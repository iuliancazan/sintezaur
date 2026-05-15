import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE, legalPages, type SintezaurDb } from '@sintezaur/db';
import { asc, eq, sql } from 'drizzle-orm';
import { LEGAL_SLUG_VALUES, type LegalSlug, UpdateLegalPageDto } from './legal.dto';

/**
 * Static legal/info pages CRUD per M6-A. The slug set is fixed by the
 * UpdateLegalPageDto-side validation + the `LEGAL_SLUGS` whitelist; the
 * site routes hard-code these slugs so adding a new one requires both
 * a migration seed row + a frontend route. (Trade-off: simpler than a
 * fully dynamic CMS, sufficient for ~6 pages that rarely change.)
 */
@Injectable()
export class LegalPagesService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  /** Public surface — content + last-updated stamp, no internal fields. */
  async getBySlug(slug: string) {
    if (!isLegalSlug(slug)) {
      throw new NotFoundException(`legal page "${slug}" not found`);
    }
    const [row] = await this.db
      .select({
        slug: legalPages.slug,
        title: legalPages.title,
        bodyMd: legalPages.bodyMd,
        metaDescription: legalPages.metaDescription,
        updatedAt: legalPages.updatedAt,
      })
      .from(legalPages)
      .where(eq(legalPages.slug, slug))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`legal page "${slug}" not found`);
    }
    return row;
  }

  /**
   * Lightweight catalog used by the footer + sitemap. Returns slug +
   * title + updatedAt only (no body).
   */
  async listSummary() {
    return this.db
      .select({
        slug: legalPages.slug,
        title: legalPages.title,
        updatedAt: legalPages.updatedAt,
      })
      .from(legalPages)
      .orderBy(asc(legalPages.slug));
  }

  /** Admin surface — full row for the edit table. */
  async listAdmin() {
    return this.db
      .select({
        slug: legalPages.slug,
        title: legalPages.title,
        bodyMd: legalPages.bodyMd,
        metaDescription: legalPages.metaDescription,
        updatedAt: legalPages.updatedAt,
        updatedByUserId: legalPages.updatedByUserId,
      })
      .from(legalPages)
      .orderBy(asc(legalPages.slug));
  }

  async update(slug: string, dto: UpdateLegalPageDto, editorUserId: string) {
    if (!isLegalSlug(slug)) {
      throw new NotFoundException(`legal page "${slug}" not found`);
    }
    const [row] = await this.db
      .update(legalPages)
      .set({
        title: dto.title,
        bodyMd: dto.bodyMd,
        metaDescription: dto.metaDescription ?? null,
        updatedByUserId: editorUserId,
        updatedAt: sql`now()`,
      })
      .where(eq(legalPages.slug, slug))
      .returning({
        slug: legalPages.slug,
        title: legalPages.title,
        updatedAt: legalPages.updatedAt,
      });
    if (!row) {
      throw new NotFoundException(`legal page "${slug}" not found`);
    }
    return row;
  }
}

function isLegalSlug(slug: string): slug is LegalSlug {
  return (LEGAL_SLUG_VALUES as readonly string[]).includes(slug);
}
