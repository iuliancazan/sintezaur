/**
 * SVG symbol sprite for Sintezaur.
 * Source paths/viewBox lifted from docs/design-imports/2026-05-14-v01.
 *
 * Render once at app bootstrap (see `provideSintezaurIcons` in
 * `libs/ui`), then reference per-icon via `<sz-icon name="search" />`.
 */
export const SINTEZAUR_ICON_NAMES = [
  'search',
  'bell',
  'sun',
  'moon',
  'auto',
  'heart',
  'pin',
  'arrow',
  'x',
  'caret-down',
  'back',
  'chevron-left',
  'chevron-right',
  'check',
  'plus',
  'minus',
  'menu',
  'star',
] as const;

export type SintezaurIconName = (typeof SINTEZAUR_ICON_NAMES)[number];

export const SINTEZAUR_SPRITE_SVG = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" data-sintezaur-sprite>
  <defs>
    <symbol id="sz-i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/>
    </symbol>
    <symbol id="sz-i-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <path d="M6 9a6 6 0 0 1 12 0v4l1.5 3h-15L6 13V9z"/><path d="M10 19a2 2 0 0 0 4 0"/>
    </symbol>
    <symbol id="sz-i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>
    </symbol>
    <symbol id="sz-i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>
    </symbol>
    <symbol id="sz-i-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 12a8 8 0 0 0 0-8" fill="currentColor"/>
    </symbol>
    <symbol id="sz-i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/>
    </symbol>
    <symbol id="sz-i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>
    </symbol>
    <symbol id="sz-i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </symbol>
    <symbol id="sz-i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M5 5l14 14M19 5L5 19"/>
    </symbol>
    <symbol id="sz-i-caret-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M6 9l6 6 6-6"/>
    </symbol>
    <symbol id="sz-i-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M15 6l-6 6 6 6"/>
    </symbol>
    <symbol id="sz-i-chevron-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M14 6l-6 6 6 6"/>
    </symbol>
    <symbol id="sz-i-chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
      <path d="M10 6l6 6-6 6"/>
    </symbol>
    <symbol id="sz-i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
      <path d="M5 12l5 5L20 7"/>
    </symbol>
    <symbol id="sz-i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <path d="M12 5v14M5 12h14"/>
    </symbol>
    <symbol id="sz-i-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <path d="M5 12h14"/>
    </symbol>
    <symbol id="sz-i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </symbol>
    <symbol id="sz-i-star" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </symbol>
  </defs>
</svg>
`.trim();
