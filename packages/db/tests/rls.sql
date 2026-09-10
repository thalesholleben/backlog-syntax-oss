\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_user <> 'backlog_app' THEN
    RAISE EXCEPTION 'RLS integration suite must run as backlog_app, got %', current_user;
  END IF;
END
$$;

DO $$
DECLARE
  insecure_roles integer;
  protected_tables integer;
  protected_policies integer;
  tenant_tables text[] := ARRAY[
    'workspaces',
    'workspace_memberships',
    'service_accounts',
    'projects',
    'tasks',
    'api_tokens',
    'workspace_invitations',
    'task_claims',
    'task_events',
    'task_handoffs',
    'idempotency_keys',
    'deletion_requests',
    'rate_limits'
  ];
BEGIN
  SELECT count(*)
  INTO insecure_roles
  FROM pg_roles
  WHERE rolname = 'backlog_app'
    AND (rolsuper OR rolbypassrls);

  IF insecure_roles <> 0 THEN
    RAISE EXCEPTION 'backlog_app must be NOSUPERUSER NOBYPASSRLS';
  END IF;

  SELECT count(*)
  INTO protected_tables
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'domain'
    AND relation.relname = ANY (tenant_tables)
    AND relation.relrowsecurity
    AND relation.relforcerowsecurity;

  IF protected_tables <> cardinality(tenant_tables) THEN
    RAISE EXCEPTION 'all tenant tables must have ENABLE and FORCE RLS, got % of %',
      protected_tables, cardinality(tenant_tables);
  END IF;

  SELECT count(*)
  INTO protected_policies
  FROM pg_policies
  WHERE schemaname = 'domain'
    AND tablename = ANY (tenant_tables)
    AND policyname = 'tenant_isolation';

  IF protected_policies <> cardinality(tenant_tables) THEN
    RAISE EXCEPTION 'every tenant table must have tenant_isolation policy, got % of %',
      protected_policies, cardinality(tenant_tables);
  END IF;

  IF has_schema_privilege('backlog_app', 'auth', 'USAGE')
    OR EXISTS (
      SELECT 1
      FROM pg_class AS auth_relation
      JOIN pg_namespace AS auth_namespace ON auth_namespace.oid = auth_relation.relnamespace
      WHERE auth_namespace.nspname = 'auth'
        AND auth_relation.relname = 'users'
        AND has_table_privilege('backlog_app', auth_relation.oid, 'SELECT')
    ) THEN
    RAISE EXCEPTION 'backlog_app must not access auth schema or users';
  END IF;
END
$$;

