/**
 * Ports the v02.1 document deliverables into content files:
 *
 *  - Student Handbook (13 explicit A4 pages, EN+RO): SINGLE SOURCE from the
 *    Screen (dark) variant; the Print (light) variant is used only to DERIVE
 *    a color theme. Every color occurrence whose Print counterpart differs
 *    becomes `var(--hb-N, <screen>)` (SVG fill/stroke attributes are moved
 *    into inline style when themed); a generated SCSS sets the print values
 *    under `@media print` / `.hb-theme-light`. Logo <img>s are emitted in
 *    both variants with `.hb-only-dark` / `.hb-only-light`.
 *  - Presenter Script + Run of Show (flowing, light, RO-only in v02.1):
 *    ported as flowing HTML; the EN field starts as a copy marked TODO and
 *    is replaced by the human-reviewed translation pass.
 *
 * Usage: pnpm tsx tools/scripts/port-course-docs.ts [path-to-v02.1-dir]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_SRC =
  '/Users/Iulian/Library/Mobile Documents/iCloud~md~obsidian/Documents/hq/projects/music/sintezaur/Crash Course in Sound Design with the Sequentila Fourm/claude-design-prototypes/2026-08-17-v02.1';
const srcDir = process.argv[2] ?? DEFAULT_SRC;
const OUT_BASE = path.resolve(
  process.cwd(),
  'apps/workshops/src/app/content/sequential-fourm',
);

const ASSET_MAP: Record<string, string> = {
  'uploads/Logo - white.png': '/course/logo-sintezaur-white.png',
  'assets/sintezaur-dark.png': '/course/logo-sintezaur-dark.png',
  'assets/zeedo-white.svg': '/course/logo-zeedo-white.svg',
  'assets/zeedo-dark.svg': '/course/logo-zeedo-dark.svg',
  'uploads/seq_logo-1786819698328-xdh8.png': '/course/logo-sequential.png',
  'assets/fourm-cover.jpg': '/course/fourm-cover.jpg',
};

const COLOR_RE = /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g;

function remapAssets(html: string): string {
  let out = html;
  for (const [from, to] of Object.entries(ASSET_MAP)) {
    out = out.split(`src="${from}"`).join(`src="${to}"`);
  }
  return out;
}

function escapeTemplate(html: string): string {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function pagesOf(doc: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<section class="page" id="(p\d+)"[\s\S]*?<\/section>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc))) {
    map.set(m[1], m[0]);
  }
  return map;
}

function flowingBody(doc: string): string {
  const m = /<doc-page[^>]*>([\s\S]*?)<\/doc-page>/.exec(doc);
  if (!m) {
    throw new Error('No <doc-page> body found');
  }
  return m[1].trim();
}

interface ColorOcc {
  index: number;
  value: string;
}

function colorOccurrences(html: string): ColorOcc[] {
  const occs: ColorOcc[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(COLOR_RE.source, 'g');
  while ((m = re.exec(html))) {
    occs.push({ index: m.index, value: m[0] });
  }
  return occs;
}

/**
 * Aligns Screen↔Print color occurrences of one page. Segments between
 * colors act as anchors; on mismatch (small structural print tweaks) we
 * skip ahead greedily on either side. Unmatched Screen colors keep their
 * value (identity), which is the safe default.
 */
function alignPage(
  screen: string,
  print: string,
): Map<number, string> /* occIndexInScreen -> printValue */ {
  const segRe = new RegExp(COLOR_RE.source, 'g');
  const split = (s: string) => {
    const parts: { text: string; color?: string }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(segRe.source, 'g');
    while ((m = re.exec(s))) {
      parts.push({ text: s.slice(last, m.index) });
      parts.push({ text: m[0], color: m[0] });
      last = m.index + m[0].length;
    }
    parts.push({ text: s.slice(last) });
    return parts;
  };
  const normalize = (t: string) => t.replace(/\s+/g, ' ');
  const a = split(screen);
  const b = split(print);
  const mapping = new Map<number, string>();
  let ai = 0;
  let bi = 0;
  let aColor = -1;
  while (ai < a.length && bi < b.length) {
    const pa = a[ai];
    const pb = b[bi];
    if (pa.color && pb.color) {
      aColor++;
      mapping.set(aColor, pb.color);
      ai++;
      bi++;
      continue;
    }
    if (!pa.color && !pb.color) {
      if (normalize(pa.text) === normalize(pb.text)) {
        ai++;
        bi++;
        continue;
      }
      // Structural divergence: greedily resync on the next long common text.
      const anchorA = a.findIndex(
        (p, i) => i > ai && !p.color && normalize(p.text).length > 24,
      );
      if (anchorA < 0) {
        break;
      }
      const anchorText = normalize(a[anchorA].text);
      const anchorB = b.findIndex(
        (p, i) => i >= bi && !p.color && normalize(p.text) === anchorText,
      );
      // Count colors we skip on the screen side — identity for them.
      for (let i = ai; i < anchorA; i++) {
        if (a[i].color) {
          aColor++;
        }
      }
      ai = anchorA;
      bi = anchorB >= 0 ? anchorB : bi;
      if (anchorB < 0) {
        break;
      }
      continue;
    }
    // One side has a color where the other has text (insertion/removal).
    if (pa.color) {
      aColor++;
      ai++;
    } else {
      bi++;
    }
  }
  return mapping;
}

