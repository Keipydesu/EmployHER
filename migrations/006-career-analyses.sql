CREATE TABLE career_analyses (
  owner_id uuid NOT NULL REFERENCES app_users(id),
  context_hash text NOT NULL,
  profile_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,context_hash),
  FOREIGN KEY(profile_id,owner_id) REFERENCES resume_profile_heads(id,owner_id) ON DELETE CASCADE
);
