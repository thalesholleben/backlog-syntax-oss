ALTER TABLE domain.tasks
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date
  ON domain.tasks (tenant_id, scheduled_date, task_id)
  WHERE deleted_at IS NULL AND archived_at IS NULL;
