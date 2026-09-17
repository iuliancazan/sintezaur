import { whereOnFourm } from './where-on-fourm';

export const SLIDE_S05_03_WHERE = whereOnFourm({
  id: '05·03·W',
  module: '05',
  label: 'Where · Modulation section',
  sections: ['MODULATION'],
  caption: 'MODULATION › SOURCE · DESTINATION · AMOUNT',
  gesture: {
    en: 'Three slots. Pick a source and a destination, then AMOUNT: red is negative, blue is positive.',
    ro: 'Trei sloturi. Alegi o sursă și o destinație, apoi AMOUNT: roșu e negativ, albastru e pozitiv.',
  },
  moduleTitle: {
    en: 'MODULE 05 · LFO &amp; MODULATION',
    ro: 'MODULUL 05 · LFO &amp; MODULATION',
  },
});
