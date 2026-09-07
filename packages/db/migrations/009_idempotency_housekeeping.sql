\set ON_ERROR_STOP on

SET ROLE backlog_owner;

CREATE OR REPLACE FUNCTION private.purge_expired_idempotency_keys(p_batch_size integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, domain AS $$
DECLARE purged_count integer;
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'batch size must be between 1 and 5000' USING ERRCODE = '22023';
  END IF;

  DELETE FROM domain.idempotency_keys AS key
  WHERE key.ctid IN (
    SELECT expired.ctid
    FROM domain.idempotency_keys AS expired
    WHERE expired.expires_at <= now()
    ORDER BY expired.expires_at
    LIMIT p_batch_size
  );
  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END
$$;

REVOKE ALL ON FUNCTION private.purge_expired_idempotency_keys(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.purge_expired_idempotency_keys(integer) TO backlog_app;

RESET ROLE;
