/**
 * Romanian-aware slugifier per spec §7.13.
 *
 * Rules:
 *   - lowercased
 *   - diacritics transliterated (ș→s, ț→t, ă→a, â→a, î→i and their caps)
 *   - whitespace + non-alphanumerics collapsed to single hyphens
 *   - leading / trailing hyphens trimmed
 *   - capped at 80 chars (min 3 enforced at call site)
 *
 * Pure function — kept FE-friendly so the dashboard can preview a
 * slug as the editor types (no round-trip to the API needed).
 */

const DIACRITIC_MAP: Record<string, string> = {
  ș: 's',
  ş: 's',
  ț: 't',
  ţ: 't',
  ă: 'a',
  â: 'a',
  î: 'i',
};

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 80;

export function slugify(input: string): string {
  if (!input) return '';
  const lower = input.toLowerCase();
  const transliterated = Array.from(lower)
    .map((ch) => DIACRITIC_MAP[ch] ?? ch)
    .join('');
  return transliterated
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Combine multiple parts into a single slug, dropping empties.
 *   slugFromParts('Roland', 'Juno-60') → 'roland-juno-60'
 *   slugFromParts('Make Noise', '0-Coast') → 'make-noise-0-coast'
 */
export function slugFromParts(...parts: (string | null | undefined)[]): string {
  return slugify(parts.filter(Boolean).join(' '));
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

/**
 * Append `-N` (incrementing) so a candidate slug doesn't collide with
 * an existing one. The caller passes a "does this slug exist" probe
 * since uniqueness scope varies by entity (slug across gear is global;
 * forum_thread is per-category; etc.).
 */
export async function uniqueSlug(
  candidate: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  if (!(await exists(candidate))) return candidate;
  for (let i = 2; i <= maxAttempts; i++) {
    const tail = `-${i}`;
    const trimmed = candidate.slice(0, SLUG_MAX_LENGTH - tail.length);
    const next = `${trimmed}${tail}`;
    if (!(await exists(next))) return next;
  }
  throw new Error(
    `Could not find a unique slug variant for "${candidate}" within ${maxAttempts} tries.`,
  );
}
