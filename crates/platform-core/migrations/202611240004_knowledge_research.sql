-- Phase 6 additive tenant-owned knowledge library and controlled research schedules.
-- No source enablement or scheduler activation by this migration.
CREATE TABLE platform_knowledge_documents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES platform_workspaces(id),
  bom_id UUID NOT NULL,
  line_index INTEGER NOT NULL CHECK (line_index BETWEEN 0 AND 49),
  mpn TEXT NOT NULL CHECK (length(mpn) BETWEEN 1 AND 128),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  created_by UUID NOT NULL,
  active_version INTEGER NOT NULL DEFAULT 0 CHECK (active_version BETWEEN 0 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,bom_id) REFERENCES platform_boms(workspace_id,id),
  UNIQUE (workspace_id,id)
);
CREATE INDEX platform_knowledge_bom ON platform_knowledge_documents(workspace_id,bom_id,created_at DESC);

CREATE TABLE platform_knowledge_versions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  document_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 20),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  source_name TEXT NOT NULL CHECK(length(source_name) BETWEEN 1 AND 160),
  page_count INTEGER NOT NULL CHECK (page_count BETWEEN 1 AND 12),
  truncated BOOLEAN NOT NULL DEFAULT false,
  properties JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,document_id) REFERENCES platform_knowledge_documents(workspace_id,id) ON DELETE CASCADE,
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,document_id,version)
);
CREATE INDEX platform_knowledge_history ON platform_knowledge_versions(workspace_id,document_id,version DESC);

CREATE TABLE platform_knowledge_pages (
  workspace_id UUID NOT NULL,
  version_id UUID NOT NULL,
  page_number INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 12),
  text_content TEXT NOT NULL CHECK(octet_length(text_content)<=12000),
  text_search TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', text_content)) STORED,
  PRIMARY KEY(workspace_id,version_id,page_number),
  FOREIGN KEY (workspace_id,version_id) REFERENCES platform_knowledge_versions(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX platform_knowledge_search ON platform_knowledge_pages USING GIN(text_search);

CREATE TABLE platform_research_schedules (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES platform_workspaces(id),
  actor_id UUID NOT NULL,
  bom_id UUID NOT NULL,
  bom_revision BIGINT NOT NULL CHECK (bom_revision>0),
  line_index INTEGER NOT NULL CHECK(line_index BETWEEN 0 AND 49),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
  country TEXT NOT NULL CHECK (country IN ('NG','US','GB','DE','ZA','CN')),
  supplier_id TEXT NOT NULL,
  source_url TEXT NOT NULL CHECK(length(source_url)<=2048),
  authorization_ref TEXT NOT NULL CHECK(length(authorization_ref) BETWEEN 1 AND 200),
  interval_hours INTEGER NOT NULL CHECK(interval_hours BETWEEN 24 AND 720),
  max_runs INTEGER NOT NULL CHECK(max_runs BETWEEN 1 AND 12),
  run_count INTEGER NOT NULL DEFAULT 0 CHECK(run_count BETWEEN 0 AND 12),
  next_run_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','paused','review_required','completed')),
  last_result_id UUID,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,bom_id) REFERENCES platform_boms(workspace_id,id),
  UNIQUE(workspace_id,id),
  UNIQUE(workspace_id,bom_id,bom_revision,line_index,country,supplier_id,source_url)
);
CREATE INDEX platform_research_due ON platform_research_schedules(next_run_at,id) WHERE state='active';
CREATE INDEX platform_research_workspace ON platform_research_schedules(workspace_id,bom_id,created_at DESC);
