#!/usr/bin/env bash
# ============================================================
# NEOGESYS SPORT - Setup Linux/Mac
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "  NEOGESYS SPORT Platform - Setup"
echo "  ================================"
echo ""

# Check Docker
info "Verifica Docker..."
docker info &>/dev/null || err "Docker non trovato o non avviato. Avvia Docker Desktop."
ok "Docker attivo"

# Check env
info "Verifica .env.docker..."
[ -f .env.docker ] || err "File .env.docker non trovato"
ok ".env.docker presente"

# Build
info "Build immagini Docker (5-10 min al primo avvio)..."
docker compose build --parallel
ok "Immagini pronte"

# Infrastruttura
info "Avvio database, Redis, MinIO..."
docker compose up -d postgres redis minio

info "Attendo PostgreSQL..."
until docker compose exec -T postgres pg_isready -U neogesys -d neogesys_sport &>/dev/null; do
  sleep 2
done
ok "PostgreSQL pronto"

until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 2
done
ok "Redis pronto"

# Avvia tutto
info "Avvio applicazioni..."
docker compose up -d
ok "Tutti i servizi avviati"

echo ""
echo "  =============================================="
echo "  NEOGESYS SPORT è pronto!"
echo "  =============================================="
echo ""
echo "  URLS:"
echo "    Web:        http://localhost:3000"
echo "    Admin:      http://localhost:3001"
echo "    API:        http://localhost:4000/health"
echo "    Demo HTML:  http://localhost:8080"
echo "    MinIO:      http://localhost:9001"
echo ""
echo "  CREDENZIALI:"
echo "    Super Admin:  superadmin@neogesys.sport / SuperAdmin2026!"
echo "    Admin ASD:    admin@demo-asd.sport / Admin2026!"
echo "    Segreteria:   segreteria@demo-asd.sport / Admin2026!"
echo ""
echo "  COMANDI UTILI:"
echo "    Ferma tutto:  docker compose down"
echo "    Log live:     docker compose logs -f"
echo "    Reset DB:     docker compose down -v && bash setup.sh"
echo "  =============================================="
echo ""
