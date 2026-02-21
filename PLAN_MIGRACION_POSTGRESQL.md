# 🚀 Plan de Migración: SQLite → PostgreSQL

## 📋 Resumen Ejecutivo

**Objetivo**: Migrar la base de datos de AutoBOT de SQLite a PostgreSQL para:
- ✅ Evitar pérdida de datos en futuras migraciones
- ✅ Mejor soporte para ALTER TABLE sin recrear tablas
- ✅ Mayor robustez y escalabilidad
- ✅ Preparación para producción

**Tiempo estimado**: 2-3 horas  
**Riesgo**: Medio (con backups, riesgo bajo)  
**Impacto**: Alto (mejora significativa en estabilidad)

---

## 🎯 Ventajas de PostgreSQL vs SQLite

| Característica | SQLite | PostgreSQL |
|----------------|--------|------------|
| **ALTER TABLE** | ❌ Limitado, requiere recrear tabla | ✅ Completo, sin recrear tabla |
| **Concurrencia** | ❌ Bloqueos a nivel de archivo | ✅ MVCC, múltiples escrituras |
| **Tipos de datos** | ⚠️ Básicos | ✅ Avanzados (JSON, Arrays, UUID) |
| **Integridad** | ⚠️ Básica | ✅ Completa (CHECK, EXCLUDE) |
| **Backups** | ⚠️ Manual (copiar archivo) | ✅ pg_dump, WAL, replicación |
| **Escalabilidad** | ❌ Limitada | ✅ Excelente |
| **Producción** | ❌ No recomendado | ✅ Estándar de industria |

---

## 📊 Estado Actual del Sistema

### Base de Datos SQLite Actual
- **Ubicación**: `server/prisma/dev.db`
- **Tamaño**: 60 KB
- **Tablas**: User, Bot, Message, Reminder, Client
- **Datos actuales**:
  - Usuarios: (verificar)
  - Bots: (verificar)
  - Mensajes: (verificar)

### Configuración Actual
```env
# server/.env
DATABASE_URL="file:./dev.db"
```

### Docker Compose
Ya tiene PostgreSQL configurado pero no se está usando:
```yaml
postgres:
  image: postgres:15-alpine
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=postgres
    - POSTGRES_DB=autobot
```

---

## 🗺️ Plan de Migración Detallado

### Fase 1: Preparación (30 min)

#### 1.1. Backup Completo del Sistema Actual
```bash
# Backup de SQLite
cp server/prisma/dev.db server/prisma/dev.db.backup_$(date +%Y%m%d_%H%M%S)

# Backup de configuraciones
cp server/.env server/.env.backup

# Backup de sesiones de WhatsApp
tar -czf sessions_backup_$(date +%Y%m%d_%H%M%S).tar.gz sessions/

# Exportar datos actuales (si existen)
sqlite3 server/prisma/dev.db ".dump" > sqlite_dump_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2. Verificar Datos Actuales
```bash
# Contar registros en cada tabla
sqlite3 server/prisma/dev.db "SELECT 'Users:', COUNT(*) FROM User;"
sqlite3 server/prisma/dev.db "SELECT 'Bots:', COUNT(*) FROM Bot;"
sqlite3 server/prisma/dev.db "SELECT 'Messages:', COUNT(*) FROM Message;"
sqlite3 server/prisma/dev.db "SELECT 'Clients:', COUNT(*) FROM Client;"
sqlite3 server/prisma/dev.db "SELECT 'Reminders:', COUNT(*) FROM Reminder;"
```

#### 1.3. Exportar Configuraciones de Bots
```bash
# Exportar configuraciones JSON de cada bot
sqlite3 server/prisma/dev.db -json "SELECT userId, config FROM Bot;" > bot_configs_backup.json
```

---

### Fase 2: Configuración de PostgreSQL (30 min)

#### 2.1. Opción A: PostgreSQL Local (Desarrollo)

**Instalar PostgreSQL en Windows:**
```powershell
# Usando Chocolatey
choco install postgresql15

