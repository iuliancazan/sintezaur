/**
 * One-shot (re-runnable) porter: reads the v02.1 prototype's Full Course
 * deck and emits one TypeScript file per slide (EN+RO colocated) plus the
 * ordered manifest, into apps/workshops/src/app/content/sequential-fourm/slides/.
 *
 * Source of truth: the Obsidian vault (see workshops-spec.md §12):
 *   claude-design-prototypes/2026-08-17-v02.1/Full Course.dc.html
 *
 * Transformations (fidelity otherwise 1:1):
 *  - onClick="{{ goM0N }}" → data-go="0N·01", onClick="{{ goHub }}" → data-go="hub"
 *  - the in-slide EN/RO pill toggle is removed (the app owns language now)
 *  - style-hover="…" → class ws-hover-accent (hover handled by SlideStage css)
 *  - asset paths → /course/*
 *  - backticks/`${` escaped for template literals; sanity checks assert no
 *    leftover handlebars/scripts
 *
 * Usage: pnpm tsx tools/scripts/port-course-slides.ts [path-to-v02.1-dir]
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_SRC =
  '/Users/Iulian/Library/Mobile Documents/iCloud~md~obsidian/Documents/hq/projects/music/sintezaur/Crash Course in Sound Design with the Sequentila Fourm/claude-design-prototypes/2026-08-17-v02.1';
const srcDir = process.argv[2] ?? DEFAULT_SRC;
const OUT_DIR = path.resolve(
  process.cwd(),
  'apps/workshops/src/app/content/sequential-fourm/slides',
);

const ASSET_MAP: Record<string, string> = {
  'uploads/Logo - white.png': '/course/logo-sintezaur-white.png',
  'assets/sintezaur-dark.png': '/course/logo-sintezaur-dark.png',
  'assets/zeedo-white.svg': '/course/logo-zeedo-white.svg',
  'assets/zeedo-dark.svg': '/course/logo-zeedo-dark.svg',
  'uploads/seq_logo-1786819698328-xdh8.png': '/course/logo-sequential.png',
  'assets/fourm-cover.jpg': '/course/fourm-cover.jpg',
};

interface RawSlide {
  lang: 'en' | 'ro';
  label: string;
  html: string;
}

function extractSections(source: string): RawSlide[] {
  const slides: RawSlide[] = [];
  // <sc-if value="{{ showEN }}" …> … </sc-if> blocks wrap 1..n sections each.
  const scIfRe = /<sc-if value="\{\{ (showEN|showRO) \}\}"[^>]*>([\s\S]*?)<\/sc-if>/g;
  let scMatch: RegExpExecArray | null;
  while ((scMatch = scIfRe.exec(source))) {
    const lang = scMatch[1] === 'showEN' ? 'en' : 'ro';
    const body = scMatch[2];
    const sectionRe = /<section\b[\s\S]*?<\/section>/g;
    let secMatch: RegExpExecArray | null;
    while ((secMatch = sectionRe.exec(body))) {
      const html = secMatch[0];
      const label = /data-label="([^"]*)"/.exec(html)?.[1] ?? '';
      slides.push({ lang, label, html });
    }
  }
  return slides;
}

/**
 * "01·03 EN Voice Path" → { id: "01·03", label: "Voice Path" }; the hub and
 * the glossary annex ("AX·01") are special-cased.
 */
function parseLabel(label: string): { id: string; label: string } {
  const clean = label.replace(/&amp;/g, '&');
  const hub = /^00 Hub (EN|RO)$/.exec(clean);
  if (hub) {
    return { id: 'hub', label: 'Course map (hub)' };
  }
  const m = /^([0-9A-Z]{2}·\d{2})\s+(EN|RO)\s+(.*)$/.exec(clean);
  if (!m) {
    throw new Error(`Unparseable slide label: "${clean}"`);
  }
  return { id: m[1], label: m[3] };
}

