-- M14-D — Manual image crop metadata for Tezaur cover/thumbnail.
-- Stores the user-selected crop window (in original image pixel coords)
-- so square variants can be regenerated with that crop instead of
-- Sharp's auto smart-crop. Shape: {"x": int, "y": int, "w": int, "h": int}.
-- Set on the row representing the `original` variant — square variants
-- are regenerated from `original` whenever this changes.

ALTER TABLE "gear_images" ADD COLUMN "crop" jsonb;
