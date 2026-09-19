import type { CheatRow, L, ScriptBlocks } from '../../script/types';

/**
 * The bordered blocks around the beats and the presenter cheat sheet —
 * ported out of the v02.1 document (tools/scripts/port-script-beats.ts),
 * then edited here. The cheat sheet's minute column is computed by the
 * renderer from the beat each row belongs to.
 */
export const BEFORE_DOORS: L[] = [
  { en: `All synths powered on, <strong>main</strong> at 12 o&#x27;clock, sound in both headphones at every station, Basic Program loaded on all of them (hold <strong>transpose down</strong> + <strong>program</strong>).`, ro: `Toate synth-urile pornite, <strong>main</strong> la 12 o&#x27;clock, sunet în ambele căști ale fiecărei stații, Basic Program încărcat pe toate (hold <strong>transpose down</strong> + <strong>program</strong>).` },
  { en: `On the loaner units: keybed firmware (keymech OS ≥ 1.0.0.2; older versions send maximum aftertouch on the bottom octave); Global: Aftertouch = Poly, Clock Mode = Out or Off (on In the arp waits for external clock), Velocity Curve = Medium; run &#x201C;Tune Voices&#x201D; after 15 minutes of warm-up.`, ro: `Pe unitățile împrumutate: firmware-ul claviaturii (keymech OS ≥ 1.0.0.2; versiunile vechi dau aftertouch maxim pe octava de jos); Global: Aftertouch = Poly, Clock Mode = Out sau Off (pe In arp-ul așteaptă clock extern), Velocity Curve = Medium; „Tune Voices" după 15 minute de încălzire.` },
  { en: `Presenter&#x27;s synth → PA (main out, mono 1/4&#x22;), microphone tested from the back of the room; 16:9 screen, the RO deck open on the title slide, clicker; overhead camera framed on the panel (if available).`, ro: `Synth-ul prezentatorului → PA (main out mono 1/4"), microfon testat din fundul sălii; ecran 16:9, prezentarea RO deschisă pe planșa de titlu, clicker; overhead camera cadrată pe panou (dacă există).` },
  { en: `On your own synth: the &#x201C;wow&#x201D; preset for 00·03 and &#x201C;Glass Echo&#x201D; (F1 17) for 06·05, both tested; the AT → LFO amount test done at home (its result decides the wording in 07·04).`, ro: `Pe synth-ul tău: presetul „wow" pentru 00·03 și „Glass Echo" (F1 17) pentru 06·05, testate; testul AT → LFO amount făcut acasă (rezultatul decide fraza din 07·04).` },
  { en: `one student handbook on every station (RO; EN on request), the rest by the exit; water; photo/video.`, ro: `câte un manual al cursantului pe fiecare stație (RO; EN la cerere), restul la ieșire; apă; foto/video.` },
  { en: `Presets to audition beforehand, for the DEMOs (names from the F1 list; check the sound yourself): 05 Syncing Pressure, 07 Mod My Arp, 17 Glass Echo, 18 Uptight Bass, 25 Dynamik Pad, 30 Unisyncerizer, 46 Acids Pro, 77 Poseidon PWM, 93 Hard Sync, 112 Aggro Feedback, 118 Bottle Service.`, ro: `Presete de auditat înainte, pentru DEMO-uri (nume din lista F1; sunetul îl verifici tu): 05 Syncing Pressure, 07 Mod My Arp, 17 Glass Echo, 18 Uptight Bass, 25 Dynamik Pad, 30 Unisyncerizer, 46 Acids Pro, 77 Poseidon PWM, 93 Hard Sync, 112 Aggro Feedback, 118 Bottle Service.` },
];

