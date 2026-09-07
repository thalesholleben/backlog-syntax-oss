#!/bin/sh
set -eu

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${BACKLOG_OWNER_PASSWORD:?BACKLOG_OWNER_PASSWORD is required}"
: "${BACKLOG_AUTH_PASSWORD:?BACKLOG_AUTH_PASSWORD is required}"
: "${BACKLOG_APP_PASSWORD:?BACKLOG_APP_PASSWORD is required}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=database_name="$POSTGRES_DB" \
  --set=owner_password="$BACKLOG_OWNER_PASSWORD" \
  --set=auth_password="$BACKLOG_AUTH_PASSWORD" \
  --set=app_password="$BACKLOG_APP_PASSWORD" \
  --file=/migrations/001_roles.sql

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/002_schema.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/003_rls.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/004_better_auth.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/005_domain_v1.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/006_security_functions.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/007_lease_housekeeping.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/008_privacy_rights.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/009_idempotency_housekeeping.sql
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --file=/migrations/010_task_schedule.sql

if [ -f /seeds/001_two_tenants.sql ]; then
  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --file=/seeds/001_two_tenants.sql
fi

# The official image starts a temporary server while running init scripts. pg_isready alone can
# report that server as healthy before migrations finish and before the final server starts.
touch "$PGDATA/.backlog-init-complete"
