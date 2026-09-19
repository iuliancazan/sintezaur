import type { CourseVariant } from '../../types';
import type { VariantCut } from '../../script/types';

/**
 * What the short (60') cut changes in the extended script. The material it
 * drops is not lost — every one of these subjects is written up in the
 * student handbook, which has no variants.
 *
 * Modules 07 Expression and 08 Arpeggiator & Sequencer come out whole;
 * What's in a Sound, Noise and Key track come out as single beats; four
 * exercises get shorter (the wording the extended script already used for
 * running late), and the modulation exercise becomes a presenter demo so
 * the whole section can still be explained.
 */
const SHORT: VariantCut = {
  dropModules: ['07', '08'],
  dropBeats: ['01·02', '02·06', '03·04'],
  minutes: {
    '02·07': 2,
    '03·05': 2,
    '04·05': 3,
    '05·04': 1,
    '09·03': 3,
  },
  // What's in a Sound is gone, so the waveshapes beat opens with its idea.
  sayPrefix: {
    '02·02': {
      en: `&#x201C;One thing first: a note is never a single tone. It is a fundamental plus a stack of quieter harmonics, and their mix is what we call timbre; that is the whole game today.&#x201D;`,
      ro: `„Întâi un lucru: o notă nu e niciodată un singur ton. E o fundamentală plus armonice mai slabe deasupra, iar amestecul lor e ceea ce numim timbru; despre asta e tot jocul de azi."`,
    },
  },
  patch: {
    // The panel tour no longer promises a module for every section.
    '01·04': {
      say: {
        en: `&#x201C;Here&#x27;s the best part: the panel is laid out in the same order as the path. Look at your synth and put a finger on it: oscillators, mixer, filter, envelopes, main. The sections on the left, modulation, aftertouch, and the ones along the bottom, unison, glide, LFO, clock, arpeggiator: some we take one by one tonight, the rest are written up in your handbook.&#x201D;`,
        ro: `„Partea cea mai bună: panoul e așezat în aceeași ordine ca traseul. Uitați-vă la synth-ul vostru și puneți degetul: oscilatoare, mixer, filtru, anvelope, main. Secțiunile din stânga, modulation, aftertouch, și cele de jos, unison, glide, LFO, clock, arpeggiator: pe unele le luăm pe rând în seara asta, restul sunt scrise în manualul vostru."`,
      },
    },
    // Two minutes, without the noise step (noise is not presented).
    '02·07': {
      say: {
        en: `&#x201C;Headphones on, from Basic Program. Osc A: press PULSE, so both saw and pulse are lit. Hold PULSE and turn SELECT toward the edge, then back. Osc B: make sure SAW is lit, octave at zero, raise OSC B in the mixer. Nudge B&#x27;s FREQUENCY a little off centre and listen to the beats; too far and it splits into two notes, bring it back to the click in the middle. Then press SAW on B to switch it off, press TRI, octave to minus one: put the sub in, take it out, feel the weight. Swap halfway.&#x201D;`,
        ro: `„Căștile sus, din Basic Program. Osc A: apăsați PULSE, să fie aprinse și saw și pulse. Țineți PULSE și rotiți SELECT spre margine, apoi înapoi. Osc B: asigurați-vă că SAW e aprins, octava pe zero, ridicați OSC B din mixer. Mișcați FREQUENCY-ul lui B puțin de la centru și ascultați bătăile; prea mult și se despart în două note, aduceți-l înapoi la clicul din mijloc. Apoi apăsați SAW pe B ca să-l stingeți, apăsați TRI, octava la minus unu: puneți sub-ul, scoateți-l, simțiți greutatea. Schimbați la jumătate."`,
      },
      theyDo: {
        en: `(A) Osc A: <strong>pulse</strong> on (saw + pulse) → hold <strong>pulse|pw</strong> + <strong>select</strong> toward the edge and back. Swap. (B) Osc B: <strong>tri</strong> on, octave -1, <strong>osc b</strong> up → B&#x27;s <strong>frequency</strong> slightly off-centre → back. The result stays on the synth: it&#x27;s the raw material for the bass in module 4.`,
        ro: `(A) Osc A: <strong>pulse</strong> on (saw + pulse) → hold <strong>pulse|pw</strong> + <strong>select</strong> spre margine și înapoi. Swap. (B) Osc B: <strong>tri</strong> on, octave -1, <strong>osc b</strong> sus → <strong>frequency</strong> B ușor off-centre → înapoi. Rezultatul rămâne pe synth: e materia primă a bass-ului din modulul 4.`,
      },
    },
    // Two minutes, without key track (it is not presented).
    '03·05': {
      say: {
        en: `&#x201C;Headphones on. Hold a chord. Cutoff slowly down until it&#x27;s dark, then back. Resonance to three o&#x27;clock and one more sweep: the whistle rides the sweep. Now, careful: bring MAIN down a little, resonance to maximum, close the cutoff a bit and play single notes: the filter self-oscillates, it sings on its own. To finish: resonance back to nine o&#x27;clock, cutoff to twelve, we keep this for the next module. Swap in the middle.&#x201D;`,
        ro: `„Căștile sus. Țineți un acord. Cutoff încet în jos până e întunecat, apoi înapoi. Rezonanța la ora trei și încă un sweep: fluieratul călărește sweep-ul. Acum, atenție: coborâți puțin MAIN, rezonanța la maximum, închideți cutoff-ul un pic și cântați note simple: filtrul intră în auto-oscilație, cântă singur. La final: rezonanța înapoi la ora nouă, cutoff la ora douăsprezece, păstrăm asta pentru modulul următor. Schimbați la mijloc."`,
      },
      theyDo: {
        en: `(A) <strong>cutoff</strong> down → up; <strong>resonance</strong> at 3 o&#x27;clock, sweep. Swap. (B) <strong>main</strong> slightly down → <strong>resonance</strong> max → <strong>cutoff</strong> a bit closed → single notes; then <strong>resonance</strong> to 9 o&#x27;clock, <strong>cutoff</strong> to 12 o&#x27;clock.`,
        ro: `(A) <strong>cutoff</strong> jos → sus; <strong>resonance</strong> la 3 o&#x27;clock, sweep. Swap. (B) <strong>main</strong> puțin jos → <strong>resonance</strong> max → <strong>cutoff</strong> puțin închis → note simple; apoi <strong>resonance</strong> la 9 o&#x27;clock, <strong>cutoff</strong> la 12 o&#x27;clock.`,
      },
    },
    // Three minutes: everyone builds the bass; the pad stays in the handbook.
    '04·05': {
      say: {
        en: `&#x201C;Headphones on, and this time we all build the same thing: the bass, from the module 2 sound. Amp envelope: attack zero, decay ten o&#x27;clock, sustain eight o&#x27;clock, release eight o&#x27;clock. Filter envelope: attack zero, decay ten o&#x27;clock, sustain minimum, release eight o&#x27;clock. In the filter: ENV AMT to three o&#x27;clock, from twelve toward the right!, and cutoff at nine o&#x27;clock. Short notes, low. Then shorten the filter decay: more pluck. Swap halfway. The pad recipe is in your handbook, page 09; build that one at home.&#x201D;`,
        ro: `„Căștile sus, și de data asta construim toți același lucru: bass-ul, din sunetul de la modulul 2. Amp envelope: attack zero, decay ora zece, sustain ora opt, release ora opt. Filter envelope: attack zero, decay ora zece, sustain minim, release ora opt. În filtru: ENV AMT la ora trei, de la douăsprezece spre dreapta!, și cutoff la ora nouă. Note scurte, jos. Apoi scurtați decay-ul filtrului: mai mult pluck. Schimbați la jumătate. Rețeta de pad e în manual, la pagina 09; pe aia o faceți acasă."`,
      },
      theyDo: {
        en: `(A) BASS: AMP ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 o&#x27;clock · <strong>sustain</strong> 8 o&#x27;clock · <strong>release</strong> 8 o&#x27;clock; FILTER ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 o&#x27;clock · <strong>sustain</strong> min · <strong>release</strong> 8 o&#x27;clock; FILTER <strong>env amt</strong> 3 o&#x27;clock · <strong>cutoff</strong> 9 o&#x27;clock; short notes; then FILTER ENV <strong>decay</strong> shorter. Swap; (B) the same. Note the positions you liked in the student handbook, page 09.`,
        ro: `(A) BASS: AMP ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 o&#x27;clock · <strong>sustain</strong> 8 o&#x27;clock · <strong>release</strong> 8 o&#x27;clock; FILTER ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 o&#x27;clock · <strong>sustain</strong> min · <strong>release</strong> 8 o&#x27;clock; FILTER <strong>env amt</strong> 3 o&#x27;clock · <strong>cutoff</strong> 9 o&#x27;clock; note scurte; apoi FILTER ENV <strong>decay</strong> mai scurt. Swap; (B) la fel. Notați în manualul cursantului, la pagina 09, pozițiile care v-au plăcut.`,
      },
    },
    // The modulation section is explained in full, but you play it.
    '05·04': {
      title: { en: `DEMO · MODULATION`, ro: `DEMO · MODULATION` },
      say: {
        en: `&#x201C;This one I play and you watch: we keep your hands free for the last module. Watch the routing, because it is the same three steps every time: source, destination, amount.&#x201D;`,
        ro: `„Pe asta o cânt eu și voi urmăriți: vă ținem mâinile libere pentru ultimul modul. Uitați-vă la rutare, că sunt aceiași trei pași de fiecare dată: sursă, destinație, cantitate."`,
      },
      demo: {
        en: `LFO <strong>triangle</strong>, <strong>frequency</strong> at ten o&#x27;clock → MODULATION: <strong>route</strong> under LFO twice (blue) → <strong>freq a</strong> and <strong>freq b</strong> twice each → the LFO&#x27;s <strong>amount</strong> from twelve toward the right → mod wheel up: vibrato under your control. Then <strong>pw a</strong> twice, the pulse breathes, and <strong>cutoff</strong> twice, wah. Go too far, then bring it back.`,
        ro: `LFO <strong>triangle</strong>, <strong>frequency</strong> la ora zece → MODULATION: <strong>route</strong> de sub LFO de două ori (albastru) → <strong>freq a</strong> și <strong>freq b</strong> de două ori fiecare → <strong>amount</strong>-ul LFO-ului de la douăsprezece spre dreapta → mod wheel sus: vibrato controlat de tine. Apoi <strong>pw a</strong> de două ori, pulsul respiră, și <strong>cutoff</strong> de două ori, wah. Mergi prea departe, apoi înapoi.`,
      },
      theyDo: undefined,
      room: { en: `PA · Headphones down`, ro: `PA · Căștile jos` },
    },
    // Six modules on the road, and the two we skipped named out loud.
    '09·01': {
      say: {
        en: `&#x201C;This is the road: oscillator, mixer, filter, envelopes, LFO and modulation, voices. Every synth you&#x27;ll meet from now on is the same road in different clothes. The two rooms we didn&#x27;t open tonight, expression and rhythm, are waiting in your handbook. If you know the road, you know where to look.&#x201D;`,
        ro: `„Ăsta e traseul: oscilator, mixer, filtru, anvelope, LFO și modulație, voci. Orice synth pe care îl întâlnești de acum e același traseu, cu alte haine. Cele două camere pe care nu le-am deschis în seara asta, expresia și ritmul, vă așteaptă în manual. Dacă știi traseul, știi unde să te uiți."`,
      },
    },
    '09·04': {
      say: {
        en: `&#x201C;Thank you. Zeedo, thank you for making this possible; Sequential, thank you for the instruments. The handbook on your table is yours, take it home; the English copies are by the exit: the same diagrams, all the theory, including the two modules we didn&#x27;t play tonight. You&#x27;ll find us at Sintezaur, [where], and that&#x27;s where we announce the next workshop. Until then: the synths are yours for another four minutes.&#x201D;`,
        ro: `„Mulțumesc. Zeedo, mulțumim că ați făcut asta posibil; Sequential, mulțumim pentru instrumente. Manualul de pe masa voastră e al vostru, luați-l acasă; exemplarele în engleză sunt la ieșire: aceleași diagrame, toată teoria, inclusiv cele două module pe care nu le-am cântat în seara asta. Ne găsiți la Sintezaur, [unde], și acolo anunțăm următorul workshop. Până atunci: synth-urile sunt ale voastre încă patru minute."`,
      },
    },
    '09·05': {
      say: {
        en: `&#x201C;Four free minutes. One suggestion, if you want one: a single sound, sixty seconds: starts quiet, grows, hits a peak, comes down. The cutoff and the resonance are the story. And one thing we never opened tonight: press harder into a key you&#x27;re already holding. The Fourm feels the pressure of every single key: that&#x27;s poly aftertouch, and it&#x27;s written up in your handbook.&#x201D; You walk the tables, going to raised hands; group photo at the end.`,
        ro: `„Patru minute libere. O propunere, dacă vreți una: un singur sunet, șaizeci de secunde: pornește încet, crește, atinge un vârf, coboară. Cutoff-ul și rezonanța sunt povestea. Și un lucru pe care nu l-am deschis deloc în seara asta: apăsați mai tare într-o clapă pe care o țineți deja. Fourm-ul simte presiunea fiecărei clape în parte: asta e poly aftertouch, și e scrisă în manualul vostru." Tu printre mese, la cine ridică mâna; foto de grup la final.`,
      },
    },
  },
};

export const SCRIPT_CUTS: Partial<Record<CourseVariant, VariantCut>> = {
  short: SHORT,
};
