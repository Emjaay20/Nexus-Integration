CREATE TABLE platform_workspaces (
 id UUID PRIMARY KEY, name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE platform_memberships (
 workspace_id UUID NOT NULL REFERENCES platform_workspaces(id), user_id UUID NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('owner','design_engineer','viewer')),
 PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE platform_user_context (
 user_id UUID PRIMARY KEY, workspace_id UUID NOT NULL,
 FOREIGN KEY(workspace_id,user_id) REFERENCES platform_memberships(workspace_id,user_id)
);
CREATE TABLE platform_boms (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES platform_workspaces(id), created_by UUID NOT NULL,
 name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160), revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),
 items JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,id)
);
CREATE INDEX platform_boms_workspace_updated ON platform_boms(workspace_id,updated_at DESC);
CREATE TABLE platform_audit (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES platform_workspaces(id), actor_id UUID NOT NULL,
 resource_id UUID, action TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('allow','deny')),
 reason TEXT NOT NULL, request_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_audit_workspace_time ON platform_audit(workspace_id,created_at DESC);
CREATE TABLE platform_jobs (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES platform_workspaces(id), actor_id UUID NOT NULL,
 bom_id UUID NOT NULL, bom_revision BIGINT NOT NULL, items JSONB NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','retry_wait','completed','failed','cancelled')),
 attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt>=0), max_attempts INTEGER NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 5),
 progress INTEGER NOT NULL DEFAULT 0 CHECK(progress>=0 AND progress<=total), total INTEGER NOT NULL CHECK(total BETWEEN 1 AND 500), result JSONB, error TEXT,
 lease_token UUID, lease_until TIMESTAMPTZ, available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 request_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,bom_id) REFERENCES platform_boms(workspace_id,id)
);
CREATE INDEX platform_jobs_claim ON platform_jobs(available_at,created_at) WHERE state IN ('queued','retry_wait','running');
CREATE INDEX platform_jobs_workspace_time ON platform_jobs(workspace_id,created_at DESC);
ALTER TABLE platform_jobs ADD COLUMN idempotency_key UUID NOT NULL;
CREATE UNIQUE INDEX platform_jobs_idempotency ON platform_jobs(workspace_id,idempotency_key);
