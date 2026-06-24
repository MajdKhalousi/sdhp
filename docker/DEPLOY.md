# SDHP — Staging / Production Deployment Guide

> **Do NOT skip the TLS Bootstrap section on first deploy.**
> nginx will fail to start if the certificate files do not exist before the HTTPS
> server block is loaded. Follow the steps in order.

---

## Prerequisites

- Docker >= 24 and Docker Compose v2 (`docker compose version`)
- A DNS A-record for your domain pointing to this server's IP, propagated before
  running certbot
- Ports 80 and 443 open in the server firewall
- `openssl` available on the host (for the self-signed placeholder step)

---

## 1. Environment Setup

```sh
# From the repository root
cp .env.production.example .env.production
```

Edit `.env.production` and replace every `CHANGE_ME_*` value:

| Variable | How to generate |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |
| `REDIS_PASSWORD` | `openssl rand -base64 32` |
| `MINIO_ROOT_PASSWORD` | `openssl rand -base64 32` |
| `JWT_SECRET` | `openssl rand -base64 64` (must be >= 64 chars) |
| `DOMAIN` | your actual domain, e.g. `clinic.example.com` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR_DOMAIN/api` |

Replace the placeholder domain in nginx config:
```sh
# Replace clinic.example.com with your actual domain
sed -i 's/clinic.example.com/YOUR_DOMAIN/g' docker/nginx/conf.d/sdhp.conf
```

---

## 2. Build Docker Images

```sh
# Build both images (takes 3-5 min on first run)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production build
```

---

## 3. TLS Bootstrap — First Deploy Only

nginx's HTTPS server block references Let's Encrypt certificate files. Those files
must exist before nginx starts. On first deploy there are no certificates yet —
the bootstrap procedure below breaks the deadlock.

### Step 3.1 — Create self-signed placeholder certificates

This lets nginx start so it can serve the ACME challenge on port 80. The
placeholder certs are replaced in the next step.

```sh
DOMAIN="YOUR_DOMAIN"   # set this to your actual domain

mkdir -p docker/certbot/conf/live/$DOMAIN

openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout docker/certbot/conf/live/$DOMAIN/privkey.pem \
  -out    docker/certbot/conf/live/$DOMAIN/fullchain.pem \
  -subj   "/CN=placeholder"
```

Also create the webroot directory that nginx will serve for ACME challenges:
```sh
mkdir -p docker/certbot/www
```

### Step 3.2 — Start nginx (and core services) with the placeholder cert

```sh
# Start postgres, redis, minio first (they take a few seconds to become healthy)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production \
  up -d postgres redis minio

# Start nginx against the placeholder cert
docker compose -f docker/docker-compose.prod.yml --env-file .env.production \
  up -d nginx

# Verify nginx is listening on port 80
curl -I http://YOUR_DOMAIN/.well-known/acme-challenge/test
# Expected: 404 (no challenge file yet — that is fine, nginx is reachable)
```

### Step 3.3 — Issue the real Let's Encrypt certificate

```sh
docker compose -f docker/docker-compose.prod.yml --env-file .env.production \
  run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --domain YOUR_DOMAIN \
    --email admin@YOUR_DOMAIN \
    --agree-tos \
    --no-eff-email
```

On success certbot writes the real certificate files to
`docker/certbot/conf/live/YOUR_DOMAIN/` — replacing the placeholders.

### Step 3.4 — Reload nginx to pick up the real certificate

```sh
docker exec sdhp_nginx nginx -s reload

# Verify HTTPS is working with the real cert
curl -I https://YOUR_DOMAIN/
# Expected: 200 or 301 redirect — no SSL error
```

---

## 4. Start All Services

```sh
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d
```

The startup order is enforced by `depends_on` + health conditions:

```
postgres (healthy) ──┐
redis    (healthy) ──┼──────────────────────────> api (healthy) ──> web ──> nginx
minio    (healthy) ──> minio-init (completed) ──┘
```

Expect 60-90 seconds for full startup on first run (Prisma migrations run
inside the api entrypoint before the server starts).

---

## 5. Post-Startup Checklist

### 5.1 Check all containers are running and healthy

```sh
docker compose -f docker/docker-compose.prod.yml --env-file .env.production ps
```

All services should show `Up` / `healthy`. If any show `unhealthy` or `Exit`:

```sh
# Check logs for a specific service
docker logs sdhp_api --tail=50
docker logs sdhp_nginx --tail=50
```

### 5.2 MinIO storage bucket

The `minio-init` service creates the bucket automatically when the stack starts.
The api service depends on `minio-init` completing successfully, so the bucket is
guaranteed to exist before any upload request is handled.

To verify the bucket was created (or recreate it manually if minio-init failed):

```sh
docker logs sdhp_minio_init
# Expected last line: [minio-init] Bucket ready: sdhp-files

