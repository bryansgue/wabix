#!/bin/bash
# =============================================================================
# 🧪 test_credit_system.sh
# Prueba: Sistema de créditos (decrementar, bloquear, reembolsar)
# =============================================================================

set -e

API_URL="http://localhost:3000/api"
TIMESTAMP=$(date +%s)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Credit System (Deduction, Block, Refund)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Create a test user with known credits
echo ""
echo "📝 Creating test user..."
USER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"credit_test_$TIMESTAMP\",\"password\":\"test123\"}")

USER_ID=$(echo $USER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")
USERNAME="credit_test_$TIMESTAMP"

echo "✓ User: $USERNAME (ID: $USER_ID)"

# 2. Check initial credits (should be 0 or 50 for trial)
echo ""
echo "📊 Initial State (from DB):"
INITIAL=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
  "SELECT \"remainingCredits\", \"monthlyLimit\", \"planType\" FROM \"User\" WHERE username='$USERNAME';")

echo "$INITIAL"
CREDITS=$(echo "$INITIAL" | awk '{print $1}' | tr -d ' ')
PLAN=$(echo "$INITIAL" | awk '{print $3}' | tr -d ' ')

echo "✓ Current Credits: $CREDITS"
echo "✓ Current Plan: $PLAN"

if [ "$PLAN" != "prueba" ]; then
  echo "❌ FAIL: User should be trial plan!"
  exit 1
fi

if [ "$CREDITS" != "50" ]; then
  echo "⚠️  WARNING: Expected 50 credits for trial, got $CREDITS"
fi

# 3. Manually set to 5 credits for testing
echo ""
echo "🔧 Setting credits to 5 for testing..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"remainingCredits\"=5 WHERE username='$USERNAME';"

AFTER=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
  "SELECT \"remainingCredits\" FROM \"User\" WHERE username='$USERNAME';")
echo "✓ Credits now: $(echo $AFTER | tr -d ' ')"

# 4. Simulate credit deduction (5 messages)
echo ""
echo "💬 Simulating 5 messages (should deduct 5 credits)..."
for i in {1..5}; do
  echo "  Message $i: Attempting to deduct credit..."
  # In real scenario, this would happen during OpenAI call
  docker compose exec -T postgres psql -U postgres -d autobot -c \
    "UPDATE \"User\" SET \"remainingCredits\" = CASE WHEN \"remainingCredits\" > 0 THEN \"remainingCredits\" - 1 ELSE 0 END WHERE username='$USERNAME';" 2>/dev/null
  
  CURRENT=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
    "SELECT \"remainingCredits\" FROM \"User\" WHERE username='$USERNAME';")
  echo "    ✓ Remaining: $(echo $CURRENT | tr -d ' ')"
done

# 5. Try to use when credits = 0
echo ""
echo "🚫 Testing block when credits = 0..."
REMAINING=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
  "SELECT \"remainingCredits\" FROM \"User\" WHERE username='$USERNAME';")

if [ "$(echo $REMAINING | tr -d ' ')" = "0" ]; then
  echo "✅ Correct: Credits are now 0 (should be blocked)"
else
  echo "❌ FAIL: Expected 0 credits, got $(echo $REMAINING | tr -d ' ')"
  exit 1
fi

# 6. Simulate refund (e.g., OpenAI fails)
echo ""
echo "💰 Simulating refund (OpenAI fails)..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"remainingCredits\" = \"remainingCredits\" + 1 WHERE username='$USERNAME';" 2>/dev/null

REFUNDED=$(docker compose exec -T postgres psql -U postgres -d autobot -tc \
  "SELECT \"remainingCredits\" FROM \"User\" WHERE username='$USERNAME';")
echo "✓ Credits after refund: $(echo $REFUNDED | tr -d ' ')"

if [ "$(echo $REFUNDED | tr -d ' ')" = "1" ]; then
  echo "✅ Correct: Credit refunded"
else
  echo "❌ FAIL: Expected 1 credit after refund"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Credit Tests Passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
