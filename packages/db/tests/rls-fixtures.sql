\set ON_ERROR_STOP on

SET ROLE backlog_owner;
SET row_security = off;

INSERT INTO domain.workspace_invitations
  (tenant_id, invitation_id, email, role, token_hash, expires_at)
VALUES
  ('01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000701', 'invite-a@example.com', 'member', 'hash-a', now() + interval '1 day'),
  ('01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000702', 'invite-b@example.com', 'member', 'hash-b', now() + interval '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO domain.task_claims
  (tenant_id, task_id, subject_type, subject_id, lease_expires_at)
VALUES
  ('01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000401', 'user', '01990000-0000-7000-8000-000000000101', now() + interval '1 hour'),
  ('01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000402', 'user', '01990000-0000-7000-8000-000000000102', now() + interval '1 hour')
ON CONFLICT DO NOTHING;

INSERT INTO domain.task_events
  (tenant_id, event_id, task_id, event_type, content, actor_subject_type, actor_subject_id, origin, correlation_id)
VALUES
  ('01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000711', '01990000-0000-7000-8000-000000000401', 'evidence', 'Tenant A evidence', 'user', '01990000-0000-7000-8000-000000000101', 'rest', 'rls-a'),
  ('01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000712', '01990000-0000-7000-8000-000000000402', 'evidence', 'Tenant B evidence', 'user', '01990000-0000-7000-8000-000000000102', 'rest', 'rls-b')
ON CONFLICT DO NOTHING;

INSERT INTO domain.task_handoffs
  (tenant_id, handoff_id, task_id, from_subject_type, from_subject_id, to_subject_type, to_subject_id, note)
VALUES
  ('01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000721', '01990000-0000-7000-8000-000000000401', 'user', '01990000-0000-7000-8000-000000000101', 'service_account', '01990000-0000-7000-8000-000000000201', 'Tenant A handoff'),
  ('01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000722', '01990000-0000-7000-8000-000000000402', 'user', '01990000-0000-7000-8000-000000000102', 'service_account', '01990000-0000-7000-8000-000000000202', 'Tenant B handoff')
ON CONFLICT DO NOTHING;

INSERT INTO domain.idempotency_keys
  (tenant_id, idempotency_key, subject_type, subject_id, operation, request_hash, response_status, response_body, expires_at)
VALUES
  ('01990000-0000-7000-8000-000000000001', 'rls-key-a', 'user', '01990000-0000-7000-8000-000000000101', 'rls-probe', 'request-a', 200, '{}', now() + interval '1 hour'),
  ('01990000-0000-7000-8000-000000000002', 'rls-key-b', 'user', '01990000-0000-7000-8000-000000000102', 'rls-probe', 'request-b', 200, '{}', now() + interval '1 hour')
ON CONFLICT DO NOTHING;

INSERT INTO domain.deletion_requests
  (tenant_id, deletion_request_id, requested_by_user_id)
VALUES
  ('01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000731', '01990000-0000-7000-8000-000000000101'),
  ('01990000-0000-7000-8000-000000000002', '01990000-0000-7000-8000-000000000732', '01990000-0000-7000-8000-000000000102')
ON CONFLICT DO NOTHING;

RESET row_security;
RESET ROLE;
