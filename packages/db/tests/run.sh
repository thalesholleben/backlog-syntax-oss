#!/usr/bin/env sh
set -eu

# Keep this POSIX script LF-only because it is mounted directly into Alpine.

run_superuser_psql() {
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    --username postgres \
    --set=ON_ERROR_STOP=1 \
    "$@"
}

attempt=0
until pg_isready --host "$PGHOST" --dbname "$PGDATABASE" --username postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "database did not become ready after completed initialization" >&2
    exit 1
  fi
  sleep 1
done

run_superuser_psql \
  --set=database_name="$PGDATABASE" \
  --set=owner_password="$BACKLOG_OWNER_PASSWORD" \
  --set=auth_password="$BACKLOG_AUTH_PASSWORD" \
  --set=app_password="$BACKLOG_APP_PASSWORD" \
  --file=/migrations/001_roles.sql
run_superuser_psql --file=/migrations/002_schema.sql
run_superuser_psql --file=/migrations/003_rls.sql
run_superuser_psql --file=/migrations/004_better_auth.sql
run_superuser_psql --file=/migrations/005_domain_v1.sql
run_superuser_psql --file=/migrations/006_security_functions.sql
run_superuser_psql --file=/migrations/007_lease_housekeeping.sql
run_superuser_psql --file=/migrations/008_privacy_rights.sql
run_superuser_psql --file=/migrations/009_idempotency_housekeeping.sql
run_superuser_psql --file=/migrations/010_task_schedule.sql
run_superuser_psql --file=/seeds/001_two_tenants.sql
run_superuser_psql --file=/seeds/001_two_tenants.sql
run_superuser_psql --file=/tests/rls-fixtures.sql

if PGPASSWORD="$BACKLOG_OWNER_PASSWORD" psql \
  --username backlog_owner \
  --set=ON_ERROR_STOP=1 \
  --file=/tests/rls.sql >/tmp/owner-sentinel.log 2>&1; then
  echo "owner sentinel unexpectedly passed" >&2
  exit 1
fi

if ! grep -q "must run as backlog_app" /tmp/owner-sentinel.log; then
  echo "owner sentinel failed for an unexpected reason" >&2
  cat /tmp/owner-sentinel.log >&2
  exit 1
fi

PGPASSWORD="$BACKLOG_APP_PASSWORD" psql \
  --username backlog_app \
  --set=ON_ERROR_STOP=1 \
  --file=/tests/rls.sql
