ALTER TABLE offices
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS dark_logo_url text,
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS brand_color varchar(20) DEFAULT '#dc2626';
