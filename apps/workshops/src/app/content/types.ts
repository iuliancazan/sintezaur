/**
 * Course content contracts. Content lives in code (workshops-spec.md §5):
 * slides and doc pages are HTML strings in the 1920×1080 / A4 coordinate
 * systems of the v02.1 prototype, rendered via [innerHTML] inside the
 * SlideStage / DocPage runtimes. One file per slide — deleting a page is
 * deleting a file plus its manifest line.
 */

export interface SlideDef {
  /** Course id, e.g. "01·03"; the hub slide uses "hub". */
  id: string;
  /** Module number ("00"–"09") or "hub". */
  module: string;
  /** Short editor-facing label (from the prototype's data-label). */
  label: string;
  /** Full-slide HTML, EN and RO, in the 1920×1080 coordinate space. */
  en: string;
  ro: string;
}

export interface DocPageDef {
  /** Page id, e.g. "p1". */
  id: string;
  /** Short editor-facing label shown in the viewer's contents rail. */
  label?: string;
  /** Full-page HTML (A4), one entry per language. */
  en: string;
  ro: string;
}

/**
 * The two cuts of a course: the full programme and the short one. The
 * handbook has no variants — only the deck and the presenter script do.
 */
export type CourseVariant = 'extended' | 'short';
export const COURSE_VARIANTS: readonly CourseVariant[] = ['extended', 'short'];
/** Running time per variant, shown on the switch and the hub cards. */
export const VARIANT_MINUTES: Record<CourseVariant, number> = {
  extended: 90,
  short: 60,
};
export type Decks = Record<CourseVariant, SlideDef[]>;

export interface WorkshopContent {
  slug: string;
  slides: SlideDef[];
}