interface ThemePair {
  varName: string;
  screen: string;
  print: string;
}

const themePairs = new Map<string, ThemePair>();

function varFor(screen: string, print: string): string {
  const key = `${screen}→${print}`;
  let pair = themePairs.get(key);
  if (!pair) {
    pair = {
      varName: `--hb-${themePairs.size + 1}`,
      screen,
      print,
    };
    themePairs.set(key, pair);
  }
  return pair.varName;
}

/** Is the color at `index` inside an open style="…" attribute? */
function inStyleAttr(html: string, index: number): boolean {
  const before = html.slice(Math.max(0, index - 400), index);
  const open = before.lastIndexOf('style="');
  if (open < 0) {
    return false;
  }
  return !before.slice(open + 7).includes('"');
}

/** SVG presentation attribute directly wrapping this color? */
function svgAttrAt(
  html: string,
  index: number,
): { attr: string; start: number } | null {
  const before = html.slice(Math.max(0, index - 40), index);
  const m = /(fill|stroke|stop-color)="$/.exec(before);
  if (!m) {
    return null;
  }
  return { attr: m[1], start: index - (m[0].length - 0) };
}

function themePage(screen: string, print: string): string {
  const occs = colorOccurrences(screen);
  const mapping = alignPage(screen, print);
  // Apply replacements back-to-front so offsets stay valid.
  let out = screen;
  for (let i = occs.length - 1; i >= 0; i--) {
    const occ = occs[i];
    const printVal = mapping.get(i) ?? occ.value;
    if (printVal === occ.value) {
      continue;
    }
    const varName = varFor(occ.value, printVal);
    if (inStyleAttr(out, occ.index)) {
      out =
        out.slice(0, occ.index) +
        `var(${varName}, ${occ.value})` +
        out.slice(occ.index + occ.value.length);
      continue;
    }
    const svgAttr = svgAttrAt(out, occ.index);
    if (svgAttr) {
      // fill="#X" → fill="#X" style="fill:var(--hb-N, #X)" (style wins).
      const attrText = `${svgAttr.attr}="${occ.value}"`;
      const attrStart = out.lastIndexOf(
        `${svgAttr.attr}="`,
        occ.index,
      );
      const replacement = `${attrText} style="${svgAttr.attr}:var(${varName}, ${occ.value})"`;
      out =
        out.slice(0, attrStart) +
        replacement +
        out.slice(attrStart + attrText.length);
      continue;
    }
    // <style> blocks or unexpected context — leave identity, report.
    console.warn(
      `[docs] unthemed occurrence (${occ.value} → ${printVal}) at unknown context`,
    );
  }
  return out;
}

/** Emit both logo variants with theme classes. */
function dualLogos(html: string): string {
  return html
    .replace(
      /<img src="\/course\/logo-sintezaur-white\.png"([^>]*)>/g,
      '<img class="hb-only-dark" src="/course/logo-sintezaur-white.png"$1><img class="hb-only-light" src="/course/logo-sintezaur-dark.png"$1>',
    )
    .replace(
      /<img src="\/course\/logo-zeedo-white\.svg"([^>]*)>/g,
      '<img class="hb-only-dark" src="/course/logo-zeedo-white.svg"$1><img class="hb-only-light" src="/course/logo-zeedo-dark.svg"$1>',
    );
}

