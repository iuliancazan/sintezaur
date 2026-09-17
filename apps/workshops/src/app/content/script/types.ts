import type { CourseVariant } from '../types';

/** One string per language; the content files carry HTML fragments. */
export interface L {
  en: string;
  ro: string;
}

/**
 * One beat of the presenter script: a slide, what you say over it, the demo
 * you play and what the room does. The clock is NOT stored — `minutes` is
 * the beat's length and the renderer adds it up, so a cut that drops or
 * shortens beats retimes the whole document on its own.
 */
export interface ScriptBeat {
  /** Course id, e.g. "02·02". */
  id: string;
  title: L;
  /** Length in the extended cut; 0 renders a single instant instead of a range. */
  minutes: number;
  say?: L;
  demo?: L;
  theyDo?: L;
  /** Short room note: "PA · Headphones down". */
  room?: L;
}

export interface ScriptModule {
  /** "00"–"09". */
  id: string;
  title: L;
  beats: ScriptBeat[];
}

/** The slides a beat puts on screen: the content slide, then its focus slide. */
export interface BeatSlides {
  slide?: string;
  /** Where-on-Fourm focus slide, shown for the demo. */
  demoSlide?: string;
}

/** What a shorter cut does to the extended script. */
export interface VariantCut {
  /** Modules left out entirely (their material stays in the handbook). */
  dropModules?: string[];
  /** Beats left out. */
  dropBeats?: string[];
  /** New lengths, in minutes. */
  minutes?: Record<string, number>;
  /** Replacement fields, merged over the beat. */
  patch?: Record<string, Partial<Omit<ScriptBeat, 'id'>>>;
  /** Text prepended to a beat's SAY (picking up what a dropped beat carried). */
  sayPrefix?: Record<string, L>;
}

/** One row of the presenter cheat sheet, keyed by the exercise beat. */
export interface CheatRow {
  beat: string;
  module: L;
  theyDo: L;
  who: L;
}

/** The bordered blocks around the beats. */
export interface ScriptBlocks {
  beforeDoors: L[];
  planB: L[];
  after: L[];
  traps: L[];
  /** Italic note under the last beat. */
  closing: L;
}

export interface ScriptMeta {
  /** Course title, as on the title slide. */
  title: L;
  /** Event line under the title. */
  event: L;
  /** Small caps credit, top right. */
  byline: L;
}

/** Everything one workshop's presenter script is made of. */
export interface PresenterScriptDoc {
  meta: ScriptMeta;
  /** The extended cut, in order. */
  modules: ScriptModule[];
  /** Beat id → the slides it shows. */
  slides: Record<string, BeatSlides>;
  /** Per-variant edits; the extended cut needs none. */
  cuts: Partial<Record<CourseVariant, VariantCut>>;
  blocks: ScriptBlocks;
  cheat: CheatRow[];
}

export interface RenderScriptOptions {
  variant: CourseVariant;
  lang: keyof L;
  /** The deck of the SAME variant — slide numbers and names come from it. */
  deck: readonly { id: string; label: string }[];
}
