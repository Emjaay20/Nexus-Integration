# syntax=docker/dockerfile:1.7
FROM golang:1.22-bookworm AS go-builder
WORKDIR /go/src/ingest
COPY services/ingest/go.mod ./
COPY services/ingest/*.go ./
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /usr/local/bin/nexus-ingest .

FROM rust:bookworm AS rust-builder
WORKDIR /usr/src/nexus
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN --mount=type=cache,target=/usr/local/cargo/registry --mount=type=cache,target=/usr/src/nexus/target cargo build --release --locked --workspace --bins && cp target/release/platform-core target/release/platform-cli target/release/platform-mcp /usr/local/bin/

FROM node:22-bookworm-slim AS web-builder
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY apps/web ./
ENV NEXT_TELEMETRY_DISABLED=1 AUTH_SECRET="nexus-build-placeholder-secret-32-chars" NEXTAUTH_SECRET="nexus-build-placeholder-secret-32-chars" DATABASE_URL="postgresql://app:app@localhost:5432/app"
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ARG VCS_REF=unknown
LABEL org.opencontainers.image.revision=$VCS_REF
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=go-builder /usr/local/bin/nexus-ingest /usr/local/bin/nexus-ingest
COPY --from=rust-builder /usr/local/bin/platform-core /usr/local/bin/platform-cli /usr/local/bin/platform-mcp /usr/local/bin/
COPY --from=web-builder --chown=node:node /app/apps/web/.next/standalone /app/apps/web
COPY --from=web-builder --chown=node:node /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=web-builder --chown=node:node /app/apps/web/public /app/apps/web/public
COPY deploy/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENV NODE_ENV=production PORT=3000 RUST_BACKEND_URL=http://127.0.0.1:8088 GO_INGEST_URL=http://127.0.0.1:8090 RUST_LOG=info
USER node
HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=3 CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
