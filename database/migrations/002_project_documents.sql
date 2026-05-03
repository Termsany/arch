DO $$
BEGIN
  CREATE TYPE project_document_type AS ENUM ('quotation', 'project_report', 'boq');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS project_documents (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type project_document_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  html_content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_documents_office_id_idx ON project_documents(office_id);
CREATE INDEX IF NOT EXISTS project_documents_project_id_idx ON project_documents(project_id);
