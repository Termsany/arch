DO $$
BEGIN
  CREATE TYPE whatsapp_message_status AS ENUM ('pending', 'sent', 'failed', 'simulated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id SERIAL PRIMARY KEY,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  message_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  phone VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  message_type VARCHAR(80) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  provider_message_id VARCHAR(200),
  status whatsapp_message_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_office_id_idx ON whatsapp_templates(office_id);
CREATE INDEX IF NOT EXISTS whatsapp_templates_key_idx ON whatsapp_templates(template_key);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_templates_global_key_idx ON whatsapp_templates(template_key) WHERE office_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_templates_office_key_idx ON whatsapp_templates(office_id, template_key) WHERE office_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_office_id_idx ON whatsapp_messages(office_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_project_id_idx ON whatsapp_messages(project_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_client_id_idx ON whatsapp_messages(client_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_invoice_id_idx ON whatsapp_messages(invoice_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS whatsapp_messages_type_idx ON whatsapp_messages(message_type);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_at_idx ON whatsapp_messages(created_at);
