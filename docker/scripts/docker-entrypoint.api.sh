#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
/app/node_modules/.bin/prisma migrate deploy
echo "[entrypoint] Migrations applied. Starting API server..."

exec node dist/src/main.js
