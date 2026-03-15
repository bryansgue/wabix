# 🤖 INSTRUCCIONES PARA IA DEL SERVIDOR

Hola IA, soy el asistente del desarrollador. Acabo de hacer `git pull` en el servidor y necesito tu ayuda para desplegar esta aplicación de WhatsApp Bot en producción.

## 📍 Contexto

- **Aplicación**: Huao WhatsApp Bot (Node.js + React + PostgreSQL)
- **Servidor**: Contabo VPS con Ubuntu/Debian
- **Dominio**: huao.cloud (configurado en Cloudflare)
- **Repositorio**: https://github.com/bryansgue/huao.git
- **Usuario del servidor**: huao
- **Directorio**: /opt/huao

## 🎯 Lo que necesito que hagas

### 1. PRIMERA VEZ - Configuración Inicial del Servidor

Si es la primera vez que despliegas en este servidor, necesito que:

1. **Ejecutes el script de setup** (como root):
   ```bash
   chmod +x scripts/setup-server.sh
   sudo ./scripts/setup-server.sh
   ```
   Este script instala Docker, Docker Compose, Git, y configura el firewall.

2. **Configures el archivo .env** con valores de producción:
   - Copia `.env.example` a `.env`
   - Genera y configura estos valores:
     - `OPENAI_API_KEY`: La API key de OpenAI (empieza con sk-proj-)
     - `JWT_SECRET`: Genera uno con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
     - `POSTGRES_PASSWORD`: Genera uno con: `openssl rand -base64 32`
     - `DATABASE_URL`: Actualiza con la contraseña de PostgreSQL generada
     - `DOMAIN`: huao.cloud
     - `EMAIL`: Email del administrador
     - `ALLOWED_ORIGINS`: https://huao.cloud,https://www.huao.cloud
     - `NODE_ENV`: production

3. **Despliega la aplicación** con Caddy (para SSL automático):
   ```bash
   docker-compose --profile prod up -d --build
   ```

4. **Verifica que todo funciona**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

### 2. ACTUALIZACIONES - Después de hacer git pull

Si ya está desplegado y solo necesitas actualizar:

1. **Ejecuta el script de despliegue**:
   ```bash
   chmod +x scripts/deploy-production.sh
   ./scripts/deploy-production.sh
   ```

   Este script automáticamente:
   - Detiene los contenedores actuales
   - Reconstruye las imágenes
   - Inicia los nuevos contenedores
   - Ejecuta las migraciones de base de datos

2. **Verifica que no hay errores**:
   ```bash
   docker-compose logs --tail=50 app
   ```

## ⚙️ Configuración del archivo .env

Aquí está el formato que debe tener el `.env` en producción:

```bash
# GENERAL
NODE_ENV=production
PORT=3000
IS_DOCKER=true

# OPENAI API
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXX
SYSTEM_PROMPT=Eres Neo, un asistente inteligente.
AI_MODEL=gpt-4o-mini

# BASE DE DATOS
POSTGRES_DB=huao
POSTGRES_USER=huao_user
POSTGRES_PASSWORD=[GENERA_UNA_CONTRASEÑA_SEGURA_AQUI]
DATABASE_URL=postgresql://huao_user:[MISMA_CONTRASEÑA]@postgres:5432/huao?schema=public

# SEGURIDAD
JWT_SECRET=[GENERA_UN_SECRET_DE_64_CARACTERES_AQUI]

# DOMINIO Y CORS
DOMAIN=huao.cloud
EMAIL=admin@huao.cloud
ALLOWED_ORIGINS=https://huao.cloud,https://www.huao.cloud

# ALMACENAMIENTO
STORAGE_ROOT=.
POSTGRES_DATA_ROOT=./.postgres-data
```

## 🔍 Verificaciones Importantes

Después de desplegar, verifica que:

1. **Los contenedores están corriendo**:
   ```bash
   docker-compose ps
   ```
   Deberías ver:
   - huao-postgres: Up (healthy)
   - huao-app: Up
   - huao-caddy: Up

