import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Global SVG sprite. Mount once at app root; reference symbols
 * elsewhere via `<svg><use href="#i-grid"/></svg>`. Lifted from
 * docs/design-imports/2026-05-16-v04 1:1 with no edits.
 */
@Component({
  selector: 'sz-admin-icons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.5-4.5" />
        </symbol>
        <symbol id="i-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M6 9a6 6 0 0 1 12 0v4l1.5 3h-15L6 13V9z" /><path d="M10 19a2 2 0 0 0 4 0" />
        </symbol>
        <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </symbol>
        <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </symbol>
        <symbol id="i-chev-l" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M14 6l-6 6 6 6" />
        </symbol>
        <symbol id="i-chev-d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
          <path d="M6 10l6 6 6-6" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </symbol>
        <symbol id="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="2.5" /><path d="M16 14a5 5 0 0 1 5.5 5" />
        </symbol>
        <symbol id="i-archive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <rect x="3" y="4" width="18" height="4" /><path d="M5 8v12h14V8" /><path d="M10 12h4" />
        </symbol>
        <symbol id="i-tag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="8" cy="9" r="1.5" />
        </symbol>
        <symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M4 4h7a3 3 0 0 1 3 3v13" /><path d="M20 4h-7a3 3 0 0 0-3 3v13" />
          <path d="M4 4v15h7" /><path d="M20 4v15h-7" />
        </symbol>
        <symbol id="i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M4 5h16v12H8l-4 4V5z" />
        </symbol>
        <symbol id="i-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M5 21V4h12l-2 4 2 4H5" />
        </symbol>
        <symbol id="i-log" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <rect x="4" y="3" width="16" height="18" /><path d="M8 8h8M8 12h8M8 16h5" />
        </symbol>
        <symbol id="i-coins" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
          <path d="M3 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
          <ellipse cx="17" cy="14" rx="4" ry="2" /><path d="M13 14v5c0 1.1 1.8 2 4 2s4-.9 4-2v-5" />
        </symbol>
        <symbol id="i-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M12 2l3 4 5 1-3 4 1 5-6-2-6 2 1-5-3-4 5-1z" />
        </symbol>
        <symbol id="i-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M4 7h12M4 12h8M4 17h14" /><circle cx="18" cy="7" r="2" />
          <circle cx="14" cy="12" r="2" /><circle cx="20" cy="17" r="2" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
          <path d="M12 3l10 18H2z" /><path d="M12 10v5" />
          <circle cx="12" cy="18" r="0.7" fill="currentColor" />
        </symbol>
        <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5" />
          <circle cx="12" cy="8" r="0.7" fill="currentColor" />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M20 11a8 8 0 1 1-2.3-5.7L20 8" /><path d="M20 4v4h-4" />
        </symbol>
        <symbol id="i-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">
          <path d="M5 5h7M5 5v14h14v-7M14 4h6v6M11 13l9-9" />
        </symbol>
        <symbol id="i-density" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M4 5h16M4 12h16M4 19h16" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <path d="M5 12l5 5L20 7" />
        </symbol>
        <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path d="M5 5l14 14M19 5L5 19" />
        </symbol>
        <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M12 4v12M6 10l6-6 6 6M4 20h16" />
        </symbol>
        <symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M12 4v12M6 12l6 6 6-6M4 20h16" />
        </symbol>
        <symbol id="i-more" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
        </symbol>
        <symbol id="i-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M3 6h7l2 3h9v11H3z" />
        </symbol>
        <symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <rect x="3" y="5" width="18" height="14" /><path d="M3 5l9 7 9-7" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
          <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
        </symbol>
      </defs>
    </svg>
  `,
})
export class AdminIconsComponent {}
