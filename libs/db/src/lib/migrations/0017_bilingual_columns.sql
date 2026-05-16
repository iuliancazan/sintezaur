-- M16-A: Bilingual platform support — optional EN columns on
-- catalog/editorial tables and a user preference for the
-- in-app locale. RO remains the default; EN is purely additive.
--
-- Strategy: NULLABLE columns with no defaults. Reads fall back to
-- the RO field when the EN counterpart is NULL (service layer);
-- search vectors are regenerated in a later postflight to include
-- the EN body.
--
-- Forum categories get their EN seed in postflight 9017.

ALTER TABLE "articles"
  ADD COLUMN "title_en" text,
  ADD COLUMN "excerpt_en" text,
  ADD COLUMN "body_en" jsonb,
  ADD COLUMN "body_html_en" text;
--> statement-breakpoint

ALTER TABLE "legal_pages"
  ADD COLUMN "title_en" text,
  ADD COLUMN "body_md_en" text,
  ADD COLUMN "meta_description_en" text;
--> statement-breakpoint

ALTER TABLE "gear"
  ADD COLUMN "tagline_ro" text,
  ADD COLUMN "tagline_en" text;
--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN "preferred_locale" "locale" DEFAULT 'ro' NOT NULL;
--> statement-breakpoint

ALTER TABLE "forum_categories"
  ADD COLUMN "name_en" text,
  ADD COLUMN "description_en" text;
