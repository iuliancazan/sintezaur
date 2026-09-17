import { whereOnFourm } from './where-on-fourm';

// Extended cut only (module 07 leaves the short deck).
export const SLIDE_S07_02_WHERE = whereOnFourm({
  id: '07·02·W',
  module: '07',
  label: 'Where · Velocity',
  sections: ['FILTER ENV', 'AMP ENV'],
  caption: 'ENVELOPES › VELOCITY',
  gesture: {
    en: 'Each envelope has a VELOCITY button: how hard you strike scales that envelope&#x27;s amount.',
    ro: 'Fiecare anvelopă are un buton VELOCITY: cât de tare lovești clapa scalează cantitatea acelei anvelope.',
  },
  moduleTitle: {
    en: 'MODULE 07 · EXPRESSION',
    ro: 'MODULUL 07 · EXPRESSION',
  },
});
