ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS file_url VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) NOT NULL DEFAULT 'local';

UPDATE project_files
SET storage_provider = 'local'
WHERE storage_provider IS NULL;
