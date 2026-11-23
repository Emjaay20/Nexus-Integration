-- Additive migration. Source policy remains operator-managed; no sites are enabled by migration.
CREATE TABLE platform_regional_sourcing (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES platform_workspaces(id),
  actor_id UUID NOT NULL,
  bom_id UUID NOT NULL,
  bom_revision BIGINT NOT NULL CHECK (bom_revision > 0),
  line_index INTEGER NOT NULL CHECK (line_index BETWEEN 0 AND 499),
  country TEXT NOT NULL CHECK (country IN ('NG','US','GB','DE','ZA','CN')),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  part JSONB NOT NULL,
  supplier_id TEXT NOT NULL,
  request_key UUID NOT NULL,
  fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('quote','research')),
  state TEXT NOT NULL CHECK (state IN ('submitting','submission_unknown','submitted','completed','failed')),
  source_url TEXT,
  policy_ref TEXT,
  model_allowed BOOLEAN NOT NULL DEFAULT false,
  crawler_job_id TEXT,
  poll_token UUID,
  poll_until TIMESTAMPTZ,
  result JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, bom_id) REFERENCES platform_boms(workspace_id,id),
  UNIQUE (workspace_id, request_key),
  CHECK ((kind='quote' AND state='completed' AND result IS NOT NULL) OR kind='research')
);
CREATE INDEX platform_regional_lookup ON platform_regional_sourcing(workspace_id,bom_id,bom_revision,line_index,country,quantity,created_at DESC);
CREATE INDEX platform_regional_daily ON platform_regional_sourcing(workspace_id,created_at DESC);
