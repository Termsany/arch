# Deployment Guide

This guide covers staging and production deployment for the architecture/interior design SaaS app.

## Overview

The app is a multi-tenant SaaS platform scoped by `office_id`.

Current production concerns:

- Frontend: React + Vite
- Backend: Express API
- Database: PostgreSQL with Drizzle
- Storage: Cloudflare R2 for production uploads, local uploads for development
- Authentication: JWT
- Communication: WhatsApp simulation by default, optional Cloud API credentials later
- Observability: app logs, health checks, audit logs
- CI: GitHub Actions for install, typecheck, and build
- UI: Arabic/English with RTL/LTR switching

Do not deploy production from local `.env` files. Use the hosting provider's secret manager.

## Recommended Production Architecture

### Option A: Managed Platforms

- Frontend: Vercel
- Backend: Render or Railway
- Database: managed PostgreSQL
- Storage: Cloudflare R2
- DNS: Cloudflare
- TLS: managed by Vercel/Render/Railway and Cloudflare

Recommended URLs:

- Staging frontend: `https://staging.yourdomain.com`
- Staging API: `https://staging-api.yourdomain.com`
- Production frontend: `https://app.yourdomain.com`
- Production API: `https://api.yourdomain.com`

### Option B: VPS With Docker Compose

- VPS running Docker and Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL
- Managed PostgreSQL preferred, or local PostgreSQL with tested backups
- Cloudflare R2 for uploads
- Cloudflare DNS in front of the app

Use managed PostgreSQL for production unless you already have a reliable backup, monitoring, patching, and restore process for the VPS database.

## Environment Variables

### Backend

Required:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://app.yourdomain.com
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=25
STORAGE_PROVIDER=r2
```

Cloudflare R2:

```env
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
R2_SIGNED_URL_EXPIRES_SECONDS=900
```

Important R2 notes:

- `R2_ENDPOINT` must not include the bucket name.
- Correct: `https://ACCOUNT_ID.r2.cloudflarestorage.com`
- Incorrect: `https://ACCOUNT_ID.r2.cloudflarestorage.com/arch`
- Bucket name goes in `R2_BUCKET`.

WhatsApp:

```env
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=simulation
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_DEFAULT_COUNTRY_CODE=20
```

For production without real WhatsApp sending, keep:

```env
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=simulation
```

Only set `WHATSAPP_PROVIDER=whatsapp_cloud` after production Meta WhatsApp credentials are ready and tested in staging.

### Frontend

Only expose safe `VITE_` variables:

```env
VITE_API_URL=https://api.yourdomain.com/api
```

The frontend reads `VITE_API_URL` at build/startup. Use the API URL without a trailing slash, for example `https://arch-tyda.onrender.com/api`. When it is set, requests that start with `/api` or `/uploads` are routed to that backend origin. When it is not set, local Docker and same-origin proxy deployments keep using relative paths.

Never expose backend secrets to the frontend:

- `DATABASE_URL`
- `JWT_SECRET`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCESS_KEY_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `S3_SECRET_ACCESS_KEY`

## Database Setup

Use PostgreSQL 14+.

1. Create a database and user.
2. Enable SSL if required by your provider.
3. Set `DATABASE_URL` in the backend environment.
4. Run migrations/schema setup before routing production traffic.

For managed providers, use connection pooling if available, but verify Drizzle and your hosting runtime support the selected pool mode.

## Cloudflare R2 Setup

1. Create a Cloudflare R2 bucket, for example `arch-production`.
2. Create an R2 API token with least privilege for that bucket.
3. Set backend variables:
   - `STORAGE_PROVIDER=r2`
   - `R2_BUCKET=arch-production`
   - `R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
4. Optional public files:
   - Configure a custom public domain or public bucket URL.
   - Set `R2_PUBLIC_BASE_URL` only if the files are intentionally public.
5. Private files:
   - Leave `R2_PUBLIC_BASE_URL` empty.
   - The backend should provide signed URLs/download access.

Security note: if R2 credentials were ever committed or shared, revoke them in Cloudflare and create new keys.

## Frontend Deployment

### Vercel

1. Import the GitHub repository into Vercel.
2. Configure the frontend app root if Vercel asks for one:
   ```text
   artifacts/arch-saas
   ```
3. If building from the monorepo root, use:
   ```bash
   pnpm --filter @workspace/arch-saas run build
   ```
4. Output directory:
   ```text
   artifacts/arch-saas/dist/public
   ```
5. Set frontend environment variables:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api
   ```
