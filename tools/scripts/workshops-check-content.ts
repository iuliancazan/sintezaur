/**
 * Content self-checks for the workshop course. The deck and the presenter
 * script come in two cuts (90' and 60') rendered from one source, so an edit
 * in one place can silently break the other: a beat pointing at a slide the
 * short deck dropped, a retimed exercise that no longer adds up to the hour,
 * a slide nobody ever puts on screen.
 *
 * Usage: pnpm workshops:check
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DECKS } from '../../apps/workshops/src/app/content/sequential-fourm/slides';
import {
  PRESENTER_SCRIPT,
  renderScript,
} from '../../apps/workshops/src/app/content/sequential-fourm/script';
import {
  cutModules,
  scriptMinutes,
} from '../../apps/workshops/src/app/content/script/render';
import {
  COURSE_VARIANTS,
  VARIANT_MINUTES,
  type CourseVariant,
} from '../../apps/workshops/src/app/content/types';

/** Total clock per cut. The short cut's free play runs past the hour. */
const EXPECTED_CLOCK: Record<CourseVariant, number> = {
  extended: 90,
  short: 64,
};
/** Never presented on screen — it exists for the handbook's glossary. */
const UNPRESENTED_SLIDES = ['AX·01'];

const problems: string[] = [];
const note = (message: string) => problems.push(message);

for (const variant of COURSE_VARIANTS) {
  const deck = DECKS[variant];
  const modules = cutModules(PRESENTER_SCRIPT, variant);
  const beats = modules.flatMap((module) => module.beats);
  const label = `${variant} (${VARIANT_MINUTES[variant]}')`;

  // 1. The clock.
  const clock = scriptMinutes(PRESENTER_SCRIPT, variant);
  if (clock !== EXPECTED_CLOCK[variant]) {
    note(`${label}: clock is ${clock} min, expected ${EXPECTED_CLOCK[variant]}`);
  }
  const freePlay = beats[beats.length - 1];
  const course = clock - (variant === 'short' ? freePlay.minutes : 0);
  if (variant === 'short' && course !== VARIANT_MINUTES[variant]) {
    note(
      `${label}: the course runs ${course} min before free play, expected ${VARIANT_MINUTES[variant]}`,
    );
  }

  // 2. Slide ids are unique and every beat points at slides this cut has.
  const ids = deck.map((slide) => slide.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    note(`${label}: duplicate slide ids: ${[...new Set(duplicates)].join(', ')}`);
  }
  const index = new Map(ids.map((id, i) => [id, i]));
  const referenced = new Set<string>();
  let last = -1;
  for (const beat of beats) {
    const slides = PRESENTER_SCRIPT.slides[beat.id] ?? {};
    for (const id of [slides.slide, slides.demoSlide]) {
      if (!id) {
        continue;
      }
      const at = index.get(id);
      if (at === undefined) {
        note(`${label}: beat ${beat.id} points at missing slide "${id}"`);
        continue;
      }
      referenced.add(id);
      if (at < last) {
        note(
          `${label}: beat ${beat.id} goes back to slide ${at + 1} after ${last + 1}`,
        );
      }
      last = at;
    }
  }

  // 3. Every slide gets presented (bar the documented exceptions).
  for (const id of ids) {
    if (!referenced.has(id) && !UNPRESENTED_SLIDES.includes(id)) {
      note(`${label}: slide "${id}" is never put on screen by a beat`);
    }
  }

  // 4. In-slide jumps (the course map, "← COURSE MAP") land somewhere.
  for (const slide of deck) {
    for (const lang of ['en', 'ro'] as const) {
      for (const [, target] of slide[lang].matchAll(/data-go="([^"]+)"/g)) {
        if (!index.has(target)) {
          note(
            `${label}: slide "${slide.id}" (${lang}) jumps to missing "${target}"`,
          );
        }
      }
    }
  }

  // 5. Beats with something to say have both languages, and both render.
  for (const beat of beats) {
    for (const field of ['title', 'say', 'demo', 'theyDo', 'room'] as const) {
      const value = beat[field];
      if (value && (!value.en.trim() || !value.ro.trim())) {
        note(`${label}: beat ${beat.id} has an empty ${field} in one language`);
      }
    }
  }
  const rendered = {
    en: renderScript({ variant, lang: 'en', deck }),
    ro: renderScript({ variant, lang: 'ro', deck }),
  };
  const count = (html: string, needle: RegExp) => html.match(needle)?.length ?? 0;
  for (const needle of [/class="beat"/g, /border-left:3px solid/g, /<h2/g]) {
    if (count(rendered.en, needle) !== count(rendered.ro, needle)) {
      note(
        `${label}: EN and RO render a different number of ${needle.source} (${count(rendered.en, needle)} vs ${count(rendered.ro, needle)})`,
      );
    }
  }
  const leftovers = Object.entries({
    'IF RUNNING LATE': /IF RUNNING LATE/,
    'DACĂ ÎNTÂRZII': /DACĂ ÎNTÂRZII/,
    'unresolved template': /\{\{/,
  }).filter(([, re]) => re.test(rendered.en) || re.test(rendered.ro));
  for (const [what] of leftovers) {
    note(`${label}: rendered script still contains ${what}`);
  }

  console.log(
    `[check] ${label}: ${deck.length} slides, ${modules.length} modules, ${beats.length} beats, clock ${clock} min`,
  );
}

// 6. Beat-slide entries that no longer belong to any beat.
const allBeatIds = new Set(
  PRESENTER_SCRIPT.modules.flatMap((module) =>
    module.beats.map((beat) => beat.id),
  ),
);
for (const id of Object.keys(PRESENTER_SCRIPT.slides)) {
  if (!allBeatIds.has(id)) {
    note(`BEAT_SLIDES has "${id}", which is not a beat`);
  }
}

// 7. Cheat-sheet rows point at beats that exist.
for (const row of PRESENTER_SCRIPT.cheat) {
  if (!allBeatIds.has(row.beat)) {
    note(`cheat sheet row points at missing beat "${row.beat}"`);
  }
}

// 8. UI dictionaries stay in step.
const dict = (lang: 'en' | 'ro') =>
  JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), `apps/workshops/public/i18n/${lang}.json`),
      'utf8',
    ),
  ) as Record<string, Record<string, unknown>>;
const keys = (tree: Record<string, Record<string, unknown>>) =>
  Object.entries(tree)
    .flatMap(([group, entries]) =>
      Object.keys(entries).map((key) => `${group}.${key}`),
    )
    .sort();
const [en, ro] = [keys(dict('en')), keys(dict('ro'))];
for (const key of en.filter((key) => !ro.includes(key))) {
  note(`i18n: "${key}" is missing from ro.json`);
}
for (const key of ro.filter((key) => !en.includes(key))) {
  note(`i18n: "${key}" is missing from en.json`);
}
console.log(`[check] i18n: ${en.length} keys, EN/RO in step`);

if (problems.length > 0) {
  console.error(`\n[check] ${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`  · ${problem}`);
  }
  process.exit(1);
}
console.log('[check] all good.');
