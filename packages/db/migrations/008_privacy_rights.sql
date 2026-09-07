\set ON_ERROR_STOP on

SET ROLE backlog_owner;

ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "privacyNoticeAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "legalNoticeVersion" text;

CREATE TABLE IF NOT EXISTS private.account_deletion_receipts (
  receipt_id uuid PRIMARY KEY DEFAULT uuidv7(),
  deleted_at timestamptz NOT NULL DEFAULT now(),
  memberships_removed integer NOT NULL CHECK (memberships_removed >= 0)
);

REVOKE ALL ON TABLE private.account_deletion_receipts FROM PUBLIC, backlog_auth, backlog_app;

CREATE OR REPLACE FUNCTION private.assert_self(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF nullif(current_setting('app.subject_type', true), '') IS DISTINCT FROM 'user'
    OR nullif(current_setting('app.subject_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'self-service principal mismatch' USING ERRCODE = '42501';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.export_own_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth, private
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM private.assert_self(p_user_id);

  SELECT jsonb_build_object(
    'account', jsonb_build_object(
      'id', app_user.id,
      'name', app_user.name,
      'email', app_user.email,
      'emailVerified', app_user."emailVerified",
      'createdAt', app_user."createdAt",
      'updatedAt', app_user."updatedAt"
      , 'termsAcceptedAt', app_user."termsAcceptedAt"
      , 'privacyNoticeAcceptedAt', app_user."privacyNoticeAcceptedAt"
      , 'legalNoticeVersion', app_user."legalNoticeVersion"
    ),
    'sessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'createdAt', user_session."createdAt",
        'updatedAt', user_session."updatedAt",
        'expiresAt', user_session."expiresAt",
        'ipAddress', user_session."ipAddress",
        'userAgent', user_session."userAgent"
      ) ORDER BY user_session."createdAt")
      FROM auth.session AS user_session
      WHERE user_session."userId" = app_user.id
    ), '[]'::jsonb)
  )
  INTO result
  FROM auth."user" AS app_user
  WHERE app_user.id = p_user_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'account not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END
$$;

CREATE OR REPLACE FUNCTION private.delete_own_account(p_user_id uuid, p_email text)
RETURNS TABLE (receipt_id uuid, deleted_at timestamptz, memberships_removed integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, auth, domain, private
AS $$
DECLARE
  account_email text;
  removed_count integer;
  created_receipt_id uuid;
  deletion_time timestamptz := clock_timestamp();
  anonymous_subject_id constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  PERFORM private.assert_self(p_user_id);

  SELECT app_user.email INTO STRICT account_email
  FROM auth."user" AS app_user
  WHERE app_user.id = p_user_id;

  IF lower(account_email) IS DISTINCT FROM lower(trim(p_email)) THEN
    RAISE EXCEPTION 'confirmation email does not match' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM domain.workspace_memberships AS own_membership
    JOIN domain.workspaces AS workspace
      ON workspace.tenant_id = own_membership.tenant_id
     AND workspace.deleted_at IS NULL
    WHERE own_membership.subject_type = 'user'
      AND own_membership.subject_id = p_user_id
      AND own_membership.role = 'owner'
      AND own_membership.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM domain.workspace_memberships AS other_owner
        WHERE other_owner.tenant_id = own_membership.tenant_id
          AND other_owner.subject_type = 'user'
          AND other_owner.subject_id <> p_user_id
          AND other_owner.role = 'owner'
          AND other_owner.deleted_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'sole owner workspace blocks account deletion' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer INTO removed_count
  FROM domain.workspace_memberships AS membership
  WHERE membership.subject_type = 'user'
    AND membership.subject_id = p_user_id
    AND membership.deleted_at IS NULL;

  DELETE FROM domain.task_claims
  WHERE subject_type = 'user' AND subject_id = p_user_id;

  UPDATE domain.task_events
  SET actor_subject_id = anonymous_subject_id
  WHERE actor_subject_type = 'user' AND actor_subject_id = p_user_id;

  UPDATE domain.task_handoffs
  SET from_subject_id = CASE
      WHEN from_subject_type = 'user' AND from_subject_id = p_user_id
        THEN anonymous_subject_id ELSE from_subject_id END,
    to_subject_id = CASE
      WHEN to_subject_type = 'user' AND to_subject_id = p_user_id
        THEN anonymous_subject_id ELSE to_subject_id END
  WHERE (from_subject_type = 'user' AND from_subject_id = p_user_id)
     OR (to_subject_type = 'user' AND to_subject_id = p_user_id);

  UPDATE domain.service_accounts
  SET created_by_user_id = anonymous_subject_id
  WHERE created_by_user_id = p_user_id;

  UPDATE domain.deletion_requests
  SET requested_by_user_id = anonymous_subject_id
  WHERE requested_by_user_id = p_user_id;

  DELETE FROM domain.idempotency_keys
  WHERE subject_type = 'user' AND subject_id = p_user_id;

  UPDATE domain.workspace_invitations AS invitation
  SET revoked_at = COALESCE(invitation.revoked_at, deletion_time),
    deleted_at = COALESCE(invitation.deleted_at, deletion_time),
    email = 'deleted@invalid.local',
    token_hash = 'deleted'
  WHERE lower(invitation.email) = lower(account_email) AND invitation.deleted_at IS NULL;

  DELETE FROM domain.workspace_memberships
  WHERE subject_type = 'user' AND subject_id = p_user_id;

  DELETE FROM auth.verification
  WHERE lower(identifier) = lower(account_email)
     OR value = p_user_id::text;

  UPDATE auth.users AS legacy_user
  SET display_name = 'Conta excluída',
    email = concat('deleted+', legacy_user.user_id::text, '@invalid.local'),
    deleted_at = deletion_time
  WHERE legacy_user.user_id = p_user_id AND legacy_user.deleted_at IS NULL;

  INSERT INTO private.account_deletion_receipts AS deletion_receipt
    (deleted_at, memberships_removed)
  VALUES (deletion_time, removed_count)
  RETURNING deletion_receipt.receipt_id INTO created_receipt_id;

  DELETE FROM auth."user" WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY SELECT created_receipt_id, deletion_time, removed_count;
END
$$;

REVOKE ALL ON FUNCTION private.assert_self(uuid) FROM PUBLIC, backlog_auth, backlog_app;
REVOKE ALL ON FUNCTION private.export_own_account(uuid) FROM PUBLIC, backlog_auth, backlog_app;
REVOKE ALL ON FUNCTION private.delete_own_account(uuid, text) FROM PUBLIC, backlog_auth, backlog_app;
GRANT EXECUTE ON FUNCTION private.export_own_account(uuid) TO backlog_app;
GRANT EXECUTE ON FUNCTION private.delete_own_account(uuid, text) TO backlog_app;

RESET ROLE;
