ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS bucket_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS checksum TEXT;

UPDATE project_files
SET storage_provider = 'local'
WHERE storage_provider IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_files_storage_provider
ON project_files(storage_provider);

CREATE INDEX IF NOT EXISTS idx_project_files_storage_key
ON project_files(storage_key);

CREATE INDEX IF NOT EXISTS idx_project_files_office_project
ON project_files(office_id, project_id);
