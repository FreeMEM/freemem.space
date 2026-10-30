# freemem.space

La bitácora de FreeMEM (Francisco Tapias Bravo). WordPress headless como gestor de
contenido y Next.js como web pública. Mismo patrón que
[commodore-malacca-club](https://github.com/FreeMEM/commodore-malacca-club).

## Dónde corre

- Producción: CT 126 de cosmos (`10.0.0.26`), en `/root/freemem.space`, con
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.
- El balanceador (CT 101, haproxy) entra por el `9443` con PROXY protocol y por el `80`.
- El correo de WordPress sale por hermes (CT 100, `10.0.0.10:587`) como no-reply@freemem.space, la misma cuenta que usa DPMS (CT 104): si se cambia su contraseña, hay que cambiarla en los dos.
- Se entra con `ssh root@cosmos.freemem.space "pct exec 126 -- …"`. El CT no tiene SSH.

## Por qué está hecho así

Se rehízo el 30/10/2026 tras una intrusión en el sitio antiguo (CT 102): una puerta
trasera en `wp-content/languages/` desde julio y el núcleo sembrado con spam de casinos.
De ahí salen las reglas:

- **No se ejecuta PHP fuera de lo imprescindible.** nginx solo pasa a PHP `wp-admin`,
  `wp-login.php` y `wp-json`. Cualquier otro `.php` devuelve 403, esté donde esté.
- **WordPress no puede instalar ni editar código.** `DISALLOW_FILE_MODS` y
  `DISALLOW_FILE_EDIT` están puestos. Plugins, temas y núcleo se cambian con WP-CLI:
  `docker compose run --rm wpcli wp plugin update --all`.
- **La parte pública de WordPress no existe.** El mu-plugin redirige al frontend y
  cierra `/wp/v2/users` y XML-RPC.
- **El HTML de la base se limpia siempre** con DOMPurify en el frontend (`lib/contenido.js`).
- **Cabeceras del frontend en nginx**: CSP (scripts solo propios y de Google Analytics,
  imágenes https, marcos solo de YouTube y Vimeo), COOP y HSTS; sin cabeceras de Next.js.
  `/api/` da 404 desde fuera (la revalidación entra por la red interna, con secreto
  comparado en tiempo constante). Comentarios: 6 por minuto y dirección. El optimizador
  de imágenes solo acepta calidad 75 y fotos de `freemem.space/wp-content/uploads`.
  Si se añade un servicio externo (un vídeo de otra plataforma, otro script), hay que
  abrirlo en `$csp_paginas` de `nginx/site.conf`.
- **Nada de secretos en el repo**, que es público. Van en `.env` (ver `.env.example`).
- **Todo se actualiza solo**: WordPress, plugins, temas y traducciones cada día; la
  imagen de PHP los domingos; nginx con ModSecurity, MariaDB, certbot y el frontend
  los lunes; el sistema del CT con unattended-upgrades. Las dos pasadas comprueban la
  web y vuelven atrás si falla. La integridad diaria la recoge la alerta de cosmos.
- **Tras cambiar `nginx/site.conf`, `restart nginx`, no `nginx -s reload`**: va montado
  como fichero suelto y `git pull` lo sustituye por otro; el contenedor sigue viendo el
  viejo hasta que se reinicia. Antes, `exec nginx nginx -t` no sirve por lo mismo.
- **Caché**: nginx guarda las páginas 60 s (renovación en segundo plano) y `/_next/`
  30 días. Lo publicado tarda como mucho un minuto en verse. `X-Cache` dice HIT o MISS.
- **En producción, `docker compose` siempre con los dos ficheros**
  (`-f docker-compose.yml -f docker-compose.prod.yml`): con uno solo, Docker recrea
  la base y WordPress con otra configuración.

## Piezas

| Ruta | Qué es |
|------|--------|
| `docker-compose.yml` | MariaDB, WordPress php-fpm y WP-CLI (perfil `cli`) |
| `docker-compose.prod.yml` | Next.js, nginx con ModSecurity (CRS 4.25) y certbot |
| `docker-compose.override.yml` | Desarrollo: nginx simple en `localhost:8080` |
| `nginx/site.conf` | Producción. El servidor `:8081` es la API interna para Next.js |
| `nginx/modsecurity/` | Excepciones del WAF. Usar `REQUEST_FILENAME`, nunca `REQUEST_URI` |
| `wordpress/mu-plugins/freemem-headless.php` | Correo, API acotada, aviso a Next.js al publicar |
| `frontend/` | Next.js 15 (App Router), CSS propio, sin librería de componentes |
| `scripts/migrar.sh` | Migración única desde el sitio antiguo. Ya está hecha |
| `scripts/wordpress_actualizar.sh` | Mantenimiento diario, el mismo de los WordPress de cosmos (copia del CT 105) |
| `scripts/imagenes_actualizar.sh` | Cada lunes: imágenes de nginx/ModSecurity, MariaDB y certbot, y frontend reconstruido; vuelve atrás si la web falla |
| `scripts/instalar-mantenimiento.sh` | Instala los dos guiones, WP-CLI, los temporizadores y unattended-upgrades en el CT |
| `monitorizacion/` | Visitas a Loki: promtail, rotación y el panel «freemem.space / Visitas» de Grafana (vigía) |
| `.github/dependabot.yml` | Avisos de versiones nuevas de npm y Docker; se fusionan a mano |

## Frontend

- Las páginas se generan al pedirlas. Las respuestas de WordPress se cachean cinco
  minutos con la etiqueta `wp`, y `/api/revalidate` la invalida cuando WordPress avisa.
- Las direcciones son las del blog antiguo: `/<slug>/`, `/category/<slug>/`,
  `/tag/<slug>/`, `/page/N/` y `/feed/`. `trailingSlash` está activado por eso.
- Diseño: azul (#0055AA) y naranja (#FF8800) del Workbench 1.3. Titulares en
  Bricolage Grotesque y texto en Literata. Las copper bars de la portada son el único
  adorno, y el Guru Meditation solo sale en la página 404.
- Google Analytics 4 (`G-K9SH40W4GY`) solo carga si el visitante acepta en el aviso
  (`components/Analitica.jsx`). Search Console se verifica con
  `public/google0ac0168ea35fcffb.html`, el fichero que puso Site Kit: no borrarlo.
- Para modelos de lenguaje: `/llms.txt`, `/llms-full.txt` y `/<slug>/index.md`.
- Hay entradas desde 2004 (las de 2004-2006 rescatadas del Mambo de old.tapiasbravo.com), con shortcodes viejos: `[youtube]` se convierte en
  `lib/contenido.js` y los de CodeColorer los pinta el plugin.

## Desarrollo

```bash
cp .env.example .env    # rellenar contraseñas; WP_HOME=http://localhost:8080
docker compose up -d
cd frontend && npm install && npm run dev
```

## Comprobaciones

- Tras tocar el frontend: `cd frontend && npx next build`.
- Tras tocar WordPress: `docker compose run --rm wpcli wp core verify-checksums` y
  `wp plugin verify-checksums --all`.
