#!/bin/sh
set -e

echo "[nexus-entrypoint] Starting Go distributor ingestion service on :8090..."
INGEST_PORT=8090 /usr/local/bin/nexus-ingest &

echo "[nexus-entrypoint] Starting Rust Platform Core (actix-web) on :8088..."
HOST=127.0.0.1 PORT=8088 GO_INGEST_URL=http://127.0.0.1:8090 /usr/local/bin/platform-core &

echo "[nexus-entrypoint] Starting Next.js 16 application on :${PORT:-3000}..."
cd /app/apps/web
export RUST_BACKEND_URL="http://127.0.0.1:8088"
export GO_INGEST_URL="http://127.0.0.1:8090"
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"

exec npm start
