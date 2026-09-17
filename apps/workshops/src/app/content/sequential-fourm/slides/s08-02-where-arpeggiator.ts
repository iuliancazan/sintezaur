import { whereOnFourm } from './where-on-fourm';

// Extended cut only (module 08 leaves the short deck).
export const SLIDE_S08_02_WHERE = whereOnFourm({
  id: '08·02·W',
  module: '08',
  label: 'Where · Arpeggiator · Clock',
  sections: ['ARP', 'CLOCK'],
  caption: 'ARPEGGIATOR › ON · HOLD + CLOCK',
  gesture: {
    en: 'ARP on and hold a chord. HOLD latches it after your hands leave; the CLOCK section sets the tempo.',
    ro: 'ARP pornit și ține un acord. HOLD îl reține după ce ridici mâinile; secțiunea CLOCK dă tempoul.',
  },
  moduleTitle: {
    en: 'MODULE 08 · ARPEGGIATOR &amp; SEQUENCER',
    ro: 'MODULUL 08 · ARPEGGIATOR &amp; SEQUENCER',
  },
});
