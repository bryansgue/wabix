# 🧠 Plan de Implementación: Bot Inteligente "Smart Pause"

Este documento detalla la arquitectura para convertir el sistema binario ON/OFF en un sistema de gestión de estados inteligente basado en tiempo.

## 1. Análisis y Objetivos

**Objetivo:** Permitir que el bot gestione pausas temporales y se reactive automáticamente, mejorando la experiencia de intervención humana.

**Requerimientos Clave:**
- **Intervención Manual:** Al escribir, pausar por 10 min.
- **Smart Keep-Alive:** Si se sigue escribiendo, reiniciar contador de 10 min.
- **Comandos Granulares:** `!off 30` pausa por 30 mins.
- **Persistencia:** Sobrevivir a reinicios del servidor.

## 2. Nueva Arquitectura de Estados

El bot tendrá 3 estados lógicos efectivos:

| Estado | Condición Técnica | Comportamiento |
|--------|----------------------|----------------|
| **🟢 ACTIVO** | `isBotPaused = false` Y `botPausedUntil < NOW` | Bot responde automáticamente. |
| **🟡 PAUSA TEMPORAL** | `isBotPaused = false` Y `botPausedUntil > NOW` | Bot en silencio. Contador visible. **Se reactiva autom.** |
| **🔴 APAGADO TOTAL** | `isBotPaused = true` | Bot en silencio indefinido. **No expira.** |

## 3. Cambios en Base de Datos (Prisma)

Modificar tabla `Client` para soportar temporizadores.

```prisma
model Client {
  // ... campos existentes
  isBotPaused    Boolean   @default(false) // Mantiene la función de "Apagado Total"
  botPausedUntil DateTime? // Nuevo: Fecha/Hora de reactivación automática
}
```

## 4. Lógica de Backend (Servicios)

### A. StoreService (`store.service.js`)
Actualizar método `setSilence`:
- Nueva firma: `setSilence(chatId, type, durationMinutes?)`
- `type`: 'PERMANENT' | 'TEMPORARY' | 'OFF'
- Lógica:
  - Si es 'TEMPORARY', calcular `botPausedUntil = NOW + duration`.
  - Si es 'PERMANENT', set `isBotPaused = true`, `botPausedUntil = null`.

### B. ApiController (`api.controller.js`)
- En `sendManualMessage`:
  - Solo si *NO* está en bloqueo permanente (`!isBotPaused`):
  - Llamar `setSilence(chatId, 'TEMPORARY', 10)`
  - Esto implementa el **"Smart Keep-Alive"**: cada mensaje manual empuja la reactivación 10 minutos hacia el futuro.

### C. WhatsAppService (`whatsapp.service.js`)
- **Filtro de Mensajes Entrantes:**
  ```javascript
  const now = new Date();
  const isPaused = client.isBotPaused || (client.botPausedUntil && client.botPausedUntil > now);
  if (isPaused) return; // Silencio
  ```
- **Comandos:**
  - `!off`: set 'PERMANENT'
  - `!off <número>`: set 'TEMPORARY' con duración custom.
  - `!on`: set 'OFF' (Limpia ambos campos).

## 5. Cambios en Frontend (Sugerido)
- El botón "BOT ON" puede mostrar un tooltip o subtítulo:
  - "⛔ OFF" (Rojo)
  - "⏳ 09:59" (Amarillo - Cuenta regresiva)
  - "✅ ON" (Verde)

---

## ✅ Plan de Ejecución

1.  **Schema**: Agregar columna `botPausedUntil` y migrar DB.
2.  **Backend**: Implementar lógica en `StoreService` y `WhatsAppService`.
3.  **API**: Conectar envío manual con lógica de pausa.
4.  **Verificación**: Probar flujo manual, comandos `!off` y expiración de tiempo.