# Manual fallback if the init container failed
docker exec sdhp_minio mc alias set local http://localhost:9000 \
  "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
docker exec sdhp_minio mc mb local/sdhp-files --ignore-existing
```

### 5.3 Smoke test URLs

| URL | Expected |
|---|---|
| `https://YOUR_DOMAIN/` | Next.js login page (200) |
| `https://YOUR_DOMAIN/api/docs` | 404 Not Found (Swagger disabled in production) |
| `https://YOUR_DOMAIN/api/v1/auth/me` | `{"message":"Unauthorized",...}` (401) |
| `http://YOUR_DOMAIN/` | 301 redirect to HTTPS |

```sh
# Quick API smoke test
curl -s https://YOUR_DOMAIN/api/v1/auth/me | grep -q Unauthorized \
  && echo "API OK" || echo "API FAILED"

# Confirm Swagger is NOT accessible in production
curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/api/docs \
  | grep -q 404 && echo "Swagger correctly disabled" || echo "WARNING: Swagger is exposed"

# Confirm HSTS header is present
curl -sI https://YOUR_DOMAIN/ | grep -i strict-transport-security
```

### 5.4 Load staging seed data (staging only, never in production with real patients)

The seed script requires `ts-node` (a devDependency) which is not available in the
production image. Run the seed from your local development environment targeting
the staging database:

```sh
# From your local machine, with DATABASE_URL pointing at the staging DB
# (e.g., forwarded via SSH tunnel or direct access if internal)
export DATABASE_URL="postgresql://sdhp_prod:PASSWORD@STAGING_HOST:5432/sdhp_production?schema=public"
cd apps/api
pnpm exec prisma db seed
```

---

## 6. Certificate Renewal

Certbot auto-renews via the 12-hour renewal loop in `docker-compose.prod.yml`.
After renewal, nginx must be reloaded to pick up the new certificate:

```sh
# Test renewal (dry run — no cert changes)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production \
  run --rm certbot renew --dry-run

# After a real renewal, reload nginx
docker exec sdhp_nginx nginx -s reload
```

To automate the nginx reload after renewal, add a cron job on the host:
```sh
# /etc/cron.d/sdhp-cert-reload — runs at 03:15 daily
15 3 * * * root docker exec sdhp_nginx nginx -s reload 2>/dev/null
```

---

## 7. Scheduled Backups

Two backup scripts cover all persistent data:

| Script | Covers | Default output |
|---|---|---|
| `docker/scripts/backup.sh` | PostgreSQL database | `/var/backups/sdhp/sdhp_YYYYMMDD_HHMMSS.pgdump` |
| `docker/scripts/backup-minio.sh` | MinIO medical file uploads | `/var/backups/sdhp/minio_YYYYMMDD_HHMMSS/` |

Neither script runs automatically — both require a host cron job.

### 7.1 Required env vars

Both scripts read credentials from the environment. Export them before
running manually, or source `.env.production` as shown in the cron
examples below.

| Variable | Used by | Source |
|---|---|---|
| `POSTGRES_USER` | `backup.sh` | `.env.production` |
| `POSTGRES_DB` | `backup.sh` | `.env.production` |
| `MINIO_ROOT_USER` | `backup-minio.sh` | `.env.production` |
| `MINIO_ROOT_PASSWORD` | `backup-minio.sh` | `.env.production` |
| `MINIO_BUCKET` | `backup-minio.sh` | `.env.production` (default: `sdhp-files`) |
| `BACKUP_DIR` | both | set to `/var/backups/sdhp` or export before running |
| `RETENTION_DAYS` | both | optional, default `30` |

### 7.2 Set up the cron jobs

Create `/etc/cron.d/sdhp-backup` on the host:

```sh
sudo tee /etc/cron.d/sdhp-backup > /dev/null <<'EOF'
SHELL=/bin/bash

# PostgreSQL backup — 02:00 daily
0 2 * * * root set -a; . /opt/sdhp/docker/.env.production; set +a; /opt/sdhp/docker/scripts/backup.sh >> /var/log/sdhp-backup-pg.log 2>&1

# MinIO backup — 02:30 daily (offset to avoid concurrent I/O with postgres)
30 2 * * * root set -a; . /opt/sdhp/docker/.env.production; set +a; /opt/sdhp/docker/scripts/backup-minio.sh >> /var/log/sdhp-backup-minio.log 2>&1

# nginx cert reload — 03:15 daily
15 3 * * * root docker exec sdhp_nginx nginx -s reload 2>/dev/null
EOF
sudo chmod 640 /etc/cron.d/sdhp-backup
```

