\set ON_ERROR_STOP on

SET ROLE backlog_owner;

CREATE OR REPLACE FUNCTION private.principal_has_membership(
  p_tenant_id uuid,
  p_subject_type domain.subject_type,
  p_subject_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth, domain
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM domain.workspace_memberships AS membership
    WHERE membership.tenant_id = p_tenant_id
      AND membership.subject_type = p_subject_type
      AND membership.subject_id = p_subject_id
      AND membership.deleted_at IS NULL
  )
  AND CASE p_subject_type
    WHEN 'user'::domain.subject_type THEN EXISTS (
      SELECT 1
      FROM auth.users AS app_user
      WHERE app_user.user_id = p_subject_id
        AND app_user.deleted_at IS NULL
    )
    WHEN 'service_account'::domain.subject_type THEN EXISTS (
      SELECT 1
      FROM domain.service_accounts AS service_account
      WHERE service_account.tenant_id = p_tenant_id
        AND service_account.service_account_id = p_subject_id
        AND service_account.deleted_at IS NULL
    )
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION private.has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, private, domain
AS $$
  SELECT
    p_tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    AND private.principal_has_membership(
      p_tenant_id,
      nullif(current_setting('app.subject_type', true), '')::domain.subject_type,
      nullif(current_setting('app.subject_id', true), '')::uuid
    )
$$;

CREATE OR REPLACE FUNCTION private.set_request_context(
  p_tenant_id uuid,
  p_subject_type domain.subject_type,
  p_subject_id uuid
)
RETURNS domain.workspace_role
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, auth, domain, private
AS $$
DECLARE
  resolved_role domain.workspace_role;
BEGIN
  IF NOT private.principal_has_membership(p_tenant_id, p_subject_type, p_subject_id) THEN
    RAISE EXCEPTION 'principal has no active membership in tenant'
      USING ERRCODE = '42501';
  END IF;

  SELECT membership.role
  INTO STRICT resolved_role
  FROM domain.workspace_memberships AS membership
  WHERE membership.tenant_id = p_tenant_id
    AND membership.subject_type = p_subject_type
    AND membership.subject_id = p_subject_id
    AND membership.deleted_at IS NULL;

  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
  PERFORM set_config('app.subject_type', p_subject_type::text, true);
  PERFORM set_config('app.subject_id', p_subject_id::text, true);
  PERFORM set_config('app.role', resolved_role::text, true);

  RETURN resolved_role;
END
$$;

CREATE OR REPLACE FUNCTION private.validate_membership_principal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth, domain
AS $$
BEGIN
  IF NEW.subject_type = 'user'::domain.subject_type THEN
    IF NOT EXISTS (
      SELECT 1
      FROM auth.users AS app_user
      WHERE app_user.user_id = NEW.subject_id
        AND app_user.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'active user principal does not exist'
        USING ERRCODE = '23503';
    END IF;
  ELSIF NEW.subject_type = 'service_account'::domain.subject_type THEN
    IF NOT EXISTS (
      SELECT 1
      FROM domain.service_accounts AS service_account
      WHERE service_account.tenant_id = NEW.tenant_id
        AND service_account.service_account_id = NEW.subject_id
        AND service_account.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'active service account is not bound to tenant'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_membership_principal
  ON domain.workspace_memberships;
CREATE TRIGGER trg_validate_membership_principal
  BEFORE INSERT OR UPDATE OF tenant_id, subject_type, subject_id, deleted_at
  ON domain.workspace_memberships
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION private.validate_membership_principal();

DO $policies$
DECLARE
  target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'domain.workspaces'::regclass,
    'domain.workspace_memberships'::regclass,
    'domain.service_accounts'::regclass,
    'domain.projects'::regclass,
    'domain.tasks'::regclass,
    'domain.api_tokens'::regclass
  ]
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', target);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s FOR ALL TO backlog_app USING (private.has_tenant_access(tenant_id)) WITH CHECK (private.has_tenant_access(tenant_id))',
      target
    );
  END LOOP;
END
$policies$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, backlog_auth, backlog_app;
GRANT USAGE ON SCHEMA private TO backlog_app;
GRANT EXECUTE ON FUNCTION private.has_tenant_access(uuid) TO backlog_app;
GRANT EXECUTE ON FUNCTION private.set_request_context(uuid, domain.subject_type, uuid)
  TO backlog_app;

ALTER DEFAULT PRIVILEGES FOR ROLE backlog_owner IN SCHEMA private
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;

RESET ROLE;
