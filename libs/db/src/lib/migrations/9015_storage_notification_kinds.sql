-- ============================================================
-- M7-B: register new notification kind for the storage lifetime
-- quota alert. Fires once per user when their cumulative upload
-- bytes cross the `per_user_lifetime_alert` threshold.
-- ============================================================

ALTER TYPE notification_kind
  ADD VALUE IF NOT EXISTS 'storage_quota_lifetime_reached';
