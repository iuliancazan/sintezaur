import { VARIANT_MINUTES, type CourseVariant } from '../types';
import type {
  L,
  PresenterScriptDoc,
  RenderScriptOptions,
  ScriptBeat,
  ScriptModule,
} from './types';

/**
 * Renders a presenter script from its beats: the clock and the slide numbers
 * are computed, so the 90' and the 60' cut come out of one source.
 *
 * Per beat the document reads SLIDE → SAY → DEMO → THEY DO, each on its own
 * line, with the slide line calling out the number and the name exactly as
 * the deck's list shows them.
 *
 * The structural words below live here rather than in the app's i18n files:
 * they are part of the printed document (and of its PDF), like the beat
 * labels of the original hand-written script.
 */
const WORDS = {
  script: { en: 'PRESENTER SCRIPT', ro: 'SCRIPT DE PREZENTARE' },
  minutes: { en: 'MINUTES', ro: 'DE MINUTE' },
  freePlay: { en: '+ FREE PLAY', ro: '+ FREE PLAY' },
  howTo: {
    en: 'One beat per slide, with a running clock. Every beat names the slide you put up, then what you do over it: SLIDE / SAY / DEMO / THEY DO.',
    ro: 'Un beat pe planșă, cu minutaj cumulativ. Fiecare beat spune ce planșă arăți, apoi ce faci peste ea: PLANȘA / SPUI / DEMO / EI FAC.',
  },
  slide: { en: 'SLIDE', ro: 'PLANȘA' },
  say: { en: 'SAY', ro: 'SPUI' },
  demo: { en: 'DEMO', ro: 'DEMO' },
  theyDo: { en: 'THEY DO', ro: 'EI FAC' },
  beforeDoors: { en: 'BEFORE DOORS', ro: 'ÎNAINTE SĂ INTRE LUMEA' },
  planB: { en: 'PLAN B', ro: 'PLAN B' },
  after: { en: 'AFTER', ro: 'DUPĂ' },
  traps: { en: 'THE TRAPS (BACK OF THE PAGE)', ro: 'CAPCANELE (VERSO)' },
  cheatKicker: { en: 'PRESENTER CHEAT SHEET', ro: 'FOAIA PREZENTATORULUI' },
  cheatTitle: {
    en: 'The exercises + the challenge, on one page',
    ro: 'Exercițiile + challenge-ul, pe o pagină',
  },
  cheatHow: {
    en: 'Control names are the ones on the panel (bold). “A → swap → B” = partner A drives, partner B reads the steps; halfway through they switch.',
    ro: 'Numele controalelor sunt cele de pe panou (bold). „A → swap → B” = partenerul A conduce, partenerul B citește pașii; la jumătate schimbă.',
  },
  colModule: { en: 'MODULE', ro: 'MODULUL' },
  colMinute: { en: 'MINUTE', ro: 'MINUTUL' },
  colTheyDo: { en: 'THEY DO (condensed)', ro: 'EI FAC (condensat)' },
  colWho: { en: 'WHO DRIVES', ro: 'CINE CONDUCE' },
} as const;

const FONT_BODY = `'Aptos','Instrument Sans','Segoe UI',sans-serif`;
const FONT_DISPLAY = `'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif`;
const FONT_MONO = `'Lato',sans-serif`;
const ACCENT = '#C25010';