function main() {
  const read = (name: string) =>
    readFileSync(path.join(srcDir, name), 'utf8');

  // ---------- Handbook ----------
  const hbDir = path.join(OUT_BASE, 'handbook');
  mkdirSync(hbDir, { recursive: true });
  const screens = {
    en: pagesOf(read('Student Handbook EN - Screen.dc.html')),
    ro: pagesOf(read('Student Handbook RO - Screen.dc.html')),
  };
  const prints = {
    en: pagesOf(read('Student Handbook EN - Print.dc.html')),
    ro: pagesOf(read('Student Handbook RO - Print.dc.html')),
  };
  const pageIds = [...screens.en.keys()];
  const manifest: string[] = [];
  for (const id of pageIds) {
    const en = dualLogos(
      remapAssets(
        themePage(
          remapAssets(screens.en.get(id) ?? ''),
          remapAssets(prints.en.get(id) ?? ''),
        ),
      ),
    );
    const ro = dualLogos(
      remapAssets(
        themePage(
          remapAssets(screens.ro.get(id) ?? ''),
          remapAssets(prints.ro.get(id) ?? ''),
        ),
      ),
    );
    for (const [lang, html] of [
      ['EN', en],
      ['RO', ro],
    ] as const) {
      if (/\{\{|<sc-|<x-|<script/i.test(html)) {
        throw new Error(`Handbook ${id} ${lang}: leftover construct`);
      }
    }
    const num = id.replace('p', '').padStart(2, '0');
    const constName = `PAGE_${num}`;
    writeFileSync(
      path.join(hbDir, `page-${num}.ts`),
      `import type { DocPageDef } from '../../types';

// Ported from v02.1 Student Handbook (Screen source of truth; print theme
// via --hb-* vars, see handbook-theme.scss). EN+RO colocated.
export const ${constName}: DocPageDef = {
  id: '${id}',
  en: \`${escapeTemplate(en)}\`,
  ro: \`${escapeTemplate(ro)}\`,
};
`,
    );
    manifest.push(constName);
  }
  writeFileSync(
    path.join(hbDir, 'index.ts'),
    `import type { DocPageDef } from '../../types';
${manifest.map((c, i) => `import { ${c} } from './page-${String(i + 1).padStart(2, '0')}';`).join('\n')}

/** Handbook page order — delete a line (and its file) to drop a page. */
export const HANDBOOK_PAGES: DocPageDef[] = [
${manifest.map((c) => `  ${c},`).join('\n')}
];
`,
  );

  // Theme scss — print/light values for every themed pair.
  const pairs = [...themePairs.values()];
  writeFileSync(
    path.join(hbDir, 'handbook-theme.scss'),
    `/* GENERATED by tools/scripts/port-course-docs.ts — screen(dark) values are
 * the inline fallbacks in the content; these are the print/light values,
 * derived positionally from the v02.1 Print variant. */
@mixin hb-light-values {
${pairs.map((p) => `  ${p.varName}: ${p.print}; /* screen ${p.screen} */`).join('\n')}
}

.hb-only-light {
  display: none !important;
}

.hb-theme-light {
  @include hb-light-values;

  .hb-only-dark {
    display: none !important;
  }
  .hb-only-light {
    display: inline-block !important;
  }
}

@media print {
  .hb-theme-print {
    @include hb-light-values;

    .hb-only-dark {
      display: none !important;
    }
    .hb-only-light {
      display: inline-block !important;
    }
  }
}
`,
  );
  console.log(
    `[docs] handbook: ${pageIds.length} pages ×2 langs, ${pairs.length} themed color pairs`,
  );

  // ---------- Presenter Script + Run of Show (flowing, light) ----------
  const docsDir = path.join(OUT_BASE, 'docs');
  mkdirSync(docsDir, { recursive: true });
  const flowing = [
    { file: 'presenter-script.ts', constName: 'PRESENTER_SCRIPT', src: 'Presenter Script.dc.html' },
    { file: 'run-of-show.ts', constName: 'RUN_OF_SHOW', src: 'Run of Show.dc.html' },
  ];
  for (const doc of flowing) {
    const ro = remapAssets(flowingBody(read(doc.src)));
    if (/\{\{|<sc-|<x-|<script/i.test(ro)) {
      throw new Error(`${doc.src}: leftover construct`);
    }
    writeFileSync(
      path.join(docsDir, doc.file),
      `// Ported from v02.1 "${doc.src}" (flowing A4, light). RO is the
// original; EN starts as a copy and is replaced by the translation pass
// (workshops-spec.md §6 — everything bilingual).
export const ${doc.constName} = {
  ro: \`${escapeTemplate(ro)}\`,
  // TODO(translation): EN version pending — currently the RO original.
  en: \`${escapeTemplate(ro)}\`,
};
`,
    );
    console.log(`[docs] ${doc.file}: ${Math.round(ro.length / 1024)}KB flowing body`);
  }
}

main();