# O descargar instalador desde:
# https://www.postgresql.org/download/windows/
```

**Crear base de datos:**
```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE autobot;

# Crear usuario (opcional, para mayor seguridad)
CREATE USER autobot_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE autobot TO autobot_user;

# Salir
\q
```

#### 2.2. Opción B: PostgreSQL con Docker (Recomendado)

**Iniciar solo PostgreSQL:**
```bash
cd c:\Antigravity\AutoBOT\whatsapp-ai-bot

# Iniciar solo el servicio de PostgreSQL
docker-compose up -d postgres

# Verificar que está corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres
```

**Verificar conexión:**
```bash
# Conectar al contenedor
docker exec -it autobot-postgres psql -U postgres -d autobot

# Verificar base de datos
\l

# Salir
\q
```

---

### Fase 3: Actualizar Configuración (15 min)

#### 3.1. Actualizar Prisma Schema

**Cambiar el datasource en `server/prisma/schema.prisma`:**

```prisma
// ANTES:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// DESPUÉS:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 3.2. Actualizar Variables de Entorno

**Modificar `server/.env`:**

```env
PORT=3000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXX

# Database - PostgreSQL
# Opción A: PostgreSQL Local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autobot?schema=public"

# Opción B: PostgreSQL Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autobot?schema=public"

# Opción C: PostgreSQL Docker (desde dentro del contenedor)
# DATABASE_URL="postgresql://postgres:postgres@postgres:5432/autobot?schema=public"

# JWT Secret
JWT_SECRET=super_secret_jwt_key_video_demo
```

#### 3.3. Crear `.env.example` para Referencia

```env
PORT=3000
NODE_ENV=development

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autobot?schema=public"

# JWT Secret (cambiar en producción)
JWT_SECRET=your_jwt_secret_here
```

---

### Fase 4: Migración de Datos (45 min)

#### 4.1. Resetear Migraciones de Prisma

```bash
cd server

# Eliminar carpeta de migraciones antiguas (SQLite)
rm -rf prisma/migrations

# Eliminar Prisma Client generado
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
```

#### 4.2. Crear Nueva Migración Inicial para PostgreSQL

```bash
# Generar nueva migración inicial
npx prisma migrate dev --name init_postgresql

# Esto creará:
# - Nueva carpeta prisma/migrations/XXXXXX_init_postgresql/
# - Tablas en PostgreSQL
# - Prisma Client actualizado
```

#### 4.3. Opción A: Sistema Limpio (Sin Datos Previos)

Si la base de datos SQLite está vacía o quieres empezar de cero:

```bash
# Solo generar Prisma Client
npx prisma generate

# El servidor creará automáticamente el usuario admin al iniciar
```

#### 4.4. Opción B: Migrar Datos Existentes (Si hay datos importantes)

**Script de Migración de Datos:**

Crear `server/migrate_sqlite_to_postgres.js`:

