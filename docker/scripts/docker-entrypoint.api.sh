#!/bin/sh
set -e

echo "[entrypoint] Starting API server..."

exec node dist/src/main.js
