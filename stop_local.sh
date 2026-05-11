#!/usr/bin/env bash
# ============================================================
#  Clinova — Stop All Local Services
# ============================================================
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.local.pids"

if [ ! -f "$PID_FILE" ]; then
  echo "No .local.pids file found. Nothing to stop."
  exit 0
fi

echo "Stopping Clinova local services..."
while read -r pid; do
  if kill "$pid" 2>/dev/null; then
    echo "  ✓ Killed PID $pid"
  else
    echo "  ✗ PID $pid already stopped"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"

# Also kill any stray uvicorn / nest processes on our ports
for port in 8001 8002 8003 8004 8005 3000 3001; do
  pid=$(lsof -ti tcp:"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "  ✓ Freed port $port (PID $pid)"
  fi
done

echo "Done. All services stopped."
