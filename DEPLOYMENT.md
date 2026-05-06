# Deployment Guide

## Local Docker

1. Create the local env file:
   ```bash
   cp .env.docker.example .env.docker
   ```
2. Set a strong `JWT_SECRET`.
3. Add local-only secrets to `.env.docker` if you need R2 or WhatsApp.
4. Start the stack:
   ```bash
   docker compose up --build
   ```

## Staging

- Use a separate PostgreSQL database.
- Use a separate R2 bucket and separate access keys.
- Set `NODE_ENV=production`.
- Inject secrets from the staging platform, not from committed files.
- Restrict `FRONTEND_URL` to the staging frontend origin.

## Production

- Use managed PostgreSQL with backups enabled.
- Use a dedicated R2 bucket and least-privilege credentials.
- Set `NODE_ENV=production`.
- Terminate TLS in the load balancer or reverse proxy.
- Keep secrets in the platform secret manager or container runtime.

## PostgreSQL Setup

- Configure `DATABASE_URL`.
- If your platform uses split values, also provide `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
- Run schema setup before starting the backend:
  ```bash
  pnpm --filter @workspace/db run push
  ```

## R2 Setup

- `R2_ENDPOINT` must not include the bucket name.
- Correct format:
  `https://ACCOUNT_ID.r2.cloudflarestorage.com`
- Put the bucket name in `R2_BUCKET`.
- Keep `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` on the backend only.

## Frontend Deployment

- The frontend only needs `VITE_API_URL` if your deployment uses an external API origin.
- Never expose database, JWT, R2, S3, or WhatsApp secrets to the frontend build.

## Backend Deployment

- Required minimum env:
  `PORT`, `DATABASE_URL` or split DB vars, `JWT_SECRET`, `FRONTEND_URL`
- Conditional env:
  `R2_*` when `STORAGE_PROVIDER=r2`
  `S3_*` when `STORAGE_PROVIDER=s3`
  `WHATSAPP_*` when `WHATSAPP_ENABLED=true` and `WHATSAPP_PROVIDER=whatsapp_cloud`

## Migrations

- Run Drizzle push before switching traffic:
  ```bash
  pnpm --filter @workspace/db run push
  ```
- In Docker local, the `migrate` service handles this automatically.

## Backup Strategy

- Enable daily PostgreSQL backups with retention.
- Back up uploaded object storage separately.
- Test restore regularly, not just backup creation.

## Rollback

1. Roll back the application image or release.
2. Restore the database only if the deployment included incompatible writes.
3. If secrets were exposed, rotate them before bringing the system back.

## Troubleshooting

- If the backend fails at startup, check missing env variable names in logs.
- If uploads fail with cloud storage enabled, verify `STORAGE_PROVIDER`, bucket, endpoint, and credentials.
- If CORS fails, confirm `FRONTEND_URL` matches the real frontend origin exactly.

## Secrets and Rotation

- Never commit `.env` or `.env.docker`.
- Use `.env.example` and `.env.docker.example` as templates only.
- Store production secrets in the hosting provider.
- Store GitHub CI secrets in GitHub Actions Secrets.

Rotate these if exposed:
- `JWT_SECRET`
- database passwords in `DATABASE_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `WHATSAPP_ACCESS_TOKEN`