export const PLAN_B: L[] = [
  { en: `<strong>No projector:</strong> teach from the panel and from the student handbook (its pages follow the slide order); overhead camera on a TV, if one exists.`, ro: `<strong>Fără proiector:</strong> predai de la panou și din manualul cursantului (paginile urmează ordinea planșelor); overhead camera pe un TV, dacă există.` },
  { en: `<strong>No PA:</strong> participants put their headphones down and you play your synth through an amp or a local speaker; demos get cut to half length.`, ro: `<strong>Fără PA:</strong> participanții își pun căștile jos și tu cânți pe synth-ul tău printr-un amplificator sau o boxă locală; demo-urile se scurtează la jumătate.` },
  { en: `<strong>A synth freezes or sounds wrong:</strong> reset to Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>); if it persists, check <strong>main</strong>, the mixer (at least one source up), <strong>cutoff</strong>, the amounts at 12 o&#x27;clock, <strong>key track</strong>; last resort: swap that station with yours.`, ro: `<strong>Un synth se blochează sau sună ciudat:</strong> reset la Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>); dacă persistă, verifică <strong>main</strong>, mixerul (cel puțin o sursă sus), <strong>cutoff</strong>, amount-urile la 12 o&#x27;clock, <strong>key track</strong>; ultima soluție: schimbi stația cu a ta.` },
];

export const AFTER: L[] = [
  { en: `<strong>Repack:</strong> every Fourm in its own box, with the original packaging, power supply alongside; headphones and splitters counted (20 + 10 from the kit, Zeedo&#x27;s separately); stands, power strips, extension cords; the return checklist signed.`, ro: `<strong>Repack:</strong> fiecare Fourm în cutia lui, cu ambalajul original, alimentatorul lângă; căștile și splitterele numărate (20 + 10 din kit, separat cele de la Zeedo); standurile, prizele, prelungitoarele; checklist de retur semnat.` },
  { en: `<strong>Take notes within 10 minutes, while it&#x27;s fresh:</strong> what worked, what ran long, what questions came up, for v2 of the course.`, ro: `<strong>Notează în 10 minute, cât e proaspăt:</strong> ce a mers, ce a fost prea lung, ce întrebări au venit, pentru v2 a cursului.` },
];

export const TRAPS: L[] = [
  { en: `<strong>If you hear nothing:</strong> headphones in the splitter? <strong>main</strong> at 12 o&#x27;clock? at least one mixer source up? <strong>cutoff</strong> closed? <strong>hold</strong> lit from the last exercise? mod wheel down on a blue route? Then Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>), it resets the mixer, the cutoff and the amounts. Still silent: Global, Local Control = On. Knobs that do nothing: Global 4, Pot Mode is not Jump.`, ro: `<strong>Dacă nu auzi nimic:</strong> căștile în splitter? <strong>main</strong> la 12 o&#x27;clock? în mixer cel puțin o sursă sus? <strong>cutoff</strong> închis? <strong>hold</strong> aprins din exercițiul dinainte? mod wheel jos pe o rută albastră? Apoi Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>), resetează mixerul, cutoff-ul și amount-urile. Tot liniște: Global, Local Control = On. Knob-uri care nu fac nimic: Global 4, Pot Mode nu e pe Jump.` },
  { en: `<strong>Self-oscillation comes in sudden and loud:</strong> <strong>main</strong> slightly down before <strong>resonance</strong> hits maximum. Announce it every time.`, ro: `<strong>Auto-oscilația e bruscă și tare:</strong> <strong>main</strong> puțin jos înainte de <strong>resonance</strong> la maximum. Anunță de fiecare dată.` },
  { en: `<strong>The amounts are bipolar</strong> (MODULATION, <strong>env amt</strong> and the AFTERTOUCH amount): 12 o&#x27;clock = nothing. Say &#x201C;from twelve toward the right&#x201D;, never just &#x201C;raise the amount&#x201D;.`, ro: `<strong>Amount-urile sunt bipolare</strong> (MODULATION, <strong>env amt</strong> și amount-ul din AFTERTOUCH): 12 o&#x27;clock = nimic. Spune „de la douăsprezece spre dreapta”, niciodată doar „ridică amount-ul”.` },
  { en: `<strong><strong>sustain</strong> at maximum = the decay does nothing.</strong> When someone &#x201C;can&#x27;t hear the decay&#x201D;, look at the sustain.`, ro: `<strong><strong>sustain</strong> la maxim = decay-ul nu face nimic.</strong> Când cineva „nu aude decay-ul”, uită-te la sustain.` },
  { en: `<strong>A short press of <strong>program</strong> is harmless</strong> (it closes PARAM); turning <strong>select</strong> or pressing INC/DEC on the program screen loads another program and loses the sound. Remind them at every exercise.`, ro: `<strong>O apăsare scurtă pe <strong>program</strong> nu strică nimic</strong> (închide PARAM); rotirea lui <strong>select</strong> sau INC/DEC pe ecranul de program încarcă alt program și pierde sunetul. Reamintește la fiecare exercițiu.` },
  { en: `<strong>Chord memory is demo-only</strong>, at your synth (steps through the Unison menu), not at the tables, not during the exercise.`, ro: `<strong>Chord memory doar demo</strong>, la tine (pași prin meniul Unison), nu la mese, nu în timpul exercițiului.` },
  { en: `<strong>Aftertouch → LFO amount per note: [test at home].</strong> Until then, the safe phrasing: &#x201C;press harder → brighter (FILT) / bend (FREQ), on the pressed note&#x201D;.`, ro: `<strong>Aftertouch → LFO amount per notă: [de testat acasă].</strong> Până atunci fraza sigură: „apasă mai tare → mai strălucitor (FILT) / bend (FREQ), pe nota apăsată”.` },
  { en: `<strong>CLK DIV:</strong> hold + <strong>select</strong> or repeated presses [check at home]; it&#x27;s also Param 19.`, ro: `<strong>CLK DIV:</strong> hold + <strong>select</strong> sau apăsări succesive [de verificat acasă]; e și Param 19.` },
  { en: `<strong>Headphones:</strong> on while they play, one ear free while you talk; swap at every exercise, so the panel passes through both pairs of hands.`, ro: `<strong>Căștile:</strong> sus când cântă, o ureche liberă când vorbești; swap la fiecare exercițiu, ca panoul să treacă prin ambele perechi de mâini.` },
];

