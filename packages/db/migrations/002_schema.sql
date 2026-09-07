\set ON_ERROR_STOP on

SET ROLE backlog_owner;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION backlog_owner;
CREATE SCHEMA IF NOT EXISTS domain AUTHORIZATION backlog_owner;
CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION backlog_owner;

REVOKE ALL ON SCHEMA auth, domain, private FROM PUBLIC;

DO $$
BEGIN
  CREATE TYPE domain.subject_type AS ENUM ('user', 'service_account');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE domain.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE domain.task_status AS ENUM ('open', 'in_progress', 'blocked', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE domain.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END
$$;

CREATE TABLE IF NOT EXISTS auth.users (
  user_id uuid PRIMARY KEY DEFAULT uuidv7(),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  email text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_live
  ON auth.users (lower(email))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS auth.identities (
  identity_id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES auth.users (user_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (char_length(provider) BETWEEN 1 AND 80),
  provider_account_id text NOT NULL CHECK (char_length(provider_account_id) BETWEEN 1 AND 255),
  credential_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_identities_provider_account_live
  ON auth.identities (provider, provider_account_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_identities_user
  ON auth.identities (user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.workspaces (
  tenant_id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_slug_live
  ON domain.workspaces (slug)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.service_accounts (
  tenant_id uuid NOT NULL REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE,
  service_account_id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, service_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_accounts_name_live
  ON domain.service_accounts (tenant_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.workspace_memberships (
  tenant_id uuid NOT NULL REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE,
  subject_type domain.subject_type NOT NULL,
  subject_id uuid NOT NULL,
  role domain.workspace_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_subject
  ON domain.workspace_memberships (tenant_id, subject_type, subject_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.projects (
  tenant_id uuid NOT NULL REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE,
  project_id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text CHECK (description IS NULL OR char_length(description) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, project_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_slug_live
  ON domain.projects (tenant_id, slug)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS domain.tasks (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL DEFAULT uuidv7(),
  project_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 50000),
  status domain.task_status NOT NULL DEFAULT 'open',
  priority domain.task_priority NOT NULL DEFAULT 'medium',
  assignee_subject_type domain.subject_type,
  assignee_subject_id uuid,
  blocked_reason text CHECK (blocked_reason IS NULL OR char_length(blocked_reason) <= 2000),
  position numeric(20, 6) NOT NULL DEFAULT 1000 CHECK (position >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, task_id),
  FOREIGN KEY (tenant_id, project_id)
    REFERENCES domain.projects (tenant_id, project_id)
    ON DELETE CASCADE,
  CHECK ((assignee_subject_type IS NULL) = (assignee_subject_id IS NULL)),
  CHECK ((status = 'blocked' AND blocked_reason IS NOT NULL) OR status <> 'blocked')
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status_position
  ON domain.tasks (tenant_id, project_id, status, position, task_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee
  ON domain.tasks (tenant_id, assignee_subject_type, assignee_subject_id)
  WHERE deleted_at IS NULL AND assignee_subject_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS domain.api_tokens (
  tenant_id uuid NOT NULL,
  token_id uuid NOT NULL DEFAULT uuidv7(),
  service_account_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  token_prefix text NOT NULL CHECK (char_length(token_prefix) BETWEEN 8 AND 64),
  secret_hash text NOT NULL CHECK (char_length(secret_hash) BETWEEN 32 AND 512),
  scopes text[] NOT NULL CHECK (
    cardinality(scopes) > 0
    AND scopes <@ ARRAY['read', 'write']::text[]
  ),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, token_id),
  FOREIGN KEY (tenant_id, service_account_id)
    REFERENCES domain.service_accounts (tenant_id, service_account_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_tokens_prefix_live
  ON domain.api_tokens (token_prefix)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_tokens_service_account
  ON domain.api_tokens (tenant_id, service_account_id)
  WHERE deleted_at IS NULL;

DO $triggers$
DECLARE
  target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'auth.users'::regclass,
    'auth.identities'::regclass,
    'domain.workspaces'::regclass,
    'domain.workspace_memberships'::regclass,
    'domain.service_accounts'::regclass,
    'domain.projects'::regclass,
    'domain.tasks'::regclass,
    'domain.api_tokens'::regclass
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON %s', target);
    EXECUTE format(
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at()',
      target
    );
  END LOOP;
END
$triggers$;

REVOKE ALL ON ALL TABLES IN SCHEMA auth, domain FROM PUBLIC, backlog_auth, backlog_app;
GRANT USAGE ON SCHEMA auth TO backlog_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO backlog_auth;

GRANT USAGE ON SCHEMA domain TO backlog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA domain TO backlog_app;

ALTER DEFAULT PRIVILEGES FOR ROLE backlog_owner IN SCHEMA auth
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE backlog_owner IN SCHEMA domain
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE backlog_owner IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backlog_auth;
ALTER DEFAULT PRIVILEGES FOR ROLE backlog_owner IN SCHEMA domain
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backlog_app;

RESET ROLE;