DO $$
DECLARE
  table_name text;
  visible_rows integer;
  tenant_tables text[] := ARRAY[
    'workspaces',
    'workspace_memberships',
    'service_accounts',
    'projects',
    'tasks',
    'api_tokens',
    'workspace_invitations',
    'task_claims',
    'task_events',
    'task_handoffs',
    'idempotency_keys',
    'deletion_requests',
    'rate_limits'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('SELECT count(*) FROM domain.%I', table_name) INTO visible_rows;
    IF visible_rows <> 0 THEN
      RAISE EXCEPTION 'missing request context leaked % row(s) from %', visible_rows, table_name;
    END IF;
  END LOOP;
END
$$;

BEGIN;
SELECT private.set_request_context(
  '01990000-0000-7000-8000-000000000001',
  'user',
  '01990000-0000-7000-8000-000000000101'
);

DO $$
DECLARE
  visible_tasks integer;
  cross_tenant_tasks integer;
  changed_rows integer;
  deleted_rows integer;
BEGIN
  SELECT count(*) INTO visible_tasks FROM domain.tasks;
  IF visible_tasks <> 1 THEN
    RAISE EXCEPTION 'tenant A user must see exactly one seeded task, saw %', visible_tasks;
  END IF;

  SELECT count(*)
  INTO cross_tenant_tasks
  FROM domain.tasks
  WHERE task_id = '01990000-0000-7000-8000-000000000402';
  IF cross_tenant_tasks <> 0 THEN
    RAISE EXCEPTION 'cross-tenant SELECT leaked tenant B task';
  END IF;

  INSERT INTO domain.tasks (
    tenant_id,
    task_id,
    project_id,
    title,
    position
  )
  VALUES (
    '01990000-0000-7000-8000-000000000001',
    '01990000-0000-7000-8000-000000000451',
    '01990000-0000-7000-8000-000000000301',
    'Tenant A CRUD probe',
    2000
  );

  UPDATE domain.tasks
  SET title = 'Tenant A CRUD probe updated', version = version + 1
  WHERE task_id = '01990000-0000-7000-8000-000000000451';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'own-tenant UPDATE must affect one row, affected %', changed_rows;
  END IF;

  UPDATE domain.tasks
  SET title = 'cross-tenant write must not happen'
  WHERE task_id = '01990000-0000-7000-8000-000000000402';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 0 THEN
    RAISE EXCEPTION 'cross-tenant UPDATE affected % rows', changed_rows;
  END IF;

  DELETE FROM domain.tasks
  WHERE task_id = '01990000-0000-7000-8000-000000000402';
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  IF deleted_rows <> 0 THEN
    RAISE EXCEPTION 'cross-tenant DELETE affected % rows', deleted_rows;
  END IF;

  DELETE FROM domain.tasks
  WHERE task_id = '01990000-0000-7000-8000-000000000451';
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  IF deleted_rows <> 1 THEN
    RAISE EXCEPTION 'own-tenant DELETE must affect one row, affected %', deleted_rows;
  END IF;
END
$$;

DO $$
DECLARE
  table_name text;
  visible_rows integer;
  foreign_rows integer;
  changed_rows integer;
  new_tenant_tables text[] := ARRAY[
    'workspace_invitations',
    'task_claims',
    'task_events',
    'task_handoffs',
    'idempotency_keys',
    'deletion_requests',
    'rate_limits'
  ];
BEGIN
  FOREACH table_name IN ARRAY new_tenant_tables LOOP
    EXECUTE format('SELECT count(*) FROM domain.%I', table_name) INTO visible_rows;
    IF visible_rows <> 1 THEN
      RAISE EXCEPTION 'tenant A must see one row from %, saw %', table_name, visible_rows;
    END IF;

    EXECUTE format('SELECT count(*) FROM domain.%I WHERE tenant_id = $1', table_name)
      INTO foreign_rows
      USING '01990000-0000-7000-8000-000000000002'::uuid;
    IF foreign_rows <> 0 THEN
      RAISE EXCEPTION 'cross-tenant SELECT leaked % row(s) from %', foreign_rows, table_name;
    END IF;

    IF table_name <> 'task_events' THEN
      EXECUTE format('UPDATE domain.%I SET updated_at = updated_at WHERE tenant_id = $1', table_name)
        USING '01990000-0000-7000-8000-000000000001'::uuid;
      GET DIAGNOSTICS changed_rows = ROW_COUNT;
      IF changed_rows <> 1 THEN
        RAISE EXCEPTION 'own-tenant UPDATE on % affected % rows', table_name, changed_rows;
      END IF;

      EXECUTE format('UPDATE domain.%I SET updated_at = updated_at WHERE tenant_id = $1', table_name)
        USING '01990000-0000-7000-8000-000000000002'::uuid;
      GET DIAGNOSTICS changed_rows = ROW_COUNT;
      IF changed_rows <> 0 THEN
        RAISE EXCEPTION 'cross-tenant UPDATE affected % row(s) in %', changed_rows, table_name;
      END IF;
    END IF;
  END LOOP;

  IF has_table_privilege('domain.task_events', 'UPDATE')
    OR has_table_privilege('domain.task_events', 'DELETE') THEN
    RAISE EXCEPTION 'task event history must be immutable to backlog_app';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO domain.tasks (
      tenant_id,
      task_id,
      project_id,
      title,
      position
    )
    VALUES (
      '01990000-0000-7000-8000-000000000002',
      '01990000-0000-7000-8000-000000000452',
      '01990000-0000-7000-8000-000000000302',
      'cross-tenant insert must fail',
      2000
    );
    RAISE EXCEPTION 'cross-tenant INSERT unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO domain.tasks (
      tenant_id,
      task_id,
      project_id,
      title,
      position
    )
    VALUES (
      '01990000-0000-7000-8000-000000000001',
      '01990000-0000-7000-8000-000000000453',
      '01990000-0000-7000-8000-000000000302',
      'foreign project payload must fail',
      2000
    );
    RAISE EXCEPTION 'cross-tenant project reference unexpectedly succeeded';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    UPDATE domain.tasks
    SET tenant_id = '01990000-0000-7000-8000-000000000002'
    WHERE task_id = '01990000-0000-7000-8000-000000000401';
    RAISE EXCEPTION 'tenant reassignment unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO domain.workspace_memberships (
      tenant_id,
      subject_type,
      subject_id,
      role
    )
    VALUES (
      '01990000-0000-7000-8000-000000000001',
      'service_account',
      '01990000-0000-7000-8000-000000000202',
      'member'
    );
    RAISE EXCEPTION 'service account from tenant B was rebound to tenant A';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    PERFORM private.set_request_context(
      '01990000-0000-7000-8000-000000000002',
      'user',
      '01990000-0000-7000-8000-000000000101'
    );
    RAISE EXCEPTION 'tenant A user impersonated tenant B membership';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM private.set_request_context(
      '01990000-0000-7000-8000-000000000001',
      'service_account',
      '01990000-0000-7000-8000-000000000202'
    );
    RAISE EXCEPTION 'tenant B service account was accepted for tenant A';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
COMMIT;

DO $$
DECLARE
  visible_tasks integer;
BEGIN
  SELECT count(*) INTO visible_tasks FROM domain.tasks;
  IF visible_tasks <> 0 THEN
    RAISE EXCEPTION 'transaction-local context leaked after COMMIT';
  END IF;
END
$$;

BEGIN;
SELECT private.set_request_context(
  '01990000-0000-7000-8000-000000000001',
  'service_account',
  '01990000-0000-7000-8000-000000000201'
);

DO $$
DECLARE
  visible_tasks integer;
  foreign_tokens integer;
BEGIN
  SELECT count(*) INTO visible_tasks FROM domain.tasks;
  IF visible_tasks <> 1 THEN
    RAISE EXCEPTION 'tenant A service account must see exactly one task, saw %', visible_tasks;
  END IF;

  SELECT count(*)
  INTO foreign_tokens
  FROM domain.api_tokens
  WHERE token_id = '01990000-0000-7000-8000-000000000602';
  IF foreign_tokens <> 0 THEN
    RAISE EXCEPTION 'service account saw token metadata from another tenant';
  END IF;
END
$$;
ROLLBACK;

SELECT 'RLS integration suite passed' AS result;