```javascript
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Cliente SQLite
const sqlite = new SQLiteClient({
    datasources: { db: { url: 'file:./prisma/dev.db' } }
});

// Cliente PostgreSQL
const postgres = new PostgresClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
});

async function migrate() {
    console.log('🚀 Iniciando migración de SQLite a PostgreSQL...\n');

    try {
        // 1. Migrar Usuarios
        console.log('📦 Migrando usuarios...');
        const users = await sqlite.user.findMany();
        for (const user of users) {
            await postgres.user.create({
                data: {
                    id: user.id,
                    username: user.username,
                    passwordHash: user.passwordHash,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            });
            console.log(`  ✅ Usuario migrado: ${user.username}`);
        }

        // 2. Migrar Bots
        console.log('\n📦 Migrando bots...');
        const bots = await sqlite.bot.findMany();
        for (const bot of bots) {
            await postgres.bot.create({
                data: {
                    id: bot.id,
                    userId: bot.userId,
                    config: bot.config,
                    silencedChats: bot.silencedChats,
                    createdAt: bot.createdAt,
                    updatedAt: bot.updatedAt
                }
            });
            console.log(`  ✅ Bot migrado: ${bot.id}`);
        }

        // 3. Migrar Clientes
        console.log('\n📦 Migrando clientes...');
        const clients = await sqlite.client.findMany();
        for (const client of clients) {
            await postgres.client.create({
                data: {
                    id: client.id,
                    chatId: client.chatId,
                    name: client.name,
                    profilePicUrl: client.profilePicUrl,
                    status: client.status,
                    notes: client.notes,
                    tags: client.tags,
                    lastBroadcastAt: client.lastBroadcastAt,
                    isBotPaused: client.isBotPaused,
                    botId: client.botId,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt
                }
            });
        }
        console.log(`  ✅ ${clients.length} clientes migrados`);

        // 4. Migrar Mensajes (últimos 1000 por bot para no sobrecargar)
        console.log('\n📦 Migrando mensajes (últimos 1000 por bot)...');
        for (const bot of bots) {
            const messages = await sqlite.message.findMany({
                where: { botId: bot.id },
                orderBy: { timestamp: 'desc' },
                take: 1000
            });

            for (const msg of messages) {
                await postgres.message.create({
                    data: {
                        botId: msg.botId,
                        chatId: msg.chatId,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        isBroadcast: msg.isBroadcast,
                        isReminder: msg.isReminder,
                        isManual: msg.isManual,
                        status: msg.status,
                        whatsappId: msg.whatsappId,
                        hasMedia: msg.hasMedia,
                        mediaUrl: msg.mediaUrl,
                        mediaType: msg.mediaType
                    }
                });
            }
            console.log(`  ✅ ${messages.length} mensajes migrados para bot ${bot.id}`);
        }

        // 5. Migrar Recordatorios
        console.log('\n📦 Migrando recordatorios...');
        const reminders = await sqlite.reminder.findMany();
        for (const reminder of reminders) {
            await postgres.reminder.create({
                data: {
                    id: reminder.id,
                    botId: reminder.botId,
                    chatId: reminder.chatId,
                    dueDate: reminder.dueDate,
                    recurrenceDays: reminder.recurrenceDays,
                    createdAt: reminder.createdAt
                }
            });
        }
        console.log(`  ✅ ${reminders.length} recordatorios migrados`);

        console.log('\n✅ ¡Migración completada exitosamente!');
        console.log(`\n📊 Resumen:`);
        console.log(`   - Usuarios: ${users.length}`);
        console.log(`   - Bots: ${bots.length}`);
        console.log(`   - Clientes: ${clients.length}`);
        console.log(`   - Recordatorios: ${reminders.length}`);

    } catch (error) {
        console.error('\n❌ Error durante la migración:', error);
        throw error;
    } finally {
        await sqlite.$disconnect();
        await postgres.$disconnect();
    }
}

migrate()
    .catch(console.error)
    .finally(() => process.exit());
```

**Ejecutar migración:**
```bash
# Asegurarse de que PostgreSQL esté corriendo
# y que DATABASE_URL apunte a PostgreSQL

node migrate_sqlite_to_postgres.js
```

---

### Fase 5: Verificación y Pruebas (30 min)

#### 5.1. Verificar Migración de Datos

```bash
# Conectar a PostgreSQL
docker exec -it autobot-postgres psql -U postgres -d autobot

# Verificar tablas
\dt

# Contar registros
SELECT 'Users:', COUNT(*) FROM "User";
SELECT 'Bots:', COUNT(*) FROM "Bot";
SELECT 'Messages:', COUNT(*) FROM "Message";
SELECT 'Clients:', COUNT(*) FROM "Client";
SELECT 'Reminders:', COUNT(*) FROM "Reminder";

# Ver usuarios
SELECT id, username, role FROM "User";

# Salir
\q
```

