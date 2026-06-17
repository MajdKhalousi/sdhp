#!/bin/sh
# ─────────────────────────────────────────────────────────────
# SDHP — MinIO backup script
# Usage: ./docker/scripts/backup-minio.sh
# Env vars (set in .env.production or export before running):
#   MINIO_ROOT_USER     (required)
#   MINIO_ROOT_PASSWORD (required)
#   MINIO_BUCKET        (default: sdhp-files)
#   BACKUP_DIR          (default: /var/backups/sdhp)
#   RETENTION_DAYS      (default: 30)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

MINIO_ROOT_USER="${MINIO_ROOT_USER:-}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-}"
MINIO_BUCKET="${MINIO_BUCKET:-sdhp-files}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdhp}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
TMP_DIR="$BACKUP_DIR/minio_${TIMESTAMP}.tmp"
DEST_DIR="$BACKUP_DIR/minio_${TIMESTAMP}"

if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
  echo "[ERROR] MINIO_ROOT_USER and MINIO_ROOT_PASSWORD must be set."
  exit 1
fi

mkdir -p "$TMP_DIR"

# Remove the temp dir on failure or interruption so incomplete backups
# are never mistaken for valid ones.
cleanup() {
  if [ -d "$TMP_DIR" ]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup incomplete — removing temp dir: $TMP_DIR"
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup INT TERM EXIT

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting MinIO backup: bucket=$MINIO_BUCKET -> $TMP_DIR"

# Credentials are passed as env vars (-e flags), not as command-line
# arguments, so they never appear in process listings or docker logs.
# The inner command uses single quotes so the host shell does not expand
# the credential variables — they are resolved inside the mc container.
docker run --rm \
  --network container:sdhp_minio \
  --entrypoint /bin/sh \
  -e MINIO_ROOT_USER \
  -e MINIO_ROOT_PASSWORD \
  -e MINIO_BUCKET \
  --volume "$TMP_DIR:/backup" \
  minio/mc:latest \
  -c 'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --quiet \
      && mc mirror "local/$MINIO_BUCKET" /backup'

OBJECT_COUNT="$(find "$TMP_DIR" -type f | wc -l | tr -d ' ')"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Mirror complete: $OBJECT_COUNT object(s)"

# Atomically promote the temp dir to the final name.
# From this point forward, TMP_DIR no longer exists so the cleanup
# trap becomes a no-op (rm -rf on a non-existent path is silent).
mv "$TMP_DIR" "$DEST_DIR"
trap - INT TERM EXIT

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] MinIO backup saved: $DEST_DIR ($OBJECT_COUNT object(s))"

# Prune any stale temp dirs left by previously interrupted backups.
find "$BACKUP_DIR" -maxdepth 1 -name "minio_*.tmp" -type d -exec rm -rf {} +

# Prune completed backup dirs older than RETENTION_DAYS.
PRUNED="$(find "$BACKUP_DIR" -maxdepth 1 -name "minio_[0-9]*" -type d -mtime "+${RETENTION_DAYS}" | wc -l | tr -d ' ')"
find "$BACKUP_DIR" -maxdepth 1 -name "minio_[0-9]*" -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} +
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruned $PRUNED MinIO backup dir(s) older than ${RETENTION_DAYS} days."
