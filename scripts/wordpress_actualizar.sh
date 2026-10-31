#!/bin/bash
# Mantiene un WordPress de cosmos: actualiza, corre WP-Cron y vigila que nadie
# le haya metido nada. La configuración de cada sitio va en
# /etc/default/wordpress-actualizar (ver cbm.conf y freemem.conf).
#
#   wordpress_actualizar.sh          pasada diaria: copia, actualiza, prueba, integridad
#   wordpress_actualizar.sh cron     solo las tareas pendientes de WP-Cron (cada 10 min)
#   wordpress_actualizar.sh imagen   pasada diaria bajando además la imagen de PHP (Docker; los domingos va sola)
#
# Por qué WP-Cron va aparte: WordPress lo dispara pidiéndose una página a sí
# mismo por su nombre público. Desde dentro de cosmos ese nombre lleva a la IP
# pública, que no da la vuelta por el NAT, así que la petición falla y las
# tareas (también las actualizaciones automáticas) no corrían nunca. En cbm
# además la web pública es otro contenedor (Next.js) que no lo despierta.
# freemem.space llevaba así meses; cbm estaba en 7.0.2, marcada «insecure».
#
# Por qué la integridad: el 14/10/2026 freemem.space apareció con puertas
# traseras desde julio (plugins falsos «wp-static-cache-*», mu-plugins, dos
# administradores nuevos, núcleo modificado). Nada lo avisó. Ahora cada día se
# comprueba el núcleo y los plugins contra las sumas de wordpress.org, los
# mu-plugins, los administradores y que no haya PHP en uploads.
#
# Copia del CT 105 (cosmos), igual en todos los WordPress de cosmos. La configuración
# de este sitio está en scripts/wordpress-actualizar.conf.
#
# Deja el estado en /var/lib/wordpress-actualizar/estado para la métrica del
# hipervisor (vigia/nodo/actualizaciones_metricas.sh).
set -uo pipefail
CONF=/etc/default/wordpress-actualizar
# shellcheck source=/dev/null
. "$CONF"
: "${MODO:?}" "${NOMBRE:?}" "${HOST:?}"
COPIAS=/var/backups/wordpress
ESTADO=/var/lib/wordpress-actualizar/estado

# La web responde como la pediría un visitante, por la entrada del propio CT.
# Desde dentro de cosmos el nombre público no da la vuelta por el NAT: se fuerza la IP interna.
probar() {
  local ip c r bien=0
  if [ "$MODO" = docker ]; then
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "${PROYECTO}-nginx-1" | awk '{print $1}')
  else
    ip=127.0.0.1
  fi
  for r in $PRUEBAS; do
    c=$(curl -sk -o /dev/null -m 20 -w '%{http_code}' --resolve "$HOST:443:$ip" "https://$HOST$r")
    [ "$c" = 200 ] || { echo "ERROR: $r responde $c" >&2; bien=1; }
  done
  return $bien
}

if [ "$MODO" = docker ]; then
  WP=${PROYECTO}-wordpress-1; DB=${PROYECTO}-db-1; RAIZ=/var/www/html
  # Imagen de PHP, los domingos (o con «imagen»): la etiqueta (wordpress:php8.3-fpm)
  # sigue los parches de PHP, pero Docker no los baja solo; la de cbm llevaba
  # PHP 8.2.17 de 2024 (14/10/2026). Si con la nueva la web falla, vuelve la anterior.
  imagen_ok=1
  if [ -n "${COMPOSE_DIR:-}" ] && [ "${1:-}" != cron ] && { [ "$(date +%u)" = 7 ] || [ "${1:-}" = imagen ]; }; then
    img=$(docker inspect -f '{{.Config.Image}}' "$WP")
    vieja=$(docker image inspect -f '{{.Id}}' "$img")
    docker pull -q "$img" >/dev/null
    if [ "$(docker image inspect -f '{{.Id}}' "$img")" != "$vieja" ]; then
      # shellcheck disable=SC2086
      (cd "$COMPOSE_DIR" && docker compose $COMPOSE_FICHEROS up -d wordpress) && sleep 15
      if probar; then
        echo "imagen $img al día: $(docker exec "$WP" php -r 'echo PHP_VERSION;')"
      else
        echo "ERROR: con la imagen nueva la web falla; vuelvo a la anterior" >&2
        docker tag "$vieja" "$img"
        # shellcheck disable=SC2086
        (cd "$COMPOSE_DIR" && docker compose $COMPOSE_FICHEROS up -d wordpress) && sleep 15
        imagen_ok=0
      fi
    fi
  fi
  docker cp /usr/local/bin/wp "$WP":/tmp/wp >/dev/null || exit 1
  trap 'docker exec "$WP" rm -rf /tmp/wp /tmp/wpcache' EXIT
  w()  { docker exec -u www-data -e WP_CLI_CACHE_DIR=/tmp/wpcache "$WP" php /tmp/wp --path="$RAIZ" --no-color "$@"; }
  en() { docker exec "$WP" "$@"; }
else
  RAIZ=$RUTA
  trap 'rm -rf /tmp/wpcache-actualizar' EXIT
  # El wp-config.php de freemem define ABSPATH sin comprobarlo: WP-CLI avisa en
  # cada orden. Es inofensivo y solo ensucia el registro.
  # setpriv y no runuser: runuser abre sesión PAM y llena el diario de líneas.
  w()  { setpriv --reuid=www-data --regid=www-data --init-groups env HOME=/var/www WP_CLI_CACHE_DIR=/tmp/wpcache-actualizar php /usr/local/bin/wp --path="$RAIZ" --no-color "$@" 2> >(grep -v 'Constant ABSPATH already defined' >&2); }
  en() { "$@"; }