6. For staging, use:
   ```env
   VITE_API_URL=https://staging-api.yourdomain.com/api
   ```
7. Confirm Vercel uses pnpm and installs with the committed lockfile.
8. Deploy preview/staging first.
9. Verify browser network requests point to the intended API host.

Vercel checklist:

- `VITE_API_URL` is set for staging and production.
- `VITE_API_URL` has no trailing slash, for example `https://arch-tyda.onrender.com/api`.
- Redeploy the Vercel frontend after changing `VITE_API_URL`; Vite embeds env values at build time.
- No backend secrets are added to Vercel frontend env.
- Build command succeeds:
  ```bash
  pnpm --filter @workspace/arch-saas run build
  ```
- Output directory is correct.
- `/`, `/login`, `/client/login`, and `/start` load.
- `/dashboard` redirects unauthenticated users.
- Arabic/English switch works after deployment.

## Backend Deployment

### Render

1. Create a new Render Web Service from the GitHub repository.
2. Runtime: Node.
3. Root directory can remain the repository root for monorepo commands.
4. Install command:
   ```bash
   pnpm install --frozen-lockfile
   ```
5. Build command:
   ```bash
   pnpm --filter @workspace/api-server run build
   ```
6. Start command:
   ```bash
   pnpm --filter @workspace/api-server run start
   ```
7. Add backend env vars through the Render dashboard.
8. Set health check path:
   ```text
   /api/healthz
   ```
   `/api/health` is also available for platforms that prefer that path.
9. Use a Render managed PostgreSQL database or external managed PostgreSQL.
10. Run the migration command before first traffic or as a one-off Render job:
    ```bash
    pnpm --filter @workspace/db run push
    ```

Render backend checklist:

- `NODE_ENV=production`
- `PORT` is supplied by Render or set explicitly.
- `DATABASE_URL` points to the staging/production database.
- `JWT_SECRET` is strong and environment-specific.
- `FRONTEND_URL` matches the deployed frontend URL exactly.
- For Render backend with Vercel frontend, set `FRONTEND_URL` to the Vercel frontend origin, for example `https://YOUR-VERCEL-FRONTEND.vercel.app`.
- `STORAGE_PROVIDER=r2` for staging/production file testing.
- R2 credentials are configured only on the backend service.
- Health check returns `{ "status": "ok" }`.
- Logs do not print secret values.

### Railway

Use the same install/build/start commands as Render. Configure `DATABASE_URL`, `FRONTEND_URL`, R2, and WhatsApp variables through Railway Variables.

## Docker Deployment Option

For a VPS Docker deployment:

1. Copy `.env.docker.example` to a server-only `.env.docker`.
2. Set production-safe values in `.env.docker`.
3. Use R2 for storage:
   ```env
   STORAGE_PROVIDER=r2
   ```
4. Build and run:
   ```bash
   docker compose up -d --build
   ```
5. Put Nginx in front of the services:
   - `https://app.yourdomain.com` to frontend container
   - `https://api.yourdomain.com` to backend container or `/api` proxy
6. Enable Let's Encrypt SSL.

Production Docker notes:

- Do not use weak local database passwords.
- Prefer managed PostgreSQL over local container PostgreSQL.
- If using local PostgreSQL, mount durable volumes and configure automated backups.
- Keep `.env.docker` out of Git.

## Staging Environment

Example URLs:

- `https://staging.yourdomain.com`
- `https://staging-api.yourdomain.com`

