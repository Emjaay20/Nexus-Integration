# syntax=docker/dockerfile:1.4
# Multi-stage build; cargo-chef caches the dependency layer between builds.

# Stage 1: Cargo Chef Planner
FROM rust:1.80-bullseye AS chef
RUN cargo install cargo-chef
WORKDIR /app

# Stage 2: Recipe Generator
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Dependency Cacher & Builder
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Cook dependencies only - this layer is cached unless Cargo.lock/Cargo.toml changes
RUN cargo chef cook --release --recipe-path recipe.json

# Build the real application binaries
COPY . .
RUN cargo build --release --bin platform-core --bin platform-cli

# Stage 4: Minimal Production Distroless Runtime
FROM gcr.io/distroless/cc-debian12 AS runtime
WORKDIR /app

COPY --from=builder /app/target/release/platform-core /usr/local/bin/platform-core
COPY --from=builder /app/target/release/platform-cli /usr/local/bin/platform-cli

ENV HOST=0.0.0.0 \
    PORT=8080 \
    RUST_LOG=info,nexus_platform_core=debug

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/platform-core"]
