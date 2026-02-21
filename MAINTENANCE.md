# Guía de Mantenimiento y Actualización de Emergencia

Este documento detalla los procedimientos para mantener el bot operativo, específicamente en el caso de que la librería de WhatsApp (`baileys`) requiera una actualización urgente debido a cambios en los protocolos de Meta.

## 🚨 Situación: El Bot dejó de conectar por "Versión Obsoleta"
Si WhatsApp cambia sus códigos y el bot entra en bucle de desconexión, sigue estos pasos para actualizar la librería núcleo en tu entorno Docker.

### Opción A: Reconstrucción (Recomendada)
Este método es el más limpio y permanente.

1. **Entrar al directorio del proyecto** en tu servidor:
   ```bash
   cd /ruta/a/whatsapp-ai-bot
   ```

2. **Detener el contenedor actual**:
   ```bash
   docker-compose down
   ```

3. **Forzar la actualización de la librería**:
   Edita el archivo `server/package.json` y asegúrate de que la versión de `@whiskeysockets/baileys` tenga el prefijo `^` o sea la última disponible. O simplemente corre esto en tu máquina local antes de subir cambios:
   ```bash
   npm install @whiskeysockets/baileys@latest
   ```

4. **Reconstruir la Imagen Docker**:
   Al reconstruir con `--no-cache`, Docker volverá a ejecutar `npm install`, descargando la ultimísima versión de Baileys.
   ```bash
   docker-compose build --no-cache
   ```

5. **Iniciar de nuevo**:
   ```bash
   docker-compose up -d
   ```

---

### Opción B: "Parche en Caliente" (Emergencia Rápida)
Usa esto si necesitas el bot funcionando YA y no puedes esperar a una reconstrucción completa.

1. **Acceder a la terminal del contenedor activo**:
   ```bash
   docker exec -it whatsapp-ai-bot sh
   ```

2. **Actualizar la librería dentro del contenedor**:
   ```bash
   cd server
   npm install @whiskeysockets/baileys@latest
   ```

3. **Salir** y **Reiniciar el contenedor**:
   ```bash
   exit
   docker restart whatsapp-ai-bot
   ```

*Nota: Si el contenedor se destruye, perderás este cambio a menos que luego apliques la Opción A.*

---

## 📅 Mantenimiento Preventivo
Se recomienda revisar actualizaciones una vez al mes:
- [Repositorio Oficial Baileys](https://github.com/WhiskeySockets/Baileys)
- Revisar si hay "Issues" abiertos sobre problemas de conexión.
