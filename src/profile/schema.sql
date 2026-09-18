-- Person A domain migration: Person C must integrate/run once in its migration system.
-- No credentials, platform users table, or destructive migration is included.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE profile_owner_lifecycle (
  owner_id uuid PRIMARY KEY,
  deleted_at timestamptz
);
CREATE TABLE resume_profile_heads (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  current_version integer NOT NULL CHECK (current_version > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX profile_owner_idx ON resume_profile_heads(owner_id);
CREATE TABLE resume_profile_versions (
  profile_id uuid NOT NULL REFERENCES resume_profile_heads(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('draft', 'confirmed')),
  facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'array'),
  embedding vector(768),
  embedding_model text,
  extraction_model text NOT NULL,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (profile_id, version),
  CHECK ((status = 'draft' AND embedding IS NULL AND embedding_model IS NULL)
      OR (status = 'confirmed' AND embedding IS NOT NULL AND embedding_model IS NOT NULL))
);
CREATE TABLE profile_invalidation_events (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES resume_profile_heads(id) ON DELETE CASCADE,
  previous_version integer NOT NULL,
  version integer NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (version = previous_version + 1)
);
-- At integration C adds the owner foreign keys to its users table. It must call
-- deleteOwner and drain/cancel in-flight operations before removing platform users.
