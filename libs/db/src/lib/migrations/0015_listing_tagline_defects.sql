-- M12-A — Bazar listing extras for the V07 "Sell" page.
-- Two new optional text columns: a single-line tagline that surfaces
-- in the live preview card and a free-form defects note that sits
-- next to the existing condition note (which only applies when
-- condition='mint'). Nothing else moves — every other "nice" field
-- in the V07 mockup stays UI-only for now.

ALTER TABLE "listings" ADD COLUMN "tagline" varchar(200);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "defects" text;
