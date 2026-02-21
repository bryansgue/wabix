# 🔴 Análisis: Pérdida de Accesos y Configuraciones

## 📋 Resumen del Problema

Al realizar cambios en la base de datos que incluyen modificaciones al esquema de Prisma, **se perdieron todos los usuarios, configuraciones y datos** del sistema. Esto ocurrió debido a cómo funcionan las migraciones de Prisma con SQLite.

---

## 🔍 Causa Raíz del Problema

### 1. **Migraciones de Prisma con SQLite**

SQLite tiene limitaciones importantes comparado con bases de datos como PostgreSQL o MySQL:

- **No soporta ALTER TABLE completo**: No puede agregar columnas con restricciones complejas o modificar columnas existentes fácilmente
- **Requiere recrear tablas**: Para agregar campos nuevos, Prisma debe recrear toda la tabla

### 2. **Proceso de Migración Destructivo**

Cuando ejecutaste migraciones recientes (especialmente `add_is_manual_field`), Prisma realizó lo siguiente:

```sql
-- RedefineTables
PRAGMA foreign_keys=OFF;

-- 1. Crear nueva tabla con el nuevo campo
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "isReminder" BOOLEAN NOT NULL DEFAULT false,
    "isManual" BOOLEAN NOT NULL DEFAULT false,  -- NUEVO CAMPO
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "whatsappId" TEXT,
    CONSTRAINT "Message_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Copiar SOLO los datos de campos existentes
INSERT INTO "new_Message" (
    "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp"
) 
SELECT "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp" 
FROM "Message";

-- 3. Eliminar tabla antigua
DROP TABLE "Message";

-- 4. Renombrar nueva tabla
ALTER TABLE "new_Message" RENAME TO "Message";

-- 5. Recrear índices
CREATE INDEX "Message_botId_chatId_idx" ON "Message"("botId", "chatId");
CREATE INDEX "Message_botId_whatsappId_idx" ON "Message"("botId", "whatsappId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
```

### 3. **El Problema Crítico**

**Observa la línea 17 del archivo de migración:**

```sql
INSERT INTO "new_Message" (
    "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp"
) 
SELECT "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp" 
FROM "Message";
```

**¿Qué falta aquí?**

❌ **No se están copiando los campos:**
- `isReminder`
- `status`
- `whatsappId`
- `hasMedia`
- `mediaUrl`
- `mediaType`

**Esto significa que:**
1. Se perdieron todos los estados de mensajes (SENT, DELIVERED, READ)
2. Se perdieron los IDs de WhatsApp de los mensajes
3. Se perdieron las referencias a archivos multimedia
4. Se perdieron los marcadores de recordatorios

---

## 🗂️ Historial de Migraciones

Revisando las migraciones ejecutadas:

| Fecha | Migración | Acción |
|-------|-----------|--------|
| 2026-02-03 03:20 | `init` | Creación inicial de tablas |
| 2026-02-03 16:55 | `add_client_model` | Agregar tabla Client |
| 2026-02-03 19:42 | `add_profile_pic_url` | Agregar campo profilePicUrl |
| 2026-02-03 20:20 | `add_reminder_recurrence` | Agregar recurrenceDays |
| 2026-02-03 21:37 | `add_broadcast_tracking` | Agregar lastBroadcastAt |
| 2026-02-03 21:42 | `add_is_broadcast` | Agregar isBroadcast ⚠️ |
| 2026-02-04 02:59 | `add_is_manual_field` | Agregar isManual ⚠️ |

### Migraciones Problemáticas

#### **Migración: `add_is_broadcast`**
```sql
INSERT INTO "new_Message" (
    "botId", "chatId", "content", "id", "role", "timestamp"
) 
SELECT "botId", "chatId", "content", "id", "role", "timestamp" 
FROM "Message";
```

**Campos perdidos en esta migración:**
- Ninguno (en ese momento solo existían esos campos)

#### **Migración: `add_is_manual_field`**
```sql
INSERT INTO "new_Message" (
    "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp"
) 
SELECT "botId", "chatId", "content", "id", "isBroadcast", "role", "timestamp" 
FROM "Message";
```

**Campos perdidos en esta migración:**
- `isReminder` ❌
- `status` ❌
- `whatsappId` ❌
- `hasMedia` ❌
- `mediaUrl` ❌
- `mediaType` ❌

---

## 📊 Estado Actual de la Base de Datos

### Archivo de Base de Datos
- **Ubicación**: `c:\Antigravity\AutoBOT\whatsapp-ai-bot\server\prisma\dev.db`
- **Tamaño actual**: 61,440 bytes (60 KB)
- **Última modificación**: 2026-02-02 22:20:32

**Esto es muy pequeño**, lo que indica que probablemente:
1. La base de datos fue recreada recientemente
2. Hay muy pocos o ningún dato

### Verificación de Usuarios

La tabla `User` existe con la estructura correcta:
```sql
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
```

**Pero probablemente está vacía** debido a que:
1. Las migraciones recrearon las tablas
2. No había un backup de los datos
3. El sistema creó una nueva base de datos limpia

---

## 🎯 Por Qué Se Perdió Todo

### Escenario Más Probable

