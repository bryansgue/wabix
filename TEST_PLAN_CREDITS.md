# 🧪 Guía Completa de Pruebas: Plans, Credits y Seguridad

## Requisitos Previos
```bash
# Asegúrate que los servicios estén corriendo
docker compose up -d

# Verifica la conexión a la BD
docker compose exec postgres psql -U postgres -d autobot -c "SELECT COUNT(*) FROM \"User\";"
```

---

## 1️⃣ Prueba: Registro de Usuario con Plan Trial

### Objetivo
Verifica que el primer usuario sea **Admin** sin expiración, y los siguientes sean **Trial** con 50 créditos y 3 días de validez.

### Script
```bash
#!/bin/bash
# Limpia usuarios anteriores (opcional)
# docker compose exec postgres psql -U postgres -d autobot -c "DELETE FROM \"User\" CASCADE;"

# Registra Usuario 1 (será Admin)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_test","password":"admin123"}' | jq .

# Registra Usuario 2 (será Trial)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user_trial","password":"user123"}' | jq .
```

### Verificación en BD
```bash
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT id, username, role, \"planType\", \"remainingCredits\", \"monthlyLimit\", \"expiresAt\" FROM \"User\" ORDER BY \"createdAt\";"
```

### Expected Output
```
                  id                  | username   | role  | planType | remainingCredits | monthlyLimit | expiresAt
--------------------------------------+------------+-------+----------+------------------+--------------+-----------------------------
 <uuid>                               | admin_test | admin | admin    |                0 |              | (null)
 <uuid>                               | user_trial | user  | prueba   |               50 |           50 | 2026-02-24 XX:XX:XX.XXX+00
```

**✅ Validar:**
- Admin tiene `planType='admin'` y sin expiración
- Trial tiene `planType='prueba'`, 50 créditos y expiración en 3 días

---

## 2️⃣ Prueba: Cambio de Plan (Admin → Starter)

### Objetivo
Simula la compra del plan Esencial ($12) que da 800 créditos mensuales.

### Script
```bash
# Obtén el ID del usuario trial
USER_ID=$(docker compose exec postgres psql -U postgres -d autobot -t -c \
  "SELECT id FROM \"User\" WHERE username='user_trial' LIMIT 1;")

# Actualiza el plan a 'starter'
curl -X PUT http://localhost:3000/auth/users/$USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "planType":"starter",
    "remainingCredits":800,
    "expiresAt":null
  }' | jq .
```

### Verificación
```bash
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT username, \"planType\", \"remainingCredits\", \"monthlyLimit\" FROM \"User\" WHERE username='user_trial';"
```

### Expected Output
```
 username   | planType | remainingCredits | monthlyLimit
------------+----------+------------------+--------------
 user_trial | starter  |              800 |          800
```

**✅ Validar:**
- `planType` cambió a `starter`
- `remainingCredits=800` (se restauran completamente)
- `monthlyLimit=800`

---

## 3️⃣ Prueba: Descuento de Créditos (OpenAI Call)

### Objetivo
Verifica que cada llamada a OpenAI decrementa **1 crédito** atómicamente.

### Setup: Simula mensaje de WhatsApp
```bash
# Necesitas una sesión activa de WhatsApp conectada
# Envía un mensaje desde un chat de WhatsApp al bot

# El backend debería:
# 1. Leer el usuario del token
# 2. Verificar plan='starter' y remainingCredits=800
# 3. Decrementar: remainingCredits → 799
# 4. Llamar a OpenAI
# 5. Si falla, revertir: remainingCredits → 800
```

### Verificación en Logs
```bash
docker compose logs -f server | grep -E "(remainingCredits|Plan limit|Credit)"
```

### Expected Logs
```
[OpenAI] User starter_user: Reserved 1 credit. Remaining: 799
[OpenAI] Response generated successfully.
```

### Verificación en BD
```bash
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT username, \"remainingCredits\" FROM \"User\" WHERE username='user_trial';" | head -20
```

