import type { RenderScriptOptions } from './script/types';
import type { Decks, DocPageDef } from './types';

/**
 * Workshop content registry — maps a workshop slug to its lazily-loaded
 * content. A new workshop = a new content folder + entries here (plus its
 * DB row created in the panel).
 */
export const SLIDES_LOADERS: Record<string, () => Promise<{ DECKS: Decks }>> =
  {
    'sequential-fourm': () => import('./sequential-fourm/slides'),
  };

export const HANDBOOK_LOADERS: Record<
  string,
  () => Promise<{ HANDBOOK_PAGES: DocPageDef[] }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/handbook'),
};

/** The presenter script is rendered per cut and language from its beats. */
export type ScriptRenderer = (options: RenderScriptOptions) => string;

export const SCRIPT_LOADERS: Record<
  string,
  () => Promise<{ renderScript: ScriptRenderer }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/script'),
};
