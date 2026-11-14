# syntax=docker/dockerfile:1.4
# Multi-stage build for Rust Platform Core standalone container

FROM rust:bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build --release --locked --bin platform-core --bin platform-cli

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/target/release/platform-core /usr/local/bin/platform-core
COPY --from=builder /app/target/release/platform-cli /usr/local/bin/platform-cli

ENV HOST=0.0.0.0 \
    PORT=8088 \
    RUST_LOG=info,nexus_platform_core=debug

EXPOSE 8088

ENTRYPOINT ["/usr/local/bin/platform-core"]
