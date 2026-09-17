import { whereOnFourm } from './where-on-fourm';

// Extended cut only (03·04 leaves the short deck).
export const SLIDE_S03_04_WHERE = whereOnFourm({
  id: '03·04·W',
  module: '03',
  label: 'Where · Filter › Key track · Env amt',
  sections: ['FILTER'],
  caption: 'FILTER › KEY TRACK · ENV AMT',
  gesture: {
    en: 'KEY TRACK on: high notes open the filter more. ENV AMT: how far the envelope pushes the cutoff.',
    ro: 'KEY TRACK pornit: notele înalte deschid filtrul mai mult. ENV AMT: cât de mult împinge anvelopa cutoff-ul.',
  },
  moduleTitle: {
    en: 'MODULE 03 · FILTER',
    ro: 'MODULUL 03 · FILTER',
  },
});
