CREATE INDEX IF NOT EXISTS clients_office_id_idx ON clients(office_id);
CREATE INDEX IF NOT EXISTS projects_office_id_idx ON projects(office_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS project_stages_project_id_idx ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS project_estimates_project_id_idx ON project_estimates(project_id);

DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS invoices_office_id_idx ON invoices(office_id);
    CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON invoices(project_id);
    CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices(client_id);
  END IF;
  IF to_regclass('public.payments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS payments_office_id_idx ON payments(office_id);
    CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
  END IF;
  IF to_regclass('public.project_tasks') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS project_tasks_office_id_idx ON project_tasks(office_id);
    CREATE INDEX IF NOT EXISTS project_tasks_assigned_to_idx ON project_tasks(assigned_to);
  END IF;
  IF to_regclass('public.project_files') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS project_files_office_id_idx ON project_files(office_id);
    CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files(project_id);
  END IF;
END $$;
