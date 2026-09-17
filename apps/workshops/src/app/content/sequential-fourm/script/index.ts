import { renderPresenterScript } from '../../script/render';
import type {
  PresenterScriptDoc,
  RenderScriptOptions,
} from '../../script/types';
import { BEAT_SLIDES, SCRIPT_MODULES } from './beats';
import { CHEAT_ROWS, SCRIPT_BLOCKS } from './shared';
import { SCRIPT_CUTS } from './variants';

/** Intro to Synthesis — the presenter script, both cuts. */
export const PRESENTER_SCRIPT: PresenterScriptDoc = {
  meta: {
    title: { en: 'INTRO TO SYNTHESIS', ro: 'INTRO TO SYNTHESIS' },
    event: {
      en: '21 September 2026 · Club Control, Bucharest · Sintezaur × Zeedo · powered by Sequential.',
      ro: '21 septembrie 2026 · Club Control, București · Sintezaur × Zeedo · powered by Sequential.',
    },
    byline: { en: 'BY IULIAN CAZAN', ro: 'DE IULIAN CAZAN' },
  },
  modules: SCRIPT_MODULES,
  slides: BEAT_SLIDES,
  cuts: SCRIPT_CUTS,
  blocks: SCRIPT_BLOCKS,
  cheat: CHEAT_ROWS,
};

export function renderScript(options: RenderScriptOptions): string {
  return renderPresenterScript(PRESENTER_SCRIPT, options);
}
