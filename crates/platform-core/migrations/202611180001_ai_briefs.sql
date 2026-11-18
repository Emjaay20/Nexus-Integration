ALTER TABLE platform_jobs ADD CONSTRAINT platform_jobs_workspace_id_unique UNIQUE(workspace_id,id);
CREATE TABLE platform_ai_briefs (
    workspace_id uuid NOT NULL REFERENCES platform_workspaces(id),
    job_id uuid NOT NULL,
    version integer NOT NULL,
    lease_token uuid NOT NULL,
    lease_until timestamptz NOT NULL,
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, job_id, version),
    FOREIGN KEY (workspace_id, job_id) REFERENCES platform_jobs(workspace_id, id)
);
CREATE INDEX platform_audit_brief_quota ON platform_audit(workspace_id, created_at) WHERE action = 'job.brief.requested';

ALTER TABLE platform_jobs ADD COLUMN trace_parent text;
