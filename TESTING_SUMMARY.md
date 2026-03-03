# ✅ PRUEBAS RÁPIDAS - Plan System, Credits & Security

## 🚀 Inicio Rápido

```bash
cd /home/bryansgue/Wabix

# Limpia la BD e inicia desde cero
docker compose exec -T postgres psql -U postgres -d autobot -c "DELETE FROM \"User\" CASCADE;"

# Levanta Docker (si no está ya activo)
docker compose up -d

# Espera 3 segundos
sleep 3

# Ejecuta la suite de pruebas
./RUN_ALL_TESTS.sh
```

Presiona `quick` para validación rápida (30 segundos).

---

## 📊 Validaciones Clave (Sin necesidad de WhatsApp)

### 1️⃣ Verificar que Plan Service carga

```bash
cd /home/bryansgue/Wabix
node --input-type=module - <<'EOF'
import('./server/src/services/plan.service.js')
  .then(() => console.log('✅ Plan service OK'))
  .catch((err) => console.error('❌', err.message));
EOF
```

**Expected:** `✅ Plan service OK`

---

### 2️⃣ Verificar que los usuarios se crean con planes correctos

```bash
# Registra primer usuario (debe ser ADMIN)
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test_admin_1","password":"admin123"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'Role: {d.get(\"role\")}')"

# Output esperado: Role: admin
```

---

### 3️⃣ Verificar créditos en DB

```bash
# Accede a la BD PostgreSQL
docker compose exec postgres psql -U postgres -d autobot

# Una vez adentro, ejecuta:
SELECT username, "role", "planType", "remainingCredits", "monthlyLimit" FROM "User" ORDER BY "createdAt" DESC LIMIT 5;

# Expected output:
 #  username        | role  | planType | remainingCredits | monthlyLimit
 # ------|-------|----------|------------------|--------
 #  test_admin_1    | admin | admin    |              0 |           0
 #  credit_test_... | user  | prueba   |             50 |          50
```

---

### 4️⃣ Verificar Semáforo Anti-Bloqueo

Busca logs de "ConnectionSemaphore" o "semaphore":

```bash
# Monitorea logs en vivo
docker compose logs -f whatsapp-bot | grep -i semaphore

# O después de un reinicio:
docker compose logs whatsapp-bot 2>&1 | grep -E "(semaphore|Processing chunk|Waiting)" | head -20
```

**Expected:** Logs mostrando staggering por chunks, no todas las sesiones conectándose al mismo tiempo.

---

## 🧪 Test Simplificado Manual

Si los scripts fallan por rate-limit, haz lo siguiente manualmente:

### Paso 1: Limpiar BD

```bash
docker compose exec -T postgres psql -U postgres -d autobot -c "DELETE FROM \"User\" CASCADE;"
```

### Paso 2: Esperar 60+ segundos (para que pase el rate limit)

```bash
sleep 65
```

### Paso 3: Registrar Usuario

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_prueba","password":"pass123"}'

# Response esperado:
# {"id":"<uuid>","username":"admin_prueba","role":"admin"}
```

### Paso 4: Verificar en BD

```bash
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "SELECT username, role, \"planType\", \"remainingCredits\", \"monthlyLimit\" FROM \"User\" WHERE username='admin_prueba';"
```

**Expected:**
```
 username     | role  | planType | remainingCredits | monthlyLimit
 -------------|-------|----------|------------------|--------
 admin_prueba | admin | admin    |                0 |           0
```

---

## 📜 Logs de Interés

### Ver logs de creación de plan

```bash
docker compose logs whatsapp-bot 2>&1 | grep -iE "(plan|credit)" | tail -20
```

### Ver logs de semáforo

```bash
docker compose logs whatsapp-bot 2>&1 | grep -iE "(semaphore|chunk|parallel)" | tail -20
```

### Ver logs de errores de plan

```bash
docker compose logs whatsapp-bot 2>&1 | grep -iE "(plan.*error|PlanLimit)" | tail -20
```

---

## 🎯 Checklist Minimal

- [ ] Plan service se carga sin errores
- [ ] Auth service se carga sin errores  
- [ ] OpenAI service se carga sin errores
- [ ] ConnectionSemaphore existe en session.manager.js
- [ ] Primer usuario registrado → `role: admin`
- [ ] Segundo usuario registrado → `role: user`, `planType: prueba`, `remainingCredits: 50`
- [ ] DB tiene ambos usuarios con los campos correctos

Si todo ✅ pasa, entonces **la implementación está lista**.

---

## 🐛 Debugging

### Error: "Cannot POST /api/auth/register"
→ Revisa que Docker esté levantado: `docker compose ps`

### Error: "Too many login attempts"  
→ Rate limit activado. Espera 60+ segundos o limpia los usuarios.

### Error: "FAIL: User should be trial plan"
→ Ya existían usuarios en BD. Limpia: `docker compose exec -T postgres psql -U postgres -d autobot -c "DELETE FROM \"User\" CASCADE;"`

### Error: "ConnectionSemaphore not found"
→ No se actualizó session.manager.js. Verifica: `grep -n "ConnectionSemaphore" server/src/services/session.manager.js`

---

## 📊 Status Actual

| Componente | Status |
|-----------|--------|
| Plan Service | ✅ Implementado |
| Credit Deduction | ✅ Implementado |
| OpenAI Integration | ✅ Implementado |
| WhatsApp Integration | ✅ Integrado |
| Anti-Thundering Herd | ✅ Implementado |
| Error Messages | ✅ Implementado |
| **Overall** | **✅ Ready** |

---

**Próximos pasos después de validar:**
- [ ] Reset mensual de créditos (cron job)
- [ ] UI Dashboard mostrando créditos
- [ ] Checkout/Stripe para planes
- [ ] Monitoreo de bans en WhatsApp
