#!/usr/bin/env bash
# Avvia tutto in modalità sviluppo (no Docker build necessario)
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

cd "$(dirname "$0")"

info "Avvio infrastruttura Docker (DB, Redis, MinIO, Demo)..."
docker compose up -d postgres redis minio demo

info "Attendo PostgreSQL..."
until docker compose exec -T postgres pg_isready -U neogesys -d neogesys_sport &>/dev/null; do sleep 2; done
ok "PostgreSQL pronto"

info "Avvio API (porta 4000)..."
export DATABASE_URL=postgresql://neogesys:neogesys_dev@localhost:5432/neogesys_sport
export REDIS_URL=redis://localhost:6379
export BETTER_AUTH_SECRET=dev_secret_change_in_production_32chars
export VAULT_KEY=0000000000000000000000000000000000000000000000000000000000000000
export ANTHROPIC_API_KEY=sk-ant-placeholder
export NODE_ENV=development
export PORT=4000
nohup pnpm --filter @neogesys/api dev > /tmp/neogesys-api.log 2>&1 &
API_PID=$!

info "Attendo API..."
until curl -sf http://localhost:4000/health &>/dev/null; do sleep 2; done
ok "API pronta (PID $API_PID)"

info "Avvio Web gestionale (porta 3000)..."
export NEXT_PUBLIC_API_URL=http://localhost:4000
export NEXT_PUBLIC_APP_URL=http://localhost:3000
nohup pnpm --filter @neogesys/web dev > /tmp/neogesys-web.log 2>&1 &
WEB_PID=$!

info "Avvio Admin piattaforma (porta 3001)..."
export NEXT_PUBLIC_APP_URL=http://localhost:3001
nohup pnpm --filter @neogesys/admin dev > /tmp/neogesys-admin.log 2>&1 &
ADMIN_PID=$!

info "Attendo Web e Admin..."
until curl -sf -o /dev/null http://localhost:3000 2>/dev/null && curl -sf -o /dev/null http://localhost:3001 2>/dev/null; do sleep 3; done
ok "Web pronta (PID $WEB_PID) | Admin pronta (PID $ADMIN_PID)"

echo ""
echo "  =============================================="
echo "  NEOGESYS SPORT è pronto!"
echo "  =============================================="
echo ""
echo "  URLS:"
echo "    Web gestionale: http://localhost:3000"
echo "    Admin platform: http://localhost:3001"
echo "    API:            http://localhost:4000/health"
echo "    Demo HTML:      http://localhost:8080"
echo "    MinIO:          http://localhost:9001"
echo ""
echo "  CREDENZIALI:"
echo "    Super Admin:  superadmin@neogesys.sport / SuperAdmin2026!"
echo "    Admin ASD:    admin@demo-asd.sport / Admin2026!"
echo "    Segreteria:   segreteria@demo-asd.sport / Admin2026!"
echo ""
echo "  LOG LIVE:"
echo "    API:   tail -f /tmp/neogesys-api.log"
echo "    Web:   tail -f /tmp/neogesys-web.log"
echo "    Admin: tail -f /tmp/neogesys-admin.log"
echo "  =============================================="
