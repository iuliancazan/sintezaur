-- Postflight: seed default badges per spec §7.4 + M5-F interview.
-- Idempotent on `key`. Adminul poate adăuga badges noi din dashboard
-- după acest seed (kind-urile suportate: post_count, account_age_days,
-- likes_received — vezi BadgeAwardingService).
--
-- Position groups: 100-199 = activity (post_count), 200-299 = membership
-- (account_age_days), 300-399 = content (likes_received).

INSERT INTO badges (key, name_ro, name_en, category, description_ro, description_en, criteria, position) VALUES
  ('first_post', 'Primul post', 'First post',
   'activity',
   'Ai publicat prima ta postare pe forum.',
   'You published your first post on the forum.',
   '{"kind":"post_count","threshold":1}'::jsonb, 100),
  ('ten_posts', '10 postări', '10 posts',
   'activity',
   'Ai depășit pragul de 10 postări aprobate.',
   'You crossed the 10-approved-posts mark.',
   '{"kind":"post_count","threshold":10}'::jsonb, 110),
  ('hundred_posts', '100 postări', '100 posts',
   'activity',
   'Ai depășit pragul de 100 postări aprobate.',
   'You crossed the 100-approved-posts mark.',
   '{"kind":"post_count","threshold":100}'::jsonb, 120),
  ('member_one_year', 'Veteran (1 an)', 'Veteran (1 year)',
   'membership',
   'Cont activ de cel puțin un an.',
   'Active account for at least one year.',
   '{"kind":"account_age_days","threshold":365}'::jsonb, 200),
  ('first_useful', 'Prima reacție „Util"', 'First useful reaction',
   'content',
   'Ai primit prima reacție „Util" pe o postare.',
   'You received your first useful reaction on a post.',
   '{"kind":"likes_received","threshold":1}'::jsonb, 300),
  ('fifty_useful', '50 reacții „Util"', '50 useful reactions',
   'content',
   'Ai acumulat 50 de reacții „Util" pe postările tale.',
   'You collected 50 useful reactions across your posts.',
   '{"kind":"likes_received","threshold":50}'::jsonb, 310)
ON CONFLICT (key) DO NOTHING;