export const CHEAT_ROWS: CheatRow[] = [
  {
    beat: '01·06',
    module: { en: `01 · SIGNAL FLOW`, ro: `01 · SIGNAL FLOW` },
    theyDo: { en: `A: <strong>osc a</strong> to zero → silence → back; Osc B <strong>saw</strong> on, <strong>osc b</strong> up (saw lit). B: repeats; both trace the path across the panel with a finger.`, ro: `A: <strong>osc a</strong> la zero → liniște → înapoi; Osc B <strong>saw</strong> on, <strong>osc b</strong> sus (saw aprins). B: repetă; ambii urmăresc traseul cu degetul pe panou.` },
    who: { en: `A, then B`, ro: `A, apoi B` },
  },
  {
    beat: '02·07',
    module: { en: `02 · OSCILLATORS`, ro: `02 · OSCILLATORS` },
    theyDo: { en: `A: Osc A <strong>pulse</strong> on (saw + pulse) → hold <strong>pulse|pw</strong> + <strong>select</strong> toward the edge and back → Osc B <strong>tri</strong> on, octave −1, <strong>osc b</strong> up → B&#x27;s <strong>frequency</strong> slightly off-centre → back. B: <strong>noise</strong> on → hold <strong>noise</strong> + <strong>select</strong> ≈ 30 → plays; then A&#x27;s steps. The sound stays on the synth (raw material for the bass).`, ro: `A: Osc A <strong>pulse</strong> on (saw + pulse) → hold <strong>pulse|pw</strong> + <strong>select</strong> spre margine și înapoi → Osc B <strong>tri</strong> on, octave −1, <strong>osc b</strong> sus → <strong>frequency</strong> B ușor off-centre → înapoi. B: <strong>noise</strong> on → hold <strong>noise</strong> + <strong>select</strong> ≈ 30 → cântă; apoi pașii lui A. Sunetul rămâne pe synth (materia primă a bass-ului).` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '03·05',
    module: { en: `03 · FILTER`, ro: `03 · FILTER` },
    theyDo: { en: `A: <strong>cutoff</strong> down → up; <strong>resonance</strong> at 3 o&#x27;clock, sweep. B: <strong>main</strong> slightly down → <strong>resonance</strong> max → <strong>cutoff</strong> a bit closed → single notes; hold <strong>key track</strong> + <strong>select</strong> → Full; then <strong>resonance</strong> 9 o&#x27;clock, <strong>cutoff</strong> 12 o&#x27;clock.`, ro: `A: <strong>cutoff</strong> jos → sus; <strong>resonance</strong> la 3 o&#x27;clock, sweep. B: <strong>main</strong> puțin jos → <strong>resonance</strong> max → <strong>cutoff</strong> puțin închis → note simple; hold <strong>key track</strong> + <strong>select</strong> → Full; apoi <strong>resonance</strong> 9 o&#x27;clock, <strong>cutoff</strong> 12 o&#x27;clock.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '04·05',
    module: { en: `04 · ENVELOPES`, ro: `04 · ENVELOPES` },
    theyDo: { en: `A · BASS: AMP ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 · <strong>sustain</strong> 8 · <strong>release</strong> 8 o&#x27;clock; FILTER ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 · <strong>sustain</strong> min · <strong>release</strong> 8; FILTER <strong>env amt</strong> 3 o&#x27;clock · <strong>cutoff</strong> 9 o&#x27;clock; short notes; then FILTER ENV <strong>decay</strong> shorter. B · PAD: AMP ENV <strong>attack</strong> 12 · <strong>decay</strong> 0 · <strong>sustain</strong> max · <strong>release</strong> 2 o&#x27;clock; FILTER ENV <strong>attack</strong> 2 · <strong>decay</strong> 2 · <strong>sustain</strong> 3 · <strong>release</strong> 2 o&#x27;clock; <strong>cutoff</strong> 12 · <strong>env amt</strong> 2 o&#x27;clock; Osc B <strong>saw</strong>, octave 0, <strong>osc b</strong> up, <strong>frequency</strong> slightly off-centre; held chord. Good settings get written into the handbook, page 06.`, ro: `A · BASS: AMP ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 · <strong>sustain</strong> 8 · <strong>release</strong> 8 o&#x27;clock; FILTER ENV <strong>attack</strong> 0 · <strong>decay</strong> 10 · <strong>sustain</strong> min · <strong>release</strong> 8; FILTER <strong>env amt</strong> 3 o&#x27;clock · <strong>cutoff</strong> 9 o&#x27;clock; note scurte; apoi FILTER ENV <strong>decay</strong> mai scurt. B · PAD: AMP ENV <strong>attack</strong> 12 · <strong>decay</strong> 0 · <strong>sustain</strong> max · <strong>release</strong> 2 o&#x27;clock; FILTER ENV <strong>attack</strong> 2 · <strong>decay</strong> 2 · <strong>sustain</strong> 3 · <strong>release</strong> 2 o&#x27;clock; <strong>cutoff</strong> 12 · <strong>env amt</strong> 2 o&#x27;clock; Osc B <strong>saw</strong>, octave 0, <strong>osc b</strong> sus, <strong>frequency</strong> ușor off-centre; acord ținut. Pozițiile bune se notează în manual, pagina 06.` },
    who: { en: `A bass → swap → B pad`, ro: `A bass → swap → B pad` },
  },
  {
    beat: '05·04',
    module: { en: `05 · LFO &amp; MODULATION`, ro: `05 · LFO &amp; MODULATION` },
    theyDo: { en: `A: LFO <strong>tri</strong> lit (others off), <strong>frequency</strong> 10 o&#x27;clock → MODULATION <strong>route</strong> (LFO), <strong>freq a</strong>, <strong>freq b</strong> all blue (press until blue if not) → mod wheel up → LFO <strong>amount</strong> from 12 o&#x27;clock to the right → wheel down / up. B, wheel up: <strong>freq a</strong> / <strong>freq b</strong> until dark → <strong>pw a</strong> until blue → plays; then <strong>cutoff</strong> until blue → <strong>frequency</strong> and <strong>amount</strong> higher, then back.`, ro: `A: LFO <strong>tri</strong> aprins (celelalte stinse), <strong>frequency</strong> 10 o&#x27;clock → MODULATION <strong>route</strong> (LFO), <strong>freq a</strong>, <strong>freq b</strong> toate albastre (apasă până e albastru dacă nu e) → mod wheel sus → LFO <strong>amount</strong> de la 12 o&#x27;clock spre dreapta → roata jos / sus. B, roata sus: <strong>freq a</strong> / <strong>freq b</strong> până se sting → <strong>pw a</strong> până e albastru → cântă; apoi <strong>cutoff</strong> până e albastru → <strong>frequency</strong> și <strong>amount</strong> mai sus, apoi înapoi.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '06·06',
    module: { en: `06 · VOICES &amp; UNISON`, ro: `06 · VOICES &amp; UNISON` },
    theyDo: { en: `A: 5 notes → hold <strong>unison</strong> + <strong>select</strong> = 4 → line → <strong>param</strong> → 10 → press <strong>select</strong> → ≈ 40 → <strong>program</strong> → <strong>feedback</strong> on → hold <strong>feedback</strong> + <strong>select</strong> → ≈ 60. B: <strong>unison</strong> off → chord → <strong>hold</strong> → hands up.`, ro: `A: 5 note → hold <strong>unison</strong> + <strong>select</strong> = 4 → linie → <strong>param</strong> → 10 → press <strong>select</strong> → ≈ 40 → <strong>program</strong> → <strong>feedback</strong> on → hold <strong>feedback</strong> + <strong>select</strong> → ≈ 60. B: <strong>unison</strong> off → acord → <strong>hold</strong> → mâinile sus.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '07·06',
    module: { en: `07 · EXPRESSION`, ro: `07 · EXPRESSION` },
    theyDo: { en: `A: FILTER ENV <strong>velocity</strong> on → soft / hard → AFTERTOUCH <strong>dest</strong> (FILT / AMP) until only FILT → <strong>amount</strong> 2 o&#x27;clock → chord, pressure on the top note → <strong>amount</strong> 10 o&#x27;clock. B: <strong>glide</strong> on → <strong>rate</strong> 10 o&#x27;clock → bass line → <strong>dest</strong> (FREQ A / FREQ B) → small <strong>amount</strong> → bend under a finger.`, ro: `A: FILTER ENV <strong>velocity</strong> on → moale / tare → AFTERTOUCH <strong>dest</strong> (FILT / AMP) până e doar FILT → <strong>amount</strong> 2 o&#x27;clock → acord, presiune pe nota de sus → <strong>amount</strong> 10 o&#x27;clock. B: <strong>glide</strong> on → <strong>rate</strong> 10 o&#x27;clock → linie de bass → <strong>dest</strong> (FREQ A / FREQ B) → <strong>amount</strong> mic → bend pe deget.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '08·05',
    module: { en: `08 · ARPEGGIATOR &amp; SEQ`, ro: `08 · ARPEGGIATOR &amp; SEQ` },
    theyDo: { en: `A: ARP <strong>on</strong> → C–E–G → <strong>hold</strong> → <strong>tap tempo|bpm</strong> ×4 → hold <strong>clk div</strong> + <strong>select</strong> → 1/16 → 1/8 → <strong>cutoff</strong>. B: hold <strong>mode</strong> + <strong>select</strong> → Random → hold <strong>octave</strong> + <strong>select</strong> → 2 → a &#x201C;wrong&#x201D; chord, 8 bars.`, ro: `A: ARP <strong>on</strong> → C–E–G → <strong>hold</strong> → <strong>tap tempo|bpm</strong> ×4 → hold <strong>clk div</strong> + <strong>select</strong> → 1/16 → 1/8 → <strong>cutoff</strong>. B: hold <strong>mode</strong> + <strong>select</strong> → Random → hold <strong>octave</strong> + <strong>select</strong> → 2 → acord „greșit”, 8 bare.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
  {
    beat: '09·02',
    module: { en: `09 · CHALLENGE`, ro: `09 · CHALLENGE` },
    theyDo: { en: `From Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>), rebuild the bass from 04: A builds, B checks against the handbook, page 06; then the other way. Settings get written down.`, ro: `Din Basic Program (hold <strong>transpose down</strong> + <strong>program</strong>), reconstruiți bass-ul de la 04: A construiește, B verifică în manual, pagina 06; apoi invers. Pozițiile se notează.` },
    who: { en: `A → swap → B`, ro: `A → swap → B` },
  },
];

/** Grouped for the renderer. */
export const SCRIPT_BLOCKS: ScriptBlocks = {
  beforeDoors: BEFORE_DOORS,
  planB: PLAN_B,
  after: AFTER,
  traps: TRAPS,
  closing: {
    en: `The Glossary annex is never presented on screen; it lives only in the student handbook.`,
    ro: `Anexa Glosar nu se prezintă niciodată pe ecran; trăiește doar în manualul cursantului.`,
  },
};
