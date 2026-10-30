#!/usr/bin/env bash
# Instala en el CT el mantenimiento diario (copia, actualizaciones, integridad),
# WP-Cron cada 10 minutos y la recarga de nginx por los certificados.
# Se lanza como root desde la raíz del repo, una vez y tras cada cambio de scripts/.
set -euo pipefail
cd "$(dirname "$0")/.."

# WP-CLI oficial, comprobado contra su suma publicada
if [ ! -x /usr/local/bin/wp ]; then
  u=https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar
  curl -fsSL -o /tmp/wp.phar "$u"
  echo "$(curl -fsSL "$u.sha512")  /tmp/wp.phar" | sha512sum -c -
  install -m 755 /tmp/wp.phar /usr/local/bin/wp && rm /tmp/wp.phar
fi

install -m 755 scripts/wordpress_actualizar.sh /usr/local/sbin/wordpress_actualizar.sh
install -m 644 scripts/wordpress-actualizar.conf /etc/default/wordpress-actualizar
install -m 644 scripts/systemd/*.service scripts/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now wordpress-actualizar.timer wordpress-cron.timer nginx-recargar.timer
systemctl list-timers --no-pager | grep -E 'wordpress|nginx'
