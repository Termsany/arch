ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'ar';

CREATE INDEX IF NOT EXISTS idx_users_preferred_language
ON users(preferred_language);