2. **No hay errores en los logs**:
   ```bash
   docker-compose logs app | grep -i error
   docker-compose logs caddy | grep -i error
   ```

3. **SSL está funcionando**:
   ```bash
   curl -I https://huao.cloud
   docker-compose logs caddy | grep -i certificate
   ```

4. **La aplicación responde**:
   ```bash
   curl https://huao.cloud
   ```

## 🐛 Si algo sale mal

### Error: Certificado SSL no se genera
```bash
# Verifica que el DNS apunta correctamente
nslookup huao.cloud

# Verifica los logs de Caddy
docker-compose logs caddy

# Reinicia Caddy
docker-compose restart caddy
```

### Error: La aplicación no inicia
```bash
# Ve los logs detallados
docker-compose logs --tail=100 app

# Verifica las variables de entorno
docker-compose exec app printenv | grep -E "JWT|POSTGRES|OPENAI"

# Reinicia la app
docker-compose restart app
```

### Error: Base de datos no conecta
```bash
# Verifica que PostgreSQL está corriendo
docker-compose ps postgres

# Ve los logs de PostgreSQL
docker-compose logs postgres

# Si es necesario, reinicia desde cero
docker-compose down -v
docker-compose --profile prod up -d --build
```

### Error: CORS bloqueado
- Verifica que `ALLOWED_ORIGINS` en `.env` incluye `https://huao.cloud`
- Reinicia la app: `docker-compose restart app`

## 📊 Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f app

# Ver estado y uso de recursos
docker-compose ps
docker stats

# Ejecutar migraciones manualmente
docker-compose exec app npx prisma migrate deploy

# Acceder a la base de datos
docker-compose exec postgres psql -U huao_user -d huao

# Backup de la base de datos
docker-compose exec postgres pg_dump -U huao_user huao > backup_$(date +%Y%m%d).sql

# Reiniciar un servicio específico
docker-compose restart app
docker-compose restart caddy

# Detener todo
docker-compose --profile prod down

# Ver el usuario admin creado
docker-compose logs app | grep "Default user created"
```

## 📝 Notas Importantes

1. **Primera vez**: El sistema crea automáticamente un usuario administrador. Busca en los logs:
   ```bash
   docker-compose logs app | grep "Default user created"
   ```

2. **DNS de Cloudflare**: DEBE tener el proxy DESACTIVADO (nube gris) para que Caddy pueda generar certificados SSL

3. **Firewall**: Los puertos 22 (SSH), 80 (HTTP) y 443 (HTTPS) deben estar abiertos

4. **Seguridad**: NUNCA compartas el archivo `.env` ni lo subas a Git

## ✅ Checklist de Despliegue

Marca cada ítem cuando lo completes:

- [ ] Script de setup ejecutado (solo primera vez)
- [ ] Archivo `.env` creado y configurado
- [ ] JWT_SECRET generado (mínimo 64 caracteres)
- [ ] POSTGRES_PASSWORD generado y configurado en ambos lugares
- [ ] OPENAI_API_KEY configurada
- [ ] DOMAIN y ALLOWED_ORIGINS configurados correctamente
- [ ] DNS en Cloudflare apuntando al servidor (proxy OFF)
- [ ] Contenedores levantados: `docker-compose --profile prod up -d --build`
- [ ] Todos los contenedores corriendo: `docker-compose ps`
- [ ] Sin errores en logs: `docker-compose logs -f`
- [ ] SSL funcionando: `curl -I https://huao.cloud`
- [ ] Aplicación accesible en el navegador: https://huao.cloud

## 🎉 Resultado Esperado

Al terminar, deberías poder:
- Acceder a https://huao.cloud en el navegador
- Ver el login de la aplicación
- Iniciar sesión con el usuario administrador creado automáticamente
- No ver errores en los logs

---

**Si necesitas ayuda adicional**, consulta:
- `DEPLOYMENT.md` - Guía completa de despliegue
- `QUICK-DEPLOY.md` - Comandos rápidos de referencia
- Logs de la aplicación: `docker-compose logs -f`

¡Buena suerte con el despliegue! 🚀
