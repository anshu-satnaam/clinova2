#!/usr/bin/env bash
# ============================================================
#  Clinova — Local Dev Startup (No Docker)
#  Launches all services as background processes
#  Logs go to: ./logs/local/<service>.log
#  Stop all: ./stop_local.sh  OR  kill $(cat .pids)
# ============================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/logs/local"
PID_FILE="$ROOT/.local.pids"
mkdir -p "$LOG_DIR"

# Wipe old PIDs
> "$PID_FILE"

# ── Load env vars ────────────────────────────────────────────
set -o allexport
source "$ROOT/.env"
set +o allexport

# Override to localhost (not docker hostnames)
export AI_SERVICE_URL=http://localhost:8001
export FHIR_SERVICE_URL=http://localhost:8002
export VOICE_SERVICE_URL=http://localhost:8003
export AUDIT_SERVICE_URL=http://localhost:8004
export CHROMA_HOST=localhost
export CHROMA_PORT=8005
export NEXT_PUBLIC_API_URL=http://localhost:3000

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        CLINOVA — Starting All Local Services             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  ChromaDB  → http://localhost:8005                       ║"
echo "║  AI        → http://localhost:8001                       ║"
echo "║  FHIR      → http://localhost:8002                       ║"
echo "║  Voice     → http://localhost:8003                       ║"
echo "║  Audit     → http://localhost:8004                       ║"
echo "║  Gateway   → http://localhost:3000                       ║"
echo "║  Frontend  → http://localhost:3001  ← open this         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

launch() {
  local name="$1"
  local log="$LOG_DIR/$name.log"
  shift
  echo "▶  $name  →  $log"
  "$@" > "$log" 2>&1 &
  echo $! >> "$PID_FILE"
  echo "   PID $!"
}

# ── 1. ChromaDB :8005 ─────────────────────────────────────────
(
  cd "$ROOT/backend/ai-service"
  source venv/bin/activate
  launch chromadb \
    chroma run --host 0.0.0.0 --port 8005 --path "$ROOT/backend/ai-service/chroma_data"
)

echo "   Waiting 5s for ChromaDB to be ready..."
sleep 5

# ── 2. AI Service :8001 ───────────────────────────────────────
(
  cd "$ROOT/backend/ai-service"
  source venv/bin/activate
  export CHROMA_HOST=localhost
  export CHROMA_PORT=8005
  launch ai-service \
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
)
sleep 2

# ── 3. FHIR Service :8002 ─────────────────────────────────────
(
  cd "$ROOT/backend/fhir-service"
  source venv/bin/activate
  launch fhir-service \
    uvicorn main:app --host 0.0.0.0 --port 8002 --reload
)
sleep 2

# ── 4. Voice Service :8003 ────────────────────────────────────
(
  cd "$ROOT/backend/voice-service"
  source venv/bin/activate
  export AI_SERVICE_URL=http://localhost:8001
  export FHIR_SERVICE_URL=http://localhost:8002
  launch voice-service \
    uvicorn main:app --host 0.0.0.0 --port 8003 --reload
)
sleep 2

# ── 5. Audit Service :8004 ────────────────────────────────────
(
  cd "$ROOT/backend/audit-service"
  source venv/bin/activate
  launch audit-service \
    uvicorn main:app --host 0.0.0.0 --port 8004 --reload
)
sleep 2

# ── 6. Gateway Service :3000 (NestJS) ─────────────────────────
(
  cd "$ROOT/backend/gateway-service"
  export NODE_ENV=development
  export AI_SERVICE_URL=http://localhost:8001
  export FHIR_SERVICE_URL=http://localhost:8002
  export VOICE_SERVICE_URL=http://localhost:8003
  export AUDIT_SERVICE_URL=http://localhost:8004
  launch gateway \
    npm run start:dev
)
sleep 3

# ── 7. Next.js Frontend :3001 ─────────────────────────────────
(
  cd "$ROOT/frontend/nextjs-app"
  export NEXT_PUBLIC_API_URL=http://localhost:3000
  launch frontend \
    npm run dev
)

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  All services started in the background."
echo "  🌐  Open: http://localhost:3001"
echo "  📋  Logs: $LOG_DIR/"
echo "  🛑  Stop: ./stop_local.sh"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Tailing all logs (Ctrl+C to detach — services keep running):"
echo ""
sleep 2
tail -f "$LOG_DIR"/*.log
