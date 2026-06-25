#!/bin/sh
set -e

# Defensive, idempotent regeneration — guards against the Prisma Client
# ever being stale or mismatched for this container's actual runtime,
# regardless of what happened at build time. Cheap no-op when already
# correct. `set -e` above means a failure here stops the container with
# Prisma's own error output (no secrets are printed by this command).
echo "[entrypoint] Ensuring Prisma Client is generated..."
/app/node_modules/.bin/prisma generate
echo "[entrypoint] Prisma Client ready."

echo "[entrypoint] Running database migrations..."
/app/node_modules/.bin/prisma migrate deploy
echo "[entrypoint] Migrations applied. Starting API server..."

exec node dist/src/main.js
