import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { SessionGuard, type AuthedRequest } from '../auth/session.guard';
import { VISITOR_COOKIE } from '../auth/session';
import { DbService } from '../db/db.service';
import { EventsService } from '../events/events.service';
import { workshops } from '../../db/schema';

const DOCS = ['slides', 'handbook', 'script', 'run-of-show'] as const;
type DocKind = (typeof DOCS)[number];
const ADMIN_ONLY: DocKind[] = ['script', 'run-of-show'];
/** Slugs are kebab-case by construction; anything else never hits the disk. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Serves the pre-generated PDFs (tools/scripts/workshops-pdf.ts →
 * src/assets/pdf/<slug>/<doc>-<lang>.pdf, committed to the repo) behind the
 * same visibility rules as the live documents (workshops-spec.md §4.3/§10).
 */
@Controller('pdf')
@UseGuards(SessionGuard)
export class PdfController {
  constructor(
    private readonly dbService: DbService,
    private readonly events: EventsService,
  ) {}

  @Get(':slug/:doc')
  async download(
    @Param('slug') slug: string,
    @Param('doc') doc: string,
    @Query('lang') langRaw: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    const lang = langRaw === 'ro' ? 'ro' : 'en';
    if (!DOCS.includes(doc as DocKind) || !SLUG_RE.test(slug)) {
      throw new NotFoundException();
    }
    const session = req.session;
    if (session.role !== 'superadmin' && session.slug !== slug) {
      throw new ForbiddenException();
    }
    if (
      session.role === 'guest' &&
      ADMIN_ONLY.includes(doc as DocKind)
    ) {
      throw new ForbiddenException();
    }
    if (session.role === 'guest' && doc === 'slides') {
      const rows = await this.dbService.db
        .select({ guestSeesSlides: workshops.guestSeesSlides })
        .from(workshops)
        .where(eq(workshops.slug, slug));
      if (!rows[0]?.guestSeesSlides) {
        throw new ForbiddenException();
      }
    }

    // Prod: webpack copies src/assets into dist. Dev fallback: read straight
    // from src so freshly generated PDFs work without a rebuild.
    const rel = ['pdf', slug, `${doc}-${lang}.pdf`];
    const candidates = [
      path.join(__dirname, 'assets', ...rel),
      path.join(
        process.cwd(),
        'apps/workshops-api/src/assets',
        ...rel,
      ),
    ];
    const file = candidates.find((p) => existsSync(p));
    if (!file) {
      throw new NotFoundException('pdf_not_generated');
    }

    this.events.record({
      workshopId: session.workshopId,
      visitorId: req.cookies?.[VISITOR_COOKIE],
      role: session.role,
      event: 'download',
      document: doc,
      lang,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${slug}-${doc}-${lang}.pdf"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    createReadStream(file).pipe(res);
  }
}
