-- M16-A postflight: populate forum_categories.{name_en, description_en}
-- for the 8 seeded categories. RO names + descriptions are left
-- untouched. Idempotent on `key` so re-runs are safe.

UPDATE forum_categories SET
  name_en = 'Article discussions',
  description_en = 'Auto-created discussion threads for each published Revista article.'
WHERE key = 'discutii_articole';

UPDATE forum_categories SET
  name_en = 'Tezaur — Questions',
  description_en = 'Gear questions: synths, drum machines, samplers, modular.'
WHERE key = 'tezaur_intrebari';

UPDATE forum_categories SET
  name_en = 'Production',
  description_en = 'DAW, mixing, mastering, studio workflow.'
WHERE key = 'productie';

UPDATE forum_categories SET
  name_en = 'Modular & Eurorack',
  description_en = 'Rack planning, modules, patches, Eurorack troubleshooting.'
WHERE key = 'modular_eurorack';

UPDATE forum_categories SET
  name_en = 'Bazar — Discussions',
  description_en = 'Prices, disputes, seller reviews. Listings live in Bazar.'
WHERE key = 'bazar_discutii';

UPDATE forum_categories SET
  name_en = 'Software & Plugins',
  description_en = 'VST/AU/AAX, DAWs, software synths.'
WHERE key = 'software_plugins';

UPDATE forum_categories SET
  name_en = 'Live & Performance',
  description_en = 'Live setups, MIDI sync, portable hardware, festivals.'
WHERE key = 'live_performance';

UPDATE forum_categories SET
  name_en = 'Gear discussions',
  description_en = 'Canonical Q&A threads per gear, populated by Tezaur.'
WHERE key = 'discutii_echipamente';

UPDATE forum_categories SET
  name_en = 'Announcements',
  description_en = 'Official platform announcements.'
WHERE key = 'anunturi';
