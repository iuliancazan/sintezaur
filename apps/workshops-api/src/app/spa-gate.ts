import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AuthService } from './auth/auth.service';
import { SESSION_COOKIE } from './auth/session';

/**
 * Production serving model (workshops-spec.md §3/§4): this process fronts
 * the built SPA. Without a valid session cookie every non-API request gets
 * only the self-contained gate page — the SPA bundle (and the content in
 * it) is never delivered to unauthenticated visitors.
 *
 * Caching (spec §13, "no stale versions, ever"): hashed build files are
 * immutable; index.html and the gate are no-store; unhashed statics
 * (course fonts/logos, i18n) revalidate via etag.
 */
export function mountSpaGate(app: NestExpressApplication) {
  const distCandidates = [
    process.env.WORKSHOPS_SPA_DIST,
    path.resolve(__dirname, '../workshops/browser'),
    path.resolve(process.cwd(), 'dist/apps/workshops/browser'),
  ].filter((p): p is string => !!p);
  const spaDist = distCandidates.find((p) =>
    existsSync(path.join(p, 'index.html')),
  );
  if (!spaDist) {
    console.log(
      '[workshops-api] no SPA build found — running API-only (dev mode).',
    );
    return;
  }

  const gateCandidates = [
    path.join(__dirname, 'assets/gate'),
    path.resolve(process.cwd(), 'apps/workshops-api/src/assets/gate'),
  ];
  const gateDir = gateCandidates.find((p) =>
    existsSync(path.join(p, 'gate.html')),
  );
  const auth = app.get(AuthService);
  const index = path.join(spaDist, 'index.html');

  const noStore = (res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  };

  // 1) The gate: unauthenticated non-API traffic sees only the login page.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token && auth.verify(token)) {
      return next();
    }
    noStore(res);
    if (req.path === '/gate.js' && gateDir) {
      return res.sendFile(path.join(gateDir, 'gate.js'));
    }
    if (!gateDir) {
      return res.status(503).send('gate unavailable');
    }
    return res.sendFile(path.join(gateDir, 'gate.html'));
  });

  // 2) Authenticated: the SPA build with deploy-safe cache headers.
  app.useStaticAssets(spaDist, {
    index: false,
    setHeaders: (res: Response, filePath: string) => {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (/-[A-Z0-9]{8}\.(js|css)$/i.test(filePath)) {
        // Content-hashed build outputs: a new deploy = new URLs.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Unhashed statics (course assets, i18n, favicon): etag revalidate.
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  });

  // 3) SPA fallback — always the fresh index.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api') ||
      (req.method !== 'GET' && req.method !== 'HEAD')
    ) {
      return next();
    }
    noStore(res);
    res.sendFile(index);
  });

  console.log(`[workshops-api] serving gated SPA from ${spaDist}`);
}
