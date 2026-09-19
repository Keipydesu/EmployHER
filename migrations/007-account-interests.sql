ALTER TABLE app_users ADD COLUMN IF NOT EXISTS interest_version integer NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS interest_fields jsonb NOT NULL DEFAULT '[]'::jsonb;