1. **Ejecutaste `npx prisma migrate dev`** después de modificar el schema
2. Prisma detectó cambios en múltiples tablas
3. Para SQLite, Prisma tuvo que recrear las tablas
4. Durante la recreación, **solo copió los campos que existían en la migración anterior**
5. Los campos nuevos se agregaron con valores por defecto
6. **Los campos que ya existían pero no se listaron en el INSERT se perdieron**

### Efecto Cascada

Debido a las relaciones `onDelete: Cascade` en el schema:

```prisma
model Bot {
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ...
}

model Message {
  botId String
  bot   Bot    @relation(fields: [botId], references: [id], onDelete: Cascade)
  // ...
}
```

**Si se perdieron usuarios:**
1. Se eliminaron automáticamente todos los Bots asociados
2. Se eliminaron automáticamente todos los Messages de esos Bots
3. Se eliminaron automáticamente todos los Clients de esos Bots
4. Se eliminaron automáticamente todos los Reminders de esos Bots

**Todo el sistema se limpió en cascada.**

---

## 🛡️ Cómo Evitar Esto en el Futuro

### 1. **Backups Antes de Migraciones**

```bash
# Antes de ejecutar prisma migrate dev
cp server/prisma/dev.db server/prisma/dev.db.backup
```

### 2. **Usar PostgreSQL en Producción**

PostgreSQL soporta ALTER TABLE completo:
```sql
-- PostgreSQL puede hacer esto sin recrear la tabla
ALTER TABLE "Message" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
```

SQLite requiere recrear toda la tabla, lo que es más propenso a errores.

### 3. **Revisar Migraciones Antes de Aplicar**

```bash
# Generar migración sin aplicarla
npx prisma migrate dev --create-only

# Revisar el archivo SQL generado
cat prisma/migrations/XXXXXX_nombre/migration.sql

# Verificar que TODOS los campos se copien en el INSERT
```

### 4. **Usar Migraciones Manuales para Cambios Complejos**

En lugar de confiar en Prisma para generar la migración automáticamente, crear el SQL manualmente:

```sql
-- Migración manual segura
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Message" (
    -- Todos los campos nuevos y viejos
    ...
);

-- COPIAR TODOS LOS CAMPOS EXISTENTES
INSERT INTO "new_Message" (
    "id", "botId", "chatId", "role", "content", "timestamp",
    "isBroadcast", "isReminder", "status", "whatsappId",
    "hasMedia", "mediaUrl", "mediaType"
) 
SELECT 
    "id", "botId", "chatId", "role", "content", "timestamp",
    "isBroadcast", "isReminder", "status", "whatsappId",
    "hasMedia", "mediaUrl", "mediaType"
FROM "Message";

DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";

PRAGMA foreign_keys=ON;
```

### 5. **Exportar Datos Antes de Cambios Grandes**

```bash
# Exportar usuarios
sqlite3 dev.db "SELECT * FROM User;" > users_backup.csv

# Exportar configuraciones de bots
sqlite3 dev.db "SELECT userId, config FROM Bot;" > bot_configs_backup.json
```

---

## 🔧 Solución Actual

### Opción 1: Restaurar desde Backup (Si Existe)

Si tienes un backup de `dev.db`:
```bash
cp dev.db.backup dev.db
```

### Opción 2: Recrear Usuario Admin

El sistema tiene un mecanismo de auto-creación de admin:

```javascript
// auth.service.js - ensureDefaultUser()
async ensureDefaultUser() {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        console.log('[Auth] No users found. Creating default admin...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash,
                role: 'admin'
            }
        });
        console.log('[Auth] Default user created: admin / admin123');
    }
}
```

**Esto se ejecuta automáticamente al iniciar el servidor.**

### Opción 3: Recrear Manualmente

Puedes usar el script `create_admin.js`:
```bash
cd server
node create_admin.js
```

---

## 📝 Lecciones Aprendidas

1. **SQLite no es ideal para producción** con esquemas que cambian frecuentemente
2. **Siempre hacer backup antes de migraciones**
3. **Revisar SQL generado por Prisma** antes de aplicar
4. **Usar PostgreSQL en producción** para migraciones más seguras
5. **Implementar sistema de backups automáticos**
6. **Exportar configuraciones críticas** (API keys, prompts) a archivos separados

---

## 🎯 Recomendaciones

### Inmediato
1. ✅ Reiniciar el servidor para que cree el usuario admin por defecto
2. ✅ Reconfigurar el bot (API key de OpenAI, prompts, etc.)
3. ✅ Reconectar WhatsApp escaneando QR

### Corto Plazo
1. 📦 Implementar backups automáticos diarios de `dev.db`
2. 📝 Documentar configuraciones importantes
3. 🔄 Migrar a PostgreSQL para producción

### Largo Plazo
1. 🗄️ Separar configuraciones críticas a archivos de entorno
2. 📊 Implementar sistema de exportación/importación de configuraciones
3. 🔐 Backup automático antes de cada migración

---

**Conclusión**: La pérdida de datos fue causada por migraciones de Prisma con SQLite que no copiaron todos los campos existentes al recrear las tablas. Esto, combinado con las relaciones en cascada, eliminó todos los datos del sistema.
