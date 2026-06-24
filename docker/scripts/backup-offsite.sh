#!/bin/sh
# ─────────────────────────────────────────────────────────────
# SDHP — Offsite backup sync (Cloudflare R2)
# Usage: ./docker/scripts/backup-offsite.sh
# Runs AFTER backup.sh and backup-minio.sh have completed (cron-ordered).
#
# Copies the local backup directory to an R2 bucket using rclone, run via
# the official rclone/rclone image — no host install required, matching
# the pattern already used by backup-minio.sh for mc.
#
# This script ONLY copies (rclone copy). It never syncs, deletes, removes,
# or purges anything locally or remotely. Offsite retention is enforced
# by an R2 bucket lifecycle rule, not by this script or this host.
#
# Env vars (set in .env.backup-offsite or export before running):
#   OFFSITE_BUCKET             (required)
#   OFFSITE_ENDPOINT           (required — https://<account_id>.r2.cloudflarestorage.com)
#   OFFSITE_REGION             (default: auto)
#   OFFSITE_ACCESS_KEY_ID      (required)
#   OFFSITE_SECRET_ACCESS_KEY  (required)
#   BACKUP_DIR                 (default: /var/backups/sdhp)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

OFFSITE_BUCKET="${OFFSITE_BUCKET:-}"
OFFSITE_ENDPOINT="${OFFSITE_ENDPOINT:-}"
OFFSITE_REGION="${OFFSITE_REGION:-auto}"
OFFSITE_ACCESS_KEY_ID="${OFFSITE_ACCESS_KEY_ID:-}"
OFFSITE_SECRET_ACCESS_KEY="${OFFSITE_SECRET_ACCESS_KEY:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdhp}"

if [ -z "$OFFSITE_BUCKET" ] || [ -z "$OFFSITE_ENDPOINT" ] || [ -z "$OFFSITE_ACCESS_KEY_ID" ] || [ -z "$OFFSITE_SECRET_ACCESS_KEY" ]; then
  echo "[ERROR] OFFSITE_BUCKET, OFFSITE_ENDPOINT, OFFSITE_ACCESS_KEY_ID, and OFFSITE_SECRET_ACCESS_KEY must all be set."
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "[ERROR] Local backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting offsite sync: $BACKUP_DIR -> r2://$OFFSITE_BUCKET/sdhp-backups"

# Credentials are passed as env vars (-e flags), not as command-line
# arguments or a config file on disk, so they never appear in process
# listings, docker logs, or a persisted rclone.conf. The local backup
# directory is mounted read-only — this script cannot modify or delete
# local backups under any circumstance.
docker run --rm \
  -e RCLONE_CONFIG_OFFSITE_TYPE=s3 \
  -e RCLONE_CONFIG_OFFSITE_PROVIDER=Cloudflare \
  -e RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$OFFSITE_ACCESS_KEY_ID" \
  -e RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$OFFSITE_SECRET_ACCESS_KEY" \
  -e RCLONE_CONFIG_OFFSITE_ENDPOINT="$OFFSITE_ENDPOINT" \
  -e RCLONE_CONFIG_OFFSITE_REGION="$OFFSITE_REGION" \
  --volume "$BACKUP_DIR:/data:ro" \
  rclone/rclone copy /data "offsite:$OFFSITE_BUCKET/sdhp-backups" \
  --stats-one-line -v

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Offsite copy command completed."

# Read-only post-copy count, for the log only — no deletion, no sync.
REMOTE_COUNT="$(docker run --rm \
  -e RCLONE_CONFIG_OFFSITE_TYPE=s3 \
  -e RCLONE_CONFIG_OFFSITE_PROVIDER=Cloudflare \
  -e RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$OFFSITE_ACCESS_KEY_ID" \
  -e RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$OFFSITE_SECRET_ACCESS_KEY" \
  -e RCLONE_CONFIG_OFFSITE_ENDPOINT="$OFFSITE_ENDPOINT" \
  -e RCLONE_CONFIG_OFFSITE_REGION="$OFFSITE_REGION" \
  rclone/rclone lsf "offsite:$OFFSITE_BUCKET/sdhp-backups" --recursive | wc -l)"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Offsite object count after sync: $REMOTE_COUNT"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Offsite sync complete."
