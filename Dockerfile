FROM rust:1.93-slim AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/
RUN cargo build --release -p scemas-server

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/scemas-server /usr/local/bin/
COPY data/ /app/data/
WORKDIR /app
ENV DEVICE_CATALOG_PATH=data/hamilton-sensor-catalog.json
CMD ["scemas-server"]
