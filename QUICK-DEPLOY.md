# 🚀 Comandos Rápidos - Despliegue Huao Bot

## 📤 En tu PC Local (desarrollo)

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "descripción de cambios"

# 2. Subir a GitHub
git push origin main
```

---

## 🖥️ En el Servidor (primera vez)

```bash
# 1. Conectarse al servidor
ssh root@TU_IP_SERVIDOR

# 2. Descargar e instalar dependencias
curl -fsSL https://raw.githubusercontent.com/bryansgue/huao/main/scripts/setup-server.sh -o setup-server.sh
chmod +x setup-server.sh
./setup-server.sh

# 3. Cambiar al usuario huao
su - huao
cd /opt/huao

# 4. Clonar el repositorio
git clone https://github.com/bryansgue/huao.git .

# 5. Configurar variables de entorno
cp .env.example .env
nano .env
# Configura: OPENAI_API_KEY, DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, ALLOWED_ORIGINS

# 6. Generar secretos (copia y pega en .env)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_SECRET
openssl rand -base64 32  # POSTGRES_PASSWORD

# 7. Levantar la aplicación por primera vez (con Caddy para SSL)
docker-compose --profile prod up -d --build

# 8. Ver logs para verificar
docker-compose logs -f
```

---

## 🔄 Actualizar en el Servidor (después de hacer push)

```bash
# 1. Conectarse al servidor
ssh huao@TU_IP_SERVIDOR

# 2. Ir al directorio
cd /opt/huao

# 3. Descargar cambios
git pull origin main

# 4. Redesplegar
./scripts/deploy-production.sh

# 5. Verificar que todo funciona
docker-compose ps
docker-compose logs -f app
```

---

## 🌐 Configuración Cloudflare (ANTES de desplegar)

1. **Agregar registro DNS tipo A:**
   - Nombre: `@`
   - Contenido: `[IP_TU_SERVIDOR]`
   - Proxy: **DESACTIVADO** (nube gris) ⚠️
   
2. **Agregar registro DNS tipo A para www:**
   - Nombre: `www`
   - Contenido: `[IP_TU_SERVIDOR]`
   - Proxy: **DESACTIVADO** (nube gris) ⚠️

3. **Verificar DNS:**
   ```bash
   nslookup huao.cloud
   ping huao.cloud
   ```

---

## 🔍 Comandos Útiles en el Servidor

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f app
docker-compose logs -f caddy

# Reiniciar un servicio
docker-compose restart app

# Ver uso de recursos
docker stats

# Acceder a la base de datos
docker-compose exec postgres psql -U huao_user -d huao

# Backup de base de datos
docker-compose exec postgres pg_dump -U huao_user huao > backup_$(date +%Y%m%d).sql

# Detener todo
docker-compose --profile prod down

# Limpiar imágenes viejas
docker image prune -a
```

---

## ⚙️ Variables de entorno importantes (.env)

```bash
# Dominio
DOMAIN=huao.cloud
EMAIL=tu-email@ejemplo.com

# CORS (importante para que funcione el frontend)
ALLOWED_ORIGINS=https://huao.cloud,https://www.huao.cloud

# OpenAI
OPENAI_API_KEY=sk-proj-XXXXXXXXX

# Seguridad
JWT_SECRET=[64_caracteres_generados]
POSTGRES_PASSWORD=[contraseña_segura]
DATABASE_URL=postgresql://huao_user:[contraseña_segura]@postgres:5432/huao?schema=public

# General
NODE_ENV=production
PORT=3000
IS_DOCKER=true
```

---

## 🔥 Firewall (ya configurado por el script)

```bash
# Ver estado
sudo ufw status

# Si necesitas abrir puertos manualmente:
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 🐛 Solución Rápida de Problemas

**SSL no funciona:**
```bash
docker-compose logs caddy | grep -i cert
docker-compose restart caddy
```

**App no inicia:**
```bash
docker-compose logs app | tail -50
docker-compose restart app
```

**Error CORS:**
Verifica `ALLOWED_ORIGINS` en `.env` y reinicia:
```bash
nano .env
docker-compose restart app
```

**Base de datos no conecta:**
```bash
docker-compose logs postgres
docker-compose restart postgres
docker-compose restart app
```

---

## ✅ Checklist Rápido

- [ ] DNS en Cloudflare apuntando a tu IP (proxy OFF)
- [ ] Script de setup ejecutado en el servidor
- [ ] Repositorio clonado en `/opt/huao`
- [ ] `.env` configurado correctamente
- [ ] `docker-compose --profile prod up -d --build` ejecutado
- [ ] https://huao.cloud accesible
- [ ] Sin errores en logs: `docker-compose logs -f`

---

**🎉 Una vez funcionando, tu flujo será:**

1. Local: Hacer cambios → `git push`
2. Servidor: `git pull` → `./scripts/deploy-production.sh`
3. ¡Listo! Los cambios están en producción
