import { whereOnFourm } from './where-on-fourm';

// First contact: everyone resets to the Basic Program before the first
// exercise — the one gesture the whole evening falls back on.
export const SLIDE_S00_04_WHERE = whereOnFourm({
  id: '00·04·W',
  module: '00',
  label: 'Where · Basic Program',
  sections: ['PROGRAM'],
  caption: 'TRANSPOSE DOWN + PROGRAM',
  gesture: {
    en: 'Hold TRANSPOSE DOWN (left of the keys) and press PROGRAM: the synth resets to the Basic Program.',
    ro: 'Ține TRANSPOSE DOWN apăsat (în stânga clapelor) și apasă PROGRAM: synth-ul revine la Basic Program.',
  },
  moduleTitle: {
    en: 'MODULE 00 · WELCOME &amp; SETUP',
    ro: 'MODULUL 00 · WELCOME &amp; SETUP',
  },
});
