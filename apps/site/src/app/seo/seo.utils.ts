import { environment } from '../../environments/environment';

/**
 * Build the absolute uploaded-image URL from a `<path>` returned by the
 * API (`/uploads/<file>` is served from the API root, not the `/api`
 * prefix — see `apps/api/src/main.ts`). Returns `undefined` for falsy
 * input so callers can pass it through to `SeoService.set({ ogImage })`
 * without a null-check.
 */
export function uploadUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const apiRoot = environment.apiBaseUrl.replace(/\/api$/, '');
  const normalized = path.startsWith('/') ? path : `/uploads/${path}`;
  return `${apiRoot}${normalized.startsWith('/uploads') ? normalized : `/uploads/${path}`}`;
}

/** Strip HTML tags and collapse whitespace for use in meta descriptions. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate text to ~150 characters at a word boundary for meta description. */
export function clampDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : max)}…`;
}
