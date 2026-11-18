.PHONY: dev dev-core dev-ingest dev-web install test test-core test-ingest test-web build-image

# The web app proxies to the Rust service on this port (RUST_BACKEND_URL default).
CORE_PORT ?= 8088
INGEST_PORT ?= 8090

# Run the Rust service, Go ingestion service, and Next.js web app together; Ctrl-C stops all.
dev:
	python3 scripts/dev.py

doctor:
	python3 scripts/doctor.py

infra-up:
	docker compose -f deploy/local/compose.yaml up -d --wait db

mcp-test:
	cargo build --bin platform-mcp
	python3 scripts/test-mcp.py target/debug/platform-mcp

platform-test:
	@test -n "$(TEST_DATABASE_URL)" || (echo "Set TEST_DATABASE_URL to the disposable nexus_platform_test database"; exit 1)
	cargo test --workspace --locked -- --ignored

k8s-verify:
	bash scripts/k8s-verify.sh

dev-core:
	HOST=127.0.0.1 PORT=$(CORE_PORT) GO_INGEST_URL=http://127.0.0.1:$(INGEST_PORT) cargo run --bin platform-core

dev-ingest:
	cd services/ingest && INGEST_HOST=127.0.0.1 INGEST_PORT=$(INGEST_PORT) go run .

dev-web:
	npm --prefix apps/web run dev

install:
	npm --prefix apps/web ci

test: test-core test-ingest test-web

test-core:
	cargo test --workspace

test-ingest:
	cd services/ingest && go test -v ./...

test-web:
	npm --prefix apps/web test

build-image:
	docker build -f Dockerfile -t nexus-platform:verify -t nexus-integration:latest .

ops-up:
	docker compose -f deploy/observability/compose.yaml up -d

ops-down:
	docker compose -f deploy/observability/compose.yaml down

ops-test:
	docker run --rm --entrypoint promtool -v "$(CURDIR)/deploy/observability:/rules:ro" -w /rules prom/prometheus:v3.2.1 test rules alerts-test.yml