Replace `/opt/sdhp` with the absolute path to the cloned repository on
your server if it differs.

The `set -a; . /opt/sdhp/docker/.env.production; set +a` pattern sources
`.env.production` and exports every variable it sets into the environment
of the child process (the backup script). Without `set -a`, sourced
variables are shell-local and are not inherited by child scripts.

### 7.3 Manual backup (first run / smoke test)

```sh
# Source credentials from .env.production, then run both scripts manually
set -a; . /opt/sdhp/docker/.env.production; set +a

bash /opt/sdhp/docker/scripts/backup.sh
bash /opt/sdhp/docker/scripts/backup-minio.sh

# List all backups
ls -lh /var/backups/sdhp/
```

### 7.4 Verify backups

```sh
# PostgreSQL — confirm latest dump is valid
docker exec sdhp_postgres pg_restore --list \
  < "$(ls -t /var/backups/sdhp/sdhp_*.pgdump | head -1)" | tail -5

# MinIO — count objects in the latest backup vs running bucket
LATEST_MINIO="$(ls -td /var/backups/sdhp/minio_[0-9]* | head -1)"
echo "Latest MinIO backup: $LATEST_MINIO"
find "$LATEST_MINIO" -type f | wc -l

# Confirm both ran today
find /var/backups/sdhp -name "sdhp_$(date +%Y%m%d)*.pgdump" | head -1
find /var/backups/sdhp -maxdepth 1 -name "minio_$(date +%Y%m%d)*" -type d | head -1
```

### 7.5 Retention policy

The default retention is 30 days for both scripts. Override by exporting
`RETENTION_DAYS` before running:

```sh
RETENTION_DAYS=14 bash docker/scripts/backup.sh
RETENTION_DAYS=14 bash docker/scripts/backup-minio.sh
```

### 7.6 PostgreSQL restore

See `docker/scripts/restore.sh`. Takes the path to a `.pgdump` file:

```sh
set -a; . /opt/sdhp/docker/.env.production; set +a
bash /opt/sdhp/docker/scripts/restore.sh /var/backups/sdhp/sdhp_YYYYMMDD_HHMMSS.pgdump
```

The script prompts for typed `yes` confirmation before dropping the
database. After restore: `docker restart sdhp_api`.

### 7.7 MinIO restore

**Stop the API first** to prevent new uploads arriving during the restore:

```sh
docker stop sdhp_api
```

Run the restore script with the path to the backup directory to restore:

```sh
set -a; . /opt/sdhp/docker/.env.production; set +a
bash /opt/sdhp/docker/scripts/restore-minio.sh /var/backups/sdhp/minio_YYYYMMDD_HHMMSS
```

The script prompts for typed `yes` confirmation, then uses `mc mirror
--overwrite` to push backup objects back into the bucket. Objects present
in the bucket but absent from the backup are left in place (they are not
deleted).

After restore:

```sh
docker start sdhp_api
# Verify uploads and downloads work in the application
```

### 7.8 Offsite backup sync (Cloudflare R2)

`docker/scripts/backup-offsite.sh` copies the local backup directory
(`/var/backups/sdhp`) to a Cloudflare R2 bucket via `rclone`, run through the
official `rclone/rclone` image — no host install required, same pattern as
`backup-minio.sh`'s use of `mc`. It only ever copies; it never syncs, deletes,
removes, or purges anything locally or remotely. Offsite retention (90 days)
is enforced by an R2 bucket lifecycle rule, not by this script.

