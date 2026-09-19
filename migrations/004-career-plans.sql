CREATE TABLE opportunity_catalog_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  version text NOT NULL
);
CREATE TABLE career_plans (
  owner_id uuid PRIMARY KEY REFERENCES app_users(id),
  profile_id uuid NOT NULL,
  version integer NOT NULL CHECK(version > 0),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(profile_id,owner_id) REFERENCES resume_profile_heads(id,owner_id) ON DELETE CASCADE
);
