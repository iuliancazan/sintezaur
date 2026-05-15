-- Spec §7.12: seed a manual EUR→RON rate so listing/price conversion
-- has a fallback on day 1. Admin updates monthly via dashboard
-- /currency-rates form. Idempotent: only insert if no EUR row yet.

INSERT INTO "currency_rates" ("currency_code", "rate_to_ron", "note")
SELECT 'eur', 5.0700, 'Seed inițial M6-E3; BNR aprox. mai 2026. Înlocuiește când admin pune rata curentă.'
WHERE NOT EXISTS (
  SELECT 1 FROM "currency_rates" WHERE "currency_code" = 'eur'
);
