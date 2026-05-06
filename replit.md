# ArchSaaS - نظام إدارة مشاريع التصميم

## Overview

Full-stack Arabic RTL SaaS web application for architecture and interior design companies. Helps design offices manage client projects through the full design and execution workflow.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Arabic RTL, shadcn/ui, wouter routing)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT (bcryptjs for hashing, jsonwebtoken for tokens)
- **Build**: esbuild (CJS bundle)

## Default Logins

### Admin
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: super_admin

### Client Portal
- **Email**: client@example.com
- **Password**: admin123
- **Role**: client
- **URL**: /client/login

## Features

### Part 1 - Project Management
- Clients CRUD
- Projects CRUD with automatic 12-stage workflow creation
- Project workflow stages management with status tracking
- Client feedback / approvals / revisions
- Estimates / BOQ (Bill of Quantities)

### Part 2 - SaaS Management
- Subscription plans management (3 default plans: فردي, مكتب, شركة)
- Offices CRUD with subscription tracking
- Public pricing page (no auth required)
- Multi-tenancy: each office sees only their own clients/projects

### Part 3 - Client Portal (بوابة العملاء)
- Clients log in at `/client/login` with `role=client` JWT
- `GET /client/projects` — list client's own projects
- `GET /client/projects/:id` — project detail with stage timeline
- Approve stages (موافقة) or request revisions (طلب تعديل)
- View feedback history (سجل الملاحظات)
- Admin: "Create portal account" button per client (key icon in clients list)
- Admin: approval status badges shown on project stages (pending / approved / revision_requested)
- Admin: changing stage status to "في انتظار موافقة العميل" auto-creates a pending approval record
- When client approves/requests revision: stage status updates + feedback record created

## Security
- `authMiddleware` blocks `role=client` tokens from all admin routes (returns 403)
- `clientPortalMiddleware` only accepts `role=client` tokens
- Client API enforces `project.client_id === user.clientId` on every request
- Admin tokens stored in `localStorage.token`; client tokens in `localStorage.clientToken` (separate)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run push-force` — force push schema changes

## API Endpoints

### Auth (both admin + client use same endpoint)
- POST /api/auth/login — Login (returns role in payload)
- GET /api/auth/me — Current admin user (blocked for clients)
- GET /api/auth/client-me — Current client user

### Admin (blocked for role=client)
- GET /api/dashboard/stats — Dashboard statistics
- GET /api/dashboard/recent-projects
- GET /api/dashboard/recent-offices
- GET /api/dashboard/pending-approvals
- CRUD /api/clients
- GET /api/clients/:id/portal-user — Check if client has a portal account
- POST /api/clients/:id/portal-user — Create/update client portal account
- CRUD /api/projects (creating auto-creates 12 stages)
- GET /api/projects/:id/stages
- GET /api/projects/:id/approvals — All stage approvals for admin view
- PUT /api/stages/:stageId — Update stage (auto-creates approval on "في انتظار موافقة العميل")
- GET /api/projects/:id/feedback
- POST /api/projects/:id/feedback
- GET/POST /api/projects/:id/estimates
- PUT/DELETE /api/estimates/:estimateId
- CRUD /api/plans + toggle-active + recommended
- GET /api/plans/active — Public, no auth required
- CRUD /api/offices

### Client Portal (role=client only)
- GET /api/client-portal/projects
- GET /api/client-portal/projects/:id
- GET /api/client-portal/projects/:id/stages — Includes approval status per stage
- GET /api/client-portal/projects/:id/feedback
- POST /api/client-portal/stages/:stageId/approve
- POST /api/client-portal/stages/:stageId/request-revision

## Database Schema

Tables: users (with client_id nullable), subscription_plans, offices, clients, projects, project_stages, client_feedback, project_estimates, stage_approvals

### stage_approvals columns
- id, project_id, stage_id, client_id
- approval_status: 'pending' | 'approved' | 'revision_requested'
- comment (nullable), approved_at (nullable)
- created_at, updated_at

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `JWT_SECRET` — JWT signing secret
- `SESSION_SECRET` — Session secret

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
