#!/bin/bash
# =============================================================================
# 🧪 test_plan_registration.sh
# Prueba: Registro con planes automáticos (Admin, Trial)
# =============================================================================

set -e

TIMESTAMP=$(date +%s)
API_URL="http://localhost:3000/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Plan Registration & Auto-Assign"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Register first user (should be Admin)
echo ""
echo "📝 Registering First User (Should be Admin)..."
ADMIN_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin_auto_$TIMESTAMP\",\"password\":\"admin123\"}")

ADMIN_ID=$(echo $ADMIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")
ADMIN_ROLE=$(echo $ADMIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('role', ''))" 2>/dev/null || echo "")

echo "Response: $ADMIN_RESPONSE" | jq . 2>/dev/null || echo "$ADMIN_RESPONSE"
echo "✓ Admin ID: $ADMIN_ID"
echo "✓ Admin Role: $ADMIN_ROLE (expected: 'admin')"

if [ "$ADMIN_ROLE" != "admin" ]; then
  echo "❌ FAIL: First user should be admin!"
  exit 1
fi

# 2. Register second user (should be Trial)
echo ""
echo "📝 Registering Second User (Should be Trial)..."
TRIAL_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"trial_auto_$TIMESTAMP\",\"password\":\"user123\"}")

TRIAL_ID=$(echo $TRIAL_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")
TRIAL_ROLE=$(echo $TRIAL_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('role', ''))" 2>/dev/null || echo "")

echo "Response: $TRIAL_RESPONSE" | jq . 2>/dev/null || echo "$TRIAL_RESPONSE"
echo "✓ Trial ID: $TRIAL_ID"
echo "✓ Trial Role: $TRIAL_ROLE (expected: not 'admin')"

# 3. Verify in database
echo ""
echo "📊 Verifying in Database..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "SELECT id, username, role, \"planType\", \"remainingCredits\", \"monthlyLimit\", \"expiresAt\" FROM \"User\" WHERE username LIKE '%auto_$TIMESTAMP%';"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Completed Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
