CREATE TABLE IF NOT EXISTS backboard_context (
 owner_id uuid PRIMARY KEY REFERENCES app_users(id),
 profile_id uuid,
 version integer NOT NULL DEFAULT 0,
 enabled boolean NOT NULL DEFAULT false,
 desired jsonb,
 assistant_id uuid,
 memory_id text,
 applied_version integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'disabled' CHECK(status IN ('disabled','pending','synced','failed','deleting')),
 expires_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0
);
