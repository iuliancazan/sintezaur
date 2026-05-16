-- M16-D — admin "Add gear" form parity with the public contributor flow.
-- The public form only carries EUR MSRP, but scraped JSON imports often
-- list the launch price in USD only (US-market data) and we want a
-- pointer back to the source page (Korg/Yamaha/Reverb price guide etc.).
-- Both columns stay NULLABLE; the UI accepts either or both.

ALTER TABLE "gear"
  ADD COLUMN "msrp_at_launch_usd" numeric(12, 2),
  ADD COLUMN "msrp_source_url" text;