const S = {
  pill: `font-family:${FONT_MONO}; font-weight:700; font-size:11px; letter-spacing:2px; color:#FFFFFF; background:${ACCENT}; border-radius:999px; padding:3px 12px; white-space:nowrap;`,
  pillSm: `font-family:${FONT_MONO}; font-weight:700; font-size:10px; letter-spacing:2px; color:#FFFFFF; background:${ACCENT}; border-radius:999px; padding:2px 10px; white-space:nowrap;`,
  beatLabel: `margin:0; font-family:${FONT_MONO}; font-weight:700; font-size:11px; letter-spacing:2px; color:${ACCENT};`,
  room: `font-family:${FONT_BODY}; font-stretch:92%; font-size:11.5px; color:#8A8A8A;`,
  slideLine: `margin:9px 0 0; display:inline-block; padding:4px 13px 4px 11px; background:#F7EBE2; border-left:3px solid ${ACCENT}; border-radius:0 5px 5px 0; font-family:${FONT_MONO}; font-weight:700; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8A3A0C;`,
  line: `margin:6px 0 0; font-stretch:92%; font-size:13px; line-height:1.6;`,
  label: `color:${ACCENT};`,
  block: `margin:18px 0 0; border:1px solid #E0E0E0; border-radius:10px; padding:14px 18px;`,
  blockHead: `margin:0; font-family:${FONT_MONO}; font-weight:700; font-size:11px; letter-spacing:2.5px; color:${ACCENT};`,
  blockItem: `margin:7px 0 0; font-stretch:92%; font-size:12.5px; line-height:1.55;`,
  th: `text-align:left; padding:6px 8px; border-bottom:2px solid ${ACCENT}; font-family:${FONT_MONO}; font-size:9px; letter-spacing:2px; color:#8A8A8A;`,
  td: `padding:6px 8px; border-bottom:1px solid #E6E6E6; vertical-align:top; font-stretch:92%; font-size:10.5px; line-height:1.45;`,
};

const t = (word: L | { en: string; ro: string }, lang: keyof L) =>
  word[lang];

