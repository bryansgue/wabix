#!/bin/bash
# =============================================================================
# 🧪 test_semaphore.sh
# Prueba: Semáforo de conexiones paralelas (Anti-Thundering Herd)
# =============================================================================

set -e

API_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Connection Semaphore (Anti-Thundering Herd)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Set environment variables for testing
echo ""
echo "🔧 Configuring Semaphore..."
export MAX_PARALLEL_WA_CONNECT=2
export SESSION_RESTORE_BATCH_SIZE=3
export SESSION_RESTORE_DELAY_MS=1000
export SESSION_START_BASE_DELAY_MS=300
export SESSION_START_JITTER_MS=500

echo "✓ MAX_PARALLEL_WA_CONNECT=$MAX_PARALLEL_WA_CONNECT"
echo "✓ SESSION_RESTORE_BATCH_SIZE=$SESSION_RESTORE_BATCH_SIZE"
echo "✓ SESSION_RESTORE_DELAY_MS=$SESSION_RESTORE_DELAY_MS"
echo "✓ SESSION_START_BASE_DELAY_MS=$SESSION_START_BASE_DELAY_MS"
echo "✓ SESSION_START_JITTER_MS=$SESSION_START_JITTER_MS"

# 2. Create 6 test users
echo ""
echo "📝 Creating 6 test users..."
for i in {1..6}; do
  USERNAME="semaphore_test_${TIMESTAMP}_$i"
  curl -s -X POST $API_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"test123\"}" > /dev/null
  echo "  ✓ Created: $USERNAME"
done

# 3. Check count in DB
echo ""
echo "📊 Verifying users in database..."
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
  "SELECT COUNT(*) FROM \"User\" WHERE username LIKE '%semaphore_test_${TIMESTAMP}%';")

echo "✓ Total test users: $(echo $USER_COUNT | tr -d ' ')"

# 4. Restart server with new env vars to see staggering
echo ""
echo "🔄 Restarting server with new environment..."
docker compose down
sleep 2

# Set env vars in .env or pass via docker-compose
export MAX_PARALLEL_WA_CONNECT=2
export SESSION_RESTORE_BATCH_SIZE=3
export SESSION_RESTORE_DELAY_MS=1000

docker compose up -d

echo "⏳ Waiting for server to start..."
sleep 5

# 5. Capture logs
echo ""
echo "📜 Capturing initialization logs (next 15 seconds)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

timeout 15 docker compose logs --follow server 2>/dev/null | grep -E "(Processing chunk|Waiting|Auto-starting|startSession|ConnectionSemaphore|acquir|release)" &
LOGS_PID=$!

sleep 20
kill $LOGS_PID 2>/dev/null || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 6. Validate staggering logic
echo ""
echo "✅ Validation Checklist:"
echo ""
echo "  ☐ Only 2 users connect in parallel (MAX_PARALLEL_WA_CONNECT=2)"
echo "  ☐ Batch 1: users 1-3 start, wait 1000ms"
echo "  ☐ Batch 2: users 4-6 start"
echo "  ☐ Each user has 300-800ms delay (BASE + JITTER)"
echo ""

echo "📝 Manual check: Look for logs like:"
echo "  [SessionManager] Auto-starting session for user: X"
echo "  [SessionManager] Processing chunk 1/2 (3 users)..."
echo "  [SessionManager] Waiting 1000ms before next chunk..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
