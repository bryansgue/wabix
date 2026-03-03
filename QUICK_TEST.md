# 🚀 Quick Start: Pruebas Inmediatas

Después de haber implementado los planes, créditos y semáforo, aquí están las pruebas **más rápidas** para validar todo sin conexión a WhatsApp.

## Paso 1: Verifica que Docker esté levantado

```bash
cd /home/bryansgue/Wabix
docker compose up -d
```

## Paso 2: Ejecuta el menú de pruebas

```bash
./RUN_ALL_TESTS.sh
```

Te aparecerá un menú interactivo:

```
🧪 AutoBOT SaaS - Complete Test Suite

1️⃣  Test Plan Registration
2️⃣  Test Credit System
3️⃣  Test Connection Semaphore
4️⃣  Test Plan Error Messages

Choose an option: quick
```

### Opción "quick" (RECOMENDADO - 30 segundos)
Valida que todos los módulos cargan sin errores:

```bash
✓ Plan service loads correctly
✓ Auth service loads correctly
✓ OpenAI service loads correctly
✓ ConnectionSemaphore implemented
ℹ️  Total users in DB: 5
✅ Quick validation complete!
```

---

## Paso 3: Pruebas específicas (manual)

### Test 1: Crear usuarios con planes automáticos

```bash
./test_plan_registration.sh
```

**Lo que hace:**
- Registra 1er usuario → debe ser **Admin**
- Registra 2do usuario → debe ser **Trial** con 50 créditos

**Output esperado:**
```
✓ Admin Role: admin (expected: 'admin')
✓ Trial ID: <uuid>
✓ Trial Role: user (expected: not 'admin')

[DB Query]
 admin_auto_1708... | admin  | admin | none    | 0    | 
 trial_auto_1708... | user   | prueba| 50      | 50
```

---

### Test 2: Sistema de créditos

```bash
./test_credit_system.sh
```

**Lo que hace:**
1. Crea usuario con 50 créditos
2. Reduce a 5
3. Simula 5 mensajes → decrementa a 0
4. Valida que esté bloqueado
5. Simula refund → incrementa a 1

**Output esperado:**
```
✓ User: credit_test_1708 (ID: <uuid>)
✓ Current Credits: 50
✓ Current Plan: prueba

🔧 Setting credits to 5 for testing...

💬 Simulating 5 messages...
  Message 1: Attempting to deduct credit...
    ✓ Remaining: 4
  Message 2: Attempting to deduct credit...
    ✓ Remaining: 3
  ... (until 0)

✅ Correct: Credits are now 0 (should be blocked)
💰 Simulating refund...
✓ Credits after refund: 1
✅ Correct: Credit refunded

✅ All Credit Tests Passed!
```

---

### Test 3: Anti-Thundering Herd (Semáforo)

```bash
./test_semaphore.sh
```

**Lo que hace:**
1. Configura semáforo a 2 conexiones máximo
2. Crea 6 usuarios
3. **Reinicia Docker** para ver el stagger
4. Captura logs de inicialización

**Output esperado:**
```
Processing chunk 1/2 (3 users)...
Auto-starting session for user: semaphore_test_1708_1
Auto-starting session for user: semaphore_test_1708_2
Auto-starting session for user: semaphore_test_1708_3
Waiting 1000ms before next chunk...

Processing chunk 2/2 (3 users)...
Auto-starting session for user: semaphore_test_1708_4
Auto-starting session for user: semaphore_test_1708_5
Auto-starting session for user: semaphore_test_1708_6
```

---

### Test 4: Mensajes de Error por Plan

```bash
./test_plan_errors.sh
```

**Lo que hace:**
- Crea 4 usuarios con diferentes estados problemáticos:
  1. Sin API Key
  2. Plan Infinito sin custom key
  3. Sin créditos
  4. Trial expirado

**Output esperado:**
```
Created test users (IDs for reference):
  User 1: <uuid> (no_key_1708) - Test missing API key
  User 2: <uuid> (infinito_no_key_1708) - Test BYOK requirement
  User 3: <uuid> (no_credits_1708) - Test zero credits
  User 4: <uuid> (expired_trial_1708) - Test expired trial

✅ To validate these tests, you need to:
  1. Connect one of these users to WhatsApp
  2. Send a message
  3. Check if the bot responds with the expected error message
```

---

## Paso 4: Monitorea los logs en vivo

Mientras ejecutas pruebas, abre otra terminal y vigila:

```bash
docker compose logs -f server | grep -E "(Plan|Credit|Semaphore|Error|ERROR)"
```

---

## 🎯 Checklist de Validación

| Test | Comando | Expected | Status |
|------|---------|----------|--------|
| Módulos cargan | `./RUN_ALL_TESTS.sh` → `quick` | ✅ sin errores | 🔄 |
| Registro automático | `./test_plan_registration.sh` | Admin + Trial | 🔄 |
| Créditos decrementan | `./test_credit_system.sh` | 5→4→3→...→0 | 🔄 |
| Bloqueo a 0 créditos | `./test_credit_system.sh` | Bloqueado | 🔄 |
| Refund en error | `./test_credit_system.sh` | 0→1 | 🔄 |
| Semáforo activo | `./test_semaphore.sh` | 2 conexiones max | 🔄 |
| Errores amigables | `./test_plan_errors.sh` | Mensajes claros | 🔄 |

---

## 🔍 Debugging Rápido

Si algo falla:

```bash
# Ver estado de usuarios
docker compose exec postgres psql -U postgres -d autobot -c \
  "SELECT username, \"planType\", \"remainingCredits\", \"monthlyLimit\" FROM \"User\" LIMIT 10;"

# Ver logs relevantes
docker compose logs server -n 100 | grep -iE "(plan|credit|error)"

# Limpiar (opcional)
docker compose exec postgres psql -U postgres -d autobot -c \
  "DELETE FROM \"User\" WHERE username LIKE '%test_%';"
```

---

## ✅ Una vez validado todo:

1. **Commit a Git:**
   ```bash
   git add -A
   git commit -m "feat: implement plan system, credits, and anti-thundering-herd"
   git push origin main
   ```

2. **Documenta lo que funciona:**
   - [x] Plans (Trial, Starter, Infinito, Business)
   - [x] Credits (deduction, blocking, refund)
   - [x] BYOK (Bring Your Own Key)
   - [x] Semaphore (max 2-3 conexiones paralelas)
   - [x] Errores amigables

3. **Próximos pasos:**
   - [ ] Reset mensual de créditos (scheduler)
   - [ ] UI en dashboard para mostrar créditos
   - [ ] Paywall/checkout para planes
   - [ ] Monitoreo de IP bans en WhatsApp

---

**¿Listo para empezar?**

```bash
cd /home/bryansgue/Wabix
./RUN_ALL_TESTS.sh
```

Presiona `quick` o un número (1-4) para cada test. 🚀