**Required env vars** (kept in a separate `docker/.env.backup-offsite` file,
`chmod 600`, root-owned — deliberately not merged into `.env.production` so
this job never has access to application secrets it doesn't need):

| Variable | Used by | Source |
|---|---|---|
| `OFFSITE_BUCKET` | `backup-offsite.sh` | `.env.backup-offsite` |
| `OFFSITE_ENDPOINT` | `backup-offsite.sh` | `.env.backup-offsite` (`https://<account_id>.r2.cloudflarestorage.com`) |
| `OFFSITE_REGION` | `backup-offsite.sh` | `.env.backup-offsite` (default: `auto`) |
| `OFFSITE_ACCESS_KEY_ID` | `backup-offsite.sh` | `.env.backup-offsite` — R2 token scoped to this bucket only |
| `OFFSITE_SECRET_ACCESS_KEY` | `backup-offsite.sh` | `.env.backup-offsite` — R2 token scoped to this bucket only |
| `BACKUP_DIR` | `backup-offsite.sh` | shared with local backups, default `/var/backups/sdhp` |

The R2 API token should be an **Object Read & Write token scoped to this one
bucket** (not Read-only/PutObject-only — `rclone copy` needs to list and
read remote objects to determine what's already present, not just write).
It must not have access to any other bucket or account-level permissions.

**Cron entry** — append to the existing `/etc/cron.d/sdhp-backup`:

```sh
# Offsite backup sync — 03:00 UTC daily (after PG 02:00 and MinIO 02:30 local backups)
0 3 * * * root set -a; . /opt/sdhp/docker/.env.backup-offsite; set +a; /opt/sdhp/docker/scripts/backup-offsite.sh >> /var/log/sdhp-backup-offsite.log 2>&1
```

> Confirm the host's system timezone is actually UTC before relying on
> `0 3 * * *` meaning 03:00 UTC — if cron runs in server-local time and the
> host is not UTC, adjust the hour accordingly so this still lands after the
> 02:00/02:30 local backup jobs complete.

**Verification** (read-only, safe to run anytime):

```sh
set -a; . /opt/sdhp/docker/.env.backup-offsite; set +a

# List recent objects in the offsite bucket
docker run --rm \
  -e RCLONE_CONFIG_OFFSITE_TYPE=s3 -e RCLONE_CONFIG_OFFSITE_PROVIDER=Cloudflare \
  -e RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$OFFSITE_ACCESS_KEY_ID" \
  -e RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$OFFSITE_SECRET_ACCESS_KEY" \
  -e RCLONE_CONFIG_OFFSITE_ENDPOINT="$OFFSITE_ENDPOINT" -e RCLONE_CONFIG_OFFSITE_REGION="$OFFSITE_REGION" \
  rclone/rclone lsl "offsite:$OFFSITE_BUCKET/sdhp-backups" | tail -20

# Confirm today's local pgdump made it offsite
docker run --rm [same -e flags as above] \
  rclone/rclone lsf "offsite:$OFFSITE_BUCKET/sdhp-backups" | grep "$(date +%Y%m%d)"

# Tail the sync log
tail -20 /var/log/sdhp-backup-offsite.log
```

**Retrieving an offsite backup** (only needed if the local copy is also
lost): download the specific file, then feed it into the existing,
unmodified `restore.sh`/`restore-minio.sh` exactly as with a local backup:

```sh
docker run --rm [same -e flags as above] \
  --volume /var/backups/sdhp:/data \
  rclone/rclone copy "offsite:$OFFSITE_BUCKET/sdhp-backups/sdhp_YYYYMMDD_HHMMSS.pgdump" /data
```

---

## 8. Updating the Application

```sh
# Pull latest code
git pull origin master

# Rebuild images (only changed layers are rebuilt)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production build

# Restart services
# The API entrypoint runs `prisma migrate deploy` before starting the server.
# Migration output appears in: docker logs sdhp_api --tail=20
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d
```

### Post-Update Verification

```sh
# 1. Confirm the correct commit is deployed
git log -1 --oneline

# 2. Check all containers are healthy
docker compose -f docker/docker-compose.prod.yml --env-file .env.production ps

# 3. Confirm migration deploy ran without errors
docker logs sdhp_api 2>&1 | grep -E "\[entrypoint\]|Migration"

# 4. Confirm Swagger is NOT accessible (should return 404)
curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/api/docs

# 5. Confirm auth rate limiting is configured in nginx
docker exec sdhp_nginx nginx -T 2>/dev/null | grep limit_req

# 6. Confirm login still works
curl -s -X POST https://YOUR_DOMAIN/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+963900000000","password":"wrong"}' | grep -q message \
  && echo "Auth endpoint reachable" || echo "Auth endpoint FAILED"
```

---

## 9. Rollback

```sh
# Check out the previous stable tag
git checkout v0.1-staging-ready

# Rebuild and restart
docker compose -f docker/docker-compose.prod.yml --env-file .env.production build
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d
```

> If a migration was applied in the failed version, a database restore from backup
> is required before rolling back the application. See `docker/scripts/restore.sh`.

---

## 10. Healthcheck Verification

```sh
# Show live healthcheck status for all services
docker inspect --format='{{.Name}}: {{.State.Health.Status}}' \
  sdhp_postgres sdhp_redis sdhp_minio sdhp_api sdhp_web

# Expected output:
# /sdhp_postgres: healthy
# /sdhp_redis: healthy
# /sdhp_minio: healthy
# /sdhp_api: healthy
# /sdhp_web: healthy
```

---

## 11. Stopping and Removing

```sh
# Stop all services (data volumes are preserved)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production down

# Stop AND remove volumes (DESTRUCTIVE — all data is lost)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production down -v
```
