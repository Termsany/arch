ALTER TABLE office_settings
ADD COLUMN IF NOT EXISTS enabled_modules jsonb NOT NULL DEFAULT
'["dashboard","clients","projects","tasks","invoices","reports","audit_logs","whatsapp","boq_library","notifications","subscription","pricing"]'::jsonb;