#### 5.2. Iniciar Servidor con PostgreSQL

```bash
# Detener servidor actual (Ctrl+C en start_serv.bat)

# Iniciar de nuevo
./start_serv.bat

# Verificar logs:
# - "Server running on port 3000"
# - "[Auth] Default user created: admin / admin123" (si no hay usuarios)
# - No errores de conexión a base de datos
```

#### 5.3. Pruebas Funcionales

**Test 1: Autenticación**
- [ ] Login con usuario existente (o admin/admin123)
- [ ] Crear nuevo usuario
- [ ] Cambiar contraseña
- [ ] Logout

**Test 2: WhatsApp**
- [ ] Conectar WhatsApp (escanear QR)
- [ ] Verificar estado de conexión
- [ ] Enviar mensaje de prueba
- [ ] Recibir mensaje

**Test 3: Configuración**
- [ ] Actualizar configuración del bot
- [ ] Guardar API key de OpenAI
- [ ] Modificar system prompt
- [ ] Verificar que se guarda correctamente

**Test 4: CRM**
- [ ] Ver lista de clientes
- [ ] Actualizar información de cliente
- [ ] Enviar mensaje manual
- [ ] Crear recordatorio

**Test 5: Persistencia**
- [ ] Reiniciar servidor
- [ ] Verificar que datos persisten
- [ ] Verificar que sesión de WhatsApp persiste

---

### Fase 6: Limpieza y Optimización (15 min)

#### 6.1. Optimizar Configuración de PostgreSQL

**Crear `server/prisma/postgresql.conf` (opcional):**
```conf
# Optimizaciones para desarrollo
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
```

#### 6.2. Configurar Backups Automáticos

**Crear script `backup_postgres.sh`:**
```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de PostgreSQL
docker exec autobot-postgres pg_dump -U postgres autobot > "$BACKUP_DIR/autobot_$TIMESTAMP.sql"

# Comprimir
gzip "$BACKUP_DIR/autobot_$TIMESTAMP.sql"

# Mantener solo últimos 7 backups
ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs rm -f

echo "✅ Backup completado: autobot_$TIMESTAMP.sql.gz"
```

**Programar backup diario (opcional):**
```bash
# Windows Task Scheduler
# O cron en Linux/Mac
0 2 * * * /path/to/backup_postgres.sh
```

#### 6.3. Actualizar Documentación

Actualizar `README.md` con:
- Instrucciones de instalación de PostgreSQL
- Comandos de backup/restore
- Troubleshooting común

---

## 🔄 Plan de Rollback (Si algo sale mal)

### Opción 1: Volver a SQLite

```bash
# 1. Detener servidor
# Ctrl+C en start_serv.bat

# 2. Restaurar configuración
cp server/.env.backup server/.env

# 3. Restaurar schema.prisma
git checkout server/prisma/schema.prisma
# O cambiar manualmente provider a "sqlite"

# 4. Restaurar base de datos
cp server/prisma/dev.db.backup_XXXXXX server/prisma/dev.db

# 5. Regenerar Prisma Client
cd server
npx prisma generate

# 6. Reiniciar servidor
./start_serv.bat
```

### Opción 2: Restaurar PostgreSQL desde Backup

```bash
# Restaurar desde dump SQL
docker exec -i autobot-postgres psql -U postgres autobot < backups/autobot_XXXXXX.sql

# O desde dump comprimido
gunzip -c backups/autobot_XXXXXX.sql.gz | docker exec -i autobot-postgres psql -U postgres autobot
```

---

## 📝 Checklist de Migración

### Pre-Migración
- [ ] Backup completo de SQLite (`dev.db`)
- [ ] Backup de configuraciones (`.env`)
- [ ] Backup de sesiones de WhatsApp (`sessions/`)
- [ ] Exportar configuraciones de bots (JSON)
- [ ] Verificar datos actuales (contar registros)
- [ ] Documentar configuraciones importantes

