.PHONY: dev dev-core dev-ingest dev-web install test test-core test-ingest test-web build-image

# The web app proxies to the Rust service on this port (RUST_BACKEND_URL default).
CORE_PORT ?= 8088
INGEST_PORT ?= 8090

# Run the Rust service, Go ingestion service, and Next.js web app together; Ctrl-C stops all.
dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) dev-ingest & \
	$(MAKE) dev-core & \
	$(MAKE) dev-web & \
	wait

dev-core:
	PORT=$(CORE_PORT) GO_INGEST_URL=http://127.0.0.1:$(INGEST_PORT) cargo run --bin platform-core

dev-ingest:
	cd services/ingest && INGEST_PORT=$(INGEST_PORT) go run .

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
	docker build -f Dockerfile -t nexus-integration:latest .
