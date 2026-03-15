# 🚀 Guía de Despliegue en Producción - Huao WhatsApp Bot

Esta guía te ayudará a desplegar tu aplicación en un servidor Contabo con tu dominio huao.cloud.

## 📋 Requisitos Previos

- ✅ Servidor VPS (Contabo) con Ubuntu 20.04+ o Debian 11+
- ✅ Dominio registrado (huao.cloud)
- ✅ Acceso SSH al servidor
- ✅ Dominio apuntando al servidor vía Cloudflare

---

## 🌐 Paso 1: Configurar DNS en Cloudflare

1. **Inicia sesión en Cloudflare** y selecciona tu dominio `huao.cloud`

2. **Agrega/Verifica los registros DNS:**

   ```
   Tipo: A
   Nombre: @
   Contenido: [IP_DE_TU_SERVIDOR_CONTABO]
   Proxy: Desactivado (nube gris) ⚠️ IMPORTANTE
   TTL: Auto
   ```

   ```
   Tipo: A
   Nombre: www
   Contenido: [IP_DE_TU_SERVIDOR_CONTABO]
   Proxy: Desactivado (nube gris) ⚠️ IMPORTANTE
   TTL: Auto
   ```

   > **⚠️ IMPORTANTE:** Desactiva el proxy de Cloudflare (nube gris) para que Caddy pueda obtener certificados SSL. Una vez que funcione, puedes activarlo si lo deseas.

3. **Verifica la propagación DNS:**
   ```bash
   # En tu máquina local
   nslookup huao.cloud
   ping huao.cloud
   ```

---

## 🖥️ Paso 2: Preparar el Servidor

### 2.1 Conectarse al servidor

```bash
ssh root@[IP_DE_TU_SERVIDOR]
```

### 2.2 Ejecutar el script de configuración

```bash
# Descargar el script de setup
curl -fsSL https://raw.githubusercontent.com/bryansgue/huao/main/scripts/setup-server.sh -o setup-server.sh

# Dar permisos de ejecución
chmod +x setup-server.sh

# Ejecutar el script
./setup-server.sh
```

Este script instalará:
- ✅ Docker y Docker Compose
- ✅ Git
- ✅ Configurará el firewall (UFW)
- ✅ Creará el usuario `huao`

### 2.3 Cambiar al usuario huao

```bash
su - huao
cd /opt/huao
```

---

## 📦 Paso 3: Clonar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/bryansgue/huao.git .

# Verificar que el repositorio se clonó correctamente
ls -la
```

---

## ⚙️ Paso 4: Configurar Variables de Entorno

### 4.1 Copiar el archivo de ejemplo

```bash
cp .env.example .env
```

### 4.2 Editar el archivo .env

```bash
nano .env
```

### 4.3 Configurar las variables importantes:

```bash
# GENERAL
NODE_ENV=production
PORT=3000
IS_DOCKER=true

# OPENAI API - Obtén tu key en https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-TU_API_KEY_AQUI

# DOMINIO Y CORS
DOMAIN=huao.cloud
EMAIL=tu-email@ejemplo.com
ALLOWED_ORIGINS=https://huao.cloud,https://www.huao.cloud

# SEGURIDAD - Genera contraseñas seguras
POSTGRES_PASSWORD=[CONTRASEÑA_SEGURA_AQUI]
DATABASE_URL=postgresql://huao_user:[CONTRASEÑA_SEGURA_AQUI]@postgres:5432/huao?schema=public
JWT_SECRET=[GENERA_UN_SECRET_DE_64_CARACTERES]
```

### 4.4 Generar secretos seguros:

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar POSTGRES_PASSWORD
openssl rand -base64 32
```

Guarda el archivo: `Ctrl + O`, `Enter`, `Ctrl + X`

---

## 🚀 Paso 5: Desplegar la Aplicación

### 5.1 Dar permisos al script de despliegue

```bash
chmod +x scripts/deploy-production.sh
```

### 5.2 Ejecutar el despliegue inicial

```bash
# Primera vez: construir y levantar con Caddy
docker-compose --profile prod up -d --build
```

### 5.3 Verificar que todo está corriendo

```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver los logs
docker-compose logs -f
```