### Migración
- [ ] PostgreSQL instalado/corriendo
- [ ] Base de datos `autobot` creada
- [ ] Schema Prisma actualizado (`provider = "postgresql"`)
- [ ] `.env` actualizado con `DATABASE_URL` de PostgreSQL
- [ ] Migraciones antiguas eliminadas
- [ ] Nueva migración inicial creada (`npx prisma migrate dev`)
- [ ] Datos migrados (si aplica)
- [ ] Prisma Client regenerado

### Post-Migración
- [ ] Servidor inicia sin errores
- [ ] Conexión a PostgreSQL exitosa
- [ ] Login funciona
- [ ] WhatsApp conecta correctamente
- [ ] Configuraciones se guardan
- [ ] Mensajes se almacenan
- [ ] CRM funciona
- [ ] Recordatorios funcionan
- [ ] Datos persisten después de reiniciar

### Limpieza
- [ ] Backups organizados
- [ ] Documentación actualizada
- [ ] Script de backup automático configurado
- [ ] Archivo SQLite antiguo archivado (no eliminado)

---

## 🎯 Recomendaciones Adicionales

### 1. **Usar Conexión Pooling en Producción**

```env
# .env (producción)
DATABASE_URL="postgresql://user:password@host:5432/autobot?schema=public&connection_limit=10&pool_timeout=20"
```

### 2. **Configurar Índices Adicionales**

```prisma
// En schema.prisma, agregar índices para mejorar performance

model Message {
  // ...
  @@index([timestamp])  // Para ordenar por fecha
  @@index([status])     // Para filtrar por estado
}

model Client {
  // ...
  @@index([updatedAt])  // Para ordenar por actividad reciente
}
```

### 3. **Monitoreo de PostgreSQL**

```bash
# Ver conexiones activas
docker exec -it autobot-postgres psql -U postgres -d autobot -c "SELECT count(*) FROM pg_stat_activity;"

# Ver tamaño de base de datos
docker exec -it autobot-postgres psql -U postgres -d autobot -c "SELECT pg_size_pretty(pg_database_size('autobot'));"

# Ver tablas más grandes
docker exec -it autobot-postgres psql -U postgres -d autobot -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### 4. **Seguridad**

```env
# Cambiar credenciales por defecto en producción
POSTGRES_USER=autobot_prod
POSTGRES_PASSWORD=contraseña_segura_aleatoria_aquí
POSTGRES_DB=autobot_prod
```

---

## 📚 Recursos Adicionales

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)

---

## ⏱️ Timeline Estimado

| Fase | Duración | Descripción |
|------|----------|-------------|
| 1. Preparación | 30 min | Backups y verificación |
| 2. Configuración PostgreSQL | 30 min | Instalación/Docker |
| 3. Actualizar Configuración | 15 min | Schema y .env |
| 4. Migración de Datos | 45 min | Crear tablas y migrar |
| 5. Verificación | 30 min | Pruebas funcionales |
| 6. Limpieza | 15 min | Optimización y docs |
| **TOTAL** | **2h 45min** | |

---

## ✅ Criterios de Éxito

La migración se considera exitosa cuando:

1. ✅ Servidor inicia sin errores de base de datos
2. ✅ Todos los usuarios pueden hacer login
3. ✅ WhatsApp conecta y funciona normalmente
4. ✅ Configuraciones se guardan y persisten
5. ✅ Mensajes se almacenan correctamente
6. ✅ CRM funciona (clientes, notas, estados)
7. ✅ Recordatorios funcionan
8. ✅ No hay pérdida de datos
9. ✅ Sistema es estable después de reiniciar
10. ✅ Backups automáticos configurados

---

**Próximos Pasos**: Una vez aprobado este plan, procederemos con la implementación fase por fase, verificando cada paso antes de continuar.
