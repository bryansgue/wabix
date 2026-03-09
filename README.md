# Huao

> Plataforma multi-tenant para operar bots de WhatsApp con dashboard React, backend Express/Prisma y despliegue dockerizado listo para producción.

## 🧱 Stack principal

- **Backend:** Node.js + Express + Prisma + PostgreSQL + Baileys (multi-sesión)
- **Frontend:** React 18 + Vite + Tailwind
- **Infra:** Docker multi-stage, docker-compose (dev/prod), Caddy (TLS automático), scripts de init/deploy/backup

## 🚀 Desarrollo local

1. Instala dependencias una sola vez:
	```bash
	npm run install:all
	```
2. Crea tu `.env` desde `.env.example` y completa al menos: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS` y `PORT`.
3. Levanta el dashboard + API en caliente:
	```bash
	npm start
	```
4. Si prefieres Docker, usa el nuevo `docker-compose.yml` (postgres + app) con tu `.env` local:
	```bash
	docker compose up --build -d
	```

### Checks rápidos

- **Build frontend:** `npm run build`
- **Validar Prisma:** `cd server && DATABASE_URL="postgresql://user:pass@localhost:5432/postgres" npx prisma validate`

## 📦 Despliegue con Docker

- El mismo `docker-compose.yml` sirve para local y producción.
- Variables clave (puedes exportarlas antes de correr `docker compose`):
- `ENV_FILE` → ruta del archivo de entorno (local: `.env`, prod: `/opt/huao/config/env/production.env`).
- `STORAGE_ROOT` → carpeta que contendrá `auth_info`, `sessions`, `uploads`, `logs`, `backups`, `caddy-*` (local: `.` / prod: `/opt/huao/storage`).
- `POSTGRES_DATA_ROOT` → volumen de PostgreSQL (local: `./.postgres-data`, prod: `/opt/huao/postgres/data`).
- `CADDYFILE_PATH` → ruta del `Caddyfile` (local: `./Caddyfile`, prod: `/opt/huao/config/caddy/Caddyfile`).
- Caddy solo se levanta cuando ejecutas `docker compose --profile prod up -d`.

### Scripts útiles

- `scripts/init-server.sh` (root) → instala Docker/ufw y crea `/opt/huao/{app,storage,config,...}`.
- `scripts/deploy.sh` → hace fetch, build, `npx prisma migrate deploy` y reinicia la stack (exporta automáticamente las rutas productivas por defecto).
- `scripts/backup.sh` → ejecuta `pg_dump` dentro del contenedor `huao-postgres` y archiva `auth_info/sessions/uploads/logs` guardando 30 días.

¿Listo para enviar a producción? En el servidor exporta las variables anteriores (o deja los defaults del script) y corre:

```bash
ENV_FILE=/opt/huao/config/env/production.env \
STORAGE_ROOT=/opt/huao/storage \
POSTGRES_DATA_ROOT=/opt/huao/postgres/data \
CADDYFILE_PATH=/opt/huao/config/caddy/Caddyfile \
docker compose --profile prod up -d --build
```

Revisa `docker compose ps` y los logs (`docker compose logs -f huao-app`) para confirmar que todo quedó arriba.
