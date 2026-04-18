@echo off
REM ============================================================
REM NEOGESYS SPORT - Setup Windows (Docker Desktop)
REM Non richiede build di immagini - usa solo immagini pre-compilate
REM ============================================================

echo.
echo ============================================================
echo   NEOGESYS SPORT - Setup Windows
echo ============================================================
echo.

REM ─── Verifica Docker ───────────────────────────────────────
echo [1/3] Verifica Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERRORE: Docker Desktop non trovato o non avviato.
    echo.
    echo 1. Scarica Docker Desktop: https://www.docker.com/products/docker-desktop
    echo 2. Avvialo e attendi che l'icona nella tray diventi verde
    echo 3. Riesegui questo script
    echo.
    pause
    exit /b 1
)
echo       OK - Docker Desktop attivo
echo.

REM ─── Avvia tutti i servizi ─────────────────────────────────
echo [2/3] Avvio servizi (primo avvio: 2-3 minuti)...
echo       Scarico immagini Docker e installo dipendenze Node...
echo.
docker compose up -d
if errorlevel 1 (
    echo ERRORE: Avvio fallito. Controlla i log sopra.
    pause
    exit /b 1
)
echo.
echo       OK - Container avviati
echo.

REM ─── Attendi che tutto sia pronto ──────────────────────────
echo [3/3] Attendo che API e frontend siano pronti...
echo       (pnpm install al primo avvio richiede ~2 minuti)
echo.

set /a retries=0
:wait_ready
timeout /t 5 /nobreak >nul
curl -sf http://localhost:4000/health >nul 2>&1
if errorlevel 1 (
    set /a retries+=1
    if %retries% GEQ 60 (
        echo ERRORE: API non risponde dopo 5 minuti.
        echo Verifica con: docker compose logs api
        pause
        exit /b 1
    )
    echo       ... ancora in avvio ^(%retries%/60^)
    goto wait_ready
)
echo       OK - API pronta

echo.
echo ============================================================
echo  NEOGESYS SPORT avviato con successo!
echo ============================================================
echo.
echo  URLS:
echo    Gestionale:        http://localhost:3000
echo    Admin Platform:    http://localhost:3001
echo    API:               http://localhost:4000/health
echo    Demo HTML:         http://localhost:8080
echo    MinIO Console:     http://localhost:9001
echo.
echo  CREDENZIALI DEMO:
echo    Super Admin:   superadmin@neogesys.sport / SuperAdmin2026!
echo    Admin ASD:     admin@demo-asd.sport      / Admin2026!
echo    Segreteria:    segreteria@demo-asd.sport  / Admin2026!
echo    Contabile:     contabile@demo-asd.sport   / Admin2026!
echo    Istruttore:    istruttore@demo-asd.sport  / Admin2026!
echo    Atleta:        atleta@demo-asd.sport      / Admin2026!
echo.
echo  COMANDI UTILI:
echo    Log live:          docker compose logs -f
echo    Ferma tutto:       docker compose down
echo    Reset completo:    docker compose down -v ^&^& setup.bat
echo ============================================================
echo.
pause
