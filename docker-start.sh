#!/usr/bin/env bash
set -e

ENV_FILE=".env"

# Extract existing HOST_PORT if present
if [ -f "$ENV_FILE" ]; then
  HOST_PORT=$(grep -E '^HOST_PORT=' "$ENV_FILE" | cut -d '=' -f2 | tr -d ' "')
fi

# Generate random port between 10000 and 60000 if not set
if [ -z "$HOST_PORT" ]; then
  HOST_PORT=$((10000 + RANDOM % 50000))
  echo "HOST_PORT=$HOST_PORT" >> "$ENV_FILE"
  echo "Assigned random HOST_PORT: $HOST_PORT"
else
  echo "Using configured HOST_PORT: $HOST_PORT"
fi

export HOST_PORT

echo "Starting Docker containers with Cloudflare Tunnel..."
docker compose up -d --build

echo "Waiting for Cloudflare Tunnel to initialize..."
sleep 5

echo "=== CLOUDFLARE TUNNEL URL ==="
docker compose logs tunnel | grep -Eo 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | tail -n 1 || true
docker compose ps
echo "============================="
echo "Local Access: http://localhost:$HOST_PORT"

