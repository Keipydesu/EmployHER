CREATE TABLE opportunity_catalog_batches (
  version text PRIMARY KEY,
  digest text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE opportunity_jobs (
  id text PRIMARY KEY,
  catalog_version text NOT NULL REFERENCES opportunity_catalog_batches(version),
  status text NOT NULL,
  role_type text NOT NULL,
  remote_mode text NOT NULL,
  location text NOT NULL,
  path_id text NOT NULL,
  embedding_config text NOT NULL,
  embedding vector(768) NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX opportunity_jobs_filters ON opportunity_jobs(status,role_type,remote_mode,location,path_id);
