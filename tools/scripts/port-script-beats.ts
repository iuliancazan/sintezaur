/**
 * One-off: turns the ported presenter script (docs/presenter-script.ts, two
 * hand-written HTML documents) into structured beats
 * (content/sequential-fourm/script/{beats,shared}.ts), so the 90' and 60'
 * cuts render from one source and the clock + slide numbers are computed.
 *
 * Every SAY / DEMO / THEY DO fragment is carried over verbatim; the SHOW
 * line is reduced to a short room note (its slide reference becomes the
 * computed slide line, its camera directions become the Where-on-Fourm
 * focus slides) and IF RUNNING LATE is dropped on purpose.
 *
 * Usage: pnpm tsx tools/scripts/port-script-beats.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Lang = 'en' | 'ro';

interface RawBeat {
  module: string;
  id: string;
  title: string;
  pill: string;
  minutes: number;
  say?: string;
  demo?: string;
  theyDo?: string;
  show?: string;
}

const SRC = path.resolve(
  process.cwd(),
  'apps/workshops/src/app/content/sequential-fourm/docs/presenter-script.ts',
);
const OUT_DIR = path.resolve(
  process.cwd(),
  'apps/workshops/src/app/content/sequential-fourm/script',
);

const source = readFileSync(SRC, 'utf8');

/** The two hand-written documents, as raw template-literal bodies. */
function half(lang: Lang): string {
  const start = source.indexOf(`  ${lang}: \``);
  if (start < 0) {
    throw new Error(`${lang}: half not found`);
  }
  const from = start + `  ${lang}: \``.length;
  const end = source.indexOf('`,\n', from);
  return source.slice(from, end < 0 ? source.indexOf('`,', from) : end);
}

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function minutesOf(pill: string): number {
  const range = pill.match(/^(\d+):(\d\d)–(\d+):(\d\d)$/);
  if (!range) {
    return 0; // single instant, e.g. "0:12"
  }
  const from = Number(range[1]) * 60 + Number(range[2]);
  const to = Number(range[3]) * 60 + Number(range[4]);
  return to - from;
}

/** The `<p>` body after a bold label, e.g. SAY:. */
function line(beat: string, label: string): string | undefined {
  const re = new RegExp(
    `<strong style="color:#C25010;">${label}:</strong>([\\s\\S]*?)</p>`,
  );
  const body = beat.match(re)?.[1]?.trim();
  if (!body || strip(body) === '—') {
    return undefined;
  }
  return body;
}

/** Splits a SAY line into speech + the DEMO that follows it. */
function splitDemo(say: string): { say: string; demo?: string } {
  const inline = say.search(
    /<span style="font-family:'Lato',sans-serif; font-weight:700; font-size:10\.5px;[^"]*">DEMO<\/span>/,
  );
  // Bold markers come in several shapes: "DEMO (20 s):", "DEMO 1:",
  // "Optional DEMO (20 s), “a kick from nothing”:", "DEMO at the
  // presenter's synth, with the real steps" (no colon).
  const bold = say.search(
    /<strong style="color:#C25010;">[^<]*\bDEMO\b[^<]*<\/strong>/,
  );
  const at = [inline, bold].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) {
    return { say: say.trim() };
  }
  const head = say.slice(0, at).trim();
  let demo = say.slice(at).trim();
  // Keep whatever qualified the marker ("(20 s)", "1", "at the presenter's
  // synth"), drop the word DEMO — the renderer prints that label itself.
  demo = demo
    .replace(
      /^<span style="font-family:'Lato',sans-serif; font-weight:700; font-size:10\.5px;[^"]*">DEMO<\/span>\s*/,
      '',
    )
    .replace(
      /^<strong style="color:#C25010;">([^<]*)<\/strong>\s*/,
      (_whole, content: string) => {
        const qualifier = content
          .replace(/\bDEMO\b\s*/, '')
          .replace(/:\s*$/, '')
          .trim();
        return qualifier ? `<strong>${qualifier}:</strong> ` : '';
      },
    )
    .trim();
  return { say: head, demo };
}