fi
# Para mirar sin ejecutar el código de plugins y temas (por si son el problema).
ws() { w --skip-plugins --skip-themes "$@"; }

if [ "${1:-}" = cron ]; then
  w cron event run --due-now >/dev/null
  exit
fi

install -d -m 700 "$COPIAS"; install -d "$(dirname "$ESTADO")"

# --- copia de la base ---------------------------------------------------------
ok=${imagen_ok:-1}
f="$COPIAS/wordpress-$(date +%F).sql.gz"
if [ "$MODO" = docker ]; then
  # La contraseña la lee el contenedor de su propio entorno: no pasa por aquí.
  docker exec "$DB" sh -c 'exec mariadb-dump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --databases "$MYSQL_DATABASE"' | gzip > "$f.tmp"
else
  ws db export - | gzip > "$f.tmp"
fi
if [ "$(gzip -cd "$f.tmp" 2>/dev/null | tail -1 | grep -c 'Dump completed')" -gt 0 ]; then
  mv "$f.tmp" "$f"; chmod 600 "$f"
  find "$COPIAS" -name 'wordpress-*.sql.gz' -mtime +14 -delete
else
  rm -f "$f.tmp"; echo "ERROR: la copia de la base falló; no se actualiza nada" >&2
  ok=0
fi

# --- actualizaciones ------------------------------------------------------------
# Núcleo: solo el último parche de su rama (--minor). El salto de versión mayor
# se decide a mano, salvo que el propio sitio lo tenga pedido (lo hará WP-Cron).
antes=$(ws core version 2>/dev/null)
if [ "$ok" = 1 ]; then
  w core update --minor || ok=0
  w core update-db || ok=0
  w plugin update --all || ok=0
  w theme update --all || ok=0
  w language core update >/dev/null 2>&1 || true
  w language plugin update --all >/dev/null 2>&1 || true
  w language theme update --all >/dev/null 2>&1 || true
  w cron event run --due-now >/dev/null 2>&1 || true
fi
despues=$(ws core version 2>/dev/null)
mayor=$(ws core check-update --major --field=version 2>/dev/null | grep -E '^[0-9]+\.[0-9]' | head -1)

# --- prueba de que la web sigue viva ------------------------------------------
api_ok=1
probar || api_ok=0

# --- integridad -----------------------------------------------------------------
motivos=()
fuera() { grep -vxF -f <(printf '%s\n' $1 ''); }   # quita de stdin las líneas de la lista $1

s=$(ws core verify-checksums 2>&1)
# Con el motivo va el fichero: el 30/10/2026 saltó una vez y no quedó rastro de cuál.
grep -q '^Success' <<<"$s" ||
  motivos+=("núcleo modificado: $(grep -E '^(Warning|Error):' <<<"$s" | grep -v 'File should not exist' | sed 's/^[A-Za-z]*: //' | head -10 | paste -sd ';')")
x=$(sed -n 's/^Warning: File should not exist: //p' <<<"$s" | fuera "${NUCLEO_EXTRA_CONOCIDO:-}")
[ -n "$x" ] && motivos+=("ficheros de más en el núcleo: $(echo $x)")

s=$(ws plugin verify-checksums --all 2>&1)
x=$(awk -F'\t' 'NR>1 && NF>=3 {print $1}' <<<"$(grep -P '\t' <<<"$s")" | sort -u | fuera "${PLUGINS_SUMA_MAL_CONOCIDA:-}")
[ -n "$x" ] && motivos+=("plugins modificados: $(echo $x)")
# Un plugin que no está en wordpress.org no tiene sumas y se «salta»: así
# pasaban los falsos wp-static-cache-*. Solo se aceptan los apuntados.
x=$(sed -n 's/.* of plugin \([^,]*\), skipping.*/\1/p' <<<"$s" | sort -u | fuera "${PLUGINS_PROPIOS:-}")
[ -n "$x" ] && motivos+=("plugins sin sumas y no apuntados: $(echo $x)")

x=$(en sh -c "ls -A '$RAIZ/wp-content/mu-plugins' 2>/dev/null" | fuera "${MU_PLUGINS:-}")
[ -n "$x" ] && motivos+=("mu-plugins no apuntados: $(echo $x)")

x=$(ws user list --role=administrator --field=user_login 2>/dev/null | fuera "${ADMINS:-}")
[ -n "$x" ] && motivos+=("administradores no apuntados: $(echo $x)")

x=$(en find "$RAIZ/wp-content/uploads" -name '*.php*' 2>/dev/null | head -5)
[ -n "$x" ] && motivos+=("PHP en uploads: $(echo $x)")

integridad=1
if [ ${#motivos[@]} -gt 0 ]; then
  integridad=0
  printf 'INTEGRIDAD: %s\n' "${motivos[@]}" >&2
fi

echo "$NOMBRE: núcleo $antes → $despues${mayor:+ (hay versión mayor $mayor)}; integridad=$integridad"

cat > "$ESTADO.tmp" <<FIN
ok=$ok
api_ok=$api_ok
integridad=$integridad
version=$despues
mayor_disponible=${mayor:-}
cuando=$(date +%s)
FIN
mv "$ESTADO.tmp" "$ESTADO"
[ "$ok" = 1 ] && [ "$api_ok" = 1 ] && [ "$integridad" = 1 ]