**✅ Validar:**
- Cada mensaje decrementa `remainingCredits` en 1
- Si OpenAI falla, el crédito se reembolsa

---

## 4️⃣ Prueba: Bloqueo por Falta de Créditos

### Objetivo
Cuando `remainingCredits=0`, el bot debe rechazar la llamada con mensaje amigable.

### Script: Reduce créditos a 0
```bash
docker compose exec postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"remainingCredits\"=0 WHERE username='user_trial';"
```

### Envía un mensaje desde WhatsApp
El bot debería responder:
```
❌ Te quedaste sin mensajes incluidos en tu plan. Actualiza o agrega una API Key propia.
```

### Verificación en BD
```bash
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT \"remainingCredits\" FROM \"User\" WHERE username='user_trial';"
```

**✅ Validar:**
- remainingCredits sigue siendo 0 (no se decrementa)
- Usuario recibe mensaje educativo
- Ninguna llamada se hizo a OpenAI

---

## 5️⃣ Prueba: Plan Infinito (BYOK)

### Objetivo
Usuario con plan `infinito` proporciona su propia OpenAI API Key y puede usar mensajes ilimitados.

### Setup
```bash
# Cambia a plan Infinito
docker compose exec postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"planType\"='infinito', \"monthlyLimit\"=NULL, \"remainingCredits\"=NULL WHERE username='user_trial';"
```

### Usuario debe configurar su Key
En el Dashboard/API, el usuario agrega:
```json
{
  "openaiApiKey": "sk-proj-<TU_PROPIA_KEY>"
}
```

### Envía mensajes
El bot debe responder usando la Key del usuario, sin decrementar créditos.

### Verificación en Logs
```bash
docker compose logs -f server | grep -E "(BYOK|custom key|infinito)" | head -10
```

**✅ Validar:**
- Bot usa la API Key del usuario (no la global)
- No hay descuento de créditos
- Puedo enviar 1000+ mensajes sin bloqueos

---

## 6️⃣ Prueba: Prevención de Thundering Herd (Anti-Bloqueo IP)

### Objetivo
Verifica que múltiples sesiones no se conecten al mismo tiempo a WhatsApp.

### Configuración
```bash
# Establece el semáforo a 2 conexiones paralelas máximo
export MAX_PARALLEL_WA_CONNECT=2
export SESSION_START_BASE_DELAY_MS=500
export SESSION_START_JITTER_MS=1000
```

### Crea 5 usuarios
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user_$i\",\"password\":\"pass_$i\"}" 2>/dev/null
done
```

### Reinicia el servidor
```bash
docker compose down
docker compose up -d
```

### Observa los logs
```bash
docker compose logs -f server | grep -E "(Processing chunk|Waiting|Auto-starting|ConnectionSemaphore)" | head -30
```

### Expected Output
```
[SessionManager] Processing chunk 1/3 (2 users)...
[SessionManager] Auto-starting session for user: user_1 (uuid1)
[SessionManager] Auto-starting session for user: user_2 (uuid2)
[SessionManager] Waiting 2000ms before next chunk...
[SessionManager] Processing chunk 2/3 (2 users)...
[SessionManager] Auto-starting session for user: user_3 (uuid3)
[SessionManager] Auto-starting session for user: user_4 (uuid4)
[SessionManager] Waiting 2000ms before next chunk...
[SessionManager] Processing chunk 3/3 (1 user)...
[SessionManager] Auto-starting session for user: user_5 (uuid5)
```

**✅ Validar:**
- Solo 2 usuarios se conectan simultáneamente (por el semáforo)
- Cada chunk espera 2 segundos antes del siguiente
- No hay picos de CPU/Memoria en el reinicio
- WhatsApp no reporta "Too Many Connections"

---

## 7️⃣ Prueba: Transcripción de Audio Bloqueada por Plan

### Objetivo
Si un usuario Trial envía una nota de voz, debería procesar sin descuento (Whisper no toca créditos).

### Setup
```bash
# Asegúrate que user_trial tiene 50 créditos
docker compose exec postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"remainingCredits\"=50 WHERE username='user_trial';"
```

### Envía una nota de voz desde WhatsApp
El bot debe:
1. Descargar el audio
2. Convertir OGG → MP3 con ffmpeg
3. Transcribir con Whisper (usando la API Key)
4. Responder con la transcripción procesada

### Verificación
```bash
docker compose logs -f server | grep -E "(Audio processing|Transcribe|Whisper)" | head -10
```

**✅ Validar:**
- Audio se procesa sin errores
- Transcripción se devuelve correctamente
- remainingCredits NO cambia (sigue siendo 50)

---

## 8️⃣ Prueba: Error Refund (API Key Inválida)

### Objetivo
Si la OpenAI API Key es inválida, se reembolsa el crédito reservado.

### Setup
```bash
# Configura una API Key inválida
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <USER_JWT>" \
  -d '{"openaiApiKey":"sk-proj-INVALID_KEY_12345"}' | jq .
