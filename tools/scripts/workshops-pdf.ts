import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from '@playwright/test';

/**
 * Renders the workshop deliverables to PDF via the running dev servers
 * (workshops on :4300 proxying workshops-api on :3300), using the same
 * print CSS the browser Print button uses. Output goes to
 * apps/workshops-api/src/assets/pdf/<slug>/ and is COMMITTED — production
 * serves these files behind auth without needing a browser in the image
 * (workshops-spec.md §10).
 *
 * Usage (both dev servers running):
 *   pnpm workshops:pdf                      # slug sequential-fourm, dev admin password
 *   WORKSHOPS_PDF_PASSWORD=... pnpm workshops:pdf -- other-slug
 */
const slug = process.argv[2] ?? 'sequential-fourm';
const BASE = process.env.WORKSHOPS_PDF_BASE ?? 'http://localhost:4300';
const USERNAME = process.env.WORKSHOPS_PDF_USERNAME ?? 'admin';
const PASSWORD = process.env.WORKSHOPS_PDF_PASSWORD ?? 'fourm-admin';
const OUT_DIR = path.resolve(
  process.cwd(),
  'apps/workshops-api/src/assets/pdf',
  slug,
);

async function login(context: BrowserContext) {
  const res = await context.request.post(`${BASE}/api/auth/login`, {
    data: { slug, username: USERNAME, password: PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(
      `Login failed (${res.status()}) — are both dev servers running and are WORKSHOPS_PDF_USERNAME/WORKSHOPS_PDF_PASSWORD an admin account for "${slug}"?`,
    );
  }
}

async function settle(page: Page, selector: string, count: number) {
  await page.waitForFunction(
    ({ selector, count }) =>
      document.querySelectorAll(selector).length >= count,
    { selector, count },
    { timeout: 30_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  // Give layout/images one more beat.
  await page.waitForTimeout(600);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await login(context);
  const page = await context.newPage();

  for (const lang of ['en', 'ro'] as const) {
    // Slides — one 1920×1080 page per slide, vector.
    await page.goto(`${BASE}/w/${slug}/slides?print=1&lang=${lang}`);
    await settle(page, '.deck-print__page', 1);
    const slideCount = await page.evaluate(
      () => document.querySelectorAll('.deck-print__page').length,
    );
    await page.pdf({
      path: path.join(OUT_DIR, `slides-${lang}.pdf`),
      width: '1920px',
      height: '1080px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`[pdf] slides-${lang}.pdf (${slideCount} slides)`);

    // Handbook — A4, light print theme via @media print.
    await page.goto(`${BASE}/w/${slug}/handbook?lang=${lang}`);
    await settle(page, '.doc__sheet', 13);
    await page.pdf({
      path: path.join(OUT_DIR, `handbook-${lang}.pdf`),
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`[pdf] handbook-${lang}.pdf`);

    // Presenter script + run of show — flowing A4.
    for (const doc of ['script', 'run-of-show'] as const) {
      await page.goto(`${BASE}/w/${slug}/${doc}?lang=${lang}`);
      await settle(page, '.doc__sheet--flow', 1);
      await page.pdf({
        path: path.join(OUT_DIR, `${doc}-${lang}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: 0, bottom: '12mm', left: 0 },
      });
      console.log(`[pdf] ${doc}-${lang}.pdf`);
    }
  }

  await browser.close();
  console.log(`[pdf] done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[pdf] failed:', err);
  process.exit(1);
});
