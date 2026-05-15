-- ============================================================
-- M7-A: Storage refactor — schema (postflight, idempotent).
--
-- Adds the six tables driving the R2 cutover:
--   storage_limits         — admin-editable size caps
--   user_upload_quota      — per-user running counters
--   storage_events         — append-only audit log
--   storage_folder_stats   — incremental rollups
--   forum_post_attachments      — Forum audio/PDF/ZIP
--   revista_article_attachments — Revista audio/PDF/ZIP
--
-- Plus four enum types. All `IF NOT EXISTS` / `CREATE OR REPLACE` so
-- re-running the migration is a no-op.
-- ============================================================

-- ---------- ENUM TYPES ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_limit_scope') THEN
    CREATE TYPE storage_limit_scope AS ENUM (
      'per_file',
      'per_user_daily',
      'per_user_lifetime_alert'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_file_type') THEN
    CREATE TYPE storage_file_type AS ENUM (
      'image',
      'audio',
      'pdf',
      'zip',
      '*'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_module') THEN
    CREATE TYPE storage_module AS ENUM (
      'tezaur',
      'bazar',
      'revista',
      'forum',
      'avatar',
      '*'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_attachment_kind') THEN
    CREATE TYPE storage_attachment_kind AS ENUM (
      'audio',
      'pdf',
      'zip'
    );
  END IF;
END $$;

-- ---------- storage_limits ----------
CREATE TABLE IF NOT EXISTS storage_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       storage_limit_scope NOT NULL,
  file_type   storage_file_type   NOT NULL,
  module      storage_module      NOT NULL,
  max_bytes   bigint              NOT NULL,
  updated_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS storage_limits_scope_type_module_unique
  ON storage_limits (scope, file_type, module);

-- ---------- user_upload_quota ----------
CREATE TABLE IF NOT EXISTS user_upload_quota (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_bytes          bigint NOT NULL DEFAULT 0,
  lifetime_bytes       bigint NOT NULL DEFAULT 0,
  last_reset_at        timestamp with time zone NOT NULL DEFAULT now(),
  notified_lifetime_at timestamp with time zone
);

-- ---------- storage_events ----------
CREATE TABLE IF NOT EXISTS storage_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  module        storage_module    NOT NULL,
  resource_id   text,
  purpose       text              NOT NULL,
  object_key    text              NOT NULL,
  bytes         bigint            NOT NULL,
  content_type  text              NOT NULL,
  file_type     storage_file_type NOT NULL,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS storage_events_module_created_idx
  ON storage_events (module, created_at);
CREATE INDEX IF NOT EXISTS storage_events_user_created_idx
  ON storage_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS storage_events_resource_idx
  ON storage_events (module, resource_id);

-- ---------- storage_folder_stats ----------
CREATE TABLE IF NOT EXISTS storage_folder_stats (
  module       storage_module NOT NULL,
  resource_id  text           NOT NULL,
  total_bytes  bigint         NOT NULL DEFAULT 0,
  file_count   integer        NOT NULL DEFAULT 0,
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS storage_folder_stats_pk
  ON storage_folder_stats (module, resource_id);

-- ---------- forum_post_attachments ----------
CREATE TABLE IF NOT EXISTS forum_post_attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  uploaded_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  kind              storage_attachment_kind NOT NULL,
  object_key        text NOT NULL,
  original_filename text NOT NULL,
  content_type      text NOT NULL,
  bytes             bigint NOT NULL,
  content_hash      text NOT NULL,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_post_attachments_post_idx
  ON forum_post_attachments (post_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS forum_post_attachments_key_unique
  ON forum_post_attachments (object_key);

-- ---------- revista_article_attachments ----------
CREATE TABLE IF NOT EXISTS revista_article_attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id        uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  uploaded_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  kind              storage_attachment_kind NOT NULL,
  object_key        text NOT NULL,
  original_filename text NOT NULL,
  content_type      text NOT NULL,
  bytes             bigint NOT NULL,
  content_hash      text NOT NULL,
  caption           text,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revista_article_attachments_article_idx
  ON revista_article_attachments (article_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS revista_article_attachments_key_unique
  ON revista_article_attachments (object_key);
