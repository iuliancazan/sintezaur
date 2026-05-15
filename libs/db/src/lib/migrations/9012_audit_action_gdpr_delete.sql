-- Spec §7.10 + §11: GDPR self-delete needs a distinct audit-log action
-- so it's filterable in /audit-log without poking into `details` JSON.
-- ALTER TYPE ADD VALUE IF NOT EXISTS is idempotent on every run.

ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'gdpr_self_delete';
