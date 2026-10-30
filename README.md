# freemem.space

La bitácora de FreeMEM: apuntes sobre el Amiga, programación, sistemas y conocimiento
libre desde 2006.

WordPress se usa solo como gestor de contenido (headless). La web pública es una
aplicación Next.js que lee la API REST de WordPress.

```
Internet ─► haproxy ─► nginx + ModSecurity ─┬─ /wp-admin, /wp-login.php, /wp-json ─► WordPress (php-fpm) ─► MariaDB
                                            └─ todo lo demás ─────────────────────► Next.js
```

## Arranque en desarrollo

```bash
cp .env.example .env
docker compose up -d                 # WordPress en http://localhost:8080
cd frontend && npm install && npm run dev   # web en http://localhost:3000
```

## Producción

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Los detalles de diseño, seguridad y despliegue están en [AGENTS.md](AGENTS.md).

## Licencia

El código, MIT. Los textos e imágenes del blog son de su autor.
