#!/bin/sh
# ─────────────────────────────────────────────────────────────
# SDHP — MinIO restore script
# Usage: ./docker/scripts/restore-minio.sh /var/backups/sdhp/minio_YYYYMMDD_HHMMSS
# Env vars (set in .env.production or export before running):
#   MINIO_ROOT_USER     (required)
#   MINIO_ROOT_PASSWORD (required)
#   MINIO_BUCKET        (default: sdhp-files)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_SRC="${1:-}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-}"
MINIO_BUCKET="${MINIO_BUCKET:-sdhp-files}"

if [ -z "$BACKUP_SRC" ]; then
  echo "Usage: $0 <backup-directory>"
  echo "       e.g. $0 /var/backups/sdhp/minio_20260617_020030"
  exit 1
fi

if [ ! -d "$BACKUP_SRC" ]; then
  echo "[ERROR] Backup directory not found: $BACKUP_SRC"
  exit 1
fi

if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
  echo "[ERROR] MINIO_ROOT_USER and MINIO_ROOT_PASSWORD must be set."
  exit 1
fi

OBJECT_COUNT="$(find "$BACKUP_SRC" -type f | wc -l | tr -d ' ')"

echo ""
echo "  WARNING: This will overwrite objects in bucket '$MINIO_BUCKET' with"
echo "  the contents of the backup. Objects present in the bucket but absent"
echo "  from the backup are NOT removed — only backup objects are mirrored in."
echo ""
echo "  Backup source : $BACKUP_SRC"
echo "  Object count  : $OBJECT_COUNT file(s)"
echo ""
echo "  IMPORTANT: Stop the API container before restoring to prevent"
echo "  new uploads from arriving during the restore:"
echo "    docker stop sdhp_api"
echo ""
printf "  Type 'yes' to confirm: "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring $OBJECT_COUNT object(s) to bucket '$MINIO_BUCKET'..."

# Credentials are passed as env vars so they never appear in process
# listings. The inner command uses single quotes so credential variables
# are resolved inside the mc container, not by the host shell.
docker run --rm \
  --network container:sdhp_minio \
  --entrypoint /bin/sh \
  -e MINIO_ROOT_USER \
  -e MINIO_ROOT_PASSWORD \
  -e MINIO_BUCKET \
  --volume "$BACKUP_SRC:/backup:ro" \
  minio/mc:latest \
  -c 'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --quiet \
      && mc mirror --overwrite /backup "local/$MINIO_BUCKET"'

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] MinIO restore complete."
echo ""
echo "  Next steps:"
echo "  1. Restart the API:  docker start sdhp_api"
echo "  2. Verify file uploads and downloads work in the application."
