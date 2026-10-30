<?php
/*
Plugin Name: freemem.space headless
Description: WordPress solo como gestor de contenido: correo por hermes, API acotada y aviso a Next.js al publicar.
*/

if (!defined('ABSPATH')) {
    exit;
}

// Las constantes vienen de WORDPRESS_CONFIG_EXTRA (docker-compose.yml). Si alguna
// falta, el sitio sigue: sin correo por hermes o sin avisar al frontend.
foreach (['FREEMEM_SMTP_USER' => '', 'FREEMEM_SMTP_PASS' => '', 'FREEMEM_REVALIDATE_SECRET' => '', 'FREEMEM_FRONTEND_URL' => home_url()] as $c => $v) {
    if (!defined($c)) {
        define($c, $v);
    }
}

// ============ CORREO ============

// El correo sale por hermes (CT 100) a su IP interna: desde dentro de cosmos,
// mail.tapiasbravo.com (la IP pública) da con el Postfix de cosmos, que no acepta
// cuentas. El certificado se comprueba igual, con el nombre que hermes presenta.
add_action('phpmailer_init', function ($m) {
    if (!FREEMEM_SMTP_USER || !FREEMEM_SMTP_PASS) {
        return;
    }
    $m->isSMTP();
    $m->Host        = '10.0.0.10';
    $m->Port        = 587;
    $m->SMTPSecure  = 'tls';
    $m->SMTPAuth    = true;
    $m->Username    = FREEMEM_SMTP_USER;
    $m->Password    = FREEMEM_SMTP_PASS;
    $m->SMTPOptions = ['ssl' => ['peer_name' => 'hermes.freemem.space', 'verify_peer' => true]];
});

add_filter('wp_mail_from', fn () => 'no-reply@freemem.space');
add_filter('wp_mail_from_name', fn () => 'La bitácora de FreeMEM');

// ============ SUPERFICIE ============

add_filter('xmlrpc_enabled', '__return_false');
add_filter('xmlrpc_methods', fn () => []);

// Sin listado de usuarios para quien no ha iniciado sesión: evita que se saquen
// los nombres de cuenta. El frontend pinta el autor con lo que trae la entrada.
add_filter('rest_endpoints', function ($endpoints) {
    if (is_user_logged_in()) {
        return $endpoints;
    }
    unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});

// El nombre público del autor viaja con cada entrada, ya que /users está cerrado.
add_action('rest_api_init', function () {
    register_rest_field(['post', 'page'], 'freemem_autor', [
        'get_callback' => function ($post) {
            // Las entradas rescatadas del Mambo que escribieron otros guardan su autor
            $original = get_post_meta($post['id'], '_autor_original', true);
            if ($original) {
                return ['nombre' => $original];
            }
            $u = get_userdata($post['author']);
            return $u ? ['nombre' => $u->display_name] : null;
        },
        'schema' => ['type' => 'object', 'context' => ['view']],
    ]);
});

// Comentarios desde el frontend sin cuenta, siempre a moderación.
add_filter('rest_allow_anonymous_comments', '__return_true');
add_filter('pre_comment_approved', function ($approved, $data) {
    return $approved === 'spam' || $approved === 'trash' ? $approved : 0;
}, 99, 2);

// La parte pública de WordPress no existe: quien llegue a ella va al frontend.
add_action('template_redirect', function () {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('REST_REQUEST') && REST_REQUEST)) {
        return;
    }
    wp_redirect(FREEMEM_FRONTEND_URL . ($_SERVER['REQUEST_URI'] ?? '/'), 301);
    exit;
});

// ============ AVISO A NEXT.JS ============

// Al publicar, cambiar o borrar contenido se avisa al frontend para que rehaga
// las páginas afectadas sin esperar a que caduque su caché.
function freemem_revalidar($motivo, $ruta = null) {
    if (!FREEMEM_REVALIDATE_SECRET) {
        return;
    }
    $url = getenv('REVALIDATE_URL') ?: 'http://frontend:3000/api/revalidate/';
    wp_remote_post($url, [
        'timeout'  => 3,
        'blocking' => false,
        'headers'  => ['Content-Type' => 'application/json', 'X-Revalidate-Secret' => FREEMEM_REVALIDATE_SECRET],
        'body'     => wp_json_encode(['motivo' => $motivo, 'ruta' => $ruta]),
    ]);
}

add_action('transition_post_status', function ($nuevo, $viejo, $post) {
    if (!in_array($post->post_type, ['post', 'page'], true)) {
        return;
    }
    if ($nuevo === 'publish' || $viejo === 'publish') {
        freemem_revalidar('entrada', '/' . $post->post_name . '/');
    }
}, 10, 3);

add_action('wp_set_comment_status', function ($id) {
    $c = get_comment($id);
    if ($c) {
        freemem_revalidar('comentario', '/' . get_post_field('post_name', $c->comment_post_ID) . '/');
    }
});

foreach (['edited_term', 'created_term', 'delete_term', 'wp_update_nav_menu'] as $gancho) {
    add_action($gancho, fn () => freemem_revalidar('estructura'));
}

// ============ LO QUE PINTA EL FRONTEND ALREDEDOR DEL CONTENIDO ============

// El menú de siempre («Menú 1»), las páginas y el retrato del lateral, en una sola
// llamada pública: los menús de la API estándar piden sesión.
add_action('rest_api_init', function () {
    register_rest_route('freemem/v1', '/sitio', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $ruta = fn ($url) => wp_make_link_relative($url) ?: '/';
            $menu = [];
            $locs = get_nav_menu_locations();
            $id   = $locs ? reset($locs) : 0;
            $obj  = wp_get_nav_menu_object($id ?: 'Menú 1');
            foreach ($obj ? wp_get_nav_menu_items($obj->term_id) : [] as $i) {
                $menu[] = ['titulo' => $i->title, 'ruta' => $ruta($i->url)];
            }
            $paginas = [];
            foreach (get_pages(['sort_column' => 'post_title']) as $p) {
                $paginas[] = ['titulo' => $p->post_title, 'ruta' => $ruta(get_permalink($p))];
            }
            $retrato = (int) get_option('freemem_retrato');
            $img = $retrato ? wp_get_attachment_image_src($retrato, 'large') : null;
            return [
                'nombre'      => get_bloginfo('name'),
                'descripcion' => get_bloginfo('description'),
                'menu'        => $menu,
                'paginas'     => $paginas,
                'retrato'     => $img ? ['src' => $img[0], 'ancho' => $img[1], 'alto' => $img[2]] : null,
            ];
        },
    ]);
});

foreach (['wp_update_nav_menu', 'update_option_freemem_retrato', 'update_option_blogname', 'update_option_blogdescription'] as $gancho) {
    add_action($gancho, fn () => freemem_revalidar('sitio'));
}
