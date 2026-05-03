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

## Default Login

- **Email**: admin@example.com
- **Password**: admin123
- **Role**: super_admin

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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Endpoints

- POST /api/auth/login — Login
- GET /api/auth/me — Current user
- GET /api/dashboard/stats — Dashboard statistics
- GET /api/dashboard/recent-projects — Recent 5 projects
- GET /api/dashboard/recent-offices — Recent 5 offices
- GET /api/dashboard/pending-approvals — Projects waiting approval
- CRUD /api/clients
- CRUD /api/projects (creating a project auto-creates 12 workflow stages)
- GET /api/projects/:id/stages — Get project stages
- PUT /api/stages/:stageId — Update stage status/notes
- GET /api/projects/:id/feedback — Get client feedback
- POST /api/projects/:id/feedback — Add client feedback
- GET/POST /api/projects/:id/estimates — Get/add estimate items
- PUT/DELETE /api/estimates/:estimateId — Update/delete estimate item
- CRUD /api/plans + toggle-active + recommended
- GET /api/plans/active — Public, no auth required
- CRUD /api/offices

## Database Schema

Tables: users, subscription_plans, offices, clients, projects, project_stages, client_feedback, project_estimates

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `JWT_SECRET` — JWT signing secret (defaults to hardcoded value if not set)
- `SESSION_SECRET` — Session secret

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
