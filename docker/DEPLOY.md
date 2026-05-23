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

The startup order is enforced by `depends_on` + `condition: service_healthy`:

```
postgres (healthy) ──┐
                      ├──> api (healthy) ──> web ──> nginx
redis    (healthy) ──┘
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

### 5.2 Create the MinIO storage bucket (one-time)

MinIO does not auto-create buckets. Run this once after first startup:

```sh
# Create the bucket (MINIO_BUCKET defaults to sdhp-files)
docker exec sdhp_minio mc alias set local http://localhost:9000 \
  "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

docker exec sdhp_minio mc mb local/sdhp-files --ignore-existing
```

### 5.3 Smoke test URLs

| URL | Expected |
|---|---|
| `https://YOUR_DOMAIN/` | Next.js login page (200) |
| `https://YOUR_DOMAIN/api/docs` | Swagger UI (200) |
| `https://YOUR_DOMAIN/api/v1/auth/me` | `{"message":"Unauthorized",...}` (401) |
| `http://YOUR_DOMAIN/` | 301 redirect to HTTPS |

```sh
# Quick API smoke test
curl -s https://YOUR_DOMAIN/api/v1/auth/me | grep -q Unauthorized \
  && echo "API OK" || echo "API FAILED"
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

## 7. Updating the Application

```sh
# Pull latest code
git pull origin master

# Rebuild images (only changed layers are rebuilt)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production build

# Restart services — Prisma migrations run automatically in the API entrypoint
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d
```

---

## 8. Rollback

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

## 9. Healthcheck Verification

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

## 10. Stopping and Removing

```sh
# Stop all services (data volumes are preserved)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production down

# Stop AND remove volumes (DESTRUCTIVE — all data is lost)
docker compose -f docker/docker-compose.prod.yml --env-file .env.production down -v
```