/** SHOW → a short room note; the slide reference and camera moves are gone. */
function roomNote(show: string | undefined, lang: Lang): string | undefined {
  if (!show) {
    return undefined;
  }
  const text = strip(show);
  const parts: string[] = [];
  if (/\bPA\b/.test(text)) {
    parts.push('PA');
  }
  if (/headphones down|căștile jos|castile jos/i.test(text)) {
    parts.push(lang === 'ro' ? 'Căștile jos' : 'Headphones down');
  }
  const walk = text.match(
    lang === 'ro'
      ? /(?:tu|umbli) printre mese([^.;]*)/i
      : /you walk the tables([^.;]*)/i,
  );
  if (walk) {
    const tail = walk[1].trim().replace(/^,\s*/, '');
    parts.push(
      (lang === 'ro' ? 'Umbli printre mese' : 'You walk the tables') +
        (tail ? `, ${tail}` : ''),
    );
  }
  const extra = text.match(
    lang === 'ro'
      ? /(lași arp-ul tău[^.;]*)/i
      : /(leave your own arp[^.;]*)/i,
  );
  if (extra) {
    parts.push(extra[1].trim());
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function parse(lang: Lang): RawBeat[] {
  const doc = half(lang);
  const moduleRe =
    /<div style="margin-top:28px; display:flex; align-items:baseline; gap:14px;"><span[^>]*>([\d:–]+)<\/span><h2[^>]*>([^<]*)<\/h2><\/div>/g;
  const modules: { at: number; id: string; title: string }[] = [];
  for (let m = moduleRe.exec(doc); m; m = moduleRe.exec(doc)) {
    const title = m[2];
    const id = title.match(/(\d\d)/)?.[1] ?? '';
    modules.push({ at: m.index, id, title });
  }
  if (modules.length !== 10) {
    throw new Error(`${lang}: expected 10 modules, got ${modules.length}`);
  }

  const beats: RawBeat[] = [];
  const beatRe = /<div class="beat"[^>]*>([\s\S]*?)\n  <\/div>/g;
  for (let b = beatRe.exec(doc); b; b = beatRe.exec(doc)) {
    const body = b[1];
    const header = body.match(
      /<span[^>]*white-space:nowrap;">([\d:–]+)<\/span><p[^>]*>([\s\S]*?)<\/p>/,
    );
    if (!header) {
      throw new Error(`${lang}: beat header not parsed at ${b.index}`);
    }
    const pill = header[1];
    const label = strip(header[2]);
    const idMatch = label.match(/^(\S+)\s*(.*)$/);
    if (!idMatch) {
      throw new Error(`${lang}: beat label not parsed: "${label}"`);
    }
    const owner = [...modules].reverse().find((m) => m.at < b!.index);
    const say = line(body, 'SAY') ?? line(body, 'SPUI');
    const split = say ? splitDemo(say) : { say: undefined };
    beats.push({
      module: owner?.id ?? '',
      id: idMatch[1],
      title: idMatch[2],
      pill,
      minutes: minutesOf(pill),
      say: split.say,
      demo: split.demo,
      theyDo: line(body, 'THEY DO') ?? line(body, 'EI FAC'),
      show: roomNote(line(body, 'SHOW') ?? line(body, 'ARĂȚI'), lang),
    });
  }
  if (beats.length !== 61) {
    throw new Error(`${lang}: expected 61 beats, got ${beats.length}`);
  }
  return beats;
}

/** Bullet items of a bordered prelude block, by its heading. */
function block(lang: Lang, heading: string): string[] {
  const doc = half(lang);
  const at = doc.indexOf(`>${heading}</p>`);
  if (at < 0) {
    throw new Error(`${lang}: block "${heading}" not found`);
  }
  const rest = doc.slice(at);
  const end = rest.indexOf('</div>');
  const items: string[] = [];
  const re = /<p[^>]*>·\s*&nbsp;([\s\S]*?)<\/p>/g;
  for (let m = re.exec(rest.slice(0, end)); m; m = re.exec(rest.slice(0, end))) {
    items.push(m[1].trim());
  }
  if (items.length === 0) {
    throw new Error(`${lang}: block "${heading}" has no items`);
  }
  return items;
}

/** Cheat-sheet rows: module label, minute, condensed THEY DO, who drives. */
function cheatRows(lang: Lang): string[][] {
  const doc = half(lang);
  const tbody = doc.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!tbody) {
    throw new Error(`${lang}: cheat sheet tbody not found`);
  }
  const rows: string[][] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  for (let r = rowRe.exec(tbody); r; r = rowRe.exec(tbody)) {
    const cells: string[] = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    for (let c = cellRe.exec(r[1]); c; c = cellRe.exec(r[1])) {
      cells.push(c[1].trim());
    }
    if (cells.length !== 4) {
      throw new Error(`${lang}: cheat row with ${cells.length} cells`);
    }
    rows.push(cells);
  }
  return rows;
}

const lit = (value: string) =>
  `\`${value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;

function pair(en: string | undefined, ro: string | undefined): string {
  if (en === undefined && ro === undefined) {
    return '';
  }
  return `{ en: ${lit(en ?? '')}, ro: ${lit(ro ?? '')} }`;
}

function main() {
  const en = parse('en');
  const ro = parse('ro');
  if (en.length !== ro.length) {
    throw new Error('EN/RO beat count differs');
  }

  const byModule = new Map<string, { title: string; beats: string[] }>();
  en.forEach((beat, i) => {
    const other = ro[i];
    if (beat.id !== other.id || beat.pill !== other.pill) {
      throw new Error(`beat ${i} mismatched: ${beat.id} vs ${other.id}`);
    }
    const fields = [
      `      id: '${beat.id}',`,
      `      title: ${pair(beat.title, other.title)},`,
      `      minutes: ${beat.minutes},`,
      beat.say ? `      say: ${pair(beat.say, other.say)},` : '',
      beat.demo ? `      demo: ${pair(beat.demo, other.demo)},` : '',
      beat.theyDo ? `      theyDo: ${pair(beat.theyDo, other.theyDo)},` : '',
      beat.show ? `      room: ${pair(beat.show, other.show)},` : '',
    ].filter(Boolean);
    const entry = `    {\n${fields.join('\n')}\n    },`;
    const module = byModule.get(beat.module) ?? {
      title: '',
      beats: [],
    };
    module.beats.push(entry);
    byModule.set(beat.module, module);
  });

  // Module titles, from the EN/RO module headers.
  const moduleTitles = new Map<string, { en: string; ro: string }>();
  for (const lang of ['en', 'ro'] as const) {
    const doc = half(lang);
    const re = /<h2[^>]*font-size:24px[^>]*>([^<]*)<\/h2>/g;
    for (let m = re.exec(doc); m; m = re.exec(doc)) {
      const title = m[1];
      const id = title.match(/(\d\d)/)?.[1] ?? '';
      const current = moduleTitles.get(id) ?? { en: '', ro: '' };
      current[lang] = title;
      moduleTitles.set(id, current);
    }
  }

  const modulesOut = [...byModule.entries()]
    .map(([id, module]) => {
      const titles = moduleTitles.get(id);
      return `  {\n    id: '${id}',\n    title: ${pair(titles?.en, titles?.ro)},\n    beats: [\n${module.beats.join('\n')}\n    ],\n  },`;
    })
    .join('\n');

  writeFileSync(
    path.join(OUT_DIR, 'beats.generated.ts'),
    `import type { ScriptModule } from './types';\n\n// GENERATED by tools/scripts/port-script-beats.ts from the v02.1 presenter\n// script, then edited by hand. SAY / DEMO / THEY DO are verbatim.\nexport const SCRIPT_MODULES: ScriptModule[] = [\n${modulesOut}\n];\n`,
  );

  const blocks = (heading: [string, string]) =>
    `[\n${block('en', heading[0])
      .map((item, i) => `  ${pair(item, block('ro', heading[1])[i])},`)
      .join('\n')}\n]`;

  const rowsEn = cheatRows('en');
  const rowsRo = cheatRows('ro');
  const cheat = rowsEn
    .map((row, i) => {
      const other = rowsRo[i];
      return `  {\n    module: ${pair(strip(row[0]), strip(other[0]))},\n    minute: '${strip(row[1])}',\n    theyDo: ${pair(row[2], other[2])},\n    who: ${pair(strip(row[3]), strip(other[3]))},\n  },`;
    })
    .join('\n');

  writeFileSync(
    path.join(OUT_DIR, 'shared.generated.ts'),
    `import type { CheatRow, L } from './types';\n\n// GENERATED by tools/scripts/port-script-beats.ts, then edited by hand.\nexport const BEFORE_DOORS: L[] = ${blocks(['BEFORE DOORS', 'ÎNAINTE SĂ INTRE LUMEA'])};\n\nexport const PLAN_B: L[] = ${blocks(['PLAN B', 'PLAN B'])};\n\nexport const AFTER: L[] = ${blocks(['AFTER', 'DUPĂ'])};\n\nexport const TRAPS: L[] = ${blocks(['THE TRAPS (BACK OF THE PAGE)', 'CAPCANELE (VERSO)'])};\n\nexport const CHEAT_ROWS: CheatRow[] = [\n${cheat}\n];\n`,
  );

  console.log(
    `[script] ${en.length} beats in ${byModule.size} modules → beats.generated.ts`,
  );
  console.log(`[script] ${rowsEn.length} cheat-sheet rows → shared.generated.ts`);
}

main();