Example staging backend env:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST:5432/arch_saas_staging
JWT_SECRET=replace-with-staging-only-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://staging.yourdomain.com
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=25
STORAGE_PROVIDER=r2
R2_BUCKET=arch-staging
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=staging-only-key
R2_SECRET_ACCESS_KEY=staging-only-secret
R2_PUBLIC_BASE_URL=
R2_SIGNED_URL_EXPIRES_SECONDS=900
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=simulation
WHATSAPP_DEFAULT_COUNTRY_CODE=20
```

Example staging frontend env:

```env
VITE_API_URL=https://staging-api.yourdomain.com/api
```

Staging checklist:

- Use a separate staging PostgreSQL database.
- Use a separate R2 bucket, for example `arch-staging`, or a clearly isolated prefix if one bucket must be shared.
- Use WhatsApp simulation or test credentials only.
- Use a separate JWT secret.
- Use staging-only admin/client test accounts.
- Set `FRONTEND_URL=https://staging.yourdomain.com`.
- Set `VITE_API_URL=https://staging-api.yourdomain.com/api`.
- Confirm `/api/health` and `/api/healthz` respond on the staging backend.
- Confirm frontend requests use `https://staging-api.yourdomain.com/api`.
- Run the full QA checklist before production.

## Production Environment

Example URLs:

- `https://app.yourdomain.com`
- `https://api.yourdomain.com`

Production checklist:

- Use the production PostgreSQL database.
- Use a production R2 bucket.
- Set a strong `JWT_SECRET`.
- Lock CORS with `FRONTEND_URL=https://app.yourdomain.com`.
- Enable HTTPS.
- Enable database backups.
- Enable app logs.
- Enable monitoring/alerts.
- Confirm audit logs are enabled.
- Confirm no real `.env` files are committed.

## Database Migrations

The repo uses Drizzle. The schema push command is:

```bash
pnpm --filter @workspace/db run push
```

For Docker local, the `migrate` service applies the Drizzle schema before the backend starts.

Migration checklist:

- Confirm CI passes before running migrations.
- Confirm `DATABASE_URL` points to staging, not production, during staging rehearsal.
- Take a database backup before production migration.
- Run:
  ```bash
  pnpm --filter @workspace/db run push
  ```
- Confirm key tables exist, including `project_files`, `invoices`, `whatsapp_messages`, and `audit_logs`.
- Confirm app startup succeeds after migration.
- Run smoke tests before promoting traffic.

Production migration process:

1. Back up the production database.
2. Deploy to staging.
3. Run migrations/schema push in staging.
4. Run the staging QA checklist.
5. Schedule a production deployment window.
6. Run migrations/schema push against production.
7. Deploy the backend and frontend.
8. Run post-deployment QA.

Warning: do not run destructive database changes in production without a tested rollback and backup.

## Backups And Restore

Backup strategy:

- PostgreSQL backup daily.
- Retain backups for 7 to 30 days.
- Keep at least one off-platform backup when possible.
- Test restore monthly.
- Document who can access backups.
- Record R2 bucket policies, lifecycle rules, and custom domains.

Suggested PostgreSQL backup command when self-hosted:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

Restore outline:

1. Stop writes or put the app in maintenance mode.
2. Create a fresh database.
3. Restore the selected backup.
4. Run migrations only if the restored backup is behind the current app version.
5. Point the backend to the restored database.
6. Verify login, office isolation, files, invoices, reports, and audit logs.

Do not overwrite the only production database copy during restore testing.

## Health Checks

Backend:

```text
GET /api/healthz
```

Also check:

```text
GET /api/health
```

Expected result is a successful 2xx JSON response from the API.

Frontend:

- Open the frontend URL.
- Confirm public home page loads.
- Confirm `/login` loads.
- Confirm unauthenticated `/dashboard` redirects to login.