Deberías ver:
- ✅ `huao-postgres` - Up (healthy)
- ✅ `huao-app` - Up
- ✅ `huao-caddy` - Up

---

## 🔄 Paso 6: Flujo de Trabajo (Desarrollo → Producción)

### En tu máquina local:

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "Descripción de los cambios"

# 2. Subir a GitHub
git push origin main
```

### En el servidor:

```bash
# 1. Conectarse al servidor
ssh huao@[IP_SERVIDOR]

# 2. Ir al directorio de la aplicación
cd /opt/huao

# 3. Descargar los últimos cambios
git pull origin main

# 4. Redesplegar
./scripts/deploy-production.sh
```

---

## 📊 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f app
docker-compose logs -f caddy
```

### Reiniciar un servicio
```bash
docker-compose restart app
docker-compose restart caddy
```

### Ver estado de los contenedores
```bash
docker-compose ps
docker-compose stats
```

### Ejecutar migraciones de base de datos
```bash
docker-compose exec app npx prisma migrate deploy
```

### Acceder a la base de datos
```bash
docker-compose exec postgres psql -U huao_user -d huao
```

### Crear un backup de la base de datos
```bash
docker-compose exec postgres pg_dump -U huao_user huao > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Detener todo
```bash
docker-compose --profile prod down
```

### Ver logs de Caddy (certificados SSL)
```bash
docker-compose logs caddy | grep -i certificate
```

---

## 🔒 Verificar SSL

Una vez desplegado, verifica que SSL funciona correctamente:

1. **En el navegador:**
   - Visita https://huao.cloud
   - Verifica el candado verde en la barra de direcciones

2. **Desde línea de comandos:**
   ```bash
   curl -I https://huao.cloud
   ```

---

## 🐛 Solución de Problemas

### Problema: Certificado SSL no se genera

**Solución:**
```bash
# Verificar logs de Caddy
docker-compose logs caddy

# Asegurarse de que el puerto 80 y 443 están abiertos
sudo ufw status

# Verificar que el dominio apunta al servidor
nslookup huao.cloud

# Reiniciar Caddy
docker-compose restart caddy
```

### Problema: La aplicación no inicia

**Solución:**
```bash
# Ver logs detallados
docker-compose logs --tail=100 app

# Verificar variables de entorno
docker-compose exec app printenv | grep -E "JWT|POSTGRES|OPENAI"

# Reiniciar la aplicación
docker-compose restart app
```

### Problema: Error de CORS

**Solución:**
Verifica que `ALLOWED_ORIGINS` en `.env` incluye tu dominio:
```bash
ALLOWED_ORIGINS=https://huao.cloud,https://www.huao.cloud
```

---

## 📈 Monitoreo

### Ver uso de recursos
```bash
docker stats
htop
```

### Ver espacio en disco
```bash
df -h
du -sh /opt/huao/*
```

### Limpiar Docker
```bash
# Limpiar imágenes no utilizadas
docker image prune -a

# Limpiar todo lo que no se esté usando
docker system prune -a --volumes
```

---

## 🔐 Seguridad Adicional (Recomendado)

### 1. Configurar fail2ban para SSH
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Deshabilitar login root por SSH
```bash
sudo nano /etc/ssh/sshd_config
# Cambiar: PermitRootLogin no
sudo systemctl restart sshd
```

### 3. Configurar actualizaciones automáticas
```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica la configuración: `cat .env`
3. Consulta la documentación de Docker y Caddy

---

## ✅ Checklist de Despliegue

- [ ] DNS configurado en Cloudflare apuntando al servidor
- [ ] Servidor configurado con Docker y Docker Compose
- [ ] Repositorio clonado en `/opt/huao`
- [ ] Archivo `.env` configurado con valores de producción
- [ ] Secretos generados (JWT_SECRET, POSTGRES_PASSWORD)
- [ ] Contenedores corriendo (`docker-compose ps`)
- [ ] SSL funcionando (https://huao.cloud accesible)
- [ ] Usuario admin creado (revisar logs)
- [ ] Firewall configurado (puertos 80, 443, 22 abiertos)

---

¡Listo! Tu aplicación debería estar corriendo en https://huao.cloud 🎉
