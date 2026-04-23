-- 14_remove_batch_limit.sql
-- Remove the hardcoded max-10 student capacity limit.
-- Institutes can now set any capacity between 1 and 500.

ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_capacity_check;
ALTER TABLE batches ADD CONSTRAINT batches_capacity_check CHECK (capacity >= 1 AND capacity <= 500);

-- The check_batch_capacity() trigger already reads b.capacity dynamically,
-- so it will continue to enforce whatever limit the admin sets. No code change needed.
