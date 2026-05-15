/**
 * Generate the brand placeholder assets the site references but which
 * aren't yet shipped as part of design output:
 *   - apps/site/public/assets/branding/og-default.png  (1200×630)
 *   - apps/site/public/assets/branding/logo.png        (512×512)
 *
 * Run with `pnpm tsx tools/scripts/generate-brand-assets.ts`. Idempotent
 * — overwrites existing files. Re-run any time the brand color changes
 * or before a fresh design drop is wired into the site CSS.
 *
 * Final brand work (typography, illustration) belongs in Iulian's
 * Claude Design output; this script just unblocks share-card previews
 * for soft-launch so Facebook / iMessage / Slack don't fall back to a
 * generic web logo.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const OG_PATH = resolve(
  process.cwd(),
  'apps/site/public/assets/branding/og-default.png',
);
const LOGO_PATH = resolve(
  process.cwd(),
  'apps/site/public/assets/branding/logo.png',
);

const BRAND_BG = '#0f172a'; // slate-900
const BRAND_FG = '#fbbf24'; // amber-400 — wordmark accent
const SUBTLE = '#94a3b8'; // slate-400

async function writePngFromSvg(target: string, svg: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(target, buf);
  process.stdout.write(`[branding] wrote ${target} (${buf.byteLength} B)\n`);
}

async function generateOgDefault(): Promise<void> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BRAND_BG}"/>
  <text x="600" y="290"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="120"
    font-weight="800"
    letter-spacing="-2"
    fill="${BRAND_FG}"
    text-anchor="middle">SINTEZAUR</text>
  <text x="600" y="370"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="34"
    font-weight="400"
    fill="${SUBTLE}"
    text-anchor="middle">Gear · Bazar · Revista · Forum</text>
  <text x="600" y="470"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="22"
    font-weight="400"
    letter-spacing="6"
    fill="${SUBTLE}"
    text-anchor="middle">sintezaur.ro</text>
</svg>`;
  await writePngFromSvg(OG_PATH, svg);
}

async function generateLogo(): Promise<void> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND_BG}"/>
  <text x="256" y="290"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="180"
    font-weight="800"
    fill="${BRAND_FG}"
    text-anchor="middle">SZ</text>
</svg>`;
  await writePngFromSvg(LOGO_PATH, svg);
}

async function main(): Promise<void> {
  await Promise.all([generateOgDefault(), generateLogo()]);
  process.stdout.write('[branding] done.\n');
}

main().catch((err) => {
  console.error('[branding] failed:', err);
  process.exit(1);
});