```

### Envía un mensaje
El bot debería responder con un error genérico.

### Verificación
```bash
docker compose logs -f server | grep -E "(refund|Refund|decrement|increment)" | head -10
```

**✅ Validar:**
- Se decrementó 1 crédito inicialmente
- OpenAI rechazó la llamada
- Se reembolsó 1 crédito automáticamente
- remainingCredits vuelve a su valor original

---

## 🧪 Test Completo Automatizado

Crea un script `test_all.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Iniciando suite de pruebas..."

# 1. Test: Registro
echo "✓ Registrando usuarios..."
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_'$(date +%s)'","password":"test123"}' | jq -e '.id' > /dev/null

# 2. Test: Cambio de plan
echo "✓ Probando cambio de plan..."
# (requiere JWT token válido)

# 3. Test: Bloqueo de créditos
echo "✓ Probando bloqueo por falta de créditos..."
# (requiere mensaje de WhatsApp simulado)

# 4. Test: Sesiones paralelas
echo "✓ Probando semáforo de conexiones..."
docker compose logs server | grep "ConnectionSemaphore" && echo "✓ Semáforo activo"

echo "✅ Suite de pruebas completada!"
```

Ejecutar:
```bash
chmod +x test_all.sh
./test_all.sh
```

---

## 📊 Resumen de Validaciones Críticas

| Test | Validar | Expected | Status |
|------|---------|----------|--------|
| 1. Trial Registration | admin sin expiración, user trial con 50 créditos | ✅ | 🔄 |
| 2. Plan Upgrade | planType = starter, remainingCredits = 800 | ✅ | 🔄 |
| 3. Credit Deduction | remainingCredits decrementa en 1 por mensaje | ✅ | 🔄 |
| 4. Zero Credits Block | Mensaje amigable cuando créditos = 0 | ✅ | 🔄 |
| 5. BYOK Plan | Usa API Key propia, sin descuento | ✅ | 🔄 |
| 6. Thundering Herd | Solo N conexiones paralelas | ✅ | 🔄 |
| 7. Audio Processing | No descuenta crédito por Whisper | ✅ | 🔄 |
| 8. Credit Refund | Reembolsa si OpenAI falla | ✅ | 🔄 |

---

## 🐛 Debugging

Si algo falla, revisa estos logs:

```bash
# Logs del servidor
docker compose logs server -n 100 | grep -E "(ERROR|Plan|Credit|Semaphore)"

# BD: Estado de usuarios
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT username, \"planType\", \"remainingCredits\", \"monthlyLimit\" FROM \"User\" LIMIT 10;"

# BD: Últimos mensajes
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT \"chatId\", role, content FROM \"Message\" ORDER BY timestamp DESC LIMIT 20;"
```

---

¡Prueba cada caso y reporta! 🚀
