import { environment } from '../../environments/environment';

/**
 * Build the absolute uploaded-image URL from a `<path>` returned by the
 * API. Mirrors `AppConfigService.imageUrl()` but stays sync + dep-free
 * so SSR / SEO meta builders that run outside the Angular DI graph (e.g.
 * route-data resolvers) can call it. Uses the same prod fallback URL the
 * config endpoint would return; the runtime `AppConfigService` overrides
 * the live FE rendering separately.
 */
export function uploadUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const base = environment.imageBaseUrl.replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
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
