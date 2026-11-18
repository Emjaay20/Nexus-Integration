#!/usr/bin/env python3
"""Explicit operator maintenance; dry-run by default, always workspace-scoped."""
import argparse,os,subprocess,uuid
p=argparse.ArgumentParser();p.add_argument('--workspace',required=True,type=uuid.UUID);p.add_argument('--apply',action='store_true');a=p.parse_args()
if not os.environ.get('DATABASE_URL'):p.error('Set DATABASE_URL in the operator environment')
workspace=str(a.workspace)
# IDs are parsed UUIDs, not SQL supplied by a browser or an MCP tool.
predicate=f"workspace_id='{workspace}'::uuid"
queries=[f"SELECT count(*) AS expired_briefs FROM platform_ai_briefs WHERE {predicate} AND job_id IN (SELECT id FROM platform_jobs WHERE {predicate} AND state IN ('completed','failed','cancelled') AND updated_at<now()-interval '30 days')",f"SELECT count(*) AS expired_jobs FROM platform_jobs WHERE {predicate} AND state IN ('completed','failed','cancelled') AND updated_at<now()-interval '30 days'",f"SELECT count(*) AS expired_audit FROM platform_audit WHERE {predicate} AND created_at<now()-interval '90 days'"]
if a.apply:
 queries=[f"DELETE FROM platform_ai_briefs WHERE {predicate} AND job_id IN (SELECT id FROM platform_jobs WHERE {predicate} AND state IN ('completed','failed','cancelled') AND updated_at<now()-interval '30 days')",f"DELETE FROM platform_jobs WHERE {predicate} AND state IN ('completed','failed','cancelled') AND updated_at<now()-interval '30 days'",f"DELETE FROM platform_audit WHERE {predicate} AND created_at<now()-interval '90 days'","DELETE FROM platform_request_limits WHERE expires_at<now()-interval '1 day'"]
# libpq reads PG* environment; keep connection strings out of process arguments.
env=os.environ.copy();env['PGDATABASE']=env.pop('DATABASE_URL');subprocess.run(['psql','-X','-v','ON_ERROR_STOP=1','--single-transaction','-c',';\n'.join(queries)],env=env,check=True)
