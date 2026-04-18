@echo off
REM ============================================================
REM NEOGESYS SPORT - Setup Windows (Docker Desktop)
REM Esegui come Amministratore
REM ============================================================

echo.
echo  ███╗   ██╗███████╗ ██████╗  ██████╗ ███████╗███████╗██╗   ██╗███████╗
echo  ████╗  ██║██╔════╝██╔═══██╗██╔════╝ ██╔════╝██╔════╝╚██╗ ██╔╝██╔════╝
echo  ██╔██╗ ██║█████╗  ██║   ██║██║  ███╗█████╗  ███████╗ ╚████╔╝ ███████╗
echo  ██║╚██╗██║██╔══╝  ██║   ██║██║   ██║██╔══╝  ╚════██║  ╚██╔╝  ╚════██║
echo  ██║ ╚████║███████╗╚██████╔╝╚██████╔╝███████╗███████║   ██║   ███████║
echo  ╚═╝  ╚═══╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚══════╝
echo.
echo                          SPORT PLATFORM v1.0
echo ============================================================
echo.

REM ─── Verifica Docker ───────────────────────────────────────
echo [1/5] Verifica Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERRORE: Docker Desktop non trovato o non avviato.
    echo Scarica Docker Desktop da: https://www.docker.com/products/docker-desktop
    echo Dopo l'installazione, riavvia e riesegui questo script.
    pause
    exit /b 1
)
echo       OK - Docker Desktop attivo

REM ─── Copia env ─────────────────────────────────────────────
echo [2/5] Configurazione environment...
if not exist .env.docker (
    echo ERRORE: File .env.docker non trovato.
    echo Assicurati di essere nella cartella NEOGESYS-SPORT
    pause
    exit /b 1
)
echo       OK - .env.docker trovato

REM ─── Build immagini ────────────────────────────────────────
echo [3/5] Build immagini Docker (primo avvio: 5-10 minuti)...
docker compose build --parallel
if errorlevel 1 (
    echo ERRORE: Build fallita. Controlla i log sopra.
    pause
    exit /b 1
)
echo       OK - Immagini costruite

REM ─── Avvia servizi infrastruttura ──────────────────────────
echo [4/5] Avvio database e servizi...
docker compose up -d postgres redis minio
echo       Attendo che PostgreSQL sia pronto...
:wait_pg
docker compose exec postgres pg_isready -U neogesys -d neogesys_sport >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_pg
)
echo       OK - PostgreSQL pronto

REM ─── Avvia app ─────────────────────────────────────────────
echo [5/5] Avvio applicazioni...
docker compose up -d
if errorlevel 1 (
    echo ERRORE: Avvio applicazioni fallito.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  NEOGESYS SPORT avviato con successo!
echo ============================================================
echo.
echo  URLS:
echo    Gestionale (web):  http://localhost:3000
echo    Admin Platform:    http://localhost:3002
echo    API:               http://localhost:4000
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
echo  Per fermare tutto: docker compose down
echo  Per vedere i log:  docker compose logs -f
echo ============================================================
echo.
pause
