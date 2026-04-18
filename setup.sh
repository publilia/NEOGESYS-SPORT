#!/usr/bin/env bash
# ============================================================
# NEOGESYS SPORT - Setup Linux/Mac
# Non richiede build di immagini - usa solo immagini pre-compilate
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  NEOGESYS SPORT - Setup"
echo "============================================================"
echo ""

info "[1/3] Verifica Docker..."
docker info &>/dev/null || err "Docker non trovato o non avviato."
ok "Docker attivo"

info "[2/3] Avvio servizi (primo avvio: 2-3 minuti per pnpm install)..."
docker compose up -d
ok "Container avviati"

info "[3/3] Attendo che l'API sia pronta..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/health &>/dev/null; then
    ok "API pronta"
    break
  fi
  if [ $i -eq 60 ]; then
    err "API non risponde dopo 5 minuti. Controlla: docker compose logs api"
  fi
  echo "      ... ancora in avvio ($i/60)"
  sleep 5
done

echo ""
echo "============================================================"
echo "  NEOGESYS SPORT è pronto!"
echo "============================================================"
echo ""
echo "  URLS:"
echo "    Gestionale:     http://localhost:3000"
echo "    Admin Platform: http://localhost:3001"
echo "    API:            http://localhost:4000/health"
echo "    Demo HTML:      http://localhost:8080"
echo "    MinIO Console:  http://localhost:9001"
echo ""
echo "  CREDENZIALI:"
echo "    Super Admin:  superadmin@neogesys.sport / SuperAdmin2026!"
echo "    Admin ASD:    admin@demo-asd.sport      / Admin2026!"
echo "    Segreteria:   segreteria@demo-asd.sport / Admin2026!"
echo "    Contabile:    contabile@demo-asd.sport  / Admin2026!"
echo "    Istruttore:   istruttore@demo-asd.sport / Admin2026!"
echo "    Atleta:       atleta@demo-asd.sport     / Admin2026!"
echo ""
echo "  COMANDI:"
echo "    Log live:     docker compose logs -f"
echo "    Ferma tutto:  docker compose down"
echo "    Reset DB:     docker compose down -v && bash setup.sh"
echo "============================================================"
echo ""
