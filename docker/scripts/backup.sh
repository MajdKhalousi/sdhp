#!/bin/sh
# ─────────────────────────────────────────────────────────────
# SDHP — PostgreSQL backup script
# Usage: ./docker/scripts/backup.sh
# Env vars (set in .env.production or export before running):
#   POSTGRES_USER     (default: postgres)
#   POSTGRES_DB       (default: sdhp)
#   BACKUP_DIR        (default: /var/backups/sdhp)
#   RETENTION_DAYS    (default: 30)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sdhp}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdhp}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
FILENAME="sdhp_${TIMESTAMP}.pgdump"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting backup: $FILENAME"

# pg_dump in custom format (compressed, parallel-restore-capable)
docker exec sdhp_postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  --no-password \
  > "$BACKUP_DIR/$FILENAME"

SIZE="$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup saved: $BACKUP_DIR/$FILENAME ($SIZE)"

# Verify backup is readable
docker exec -i sdhp_postgres pg_restore \
  --list \
  --format=custom \
  < "$BACKUP_DIR/$FILENAME" > /dev/null \
  && echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup integrity verified." \
  || { echo "[ERROR] Backup verification failed — file may be corrupt."; exit 1; }

# Prune old backups
PRUNED="$(find "$BACKUP_DIR" -name "sdhp_*.pgdump" -mtime "+${RETENTION_DAYS}" | wc -l)"
find "$BACKUP_DIR" -name "sdhp_*.pgdump" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruned $PRUNED backup(s) older than ${RETENTION_DAYS} days."
