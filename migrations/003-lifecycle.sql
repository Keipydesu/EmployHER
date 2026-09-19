ALTER TABLE app_deletions ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX app_deletions_pending ON app_deletions(next_attempt_at) WHERE status<>'completed';
