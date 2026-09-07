SET ROLE backlog_owner;

CREATE OR REPLACE FUNCTION private.expire_task_leases()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, domain AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE domain.task_claims
  SET released_at = now(), updated_at = now()
  WHERE released_at IS NULL AND lease_expires_at <= now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END
$$;

REVOKE ALL ON FUNCTION private.expire_task_leases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.expire_task_leases() TO backlog_app;

RESET ROLE;
