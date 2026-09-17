import { whereOnFourm } from './where-on-fourm';

// Extended cut only (module 07 leaves the short deck).
export const SLIDE_S07_04_WHERE = whereOnFourm({
  id: '07·04·W',
  module: '07',
  label: 'Where · Aftertouch',
  sections: ['AFTERTOUCH'],
  caption: 'AFTERTOUCH › DESTINATION · AMOUNT',
  gesture: {
    en: 'Press harder into a held key. AMOUNT sets how much; the buttons pick where the pressure goes.',
    ro: 'Apasă mai tare într-o clapă ținută. AMOUNT dă cât de mult; butoanele aleg unde merge presiunea.',
  },
  moduleTitle: {
    en: 'MODULE 07 · EXPRESSION',
    ro: 'MODULUL 07 · EXPRESSION',
  },
});
