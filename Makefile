.PHONY: dev dev-core dev-web install test test-core test-web build-image

# The web app proxies to the Rust service on this port (RUST_BACKEND_URL default).
CORE_PORT ?= 8088

# Run the Rust service and the web app together; Ctrl-C stops both.
dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) dev-core & \
	$(MAKE) dev-web & \
	wait

dev-core:
	PORT=$(CORE_PORT) cargo run --bin platform-core

dev-web:
	npm --prefix apps/web run dev

install:
	npm --prefix apps/web ci

test: test-core test-web

test-core:
	cargo test --workspace

test-web:
	npm --prefix apps/web test

build-image:
	docker build -f deploy/docker/Dockerfile -t platform-core:dev .