Docker log checks:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 postgres
```

## Logs And Monitoring

Minimum production monitoring:

- Backend request/error logs.
- Backend process restarts.
- Database connection failures.
- Failed uploads to R2.
- Authentication error spikes.
- 5xx API response rate.
- Disk usage if Docker/VPS is used.
- PostgreSQL storage and CPU.
- R2 object count/storage growth.

Audit logs are app-level records for business-critical actions. They do not replace infrastructure logs.

## Rollback Plan

Before deployment:

- Keep the previous frontend build available.
- Keep the previous backend image/build available.
- Take a database backup before migrations.
- Record the Git commit SHA being deployed.

Rollback steps:

1. Stop new deployment traffic if possible.
2. Redeploy the previous frontend build.
3. Redeploy the previous backend image/build.
4. Check API health.
5. Check login and main workflows.
6. Restore the database backup only if the migration or new code caused data corruption.

Do not rollback the database blindly. A database rollback can lose valid user data created after deployment.

## Security Checklist

- No real `.env`, `.env.docker`, `.env.local`, or `.env.production` files are committed.
- Production secrets are stored in the hosting provider secret manager.
- `JWT_SECRET` is long, random, and production-only.
- R2 keys are least privilege.
- R2 keys are rotated if exposed.
- WhatsApp tokens are backend-only.
- `FRONTEND_URL` is locked to trusted frontend origins.
- HTTPS is enabled for frontend and backend.
- Rate limiting is enabled on auth routes.
- Helmet/security middleware is enabled.
- Audit logs are enabled and readable by admins only.
- Client portal access is tested.
- Office isolation is tested.
- Backups are enabled and restore has been tested.
- GitHub secret scanning and push protection are enabled when available.

## Post-Deployment QA Checklist

- Log in as super admin.
- Log in as office admin.
- Log in as client.
- Create an office through onboarding.
- Create a client.
- Create a project.
- Upload a file to R2.
- Confirm the file appears in the R2 bucket.
- View a client-visible file from the client portal.
- Create BOQ/estimate items.
- Generate a quotation.
- Create an invoice.
- Record a payment.
- Check reports.
- Send a WhatsApp simulation message.
- Check audit logs.
- Switch Arabic to English.
- Verify Arabic RTL.
- Verify English LTR.
- Verify subscription limits.
- Verify cross-office data is blocked.
- Verify client users cannot access admin APIs.

## Post-Staging QA Checklist

- Open `https://staging.yourdomain.com`.
- Confirm `/login`, `/client/login`, `/start`, and `/pricing` load.
- Check `https://staging-api.yourdomain.com/api/health`.
- Check `https://staging-api.yourdomain.com/api/healthz`.
- Log in as super admin.
- Log in as office admin.
- Log in as client.
- Create a staging office.
- Create a staging client and project.
- Upload a file and verify R2 object creation in the staging bucket or prefix.
- Mark the file as client-visible and verify it from the client portal.
- Add BOQ items.
- Generate a quotation document.
- Create an invoice and record a payment.
- Open reports and confirm totals load.
- Send a WhatsApp simulation message.
- Confirm audit logs include login and the tested actions.
- Switch Arabic/English and verify RTL/LTR direction.
- Verify subscription limits on staging data.
- Confirm office isolation with two staging offices.
- Confirm browser console has no production-blocking errors.
- Confirm backend logs have no startup, database, CORS, or R2 errors.

## Troubleshooting

### Backend fails at startup

- Check logs for missing environment variable names.
- Confirm `DATABASE_URL` is set and reachable.
- Confirm `JWT_SECRET` is set.
- If `STORAGE_PROVIDER=r2`, confirm all required `R2_*` variables are set.

### CORS errors

- Confirm `FRONTEND_URL` exactly matches the deployed frontend origin.
- Include scheme and host, for example `https://app.yourdomain.com`.
- If multiple origins are supported by the app config, separate them with commas only if the backend parser supports it.

### R2 uploads fail

- Confirm `STORAGE_PROVIDER=r2`.
- Confirm `R2_ENDPOINT` has no bucket path.
- Confirm `R2_BUCKET` is correct.
- Confirm the R2 token has write/delete permissions.
- Confirm backend logs do not show missing R2 variable names.

### Frontend cannot reach API

- Confirm `VITE_API_URL` points to the backend `/api` URL.
- Confirm the backend health check passes.
- Confirm DNS and TLS certificates are active.

### Migrations fail

- Stop deployment.
- Keep the backup.
- Read the exact SQL/Drizzle error.
- Fix in staging first.
- Do not retry destructive migrations blindly.

### Login works but data is missing

- Confirm the user is linked to the expected `office_id`.
- Confirm database points to the expected environment.
- Confirm office isolation is working and the user is not in an empty staging office.

## Final Release Gate

Production is ready only after:

- CI passes.
- Staging QA passes.
- Database backup exists.
- Required env vars are set.
- R2 upload/download is verified.
- Audit logs are verified.
- Arabic/English switching is verified.
- Office isolation and client portal access are verified.
