\set ON_ERROR_STOP on

SET ROLE backlog_owner;

-- Autoria da tarefa. Nullable de proposito: as tarefas criadas antes desta migration
-- nao tem autor atribuivel, e inventar um valor num campo de atribuicao mente com a
-- mesma confianca com que os outros dizem a verdade. NULL diz "criada antes de existir
-- atribuicao", que e o fato.
ALTER TABLE domain.tasks
  ADD COLUMN IF NOT EXISTS created_by_subject_type domain.subject_type,
  ADD COLUMN IF NOT EXISTS created_by_subject_id uuid;

DO $authorship$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'domain.tasks'::regclass AND conname = 'tasks_created_by_pair'
  ) THEN
    ALTER TABLE domain.tasks
      ADD CONSTRAINT tasks_created_by_pair
      CHECK ((created_by_subject_type IS NULL) = (created_by_subject_id IS NULL));
  END IF;
END $authorship$;

-- Balde de rate limit por principal. Vive no Postgres, e nao na memoria do processo,
-- porque memoria concede um orcamento por replica e faz o limite anunciado no contrato
-- deixar de valer no instante em que a API escalar. Precedente: idempotency_keys.
CREATE TABLE IF NOT EXISTS domain.rate_limits (
  tenant_id uuid NOT NULL,
  subject_type domain.subject_type NOT NULL,
  subject_id uuid NOT NULL,
  bucket text NOT NULL CHECK (char_length(bucket) BETWEEN 1 AND 64),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, subject_type, subject_id, bucket),
  FOREIGN KEY (tenant_id) REFERENCES domain.workspaces (tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON domain.rate_limits (window_started_at);

DROP TRIGGER IF EXISTS trg_touch_updated_at ON domain.rate_limits;
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON domain.rate_limits
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

ALTER TABLE domain.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain.rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON domain.rate_limits;
CREATE POLICY tenant_isolation ON domain.rate_limits FOR ALL TO backlog_app
  USING (private.has_tenant_access(tenant_id))
  WITH CHECK (private.has_tenant_access(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON domain.rate_limits TO backlog_app;

-- Housekeeping no mesmo padrao do purge de idempotency_keys.
CREATE OR REPLACE FUNCTION private.purge_expired_rate_limits(
  p_retention interval DEFAULT interval '1 day',
  p_batch_size integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, domain AS $purge$
DECLARE purged_count integer;
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'batch size must be between 1 and 5000' USING ERRCODE = '22023';
  END IF;

  DELETE FROM domain.rate_limits AS limit_row
  WHERE limit_row.ctid IN (
    SELECT stale.ctid
    FROM domain.rate_limits AS stale
    WHERE stale.window_started_at <= now() - p_retention
    ORDER BY stale.window_started_at
    LIMIT p_batch_size
  );
  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END
$purge$;

REVOKE ALL ON FUNCTION private.purge_expired_rate_limits(interval, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.purge_expired_rate_limits(interval, integer) TO backlog_app;

-- A exclusao de conta anonimiza rastro por rastro, tabela por tabela. Todo identificador
-- pessoal novo precisa entrar aqui, senao sobrevive a exclusao por omissao. Esta funcao e
-- a de 008 com dois acrescimos: autoria da tarefa e os baldes do usuario.
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

  -- Autoria e identificador pessoal: anonimiza como ja se faz com task_events.
  UPDATE domain.tasks
  SET created_by_subject_id = anonymous_subject_id
  WHERE created_by_subject_type = 'user' AND created_by_subject_id = p_user_id;

  DELETE FROM domain.rate_limits
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

REVOKE ALL ON FUNCTION private.delete_own_account(uuid, text) FROM PUBLIC, backlog_auth, backlog_app;
GRANT EXECUTE ON FUNCTION private.delete_own_account(uuid, text) TO backlog_app;

RESET ROLE;
