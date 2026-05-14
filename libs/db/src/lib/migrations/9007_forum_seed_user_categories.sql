-- Postflight: seed the visible + remaining system forum categories
-- per spec §8.4. Idempotent on key (matches 9005's pattern).
--
-- Visible: tezaur_intrebari / productie / modular_eurorack /
--          bazar_discutii / software_plugins / live_performance
-- System: discutii_echipamente (canonical gear Q&A — added by
--         Tezaur toggle), anunturi (admin-only announcements).
--
-- position: visible cats land 100-160; system cats sink to 900-920.

INSERT INTO forum_categories (key, slug, name, description, kind, position) VALUES
  ('tezaur_intrebari', 'tezaur-intrebari', 'Tezaur — Întrebări',
   'Întrebări despre echipament: sinteze, drum machines, samplere, modulare.', 'user', 100),
  ('productie', 'productie', 'Producție',
   'DAW, mixing, mastering, workflow în studio.', 'user', 110),
  ('modular_eurorack', 'modular-eurorack', 'Modular & Eurorack',
   'Planificare rack, module, patch-uri, troubleshooting Eurorack.', 'user', 120),
  ('bazar_discutii', 'bazar-discutii', 'Bazar — Discuții',
   'Prețuri, dispute, reviews vânzători. Anunțurile sunt în Bazar.', 'user', 130),
  ('software_plugins', 'software-plugins', 'Software & Plugins',
   'VST/AU/AAX, DAW-uri, soft sintezatoare.', 'user', 140),
  ('live_performance', 'live-performance', 'Live & Performance',
   'Setup live, MIDI sync, hardware portabil, festivaluri.', 'user', 150),
  ('discutii_echipamente', 'discutii-echipamente', 'Discuții echipamente',
   'Thread-uri Q&A canonice per echipament (populate de Tezaur).', 'system', 910),
  ('anunturi', 'anunturi', 'Anunțuri',
   'Anunțuri oficiale ale platformei.', 'system', 920)
ON CONFLICT (key) DO NOTHING;
