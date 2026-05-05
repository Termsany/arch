# ArchSaaS — نظام إدارة مشاريع التصميم

تطبيق SaaS عربي RTL لإدارة مكاتب العمارة والتصميم الداخلي.

## Current Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT
- Multi-tenancy: `office_id`
- Local Docker setup

## Latest Phase: Reports And Analytics

تمت إضافة لوحة تقارير بسيطة وسريعة للمكاتب ومدير النظام:

- صفحة `/reports` بعنوان `التقارير`
- تبويبات:
  - `تقرير عام`
  - `تقرير المشاريع`
  - `تقرير العملاء`
  - `تقرير المراحل`
  - `التقرير المالي`
  - `تقرير المهام`
  - `تقرير التخزين`
- فلاتر:
  - `من تاريخ`
  - `إلى تاريخ`
  - `office_id` لمدير النظام فقط عند توفر API المكاتب
- تقارير office-scoped لكل مستخدم غير `super_admin`
- ملخص صغير في لوحة التحكم من تقرير عام

## New Reports API Routes

- `GET /api/reports/overview`
- `GET /api/reports/projects`
- `GET /api/reports/clients`
- `GET /api/reports/workflow`
- `GET /api/reports/finance`
- `GET /api/reports/tasks`
- `GET /api/reports/storage`

كل المسارات تدعم:

- `from_date=YYYY-MM-DD`
- `to_date=YYYY-MM-DD`
- `office_id` للـ `super_admin` فقط

## Permissions

- `super_admin`: يرى كل التقارير، ويمكنه فلترة مكتب محدد.
- `office_admin`: يرى تقارير مكتبه فقط.
- `accountant`: يصل للتقرير العام والمالي.
- `project_manager`: يصل لتقارير المشاريع، المراحل، المهام، التخزين، والعام.
- `designer`: يصل لتقارير المشاريع والمهام المحدودة.
- `client`: ممنوع من تقارير الإدارة.

## Database Changes

Migration جديد:

- `database/migrations/007_reports_indexes.sql`

الفهارس الأساسية:

- `clients.office_id`
- `projects.office_id`
- `projects.client_id`
- `project_stages.project_id`
- `project_estimates.project_id`

والفهارس الاختيارية تُضاف فقط إذا كانت الجداول موجودة:

- `invoices.office_id`, `invoices.project_id`, `invoices.client_id`
- `payments.office_id`, `payments.invoice_id`
- `project_tasks.office_id`, `project_tasks.assigned_to`
- `project_files.office_id`, `project_files.project_id`

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/arch-saas run dev
```

## Docker Setup

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:5173
```

Backend health:

```text
http://localhost:5173/api/healthz
```

## Test Accounts

- `admin@example.com` / `admin123` — مدير النظام
- `office1admin@example.com` / `admin123` — مكتب 1
- `office2admin@example.com` / `admin123` — مكتب 2

## How To Test Reports

1. Log in as `office1admin@example.com`.
2. Open `/reports`.
3. Confirm only office 1 data appears.
4. Apply `من تاريخ` and `إلى تاريخ` filters.
5. Log in as `admin@example.com`.
6. Confirm global reports appear.
7. If offices API is available, filter by one office and confirm scoped totals.
8. Confirm client tokens cannot access `/api/reports/overview`.
9. Confirm reports return empty arrays/zero totals when optional tables like invoices, tasks, or files are not present.

## Developer Notes

If you modify `lib/api-spec/openapi.yaml`, regenerate generated clients:

```bash
pnpm --filter @workspace/api-spec run codegen
```

After modifying schema files:

```bash
pnpm --filter @workspace/db run push
```

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`

## Arabic RTL Notes

- واجهة التطبيق عربية و RTL.
- استخدم `dir="ltr"` للأرقام والتواريخ عند الحاجة.
- كل التقارير تعرض labels عربية بسيطة ومباشرة.
