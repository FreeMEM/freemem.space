#!/usr/bin/env bash
# Pone al día cada semana lo que no actualiza wordpress_actualizar.sh: las imágenes
# de nginx con ModSecurity (reglas CRS y parches de nginx), MariaDB y certbot, y
# reconstruye el frontend sobre la última node:22-alpine. La imagen de PHP la baja
# wordpress_actualizar.sh los domingos.
#
# Si después de cambiar algo la web no responde, vuelve a las imágenes de antes.
set -uo pipefail
cd /root/freemem.space
dc() { docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"; }

probar() {
  local ip c r bien=0
  ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' freememspace-nginx-1 | awk '{print $1}')
  for r in / /feed/ /wp-json/wp/v2/posts?per_page=1 /wp-login.php; do
    c=$(curl -sk -o /dev/null -m 20 -w '%{http_code}' --resolve "freemem.space:443:$ip" "https://freemem.space$r")
    [ "$c" = 200 ] || { echo "ERROR: $r responde $c" >&2; bien=1; }
  done
  return $bien
}

declare -A antes
for s in nginx db certbot; do
  img=$(dc config --images "$s" 2>/dev/null | head -1)
  antes[$s]="$img@$(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null)"
done

dc pull -q nginx db certbot
dc build -q --pull frontend
dc up -d --remove-orphans 2>&1 | grep -v -E 'Running|orphan' || true
sleep 20

if probar; then
  for s in nginx db certbot; do
    img=${antes[$s]%@*}
    [ "${antes[$s]#*@}" != "$(docker image inspect -f '{{.Id}}' "$img")" ] && echo "$s: imagen nueva ($img)"
  done
  docker image prune -f >/dev/null
  echo "imágenes al día"
else
  echo "ERROR: con las imágenes nuevas la web falla; vuelvo a las anteriores" >&2
  for s in nginx db certbot; do
    docker tag "${antes[$s]#*@}" "${antes[$s]%@*}" 2>/dev/null
  done
  dc up -d nginx db certbot
  exit 1
fi
