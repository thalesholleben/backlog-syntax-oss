\set ON_ERROR_STOP on

SET ROLE backlog_owner;

DO $$ BEGIN
  CREATE TYPE domain.task_event_type AS ENUM ('evidence', 'decision_request', 'decision', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS domain.workspace_invitations (
  tenant_id uuid NOT NULL REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL DEFAULT uuidv7(), email text NOT NULL,
  role domain.workspace_role NOT NULL, token_hash text NOT NULL,
  expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, PRIMARY KEY (tenant_id, invitation_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
  ON domain.workspace_invitations (tenant_id, lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.task_claims (
  tenant_id uuid NOT NULL, task_id uuid NOT NULL,
  subject_type domain.subject_type NOT NULL, subject_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(), heartbeat_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL, released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, PRIMARY KEY (tenant_id, task_id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES domain.tasks (tenant_id, task_id) ON DELETE CASCADE,
  CHECK (lease_expires_at > claimed_at)
);
CREATE INDEX IF NOT EXISTS idx_task_claims_expiry
  ON domain.task_claims (tenant_id, lease_expires_at) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.task_events (
  tenant_id uuid NOT NULL, event_id uuid NOT NULL DEFAULT uuidv7(), task_id uuid NOT NULL,
  event_type domain.task_event_type NOT NULL, content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  actor_subject_type domain.subject_type NOT NULL, actor_subject_id uuid NOT NULL,
  origin text NOT NULL CHECK (origin IN ('rest', 'mcp', 'system')),
  correlation_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES domain.tasks (tenant_id, task_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_events_task_created
  ON domain.task_events (tenant_id, task_id, created_at, event_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.task_handoffs (
  tenant_id uuid NOT NULL, handoff_id uuid NOT NULL DEFAULT uuidv7(), task_id uuid NOT NULL,
  from_subject_type domain.subject_type NOT NULL, from_subject_id uuid NOT NULL,
  to_subject_type domain.subject_type NOT NULL, to_subject_id uuid NOT NULL,
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, PRIMARY KEY (tenant_id, handoff_id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES domain.tasks (tenant_id, task_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_task
  ON domain.task_handoffs (tenant_id, task_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.idempotency_keys (
  tenant_id uuid NOT NULL, idempotency_key text NOT NULL,
  subject_type domain.subject_type NOT NULL, subject_id uuid NOT NULL,
  operation text NOT NULL, request_hash text NOT NULL, response_status integer NOT NULL,
  response_body jsonb NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, PRIMARY KEY (tenant_id, subject_type, subject_id, operation, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry
  ON domain.idempotency_keys (tenant_id, expires_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.deletion_requests (
  tenant_id uuid NOT NULL, deletion_request_id uuid NOT NULL DEFAULT uuidv7(),
  requested_by_user_id uuid NOT NULL, status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled', 'completed')),
  recoverable_until timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  PRIMARY KEY (tenant_id, deletion_request_id),
  FOREIGN KEY (tenant_id) REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE
);

DO $triggers$
DECLARE target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'domain.workspace_invitations'::regclass, 'domain.task_claims'::regclass,
    'domain.task_events'::regclass, 'domain.task_handoffs'::regclass,
    'domain.idempotency_keys'::regclass, 'domain.deletion_requests'::regclass
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON %s', target);
    EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at()', target);
  END LOOP;
END $triggers$;

DO $policies$
DECLARE target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'domain.workspace_invitations'::regclass, 'domain.task_claims'::regclass,
    'domain.task_events'::regclass, 'domain.task_handoffs'::regclass,
    'domain.idempotency_keys'::regclass, 'domain.deletion_requests'::regclass
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', target);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s FOR ALL TO backlog_app USING (private.has_tenant_access(tenant_id)) WITH CHECK (private.has_tenant_access(tenant_id))', target);
  END LOOP;
END $policies$;

CREATE OR REPLACE FUNCTION private.resolve_task_tenant(
  p_subject_type domain.subject_type, p_subject_id uuid, p_task_id uuid
) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private, domain AS $$
  SELECT task.tenant_id FROM domain.tasks AS task
  WHERE task.task_id = p_task_id AND task.deleted_at IS NULL
    AND private.principal_has_membership(task.tenant_id, p_subject_type, p_subject_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.resolve_project_tenant(
  p_subject_type domain.subject_type, p_subject_id uuid, p_project_id uuid
) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private, domain AS $$
  SELECT project.tenant_id FROM domain.projects AS project
  WHERE project.project_id = p_project_id AND project.deleted_at IS NULL
    AND private.principal_has_membership(project.tenant_id, p_subject_type, p_subject_id)
  LIMIT 1
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA domain FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA domain TO backlog_app;
REVOKE UPDATE, DELETE ON domain.task_events FROM backlog_app;
GRANT EXECUTE ON FUNCTION private.resolve_task_tenant(domain.subject_type, uuid, uuid) TO backlog_app;
GRANT EXECUTE ON FUNCTION private.resolve_project_tenant(domain.subject_type, uuid, uuid) TO backlog_app;
RESET ROLE;
