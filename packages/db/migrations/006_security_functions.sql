\set ON_ERROR_STOP on

SET ROLE backlog_owner;

CREATE OR REPLACE FUNCTION private.principal_has_membership(
  p_tenant_id uuid, p_subject_type domain.subject_type, p_subject_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, auth, domain AS $$
  SELECT EXISTS (
    SELECT 1 FROM domain.workspace_memberships AS membership
    WHERE membership.tenant_id = p_tenant_id
      AND membership.subject_type = p_subject_type
      AND membership.subject_id = p_subject_id
      AND membership.deleted_at IS NULL
  ) AND CASE p_subject_type
    WHEN 'user'::domain.subject_type THEN
      EXISTS (SELECT 1 FROM auth."user" AS app_user WHERE app_user.id = p_subject_id)
      OR EXISTS (SELECT 1 FROM auth.users AS legacy_user
        WHERE legacy_user.user_id = p_subject_id AND legacy_user.deleted_at IS NULL)
    WHEN 'service_account'::domain.subject_type THEN EXISTS (
      SELECT 1 FROM domain.service_accounts AS service_account
      WHERE service_account.tenant_id = p_tenant_id
        AND service_account.service_account_id = p_subject_id
        AND service_account.deleted_at IS NULL
    )
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION private.validate_membership_principal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, auth, domain AS $$
BEGIN
  IF NEW.subject_type = 'user'::domain.subject_type THEN
    IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE id = NEW.subject_id)
      AND NOT EXISTS (SELECT 1 FROM auth.users WHERE user_id = NEW.subject_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'active user principal does not exist' USING ERRCODE = '23503';
    END IF;
  ELSIF NEW.subject_type = 'service_account'::domain.subject_type THEN
    IF NOT EXISTS (
      SELECT 1 FROM domain.service_accounts AS service_account
      WHERE service_account.tenant_id = NEW.tenant_id
        AND service_account.service_account_id = NEW.subject_id
        AND service_account.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'active service account is not bound to tenant' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.create_workspace(
  p_user_id uuid, p_name text, p_slug text
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, auth, domain AS $$
DECLARE created_tenant_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE id = p_user_id)
    AND NOT EXISTS (SELECT 1 FROM auth.users WHERE user_id = p_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'active user principal does not exist' USING ERRCODE = '42501';
  END IF;
  INSERT INTO domain.workspaces (name, slug) VALUES (p_name, p_slug)
    RETURNING tenant_id INTO created_tenant_id;
  INSERT INTO domain.workspace_memberships (tenant_id, subject_type, subject_id, role)
    VALUES (created_tenant_id, 'user', p_user_id, 'owner');
  RETURN created_tenant_id;
END
$$;

CREATE OR REPLACE FUNCTION private.list_subject_workspaces(
  p_subject_type domain.subject_type, p_subject_id uuid, p_after uuid, p_limit integer
) RETURNS TABLE (
  tenant_id uuid, name text, slug text, role domain.workspace_role,
  created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private, domain AS $$
  SELECT workspace.tenant_id, workspace.name, workspace.slug, membership.role,
    workspace.created_at, workspace.updated_at
  FROM domain.workspace_memberships AS membership
  JOIN domain.workspaces AS workspace ON workspace.tenant_id = membership.tenant_id
  WHERE membership.subject_type = p_subject_type AND membership.subject_id = p_subject_id
    AND membership.deleted_at IS NULL AND workspace.deleted_at IS NULL
    AND (p_after IS NULL OR workspace.tenant_id > p_after)
    AND private.principal_has_membership(workspace.tenant_id, p_subject_type, p_subject_id)
  ORDER BY workspace.tenant_id LIMIT LEAST(GREATEST(p_limit, 1), 101)
$$;

CREATE OR REPLACE FUNCTION private.authenticate_pat(p_prefix text, p_secret_hash text)
RETURNS TABLE (tenant_id uuid, service_account_id uuid, scopes text[])
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, domain AS $$
BEGIN
  RETURN QUERY
    UPDATE domain.api_tokens AS token
    SET last_used_at = now()
    FROM domain.service_accounts AS service_account
    WHERE token.token_prefix = p_prefix AND token.secret_hash = p_secret_hash
      AND token.service_account_id = service_account.service_account_id
      AND token.tenant_id = service_account.tenant_id
      AND token.revoked_at IS NULL AND token.deleted_at IS NULL
      AND service_account.deleted_at IS NULL
      AND (token.expires_at IS NULL OR token.expires_at > now())
    RETURNING token.tenant_id, token.service_account_id, token.scopes;
END
$$;

REVOKE ALL ON FUNCTION private.create_workspace(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.list_subject_workspaces(domain.subject_type, uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.authenticate_pat(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_workspace(uuid, text, text) TO backlog_app;
GRANT EXECUTE ON FUNCTION private.list_subject_workspaces(domain.subject_type, uuid, uuid, integer) TO backlog_app;
GRANT EXECUTE ON FUNCTION private.authenticate_pat(text, text) TO backlog_app;

RESET ROLE;
