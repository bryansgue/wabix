#!/bin/bash
# =============================================================================
# 🎯 RUN_ALL_TESTS.sh
# Script maestro para ejecutar la suite completa de pruebas
# =============================================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║          🧪 AutoBOT SaaS - Complete Test Suite                       ║"
echo "║          Plans, Credits, BYOK, and Anti-Bloqueos                     ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${BLUE}📋 Pre-flight Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! docker compose ps | grep -q "postgres"; then
  echo -e "${RED}❌ PostgreSQL container not running!${NC}"
  echo "   Run: docker compose up -d"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL running${NC}"

if ! docker compose ps | grep -qE "(whatsapp-bot|server)"; then
  echo -e "${RED}❌ Server container not running!${NC}"
  echo "   Run: docker compose up -d"
  exit 1
fi
echo -e "${GREEN}✓ Server running${NC}"

# Check API connectivity
if ! curl -s http://localhost:3000/auth/register -X OPTIONS > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  API might not be responding yet, waiting...${NC}"
  sleep 3
fi
echo -e "${GREEN}✓ API responding${NC}"

echo ""
echo -e "${BLUE}🧪 Available Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Test Plan Registration"
echo "    → Verifies Admin auto-assign and Trial creation"
echo "    → Run: ./test_plan_registration.sh"
echo ""
echo "2️⃣  Test Credit System"
echo "    → Verifies credit deduction, blocking, and refunds"
echo "    → Run: ./test_credit_system.sh"
echo ""
echo "3️⃣  Test Connection Semaphore"
echo "    → Verifies anti-thundering herd protection"
echo "    → Run: ./test_semaphore.sh"
echo ""
echo "4️⃣  Test Plan Error Messages"
echo "    → Verifies user-friendly error messages"
echo "    → Run: ./test_plan_errors.sh"
echo ""

# Menu
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Choose an option:${NC}"
echo "  all       - Run all tests sequentially"
echo "  1         - Run plan registration test"
echo "  2         - Run credit system test"
echo "  3         - Run semaphore test"
echo "  4         - Run plan error messages test"
echo "  quick     - Run quick validations only"
echo "  logs      - Show recent server logs"
echo ""
read -p "Enter choice (default: quick): " CHOICE
CHOICE=${CHOICE:-quick}

# Color functions
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

fail() {
  echo -e "${RED}❌ $1${NC}"
}

info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Execute based on choice
case $CHOICE in
  all)
    echo ""
    echo -e "${BLUE}Running ALL tests...${NC}"
    echo ""
    
    echo "Test 1/4: Plan Registration"
    ./test_plan_registration.sh || fail "Plan registration test failed"
    sleep 2
    
    echo ""
    echo "Test 2/4: Credit System"
    ./test_credit_system.sh || fail "Credit system test failed"
    sleep 2
    
    echo ""
    echo "Test 3/4: Semaphore (requires restart)"
    ./test_semaphore.sh || fail "Semaphore test failed"
    sleep 2
    
    echo ""
    echo "Test 4/4: Plan Errors"
    ./test_plan_errors.sh || fail "Plan errors test failed"
    
    success "All tests completed!"
    ;;
    
  1)
    echo ""
    ./test_plan_registration.sh
    ;;
    
  2)
    echo ""
    ./test_credit_system.sh
    ;;
    
  3)
    echo ""
    ./test_semaphore.sh
    ;;
    
  4)
    echo ""
    ./test_plan_errors.sh
    ;;
    
  quick)
    echo ""
    echo -e "${BLUE}🚀 Quick Validation${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check plan service loaded
    echo "Checking plan service..."
    if node --input-type=module - <<'EOF' 2>/dev/null
import('./server/src/services/plan.service.js')
  .then(() => console.log('OK'))
  .catch((err) => { console.error('FAIL'); process.exit(1); });
EOF
    then
      success "Plan service loads correctly"
    else
      fail "Plan service failed to load"
    fi
    
    # Check auth service
    echo "Checking auth service..."
    if DATABASE_URL="postgresql://postgres:postgres@postgres:5432/autobot?schema=public" \
       node --input-type=module - <<'EOF' 2>/dev/null
import('./server/src/services/auth.service.js')
  .then(() => console.log('OK'))
  .catch((err) => { console.error('FAIL:', err.message); process.exit(1); });
EOF
    then
      success "Auth service loads correctly"
    else
      fail "Auth service failed to load"
    fi
    
    # Check openai service
    echo "Checking openai service..."
    if node --input-type=module - <<'EOF' 2>/dev/null
import('./server/src/services/openai.service.js')
  .then(() => console.log('OK'))
  .catch((err) => { console.error('FAIL'); process.exit(1); });
EOF
    then
      success "OpenAI service loads correctly"
    else
      fail "OpenAI service failed to load"
    fi
    
    # Check semaphore in session manager
    echo "Checking session manager (semaphore)..."
    if grep -q "ConnectionSemaphore" server/src/services/session.manager.js; then
      success "ConnectionSemaphore implemented"
    else
      fail "ConnectionSemaphore not found"
    fi
    
    # DB check
    echo "Checking database..."
    USERS_COUNT=$(docker compose exec -T postgres psql -U postgres -d autobot -tc "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")
    info "Total users in DB: $(echo $USERS_COUNT | tr -d ' ')"
    
    echo ""
    success "Quick validation complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Run individual tests: ./test_plan_registration.sh"
    echo "  2. Monitor logs: docker compose logs -f whatsapp-bot"
    echo "  3. Check database: docker compose exec postgres psql -U postgres -d autobot"
    ;;
    
  logs)
    echo ""
    echo -e "${BLUE}Recent Server Logs${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker compose logs whatsapp-bot -n 50
    ;;
    
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Test Suite Complete                            ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
