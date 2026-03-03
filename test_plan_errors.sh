#!/bin/bash
# =============================================================================
# 🧪 test_plan_errors.sh
# Prueba: Mensajes de error amigables según plan
# =============================================================================

set -e

API_URL="http://localhost:3000/api"
TIMESTAMP=$(date +%s)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Plan Error Messages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Case 1: No OpenAI Key
echo ""
echo "Test 1️⃣: Missing OpenAI API Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER1=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"no_key_$TIMESTAMP\",\"password\":\"test123\"}" | jq -r '.id')

echo "✓ Created user: $USER1"
echo ""
echo "Expected error message:"
echo "  ❌ Error: No se ha configurado la API Key de OpenAI."
echo ""
echo "To trigger: Send a message via WhatsApp (simulated)"

# Test Case 2: Plan Infinito without custom key
echo ""
echo "Test 2️⃣: Plan Infinito without Custom API Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER2=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"infinito_no_key_$TIMESTAMP\",\"password\":\"test123\"}" | jq -r '.id')

echo "✓ Created user: $USER2"
echo ""
echo "Changing to Infinito plan without custom key..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"planType\"='infinito' WHERE id='$USER2';"

echo ""
echo "Expected error message:"
echo "  ❌ Tu plan requiere agregar tu propia OpenAI API Key en el Dashboard."
echo ""
echo "To trigger: Send a message via WhatsApp (simulated)"

# Test Case 3: Zero credits
echo ""
echo "Test 3️⃣: Zero Credits (Starter Plan)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER3=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"no_credits_$TIMESTAMP\",\"password\":\"test123\"}" | jq -r '.id')

echo "✓ Created user: $USER3"
echo ""
echo "Changing to Starter plan with 0 credits..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"planType\"='starter', \"remainingCredits\"=0, \"monthlyLimit\"=800 WHERE id='$USER3';"

echo ""
echo "Expected error message:"
echo "  ❌ Te quedaste sin mensajes incluidos en tu plan. Actualiza o agrega una API Key propia."
echo ""
echo "To trigger: Send a message via WhatsApp (simulated)"

# Test Case 4: Trial expired
echo ""
echo "Test 4️⃣: Expired Trial Plan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER4=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"expired_trial_$TIMESTAMP\",\"password\":\"test123\"}" | jq -r '.id')

echo "✓ Created user: $USER4"
echo ""
echo "Setting expiration date to past..."
docker compose exec -T postgres psql -U postgres -d autobot -c \
  "UPDATE \"User\" SET \"expiresAt\"='2026-01-01'::timestamp WHERE id='$USER4';"

echo ""
echo "Expected error message:"
echo "  ❌ Tu prueba terminó. Contrata un plan para continuar."
echo ""
echo "To trigger: Send a message via WhatsApp (simulated)"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Created test users (IDs for reference):"
echo "  User 1: $USER1 (no_key_$TIMESTAMP) - Test missing API key"
echo "  User 2: $USER2 (infinito_no_key_$TIMESTAMP) - Test BYOK requirement"
echo "  User 3: $USER3 (no_credits_$TIMESTAMP) - Test zero credits"
echo "  User 4: $USER4 (expired_trial_$TIMESTAMP) - Test expired trial"

echo ""
echo "✅ To validate these tests, you need to:"
echo "  1. Connect one of these users to WhatsApp"
echo "  2. Send a message"
echo "  3. Check if the bot responds with the expected error message"
echo ""

echo "📜 Monitor logs with:"
echo "  docker compose logs -f server | grep -E '(Plan limit|PlanLimitError|error|Error)'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
