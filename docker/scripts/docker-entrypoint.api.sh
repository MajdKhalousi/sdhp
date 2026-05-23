#!/bin/sh
# API entrypoint: run Prisma migrations then start the NestJS server.
set -e

echo "[entrypoint] Running database migrations..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting API server..."
exec node dist/main
