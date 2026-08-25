import type { SlideDef } from '../../types';
import { SLIDE_S00_00_HUB } from './s00-00-hub';
import { SLIDE_S00_02_TODAY } from './s00-02-today';
import { SLIDE_S01_01_COVER } from './s01-01-cover';
import { SLIDE_S01_02_WHAT_S_IN_A_SOUND } from './s01-02-what-s-in-a-sound';
import { SLIDE_S01_03_VOICE_PATH } from './s01-03-voice-path';
import { SLIDE_S01_04_WHERE_ON_FOURM } from './s01-04-where-on-fourm';
import { SLIDE_S01_05_THE_MIXER } from './s01-05-the-mixer';
import { SLIDE_S01_06_KEY_TERMS } from './s01-06-key-terms';
import { SLIDE_S02_01_COVER } from './s02-01-cover';
import { SLIDE_S02_02_WAVESHAPES } from './s02-02-waveshapes';
import { SLIDE_S02_03_OCTAVES_AND_TUNING } from './s02-03-octaves-and-tuning';
import { SLIDE_S02_04_PULSE_WIDTH } from './s02-04-pulse-width';
import { SLIDE_S02_05_SUB_TRICK } from './s02-05-sub-trick';
import { SLIDE_S02_06_NOISE } from './s02-06-noise';
import { SLIDE_S02_07_TERMS } from './s02-07-terms';
import { SLIDE_S03_01_COVER } from './s03-01-cover';
import { SLIDE_S03_02_LOW_PASS } from './s03-02-low-pass';
import { SLIDE_S03_03_RESONANCE } from './s03-03-resonance';
import { SLIDE_S03_04_KEY_TRACK_AND_ENV_AMOUNT } from './s03-04-key-track-and-env-amount';
import { SLIDE_S03_05_KEY_TERMS } from './s03-05-key-terms';
import { SLIDE_S04_01_COVER } from './s04-01-cover';
import { SLIDE_S04_02_ADSR } from './s04-02-adsr';
import { SLIDE_S04_03_TWO_ENVELOPES } from './s04-03-two-envelopes';
import { SLIDE_S04_04_BASS_VS_PAD } from './s04-04-bass-vs-pad';
import { SLIDE_S04_05_KEY_TERMS } from './s04-05-key-terms';
import { SLIDE_S05_01_COVER } from './s05-01-cover';
import { SLIDE_S05_02_THE_LFO } from './s05-02-the-lfo';
import { SLIDE_S05_03_THE_MODULATION_SECTION } from './s05-03-the-modulation-section';
import { SLIDE_S05_04_KEY_TERMS } from './s05-04-key-terms';
import { SLIDE_S06_01_COVER } from './s06-01-cover';
import { SLIDE_S06_02_POLYPHONY } from './s06-02-polyphony';
import { SLIDE_S06_03_UNISON } from './s06-03-unison';
import { SLIDE_S06_04_CHORD_MEMORY } from './s06-04-chord-memory';
import { SLIDE_S06_05_FEEDBACK } from './s06-05-feedback';
import { SLIDE_S06_06_TERMS } from './s06-06-terms';
import { SLIDE_S07_01_COVER } from './s07-01-cover';
import { SLIDE_S07_02_VELOCITY } from './s07-02-velocity';
import { SLIDE_S07_03_POLY_AT } from './s07-03-poly-at';
import { SLIDE_S07_04_AT_ROUTING } from './s07-04-at-routing';
import { SLIDE_S07_05_STEPS_VS_GLIDE } from './s07-05-steps-vs-glide';
import { SLIDE_S07_06_TERMS } from './s07-06-terms';
import { SLIDE_S08_01_COVER } from './s08-01-cover';
import { SLIDE_S08_02_HOW_IT_WORKS } from './s08-02-how-it-works';
import { SLIDE_S08_03_CLOCK } from './s08-03-clock';
import { SLIDE_S08_04_SEQUENCER } from './s08-04-sequencer';
import { SLIDE_S08_05_TERMS } from './s08-05-terms';
import { SLIDE_S09_01_THE_ROAD_AGAIN } from './s09-01-the-road-again';
import { SLIDE_S09_02_THANK_YOU } from './s09-02-thank-you';
import { SLIDE_SAX_01_COVER } from './sAX-01-cover';

/** Deck order — remove a line (and its file) to drop a slide. */
export const SLIDES: SlideDef[] = [
  SLIDE_S00_00_HUB,
  SLIDE_S00_02_TODAY,
  SLIDE_S01_01_COVER,
  SLIDE_S01_02_WHAT_S_IN_A_SOUND,
  SLIDE_S01_03_VOICE_PATH,
  SLIDE_S01_04_WHERE_ON_FOURM,
  SLIDE_S01_05_THE_MIXER,
  SLIDE_S01_06_KEY_TERMS,
  SLIDE_S02_01_COVER,
  SLIDE_S02_02_WAVESHAPES,
  SLIDE_S02_03_OCTAVES_AND_TUNING,
  SLIDE_S02_04_PULSE_WIDTH,
  SLIDE_S02_05_SUB_TRICK,
  SLIDE_S02_06_NOISE,
  SLIDE_S02_07_TERMS,
  SLIDE_S03_01_COVER,
  SLIDE_S03_02_LOW_PASS,
  SLIDE_S03_03_RESONANCE,
  SLIDE_S03_04_KEY_TRACK_AND_ENV_AMOUNT,
  SLIDE_S03_05_KEY_TERMS,
  SLIDE_S04_01_COVER,
  SLIDE_S04_02_ADSR,
  SLIDE_S04_03_TWO_ENVELOPES,
  SLIDE_S04_04_BASS_VS_PAD,
  SLIDE_S04_05_KEY_TERMS,
  SLIDE_S05_01_COVER,
  SLIDE_S05_02_THE_LFO,
  SLIDE_S05_03_THE_MODULATION_SECTION,
  SLIDE_S05_04_KEY_TERMS,
  SLIDE_S06_01_COVER,
  SLIDE_S06_02_POLYPHONY,
  SLIDE_S06_03_UNISON,
  SLIDE_S06_04_CHORD_MEMORY,
  SLIDE_S06_05_FEEDBACK,
  SLIDE_S06_06_TERMS,
  SLIDE_S07_01_COVER,
  SLIDE_S07_02_VELOCITY,
  SLIDE_S07_03_POLY_AT,
  SLIDE_S07_04_AT_ROUTING,
  SLIDE_S07_05_STEPS_VS_GLIDE,
  SLIDE_S07_06_TERMS,
  SLIDE_S08_01_COVER,
  SLIDE_S08_02_HOW_IT_WORKS,
  SLIDE_S08_03_CLOCK,
  SLIDE_S08_04_SEQUENCER,
  SLIDE_S08_05_TERMS,
  SLIDE_S09_01_THE_ROAD_AGAIN,
  SLIDE_S09_02_THANK_YOU,
  SLIDE_SAX_01_COVER,
];
