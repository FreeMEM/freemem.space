#!/usr/bin/env bash
# Migra el contenido del freemem.space antiguo (CT 102, intrusión de 2026) a esta
# instalación limpia. Se lanza una vez, en la raíz del repo y con la pila arrancada:
#
#   migracion/blog-latin1.sql   mysqldump de la base «blog» con
#                               --default-character-set=latin1 --skip-set-charset
#   migracion/uploads-crudo.tar wp-content/uploads del sitio antiguo
#
# Qué se trae y qué no, y por qué:
# - Del sitio antiguo no se copia ni una línea de PHP: núcleo, plugins y tema salen
#   de wordpress.org. De uploads solo imágenes (ni .php, ni .js, ni .svg, ni .swf).
# - De la base, solo contenido: entradas, páginas, medios, menús, términos,
#   comentarios aprobados y el usuario 1. Las opciones van por lista blanca: lo
#   demás (widgets, cron, ajustes de plugins) es justo donde se esconden semillas.
# - Las tablas eran latin1 con bytes UTF-8 dentro (WordPress con DB_CHARSET
#   latin1). Se cargan declarándolas utf8mb4 sin convertir, que es lo que eran.
set -euo pipefail
cd "$(dirname "$0")/.."

PROD=(-f docker-compose.yml)
[ "${1:-}" = "--prod" ] && PROD+=(-f docker-compose.prod.yml)
dc() { docker compose "${PROD[@]}" "$@"; }
wp() { dc run --rm -T wpcli wp "$@"; }
sql() { dc exec -T db mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" "$@"; }

set -a; . ./.env; set +a
: "${WP_HOME:?falta WP_HOME en .env}"

DUMP=migracion/blog-latin1.sql
UPLOADS=migracion/uploads-crudo.tar
[ -f "$DUMP" ] && [ -f "$UPLOADS" ] || { echo "faltan $DUMP o $UPLOADS"; exit 1; }

echo "== Instalación limpia"
if ! wp core is-installed 2>/dev/null; then
  wp core install --url="$WP_HOME" --title="La bitácora de FreeMEM" \
    --admin_user=admin --admin_email=francisco.antonio@tapiasbravo.com \
    --admin_password="$(openssl rand -base64 33)" --skip-email
fi
wp language core install es_ES --activate
wp theme install twentytwentyfive --activate
wp plugin install akismet codecolorer mcp-adapter enable-abilities-for-mcp --activate
wp plugin delete hello 2>/dev/null || true

echo "== Base antigua en «antiguo»"
sql -e "DROP DATABASE IF EXISTS antiguo; CREATE DATABASE antiguo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sed -E 's/CHARSET=latin1( COLLATE=latin1_swedish_ci)?/CHARSET=utf8mb4/g; s/ CHARACTER SET latin1( COLLATE latin1_swedish_ci)?//g; s/ COLLATE latin1_swedish_ci//g; s/ENGINE=MyISAM/ENGINE=InnoDB/g' "$DUMP" \
  | sql --default-character-set=utf8mb4 antiguo

echo "== Contenido"
# Copia tabla a tabla con las columnas que tengan las dos (el esquema nuevo manda).
copiar() {
  local t=$1 filtro=${2:-1}
  local cols
  cols=$(sql -N -e "SELECT GROUP_CONCAT(CONCAT('\`',n.column_name,'\`') ORDER BY n.ordinal_position)
    FROM information_schema.columns n JOIN information_schema.columns v
      ON v.table_schema='antiguo' AND v.table_name=n.table_name AND v.column_name=n.column_name
    WHERE n.table_schema='wordpress' AND n.table_name='$t'")
  sql wordpress -e "DELETE FROM $t; INSERT INTO $t ($cols) SELECT $cols FROM antiguo.$t WHERE $filtro;"
  echo "  $t: $(sql -N wordpress -e "SELECT COUNT(*) FROM $t")"
}
copiar wp_posts "post_type NOT IN ('revision','oembed_cache','customize_changeset','wp_global_styles','wp_template','wp_template_part','wp_navigation') AND post_status <> 'auto-draft'"
copiar wp_postmeta "post_id IN (SELECT ID FROM wordpress.wp_posts) AND meta_key NOT IN ('_edit_lock','_edit_last','_wp_old_slug') AND meta_key NOT LIKE '\\_oembed\\_%'"
copiar wp_terms
copiar wp_term_taxonomy
copiar wp_termmeta
copiar wp_term_relationships "object_id IN (SELECT ID FROM wordpress.wp_posts) OR term_taxonomy_id IN (SELECT term_taxonomy_id FROM wordpress.wp_term_taxonomy WHERE taxonomy='link_category')"
copiar wp_comments "comment_approved='1' AND comment_type IN ('','comment')"
copiar wp_commentmeta "comment_id IN (SELECT comment_ID FROM wordpress.wp_comments)"
copiar wp_links

echo "== Usuario 1: datos públicos, sin contraseña ni claves de aplicación"
sql wordpress -e "UPDATE wp_users n JOIN antiguo.wp_users v ON v.ID=n.ID
  SET n.user_nicename=v.user_nicename, n.display_name=v.display_name, n.user_url=v.user_url, n.user_registered=v.user_registered
  WHERE n.ID=1;"
for k in first_name last_name nickname description; do
  v=$(sql -N antiguo -e "SELECT meta_value FROM wp_usermeta WHERE user_id=1 AND meta_key='$k'")
  [ -n "$v" ] && wp user meta update 1 "$k" "$v" >/dev/null
done
# Las entradas de otros autores (cuentas antiguas que no se migran) pasan al 1
sql wordpress -e "UPDATE wp_posts SET post_author=1 WHERE post_author NOT IN (SELECT ID FROM wp_users);"

echo "== Opciones (lista blanca)"
for o in blogname blogdescription permalink_structure category_base tag_base posts_per_page \
         date_format time_format start_of_week timezone_string gmt_offset show_on_front \
         page_on_front page_for_posts default_category sticky_posts site_icon \
         wp_page_for_privacy_policy thread_comments thread_comments_depth comment_order \
         default_comments_page comments_per_page close_comments_for_old_posts \
         close_comments_days_old uploads_use_yearmonth_folders nav_menu_options; do
  sql wordpress -e "REPLACE INTO wp_options (option_name, option_value, autoload)
    SELECT option_name, option_value, autoload FROM antiguo.wp_options WHERE option_name='$o';"
done
wp option update comment_moderation 1
wp option update comment_registration 0
wp option update default_pingback_flag 0
wp option update default_ping_status closed
wp rewrite structure '/%postname%/'

echo "== Direcciones antiguas"
for d in http://freemem.space http://www.freemem.space https://www.freemem.space \
         http://blog.tapiasbravo.com https://blog.tapiasbravo.com \
         http://www.tapiasbravo.com https://www.tapiasbravo.com http://tapiasbravo.com https://tapiasbravo.com; do
  wp search-replace "$d" "$WP_HOME" wp_posts wp_postmeta wp_comments wp_options --precise --skip-columns=guid --report-changed-only
done

echo "== Medios: solo imágenes"
dc run --rm -T --entrypoint sh -v "$PWD/migracion:/migracion:ro" wpcli -c '
  set -e; T=$(mktemp -d); tar -xf /migracion/uploads-crudo.tar -C "$T"; cd "$T"
  find uploads -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.ico" \) \
    | tar -cf - -T - | tar -xf - -C /var/www/html/wp-content
  echo "  descartados: $(find uploads -type f ! \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.ico" \) | tr "\n" " ")"
  rm -rf "$T"
  echo "  imágenes: $(find /var/www/html/wp-content/uploads -type f | wc -l)"'

wp cache flush >/dev/null 2>&1 || true
sql -e "DROP DATABASE antiguo;"
echo "== Hecho. Comprobar: wp core verify-checksums; wp plugin verify-checksums --all"
