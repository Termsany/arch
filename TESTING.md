# Manual Testing Checklist

## Reports And Analytics

- `GET /api/reports/overview` returns totals without crashing.
- `GET /api/reports/projects` returns projects by status, design type, and month.
- `GET /api/reports/clients` returns total clients, new clients per month, and active clients.
- `GET /api/reports/workflow` returns stage status summaries and approval/revision lists.
- `GET /api/reports/finance` returns zeros and empty arrays if invoice tables are not installed.
- `GET /api/reports/tasks` returns zeros and empty arrays if task tables are not installed.
- `GET /api/reports/storage` returns zeros and empty arrays if file tables are not installed.
- `from_date` and `to_date` filters reduce results by created date where available.
- `office_id` filter works only for `super_admin`.
- `office_admin` sees only their office data.
- `super_admin` can see global reports.
- Client users cannot access reports.
- Dashboard shows a small overview summary: invoice value, paid amount, outstanding amount, overdue tasks, and storage used.
- `/reports` loads in Arabic RTL.
- Sidebar shows `التقارير`.
- Reports do not crash with empty data.

## Performance Indexes

- `clients_office_id_idx` exists.
- `projects_office_id_idx` exists.
- `projects_client_id_idx` exists.
- `project_stages_project_id_idx` exists.
- `project_estimates_project_id_idx` exists.
- Optional invoice/payment/task/file indexes are created only when those tables exist.

## Regression Checks

- Login still works.
- Clients list still loads.
- Projects list still loads.
- Project details still loads.
- Dashboard still loads.
- Super-admin-only sidebar items remain hidden for office users.
