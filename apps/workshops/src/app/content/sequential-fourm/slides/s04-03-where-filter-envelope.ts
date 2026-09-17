import { whereOnFourm } from './where-on-fourm';

export const SLIDE_S04_03_WHERE = whereOnFourm({
  id: '04·03·W',
  module: '04',
  label: 'Where · Filter envelope › Env amt · Decay',
  sections: ['FILTER ENV', 'FILTER'],
  caption: 'FILTER ENV › DECAY + FILTER › ENV AMT',
  gesture: {
    en: 'ENV AMT (in the filter) sends the envelope to the cutoff; DECAY sets how fast the brightness falls away.',
    ro: 'ENV AMT (din filtru) trimite anvelopa în cutoff; DECAY decide cât de repede se stinge strălucirea.',
  },
  moduleTitle: {
    en: 'MODULE 04 · ENVELOPES',
    ro: 'MODULUL 04 · ENVELOPES',
  },
});
