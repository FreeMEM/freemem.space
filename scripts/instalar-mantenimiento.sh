#!/usr/bin/env bash
# Instala en el CT el mantenimiento diario (copia, actualizaciones, integridad),
# WP-Cron cada 10 minutos, la recarga de nginx por los certificados, las imágenes
# de Docker al día cada semana y los parches automáticos del sistema.
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

install -m 755 scripts/wordpress_actualizar.sh scripts/imagenes_actualizar.sh /usr/local/sbin/
install -m 644 scripts/wordpress-actualizar.conf /etc/default/wordpress-actualizar
install -m 644 scripts/systemd/*.service scripts/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now wordpress-actualizar.timer wordpress-cron.timer nginx-recargar.timer imagenes-actualizar.timer
systemctl list-timers --no-pager | grep -E 'wordpress|nginx|imagenes'

# Parches de seguridad del sistema del CT, solos (Docker incluido: viene de Ubuntu)
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades >/dev/null
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades
unattended-upgrade --dry-run >/dev/null && echo 'unattended-upgrades activo'
