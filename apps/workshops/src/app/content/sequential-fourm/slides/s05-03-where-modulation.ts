import { whereOnFourm } from './where-on-fourm';

export const SLIDE_S05_03_WHERE = whereOnFourm({
  id: '05·03·W',
  module: '05',
  label: 'Where · Modulation section',
  sections: ['MODULATION'],
  caption: 'MODULATION › SOURCE · DESTINATION · AMOUNT',
  gesture: {
    en: 'Three sources. Press a ROUTE, then a destination, then AMOUNT: zero at 12 o&#x27;clock.<br>· red = the direct bus, always on&nbsp;&nbsp;· blue = the mod-wheel bus&nbsp;&nbsp;· purple = both',
    ro: 'Trei surse. Apeși un ROUTE, apoi o destinație, apoi AMOUNT: zero la ora douăsprezece.<br>· roșu = bus-ul direct, mereu pornit&nbsp;&nbsp;· albastru = bus-ul mod wheel&nbsp;&nbsp;· mov = amândouă',
  },
  moduleTitle: {
    en: 'MODULE 05 · LFO &amp; MODULATION',
    ro: 'MODULUL 05 · LFO &amp; MODULATION',
  },
});