function transform(html: string): string {
  let out = html;

  // Remove the in-slide EN/RO toggle cluster (only on hub slides).
  out = out.replace(
    /<div style="position:absolute; left:50%; transform:translateX\(-50%\); top:44px;[^"]*">\s*<div onClick="\{\{ setEN \}\}"[\s\S]*?<\/div>\s*<\/div>/g,
    '',
  );

  // Navigation handlers → data-go targets, consumed by SlideStage.
  out = out.replace(/onClick="\{\{ goHub \}\}"/g, 'data-go="hub"');
  out = out.replace(
    /onClick="\{\{ goM0(\d) \}\}"/g,
    (_, n: string) => `data-go="0${n}·01"`,
  );

  // style-hover → class (SlideStage defines .ws-hover-accent:hover).
  out = out.replace(/\s*style-hover="[^"]*"/g, ' class="ws-hover-accent"');

  // Asset paths.
  for (const [from, to] of Object.entries(ASSET_MAP)) {
    out = out.split(`src="${from}"`).join(`src="${to}"`);
  }

  // data-screen-label is Claude-Design-only metadata.
  out = out.replace(/\s*data-screen-label="[^"]*"/g, '');

  // Sanity: nothing Claude-Design-specific may survive.
  if (/\{\{|<sc-|<x-|onClick=|<script/i.test(out)) {
    const at = /\{\{|<sc-|<x-|onClick=|<script/i.exec(out);
    throw new Error(
      `Untransformed construct near: …${out.slice(Math.max(0, (at?.index ?? 0) - 60), (at?.index ?? 0) + 80)}…`,
    );
  }
  return out;
}

/** Escape for embedding in a backtick template literal. */
function escapeTemplate(html: string): string {
  return html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function fileBase(id: string, label: string): string {
  const slugLabel = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (id === 'hub') {
    return 's00-00-hub';
  }
  return `s${id.replace('·', '-')}-${slugLabel}`;
}

function main() {
  const source = readFileSync(path.join(srcDir, 'Full Course.dc.html'), 'utf8');
  const raw = extractSections(source);
  const en = raw.filter((s) => s.lang === 'en');
  const ro = raw.filter((s) => s.lang === 'ro');
  if (en.length !== ro.length) {
    throw new Error(`EN/RO count mismatch: ${en.length} vs ${ro.length}`);
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest: { file: string; constName: string }[] = [];
  for (let i = 0; i < en.length; i++) {
    const enMeta = parseLabel(en[i].label);
    const roMeta = parseLabel(ro[i].label);
    if (enMeta.id !== roMeta.id) {
      throw new Error(
        `Pairing mismatch at ${i}: EN "${en[i].label}" vs RO "${ro[i].label}"`,
      );
    }
    const id = enMeta.id;
    const moduleId = id === 'hub' ? 'hub' : id.slice(0, 2);
    const base = fileBase(id, enMeta.label);
    const constName = `SLIDE_${base.replace(/-/g, '_').toUpperCase()}`;
    const content = `import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (${en[i].label} / ${ro[i].label}).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const ${constName}: SlideDef = {
  id: '${id}',
  module: '${moduleId}',
  label: ${JSON.stringify(enMeta.label)},
  en: \`${escapeTemplate(transform(en[i].html))}\`,
  ro: \`${escapeTemplate(transform(ro[i].html))}\`,
};
`;
    writeFileSync(path.join(OUT_DIR, `${base}.ts`), content);
    manifest.push({ file: base, constName });
  }

  const index = `import type { SlideDef } from '../../types';
${manifest.map((m) => `import { ${m.constName} } from './${m.file}';`).join('\n')}

/** Deck order — remove a line (and its file) to drop a slide. */
export const SLIDES: SlideDef[] = [
${manifest.map((m) => `  ${m.constName},`).join('\n')}
];
`;
  writeFileSync(path.join(OUT_DIR, 'index.ts'), index);
  console.log(`[port] wrote ${manifest.length} slides + index.ts → ${OUT_DIR}`);
}

main();
