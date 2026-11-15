#!/bin/sh
set -eu

pids=""
cleanup() { kill $pids 2>/dev/null || true; }
trap cleanup EXIT
shutdown() {
    trap '' TERM INT
    cleanup
    for pid in $pids; do wait "$pid" 2>/dev/null || true; done
    exit 0
}
trap shutdown TERM INT

echo "[nexus-entrypoint] Starting distributor ingestion on :8090"
INGEST_HOST=127.0.0.1 INGEST_PORT=8090 /usr/local/bin/nexus-ingest &
pids="$pids $!"

echo "[nexus-entrypoint] Starting platform core on :8088"
HOST=127.0.0.1 PORT=8088 GO_INGEST_URL=http://127.0.0.1:8090 /usr/local/bin/platform-core &
pids="$pids $!"

cd /app/apps/web
export RUST_BACKEND_URL="http://127.0.0.1:8088"
export GO_INGEST_URL="http://127.0.0.1:8090"
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"
echo "[nexus-entrypoint] Starting workspace on :$PORT"
node server.js &
pids="$pids $!"

# Stop the container if any service exits, so the host can restart the full stack.
while :; do
    for pid in $pids; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "[nexus-entrypoint] A service exited; stopping the container." >&2
            exit 1
        fi
    done
    sleep 2 &
    wait $! || true
done
