# Guía de Conexión y Mantenimiento del VPS (AutoBOT)

Esta guía contiene las instrucciones necesarias para conectarse al servidor de producción y aplicar cambios futuros.

## 1. Datos de Acceso SSH
Para conectarte desde tu terminal (PowerShell o CMD):

- **Host (IP):** `89.117.145.215`
- **Usuario:** `root`
- **Puerto:** `22` (por defecto)
- **Comando de conexión:**
  ```bash
  ssh root@89.117.145.215
  ```

## 2. Ubicación del Proyecto
El código fuente y los archivos de configuración en el servidor se encuentran en:
- **Ruta:** `/var/www/bot`

Para entrar a la carpeta después de conectar por SSH:
```bash
cd /var/www/bot
```

## 3. Comandos Útiles de Docker
Dentro de la carpeta `/var/www/bot`, puedes usar estos comandos:

- **Ver estado de los contenedores:**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
- **Ver logs en tiempo real (Backend):**
  ```bash
  docker logs -f autobot_backend_prod
  ```
- **Reiniciar todo el sistema:**
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```
- **Aplicar cambios de código (Rebuild):**
  Si subes nuevos archivos y quieres que surtan efecto:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```

## 4. Flujo de Actualización Manual
Si realizas un cambio en tu computadora local y quieres subirlo al servidor:

1.  **Subir archivo corregido (Ejemplo: AdminPage.jsx):**
    ```powershell
    scp client/src/pages/AdminPage.jsx root@89.117.145.215:/var/www/bot/client/src/pages/AdminPage.jsx
    ```
2.  **Reconstruir el contenedor afectado en el VPS:**
    Conéctate por SSH y ejecuta:
    ```bash
    cd /var/www/bot
    docker compose -f docker-compose.prod.yml up -d --build frontend
    ```

## 5. Estructura de Producción
- **Base de Datos:** PostgreSQL (Contenedor `autobot_db_prod`).
- **Proxy/SSL:** Caddy (Contenedor `autobot_gateway`) configurado en el puerto `8085`.
- **Persistencia:** Las sesiones de WhatsApp se guardan en `./brain` y `./auth_info` para que no se pierdan al reiniciar.
