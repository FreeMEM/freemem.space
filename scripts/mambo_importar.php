<?php
/**
 * Importa en WordPress los artículos rescatados de old.tapiasbravo.com (Mambo,
 * 2004-2008) que deja mambo_extraer.py. Se lanza con WP-CLI:
 *
 *   docker compose run --rm wpcli wp eval-file /migracion/mambo_importar.php /migracion/mambo.json
 *
 * Se puede repetir: cada entrada lleva el id de Mambo en _mambo_id y no se duplica.
 */

if (!defined('WP_CLI')) {
    exit;
}

$fichero = $args[0] ?? '';
$piezas  = json_decode((string) file_get_contents($fichero), true);
if (!is_array($piezas)) {
    WP_CLI::error("No se puede leer $fichero");
}

$cat = term_exists('archivo-tapiasbravo', 'category');
if (!$cat) {
    $cat = wp_insert_term('Archivo de tapiasbravo.com', 'category', [
        'slug'        => 'archivo-tapiasbravo',
        'description' => 'Lo que escribí entre 2004 y 2008 en old.tapiasbravo.com, un Mambo que nunca pasé a WordPress. Rescatado de la Wayback Machine en 2026.',
    ]);
}
$cat_id = (int) (is_array($cat) ? $cat['term_id'] : $cat);

// Mismo artículo visto como contenido y como entrada del blog de Mambo: uno solo
$unicas = [];
foreach ($piezas as $p) {
    $clave = mb_strtolower(trim($p['titulo'])) . '|' . substr((string) $p['fecha'], 0, 10);
    if (!isset($unicas[$clave]) || ($p['tipo'] === 'art' && $unicas[$clave]['tipo'] !== 'art')) {
        $unicas[$clave] = $p;
    }
}

$mios  = ['francisco tapias', 'freemem', 'francisco a. tapias bravo', 'francisco tapias bravo', ''];
$hecho = ['creadas' => 0, 'ya estaban' => 0];
$por_id = [];

foreach ($unicas as $p) {
    // Título y fecha identifican la pieza: el id de Mambo falta en las de listados
    $mambo_id = substr(md5(mb_strtolower(trim($p['titulo'])) . '|' . substr((string) $p['fecha'], 0, 10)), 0, 16);
    $ya = get_posts(['post_type' => 'post', 'post_status' => 'any', 'meta_key' => '_mambo_id', 'meta_value' => $mambo_id, 'fields' => 'ids']);
    if ($ya) {
        if ($p['id']) {
            $por_id[$p['id']] = $ya[0];
        }
        $hecho['ya estaban']++;
        continue;
    }

    $html = $p['html'];
    // Las imágenes de Mambo no están en la Wayback Machine: se quitan las rotas
    $html = preg_replace('#<img[^>]+src="(?:https?://(?:old\.|www\.)?tapiasbravo\.com)?/?images/[^"]*"[^>]*>#i', '', $html);
    // Enlaces a otras partes de aquel Mambo (contacto, secciones): se queda el texto
    $html = preg_replace('#<a href="https?://(?:old\.|www\.)?tapiasbravo\.com/index\.php\?option=(?!com_content|content)[^"]*">(.*?)</a>#is', '$1', $html);
    // Sin texto que leer (pruebas, o solo un banner que ya no existe): no se importa
    if (mb_strlen(trim(wp_strip_all_tags($html))) < 60 && !str_contains($html, '<a ')) {
        WP_CLI::log('Sin contenido, no se importa: ' . $p['titulo']);
        continue;
    }

    $fecha  = $p['fecha'] ? date_create($p['fecha']) : null;
    $cuando = $fecha ? wp_date('j \d\e F \d\e Y', $fecha->getTimestamp()) : 'entre 2004 y 2008';
    $autor  = trim((string) ($p['autor'] ?? ''));
    $donde  = $p['tipo'] === 'blog' ? 'en el blog de usuarios de old.tapiasbravo.com' : 'en old.tapiasbravo.com';
    $nota   = '<p><em>Publicado ' . $donde . ' el ' . esc_html($cuando)
        . (in_array(mb_strtolower($autor), $mios, true) ? '' : '. Lo escribió ' . esc_html($autor))
        . '. Recuperado de la <a href="https://web.archive.org/web/' . esc_attr($p['captura'])
        . '/http://old.tapiasbravo.com/">Wayback Machine</a> en 2026.</em></p>';

    $id = wp_insert_post([
        'post_type'      => 'post',
        'post_status'    => 'publish',
        'post_author'    => 1,
        'post_title'     => wp_strip_all_tags($p['titulo']),
        'post_content'   => wp_kses_post($html) . "\n\n" . $nota,
        'post_date'      => $fecha ? $fecha->format('Y-m-d H:i:s') : '2004-01-01 12:00:00',
        'post_category'  => [$cat_id],
        'comment_status' => 'closed',
        'ping_status'    => 'closed',
        'meta_input'     => ['_mambo_id' => $mambo_id, '_mambo_captura' => $p['captura'], '_mambo_origen' => $p['tipo'] . '-' . ($p['id'] ?? '')],
    ], true);

    if (is_wp_error($id)) {
        WP_CLI::warning($p['titulo'] . ': ' . $id->get_error_message());
        continue;
    }
    if ($p['id']) {
        $por_id[$p['id']] = $id;
    }
    $hecho['creadas']++;
}

// Enlaces entre artículos de Mambo (index.php?option=com_content&task=view&id=N)
// a la entrada nueva; los que no se rescataron, a su captura en la Wayback Machine.
foreach ($por_id as $id) {
    $post  = get_post($id);
    $nuevo = preg_replace_callback(
        '#href="https?://(?:old\.|www\.)?tapiasbravo\.com/index\.php\?option=(?:com_)?content&(?:amp;)?task=view&(?:amp;)?(?:id=)?(\d+)[^"]*"#',
        function ($m) use ($por_id) {
            return isset($por_id[(int) $m[1]])
                ? 'href="' . get_permalink($por_id[(int) $m[1]]) . '"'
                : 'href="https://web.archive.org/web/2007/http://old.tapiasbravo.com/index.php?option=com_content&task=view&id=' . $m[1] . '"';
        },
        $post->post_content
    );
    if ($nuevo !== $post->post_content) {
        wp_update_post(['ID' => $id, 'post_content' => $nuevo]);
    }
}

WP_CLI::success(sprintf('%d creadas, %d ya estaban, en «Archivo de tapiasbravo.com»', $hecho['creadas'], $hecho['ya estaban']));
