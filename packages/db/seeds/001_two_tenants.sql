\set ON_ERROR_STOP on

SET ROLE backlog_owner;
SET row_security = off;

INSERT INTO auth.users (user_id, display_name, email, email_verified_at)
VALUES
  ('01990000-0000-7000-8000-000000000101', 'Alice Tenant A', 'alice-a@example.com', now()),
  ('01990000-0000-7000-8000-000000000102', 'Bob Tenant B', 'bob-b@example.com', now())
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    email_verified_at = EXCLUDED.email_verified_at,
    deleted_at = NULL;

INSERT INTO auth.identities (
  identity_id,
  user_id,
  provider,
  provider_account_id,
  credential_hash
)
VALUES
  (
    '01990000-0000-7000-8000-000000000501',
    '01990000-0000-7000-8000-000000000101',
    'credential',
    'alice-a@example.com',
    'argon2id-test-fixture-placeholder-alice-000000000000'
  ),
  (
    '01990000-0000-7000-8000-000000000502',
    '01990000-0000-7000-8000-000000000102',
    'credential',
    'bob-b@example.com',
    'argon2id-test-fixture-placeholder-bob-00000000000000'
  )
ON CONFLICT (identity_id) DO UPDATE
SET provider_account_id = EXCLUDED.provider_account_id,
    credential_hash = EXCLUDED.credential_hash,
    deleted_at = NULL;

INSERT INTO domain.workspaces (tenant_id, name, slug)
VALUES
  ('01990000-0000-7000-8000-000000000001', 'Tenant A', 'tenant-a'),
  ('01990000-0000-7000-8000-000000000002', 'Tenant B', 'tenant-b')
ON CONFLICT (tenant_id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    deleted_at = NULL;

INSERT INTO domain.service_accounts (
  tenant_id,
  service_account_id,
  name,
  description,
  created_by_user_id
)
VALUES
  (
    '01990000-0000-7000-8000-000000000001',
    '01990000-0000-7000-8000-000000000201',
    'Agent A',
    'Deterministic tenant A test principal',
    '01990000-0000-7000-8000-000000000101'
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    '01990000-0000-7000-8000-000000000202',
    'Agent B',
    'Deterministic tenant B test principal',
    '01990000-0000-7000-8000-000000000102'
  )
ON CONFLICT (tenant_id, service_account_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    deleted_at = NULL;

INSERT INTO domain.workspace_memberships (tenant_id, subject_type, subject_id, role)
VALUES
  (
    '01990000-0000-7000-8000-000000000001',
    'user',
    '01990000-0000-7000-8000-000000000101',
    'owner'
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    'user',
    '01990000-0000-7000-8000-000000000102',
    'owner'
  ),
  (
    '01990000-0000-7000-8000-000000000001',
    'service_account',
    '01990000-0000-7000-8000-000000000201',
    'member'
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    'service_account',
    '01990000-0000-7000-8000-000000000202',
    'member'
  )
ON CONFLICT (tenant_id, subject_type, subject_id) DO UPDATE
SET role = EXCLUDED.role,
    deleted_at = NULL;

INSERT INTO domain.projects (tenant_id, project_id, name, slug, description)
VALUES
  (
    '01990000-0000-7000-8000-000000000001',
    '01990000-0000-7000-8000-000000000301',
    'Project A',
    'project-a',
    'Tenant A isolation fixture'
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    '01990000-0000-7000-8000-000000000302',
    'Project B',
    'project-b',
    'Tenant B isolation fixture'
  )
ON CONFLICT (tenant_id, project_id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    deleted_at = NULL;

INSERT INTO domain.tasks (
  tenant_id,
  task_id,
  project_id,
  title,
  description,
  priority,
  position
)
VALUES
  (
    '01990000-0000-7000-8000-000000000001',
    '01990000-0000-7000-8000-000000000401',
    '01990000-0000-7000-8000-000000000301',
    'Task A',
    'Tenant A private task',
    'high',
    1000
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    '01990000-0000-7000-8000-000000000402',
    '01990000-0000-7000-8000-000000000302',
    'Task B',
    'Tenant B private task',
    'urgent',
    1000
  )
ON CONFLICT (tenant_id, task_id) DO UPDATE
SET project_id = EXCLUDED.project_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    deleted_at = NULL;

INSERT INTO domain.api_tokens (
  tenant_id,
  token_id,
  service_account_id,
  name,
  token_prefix,
  secret_hash,
  scopes
)
VALUES
  (
    '01990000-0000-7000-8000-000000000001',
    '01990000-0000-7000-8000-000000000601',
    '01990000-0000-7000-8000-000000000201',
    'Agent A token',
    'bks_test_a_0001',
    'argon2id-test-fixture-placeholder-token-a-0000000000',
    ARRAY['read', 'write']
  ),
  (
    '01990000-0000-7000-8000-000000000002',
    '01990000-0000-7000-8000-000000000602',
    '01990000-0000-7000-8000-000000000202',
    'Agent B token',
    'bks_test_b_0001',
    'argon2id-test-fixture-placeholder-token-b-0000000000',
    ARRAY['read']
  )
ON CONFLICT (tenant_id, token_id) DO UPDATE
SET name = EXCLUDED.name,
    secret_hash = EXCLUDED.secret_hash,
    scopes = EXCLUDED.scopes,
    revoked_at = NULL,
    deleted_at = NULL;

RESET row_security;
RESET ROLE;