function clock(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** "0:13–0:15", or a single instant for a zero-length beat. */
function span(from: number, minutes: number): string {
  return minutes > 0
    ? `${clock(from)}–${clock(from + minutes)}`
    : clock(from);
}

/** The extended script, with a cut's drops, retimings and patches applied. */
function cutModules(
  doc: PresenterScriptDoc,
  variant: CourseVariant,
): ScriptModule[] {
  const cut = doc.cuts[variant];
  if (!cut) {
    return doc.modules;
  }
  return doc.modules
    .filter((module) => !cut.dropModules?.includes(module.id))
    .map((module) => ({
      ...module,
      beats: module.beats
        .filter((beat) => !cut.dropBeats?.includes(beat.id))
        .map((beat) => {
          const next: ScriptBeat = { ...beat, ...cut.patch?.[beat.id] };
          const minutes = cut.minutes?.[beat.id];
          if (minutes !== undefined) {
            next.minutes = minutes;
          }
          const prefix = cut.sayPrefix?.[beat.id];
          if (prefix && next.say) {
            next.say = {
              en: `${prefix.en} ${next.say.en}`,
              ro: `${prefix.ro} ${next.say.ro}`,
            };
          }
          return next;
        }),
    }))
    .filter((module) => module.beats.length > 0);
}

function beatLine(
  label: { en: string; ro: string },
  body: L,
  lang: keyof L,
): string {
  return `<p style="${S.line}"><strong style="${S.label}">${t(label, lang)}:</strong> ${body[lang]}</p>`;
}

function slideLine(
  id: string | undefined,
  lang: keyof L,
  numbers: Map<string, { number: number; label: string }>,
): string {
  if (!id) {
    return '';
  }
  const slide = numbers.get(id);
  if (!slide) {
    return '';
  }
  return `<p style="${S.slideLine}">${t(WORDS.slide, lang)} ${slide.number} · ${slide.label}</p>`;
}

export function renderPresenterScript(
  doc: PresenterScriptDoc,
  { variant, lang, deck }: RenderScriptOptions,
): string {
  const modules = cutModules(doc, variant);
  const numbers = new Map(
    deck.map((slide, i) => [slide.id, { number: i + 1, label: slide.label }]),
  );

  // One pass for the clock: module ranges and beat spans.
  let at = 0;
  const timed = modules.map((module) => {
    const from = at;
    const beats = module.beats.map((beat) => {
      const beatFrom = at;
      at += beat.minutes;
      return { beat, span: span(beatFrom, beat.minutes) };
    });
    return { module, span: span(from, at - from), beats, from };
  });
  const total = at;
  const planned = VARIANT_MINUTES[variant];
  const header =
    `${t(WORDS.script, lang)} · ${planned} ${t(WORDS.minutes, lang)}` +
    (total > planned ? ` ${t(WORDS.freePlay, lang)}` : '');

  const overview = timed
    .map(({ module, span: range, beats }) => {
      const title = module.title[lang].replace(/^MODUL(E|UL)\s+/i, '');
      const titles = beats
        .map(({ beat }) => `${beat.id} ${beat.title[lang]}`)
        .join(' · ');
      return `<span style="${S.pill}">${range}</span><div><p style="margin:0; font-family:${FONT_DISPLAY}; font-stretch:88%; font-size:18px; color:#111111;">${title}</p><p style="margin:3px 0 0; font-stretch:92%; font-size:12px; line-height:1.5; color:#6E6E6E; font-style:italic;">${titles}</p></div>`;
    })
    .join('');

  const body = timed
    .map(({ module, span: range, beats }) => {
      const head = `<div style="margin-top:28px; display:flex; align-items:baseline; gap:14px;"><span style="${S.pill}">${range}</span><h2 style="margin:0; font-family:${FONT_DISPLAY}; font-stretch:88%; font-weight:400; font-size:24px; color:#111111;">${module.title[lang]}</h2></div>`;
      const written = beats
        .map(({ beat, span: beatSpan }) => {
          const slides = doc.slides[beat.id] ?? {};
          const room = beat.room
            ? `<span style="${S.room}">${beat.room[lang]}</span>`
            : '';
          return [
            `<div class="beat" style="margin-top:16px;">`,
            `<div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;">`,
            `<span style="${S.pillSm}">${beatSpan}</span>`,
            `<p style="${S.beatLabel}">${beat.id} ${beat.title[lang]}</p>`,
            room,
            `</div>`,
            slideLine(slides.slide, lang, numbers),
            beat.say ? beatLine(WORDS.say, beat.say, lang) : '',
            slideLine(slides.demoSlide, lang, numbers),
            beat.demo ? beatLine(WORDS.demo, beat.demo, lang) : '',
            beat.theyDo ? beatLine(WORDS.theyDo, beat.theyDo, lang) : '',
            `</div>`,
          ].join('');
        })
        .join('');
      return head + written;
    })
    .join('');

  const block = (heading: { en: string; ro: string }, items: L[]) =>
    items.length === 0
      ? ''
      : `<div style="${S.block}"><p style="${S.blockHead}">${t(heading, lang)}</p>${items
          .map(
            (item, i) =>
              `<p style="${i === 0 ? S.blockItem.replace('margin:7px', 'margin:8px') : S.blockItem}">· &nbsp;${item[lang]}</p>`,
          )
          .join('')}</div>`;

  // Cheat sheet: the exercises this cut actually runs, retimed.
  const exercises = new Map(
    timed.flatMap(({ beats }) =>
      beats
        .filter(({ beat }) => beat.theyDo)
        .map(({ beat, span: beatSpan }) => [beat.id, beatSpan] as const),
    ),
  );
  const cheatRows = doc.cheat
    .filter((row) => exercises.has(row.beat))
    .map(
      (row) =>
        `<tr><td style="${S.td} white-space:nowrap; font-family:${FONT_MONO}; font-weight:700; font-size:9.5px; letter-spacing:1.5px; color:${ACCENT};">${row.module[lang]}</td><td style="${S.td} white-space:nowrap; font-family:${FONT_MONO}; font-size:10px; color:#6E6E6E;">${exercises.get(row.beat)}</td><td style="${S.td}">${row.theyDo[lang]}</td><td style="${S.td} white-space:nowrap; color:#6E6E6E;">${row.who[lang]}</td></tr>`,
    )
    .join('');
  const cheat = `<div style="break-before:page; page-break-before:always; margin-top:28px;">
    <p style="margin:0; font-family:${FONT_MONO}; font-weight:700; font-size:12px; letter-spacing:3px; color:${ACCENT};">${t(WORDS.cheatKicker, lang)}</p>
    <h2 style="margin:6px 0 0; font-family:${FONT_DISPLAY}; font-stretch:88%; font-weight:400; font-size:26px; line-height:1.05; color:#111111;">${t(WORDS.cheatTitle, lang)}</h2>
    <p style="margin:8px 0 0; font-stretch:92%; font-size:12px; line-height:1.5; color:#6E6E6E;">${t(WORDS.cheatHow, lang)}</p>
    <table style="width:100%; border-collapse:collapse; margin-top:12px; font-family:${FONT_BODY}; color:#333333;">
      <thead><tr><th style="${S.th}">${t(WORDS.colModule, lang)}</th><th style="${S.th}">${t(WORDS.colMinute, lang)}</th><th style="${S.th}">${t(WORDS.colTheyDo, lang)}</th><th style="${S.th}">${t(WORDS.colWho, lang)}</th></tr></thead>
      <tbody>${cheatRows}</tbody>
    </table>
    <div style="break-before:page; page-break-before:always; margin-top:22px; border:1px solid #E0E0E0; border-radius:10px; padding:14px 18px;"><p style="${S.blockHead}">${t(WORDS.traps, lang)}</p>${doc.blocks.traps
      .map(
        (item) =>
          `<p style="margin:6px 0 0; font-stretch:92%; font-size:11.5px; line-height:1.5;">· &nbsp;${item[lang]}</p>`,
      )
      .join('')}</div>
  </div>`;

  return `<div style="font-family:${FONT_BODY}; color:#333333;">
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <img src="/course/logo-sintezaur-dark.png" alt="Sintezaur" style="height:30px; width:auto;"><div style="display:flex; align-items:center; gap:14px; margin-left:auto; margin-right:14px;"><img src="/course/logo-zeedo-dark.svg" alt="Zeedo" style="height:14px; width:auto; opacity:0.75;"><span style="font-family:${FONT_MONO}; font-weight:700; font-size:10px; letter-spacing:3px; color:#8A8A8A;">SEQUENTIAL</span></div>
    <p style="margin:0; font-family:${FONT_MONO}; font-size:11px; letter-spacing:3px; color:#8A8A8A;">${doc.meta.byline[lang]}</p>
  </div>
  <p style="margin:26px 0 0; font-family:${FONT_MONO}; font-weight:700; font-size:12px; letter-spacing:3px; color:${ACCENT};">${header}</p>
  <h1 style="margin:8px 0 0; font-family:${FONT_DISPLAY}; font-stretch:88%; font-weight:400; font-size:40px; line-height:1.05; color:#111111;">${doc.meta.title[lang]}</h1>
  <svg style="display:block; margin-top:10px; width:320px; height:12px;" viewBox="0 0 320 12" fill="none"><path d="M3 6.5C45 5 95 8 150 6S240 5 285 7 310 6 317 6.3" stroke="#E97132" stroke-width="3.5" stroke-linecap="round"></path></svg>
  <p style="margin:14px 0 0; font-stretch:92%; font-size:13.5px; line-height:1.6;">${t(WORDS.howTo, lang)} ${doc.meta.event[lang]}</p>
  ${block(WORDS.beforeDoors, doc.blocks.beforeDoors)}
  ${block(WORDS.planB, doc.blocks.planB)}
  <div style="margin-top:26px; display:grid; grid-template-columns:auto 1fr; column-gap:18px; row-gap:14px; align-items:baseline;">${overview}</div>
  ${body}
  <p style="margin:22px 0 0; font-stretch:92%; font-size:12.5px; line-height:1.55; color:#6E6E6E; font-style:italic;">${doc.blocks.closing[lang]}</p>
  ${block(WORDS.after, doc.blocks.after)}
  ${cheat}
</div>`;
}

/** Total clock of a cut, in minutes — used by the content self-checks. */
export function scriptMinutes(
  doc: PresenterScriptDoc,
  variant: CourseVariant,
): number {
  return cutModules(doc, variant)
    .flatMap((module) => module.beats)
    .reduce((sum, beat) => sum + beat.minutes, 0);
}

export { cutModules };
