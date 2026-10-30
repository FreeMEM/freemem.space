# freemem.space

La bitácora de FreeMEM (Francisco Tapias Bravo). WordPress headless como gestor de
contenido y Next.js como web pública. Mismo patrón que
[commodore-malacca-club](https://github.com/FreeMEM/commodore-malacca-club).

## Dónde corre

- Producción: CT 126 de cosmos (`10.0.0.26`), en `/root/freemem.space`, con
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.
- El balanceador (CT 101, haproxy) entra por el `9443` con PROXY protocol y por el `80`.
- El correo de WordPress sale por hermes (CT 100, `10.0.0.10:587`).
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
- **Nada de secretos en el repo**, que es público. Van en `.env` (ver `.env.example`).

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

## Frontend

- Las páginas se generan al pedirlas. Las respuestas de WordPress se cachean cinco
  minutos con la etiqueta `wp`, y `/api/revalidate` la invalida cuando WordPress avisa.
- Las direcciones son las del blog antiguo: `/<slug>/`, `/category/<slug>/`,
  `/tag/<slug>/`, `/page/N/` y `/feed/`. `trailingSlash` está activado por eso.
- Diseño: azul (#0055AA) y naranja (#FF8800) del Workbench 1.3. Titulares en
  Bricolage Grotesque y texto en Literata. Las copper bars de la portada son el único
  adorno, y el Guru Meditation solo sale en la página 404.
- Hay entradas desde 2006, con shortcodes viejos: `[youtube]` se convierte en
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
