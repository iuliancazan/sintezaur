import type { DocPageDef, SlideDef } from './types';

/**
 * Workshop content registry — maps a workshop slug to its lazily-loaded
 * content. A new workshop = a new content folder + entries here (plus its
 * DB row created in the panel).
 */
export const SLIDES_LOADERS: Record<
  string,
  () => Promise<{ SLIDES: SlideDef[] }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/slides'),
};

export interface FlowingDoc {
  en: string;
  ro: string;
}

export const HANDBOOK_LOADERS: Record<
  string,
  () => Promise<{ HANDBOOK_PAGES: DocPageDef[] }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/handbook'),
};

export const SCRIPT_LOADERS: Record<
  string,
  () => Promise<{ PRESENTER_SCRIPT: FlowingDoc }>
> = {
  'sequential-fourm': () =>
    import('./sequential-fourm/docs/presenter-script'),
};

export const RUN_OF_SHOW_LOADERS: Record<
  string,
  () => Promise<{ RUN_OF_SHOW: FlowingDoc }>
> = {
  'sequential-fourm': () => import('./sequential-fourm/docs/run-of-show'),
};
