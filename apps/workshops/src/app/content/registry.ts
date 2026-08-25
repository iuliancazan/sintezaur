import type { SlideDef } from './types';

/**
 * Workshop content registry — maps a workshop slug to its lazily-loaded
 * content. A new workshop = a new content folder + one entry here (plus its
 * DB row created in the panel).
 */
export const SLIDES_LOADERS: Record<
  string,
  () => Promise<{ SLIDES: SlideDef[] }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/slides'),
};
