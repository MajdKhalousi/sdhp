#!/bin/sh
# ─────────────────────────────────────────────────────────────
# SDHP — PostgreSQL restore script
# Usage: ./docker/scripts/restore.sh /path/to/sdhp_YYYYMMDD_HHMMSS.pgdump
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_FILE="${1:-}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sdhp}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.pgdump>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo ""
echo "  WARNING: This will DROP and recreate the '$POSTGRES_DB' database."
echo "  All current data will be permanently lost."
echo "  Backup file: $BACKUP_FILE"
echo ""
printf "  Type 'yes' to confirm: "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Dropping existing database..."
docker exec sdhp_postgres psql \
  -U "$POSTGRES_USER" \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" postgres

docker exec sdhp_postgres psql \
  -U "$POSTGRES_USER" \
  -c "CREATE DATABASE $POSTGRES_DB;" postgres

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring from $BACKUP_FILE..."
docker exec -i sdhp_postgres pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --format=custom \
  < "$BACKUP_FILE"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restore complete."
echo ""
echo "  Next steps:"
echo "  1. Restart the API:  docker restart sdhp_api"
echo "  2. Verify the app is working correctly."
