-- Reports and analytics performance indexes.
-- Safe to run multiple times.

CREATE INDEX IF NOT EXISTS clients_office_id_idx ON clients(office_id);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON clients(created_at);

CREATE INDEX IF NOT EXISTS projects_office_id_idx ON projects(office_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(project_status);

CREATE INDEX IF NOT EXISTS project_stages_project_id_idx ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS project_stages_status_idx ON project_stages(status);

CREATE INDEX IF NOT EXISTS project_estimates_project_id_idx ON project_estimates(project_id);

CREATE INDEX IF NOT EXISTS invoices_office_id_idx ON invoices(office_id);
CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON invoices(project_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices(due_date);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);

CREATE INDEX IF NOT EXISTS payments_office_id_idx ON payments(office_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);

CREATE INDEX IF NOT EXISTS project_tasks_office_id_idx ON project_tasks(office_id);
CREATE INDEX IF NOT EXISTS project_tasks_assigned_to_idx ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS project_tasks_due_date_idx ON project_tasks(due_date);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON project_tasks(status);

CREATE INDEX IF NOT EXISTS project_files_office_id_idx ON project_files(office_id);
CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files(project_id);
CREATE INDEX IF NOT EXISTS project_files_created_at_idx ON project_files(created_at);
