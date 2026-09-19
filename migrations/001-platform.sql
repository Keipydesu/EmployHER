CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  auth_issuer text NOT NULL,
  auth_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz,
  consent_version text,
  consent_at timestamptz,
  UNIQUE(auth_issuer, auth_subject)
);
CREATE TABLE IF NOT EXISTS app_operations (
  owner_id uuid NOT NULL REFERENCES app_users(id),
  kind text NOT NULL,
  key text NOT NULL,
  digest text NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','done')),
  lease_token uuid NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,kind,key),
  CHECK ((state='pending' AND result IS NULL) OR (state='done' AND result IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS app_operations_expiry ON app_operations(expires_at);
CREATE TABLE IF NOT EXISTS app_deletions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL UNIQUE REFERENCES app_users(id),
  status text NOT NULL CHECK(status IN ('pending','failed','completed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_request_quotas (
  scope text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL CHECK(count>=0),
  PRIMARY KEY(scope,day)
);
