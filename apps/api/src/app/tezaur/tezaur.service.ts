import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import 'multer';
import {
  DATABASE,
  type SintezaurDb,
  forumCategories,
  forumPosts,
  forumThreads,
  gear,
  gearDescriptions,
  gearFamilies,
  gearImages,
  gearLinks,
  gearRelationships,
  gearVideos,
  slugRedirects,
  userGearStatuses,
} from '@sintezaur/db';
import { slugFromParts, slugify, uniqueSlug } from '@sintezaur/shared';
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';
import { StorageService, type ProcessedUpload } from '../common/storage.service';
import type {
  CreateGearDto,
  CreateGearFamilyDto,
  CreateGearLinkDto,
  CreateGearRelationshipDto,
  CreateGearVideoDto,
  ListGearQueryDto,
  ListModerationQueueDto,
  MeCreateGearDto,
  MeUpdateGearDto,
  UpdateGearDto,
  UpdateGearFamilyDto,
  UpsertGearDescriptionDto,
} from './tezaur.dto';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

const MODERATOR_ROLES = ['curator', 'admin', 'superadmin'] as const;
function isModerator(roles: readonly string[]): boolean {
  return roles.some((r) => (MODERATOR_ROLES as readonly string[]).includes(r));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PublicGearListItem {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  formFactor: string | null;
  yearReleased: number | null;
  yearDiscontinued: number | null;
  ownersPublicCount: number;
  avgRating: string | null;
  reviewCount: number;
  /** Square thumb path (relative to /uploads), or null when no images. */
  thumb: string | null;
  /** Per-category type from `specs.type`. */
  type: string | null;
}

@Injectable()
export class TezaurService {
  private readonly logger = new Logger(TezaurService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly storage: StorageService,
    private readonly audit: AuditLogService,
  ) {}

  /* ============================================================
     gear CRUD
     ============================================================ */

  async createGear(
    dto: CreateGearDto,
    actorId: string,
    req?: Request,
  ): Promise<{ id: string; slug: string }> {
    const slugCandidate = dto.slug
      ? slugify(dto.slug)
      : slugFromParts(dto.brand, dto.model);
    const slug = await uniqueSlug(slugCandidate, (s) => this.gearSlugExists(s));

    const [row] = await this.db
      .insert(gear)
      .values({
        slug,
        category: dto.category,
        brand: dto.brand,
        model: dto.model,
        formFactor: dto.formFactor,
        familyId: dto.familyId,
        yearReleased: dto.yearReleased,
        yearDiscontinued: dto.yearDiscontinued,
        msrpAtLaunchEur: dto.msrpAtLaunchEur?.toString(),
        latestFirmwareVersion: dto.latestFirmwareVersion,
        firmwareNotesUrl: dto.firmwareNotesUrl,
        specs: dto.specs ?? {},
        published: dto.published ?? false,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning({ id: gear.id, slug: gear.slug });

    await this.audit.record({
      actorId,
      action: 'create_gear',
      targetType: 'gear',
      targetId: row.id,
      details: { slug: row.slug, brand: dto.brand, model: dto.model },
      req,
    });
    return row;
  }

  async updateGear(
    id: string,
    dto: UpdateGearDto,
    actorId: string,
    req?: Request,
  ): Promise<{ id: string; slug: string }> {
    const existing = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, id), isNull(gear.deletedAt)))
      .limit(1);
    const current = existing[0];
    if (!current) throw new NotFoundException(`gear ${id} not found`);

    let newSlug = current.slug;
    if (dto.slug && dto.slug !== current.slug) {
      if (current.published) {
        throw new ConflictException('Slug locked after publish (spec §7.13).');
      }
      newSlug = await uniqueSlug(slugify(dto.slug), (s) =>
        this.gearSlugExists(s, id),
      );
    }

    const wasPublished = current.published;
    const willPublish = dto.published ?? current.published;

    // If slug effectively changes on a published item via brand/model edit
    // (not allowed, but defensive — service blocks the path above), skip.
    await this.db
      .update(gear)
      .set({
        slug: newSlug,
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.formFactor !== undefined && { formFactor: dto.formFactor }),
        ...(dto.familyId !== undefined && { familyId: dto.familyId ?? null }),
        ...(dto.yearReleased !== undefined && {
          yearReleased: dto.yearReleased,
        }),
        ...(dto.yearDiscontinued !== undefined && {
          yearDiscontinued: dto.yearDiscontinued,
        }),
        ...(dto.msrpAtLaunchEur !== undefined && {
          msrpAtLaunchEur: dto.msrpAtLaunchEur?.toString() ?? null,
        }),
        ...(dto.latestFirmwareVersion !== undefined && {
          latestFirmwareVersion: dto.latestFirmwareVersion ?? null,
        }),
        ...(dto.firmwareNotesUrl !== undefined && {
          firmwareNotesUrl: dto.firmwareNotesUrl ?? null,
        }),
        ...(dto.specs !== undefined && { specs: dto.specs }),
        ...(dto.published !== undefined && { published: dto.published }),
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(gear.id, id));

    if (!wasPublished && willPublish) {
      // Lock slug on first publish — already enforced for future updates.
      this.logger.log(`gear ${id} published (slug locked)`);
    }

    await this.audit.record({
      actorId,
      action: 'edit_gear',
      targetType: 'gear',
      targetId: id,
      details: { changed: Object.keys(dto) },
      req,
    });

    return { id, slug: newSlug };
  }

  async softDeleteGear(
    id: string,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const result = await this.db
      .update(gear)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(gear.id, id), isNull(gear.deletedAt)))
      .returning({ id: gear.id });
    if (!result.length) throw new NotFoundException(`gear ${id} not found`);
    await this.audit.record({
      actorId,
      action: 'soft_delete_gear',
      targetType: 'gear',
      targetId: id,
      req,
    });
  }

  /* ============================================================
     Canonical forum thread per spec §8.1 ("Thread oficial" in RO UI).
     Editor toggles ON to attach a forum thread; OFF clears the link
     but preserves the thread (replies stay). Toggling ON twice on the
     same gear re-attaches the previous thread instead of creating a
     new one (the `forum_threads.canonical_for_gear_id` reverse FK is
     unique partial → enforces this).
     ============================================================ */

  async enableOfficialThread(
    gearId: string,
    actorId: string,
    req?: Request,
  ): Promise<{ threadId: string; threadSlug: string; created: boolean }> {
    const [g] = await this.db
      .select()
      .from(gear)
      .where(eq(gear.id, gearId))
      .limit(1);
    if (!g) throw new NotFoundException(`gear ${gearId} not found`);

    // Fast path: already linked.
    if (g.canonicalThreadId) {
      const [t] = await this.db
        .select({ id: forumThreads.id, slug: forumThreads.slug })
        .from(forumThreads)
        .where(eq(forumThreads.id, g.canonicalThreadId))
        .limit(1);
      if (t) return { threadId: t.id, threadSlug: t.slug, created: false };
    }

    // Try to reuse the previously-attached thread (toggle-OFF preserved it).
    const [existing] = await this.db
      .select({ id: forumThreads.id, slug: forumThreads.slug })
      .from(forumThreads)
      .where(eq(forumThreads.canonicalForGearId, gearId))
      .limit(1);

    if (existing) {
      await this.db
        .update(gear)
        .set({ canonicalThreadId: existing.id, updatedBy: actorId })
        .where(eq(gear.id, gearId));
      await this.audit.record({
        actorId,
        action: 'set_canonical_thread',
        targetType: 'gear',
        targetId: gearId,
        details: { threadId: existing.id, reused: true },
        req,
      });
      return { threadId: existing.id, threadSlug: existing.slug, created: false };
    }

    // Create new in `discutii_echipamente`.
    const [cat] = await this.db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.key, 'discutii_echipamente'))
      .limit(1);
    if (!cat) {
      throw new ConflictException(
        'Categoria forum `discutii_echipamente` lipsește — rulează migrațiile.',
      );
    }

    const title = `Discuții: ${g.brand} ${g.model}`;
    const slug = await uniqueSlug(slugFromParts(g.brand, g.model), (s) =>
      this.forumThreadSlugTaken(s),
    );
    const opHtml = `<p>Thread oficial pentru discuții despre <strong>${escapeHtml(g.brand)} ${escapeHtml(g.model)}</strong>. Vezi specificații și istoric pe pagina <a href="/tezaur/${g.slug}">Tezaur</a>.</p>`;
    const opJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Thread oficial pentru discuții despre ' },
            { type: 'text', marks: [{ type: 'bold' }], text: `${g.brand} ${g.model}` },
            { type: 'text', text: '. Vezi specificații și istoric pe pagina Tezaur.' },
          ],
        },
      ],
    };

    const [thread] = await this.db
      .insert(forumThreads)
      .values({
        slug,
        categoryId: cat.id,
        authorId: actorId,
        title,
        postCount: 0,
        canonicalForGearId: gearId,
      })
      .returning({ id: forumThreads.id, slug: forumThreads.slug });

    const [op] = await this.db
      .insert(forumPosts)
      .values({
        threadId: thread.id,
        parentPostId: null,
        authorId: actorId,
        body: opJson,
        bodyHtml: opHtml,
        topLevelSeq: 0,
        subSeq: null,
        status: 'approved',
      })
      .returning({ id: forumPosts.id });

    await this.db
      .update(forumThreads)
      .set({
        firstPostId: op.id,
        postCount: 1,
        lastPostAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, thread.id));

    await this.db
      .update(gear)
      .set({ canonicalThreadId: thread.id, updatedBy: actorId })
      .where(eq(gear.id, gearId));

    await this.audit.record({
      actorId,
      action: 'set_canonical_thread',
      targetType: 'gear',
      targetId: gearId,
      details: { threadId: thread.id, created: true, title },
      req,
    });

    return { threadId: thread.id, threadSlug: thread.slug, created: true };
  }

  async disableOfficialThread(
    gearId: string,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const [g] = await this.db
      .select({ canonicalThreadId: gear.canonicalThreadId })
      .from(gear)
      .where(eq(gear.id, gearId))
      .limit(1);
    if (!g) throw new NotFoundException(`gear ${gearId} not found`);
    if (!g.canonicalThreadId) return; // already off

    await this.db
      .update(gear)
      .set({ canonicalThreadId: null, updatedBy: actorId })
      .where(eq(gear.id, gearId));

    await this.audit.record({
      actorId,
      action: 'set_canonical_thread',
      targetType: 'gear',
      targetId: gearId,
      details: { unlinked: true, threadId: g.canonicalThreadId },
      req,
    });
  }

  private async forumThreadSlugTaken(slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(eq(forumThreads.slug, slug))
      .limit(1);
    return rows.length > 0;
  }

  async restoreGear(
    id: string,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const result = await this.db
      .update(gear)
      .set({ deletedAt: null, updatedBy: actorId })
      .where(eq(gear.id, id))
      .returning({ id: gear.id });
    if (!result.length) throw new NotFoundException(`gear ${id} not found`);
    await this.audit.record({
      actorId,
      action: 'restore_gear',
      targetType: 'gear',
      targetId: id,
      req,
    });
  }

  /* ============================================================
     gear family
     ============================================================ */

  async createFamily(
    dto: CreateGearFamilyDto,
    actorId: string,
    req?: Request,
  ): Promise<{ id: string; slug: string }> {
    const slug = await uniqueSlug(
      slugify(dto.slug ?? dto.name),
      (s) => this.familySlugExists(s),
    );
    const [row] = await this.db
      .insert(gearFamilies)
      .values({ slug, name: dto.name, summary: dto.summary })
      .returning({ id: gearFamilies.id, slug: gearFamilies.slug });
    await this.audit.record({
      actorId,
      action: 'create_gear_family',
      targetType: 'gear_family',
      targetId: row.id,
      details: { name: dto.name },
      req,
    });
    return row;
  }

  async updateFamily(
    id: string,
    dto: UpdateGearFamilyDto,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const result = await this.db
      .update(gearFamilies)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
        updatedAt: new Date(),
      })
      .where(eq(gearFamilies.id, id))
      .returning({ id: gearFamilies.id });
    if (!result.length) throw new NotFoundException(`family ${id} not found`);
    await this.audit.record({
      actorId,
      action: 'edit_gear_family',
      targetType: 'gear_family',
      targetId: id,
      details: { changed: Object.keys(dto) },
      req,
    });
  }

  async listFamilies(): Promise<{ id: string; slug: string; name: string }[]> {
    return this.db
      .select({
        id: gearFamilies.id,
        slug: gearFamilies.slug,
        name: gearFamilies.name,
      })
      .from(gearFamilies)
      .orderBy(asc(gearFamilies.name));
  }

  /**
   * Admin family listing with gear count (non-deleted) per family. Used
   * by the dashboard families management page to highlight which entries
   * are heavy / which are orphan candidates for delete.
   */
  async listFamiliesAdmin(): Promise<
    {
      id: string;
      slug: string;
      name: string;
      summary: string | null;
      gearCount: number;
      createdAt: Date;
      updatedAt: Date;
    }[]
  > {
    return this.db
      .select({
        id: gearFamilies.id,
        slug: gearFamilies.slug,
        name: gearFamilies.name,
        summary: gearFamilies.summary,
        createdAt: gearFamilies.createdAt,
        updatedAt: gearFamilies.updatedAt,
        gearCount: sql<number>`(
          SELECT count(*)::int FROM ${gear}
          WHERE ${gear.familyId} = ${gearFamilies.id}
            AND ${gear.deletedAt} IS NULL
        )`,
      })
      .from(gearFamilies)
      .orderBy(asc(gearFamilies.name));
  }

  /**
   * Hard delete a family. Safe because `gear.family_id` is `ON DELETE
   * SET NULL` — the gear rows stay, they just lose their family grouping.
   */
  async deleteFamily(
    id: string,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const result = await this.db
      .delete(gearFamilies)
      .where(eq(gearFamilies.id, id))
      .returning({ id: gearFamilies.id, name: gearFamilies.name });
    if (!result.length) throw new NotFoundException(`family ${id} not found`);
    await this.audit.record({
      actorId,
      action: 'edit_gear_family',
      targetType: 'gear_family',
      targetId: id,
      details: { kind: 'delete', name: result[0].name },
      req,
    });
  }

  /**
   * Merge family `fromId` into `intoId`: re-parents every gear pointing
   * at `fromId` to `intoId`, then drops the source family row. Audit-logs
   * both sides + the number of gears moved.
   */
  async mergeFamilies(
    fromId: string,
    intoId: string,
    actorId: string,
    req?: Request,
  ): Promise<{ movedGearCount: number }> {
    if (fromId === intoId) {
      throw new BadRequestException('Sursa și destinația trebuie să fie diferite.');
    }
    const [src] = await this.db
      .select()
      .from(gearFamilies)
      .where(eq(gearFamilies.id, fromId))
      .limit(1);
    if (!src) throw new NotFoundException(`source family ${fromId} not found`);
    const [dst] = await this.db
      .select()
      .from(gearFamilies)
      .where(eq(gearFamilies.id, intoId))
      .limit(1);
    if (!dst)
      throw new NotFoundException(`destination family ${intoId} not found`);

    return this.db.transaction(async (tx) => {
      const moved = await tx
        .update(gear)
        .set({ familyId: intoId, updatedAt: new Date(), updatedBy: actorId })
        .where(eq(gear.familyId, fromId))
        .returning({ id: gear.id });
      await tx.delete(gearFamilies).where(eq(gearFamilies.id, fromId));
      await this.audit.record({
        actorId,
        action: 'edit_gear_family',
        targetType: 'gear_family',
        targetId: intoId,
        details: {
          kind: 'merge',
          fromId,
          fromName: src.name,
          intoName: dst.name,
          movedGearCount: moved.length,
        },
        req,
      });
      return { movedGearCount: moved.length };
    });
  }

  /* ============================================================
     gear_description (Tiptap, per locale)
     ============================================================ */

  async upsertDescription(
    gearId: string,
    dto: UpsertGearDescriptionDto,
    actorId: string,
  ): Promise<void> {
    await this.db
      .insert(gearDescriptions)
      .values({
        gearId,
        lang: dto.lang,
        body: dto.body,
        bodyHtml: dto.bodyHtml,
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: [gearDescriptions.gearId, gearDescriptions.lang],
        set: {
          body: dto.body,
          bodyHtml: dto.bodyHtml,
          updatedBy: actorId,
          updatedAt: new Date(),
        },
      });
  }

  /* ============================================================
     gear_image — upload + delete
     ============================================================ */

  async attachImage(
    gearId: string,
    actorId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<{ sourceId: string }> {
    const existing = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!existing.length)
      throw new NotFoundException(`gear ${gearId} not found`);

    const processed: ProcessedUpload = await this.storage.processImage(
      'gear',
      gearId,
      file,
      actorId,
    );

    // Next position = max(position) + 1 (per source).
    const maxPos = await this.db
      .select({ max: sql<number>`coalesce(max(${gearImages.position}), -1)` })
      .from(gearImages)
      .where(eq(gearImages.gearId, gearId));
    const position = (maxPos[0]?.max ?? -1) + 1;

    await this.db.insert(gearImages).values(
      processed.variants.map((v) => ({
        gearId,
        sourceId: processed.sourceId,
        variant: v.variant,
        path: v.path,
        width: v.width,
        height: v.height,
        sizeBytes: v.sizeBytes,
        mimeType: v.mimeType,
        caption,
        position,
        uploadedBy: actorId,
      })),
    );
    return { sourceId: processed.sourceId };
  }

  async detachImage(gearId: string, sourceId: string): Promise<void> {
    const rows = await this.db
      .select({ path: gearImages.path })
      .from(gearImages)
      .where(
        and(eq(gearImages.gearId, gearId), eq(gearImages.sourceId, sourceId)),
      );
    if (!rows.length)
      throw new NotFoundException(`image source ${sourceId} not found`);

    await this.storage.deleteObjects(rows.map((r) => r.path));
    await this.db
      .delete(gearImages)
      .where(
        and(eq(gearImages.gearId, gearId), eq(gearImages.sourceId, sourceId)),
      );
  }

  /* ============================================================
     gear_video / gear_link
     ============================================================ */

  async addVideo(
    gearId: string,
    dto: CreateGearVideoDto,
    actorId: string,
  ): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(gearVideos)
      .values({
        gearId,
        provider: dto.provider,
        externalId: dto.externalId,
        title: dto.title,
        addedBy: actorId,
      })
      .returning({ id: gearVideos.id });
    return row;
  }

  async removeVideo(gearId: string, videoId: string): Promise<void> {
    await this.db
      .delete(gearVideos)
      .where(and(eq(gearVideos.gearId, gearId), eq(gearVideos.id, videoId)));
  }

  async addLink(
    gearId: string,
    dto: CreateGearLinkDto,
    actorId: string,
  ): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(gearLinks)
      .values({
        gearId,
        kind: dto.kind as
          | 'manual'
          | 'service_notes'
          | 'manufacturer'
          | 'wikipedia'
          | 'price_guide'
          | 'firmware'
          | 'affiliate'
          | 'other',
        url: dto.url,
        label: dto.label,
        vendor: dto.vendor,
        addedBy: actorId,
      })
      .returning({ id: gearLinks.id });
    return row;
  }

  async removeLink(gearId: string, linkId: string): Promise<void> {
    await this.db
      .delete(gearLinks)
      .where(and(eq(gearLinks.gearId, gearId), eq(gearLinks.id, linkId)));
  }

  /* ============================================================
     gear_relationship
     ============================================================ */

  async addRelationship(
    parentGearId: string,
    dto: CreateGearRelationshipDto,
    actorId: string,
  ): Promise<{ id: string }> {
    if (parentGearId === dto.childGearId) {
      throw new ConflictException(
        'A gear cannot be related to itself.',
      );
    }
    const [row] = await this.db
      .insert(gearRelationships)
      .values({
        parentGearId,
        childGearId: dto.childGearId,
        type: dto.type,
        note: dto.note,
        createdBy: actorId,
      })
      .returning({ id: gearRelationships.id });
    return row;
  }

  async removeRelationship(relId: string): Promise<void> {
    await this.db
      .delete(gearRelationships)
      .where(eq(gearRelationships.id, relId));
  }

  /* ============================================================
     public list (with search + filters + sort + pagination)
     ============================================================ */

  async listPublic(q: ListGearQueryDto): Promise<{
    items: PublicGearListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(gear.published, true), isNull(gear.deletedAt)];
    if (q.category) conditions.push(eq(gear.category, q.category));
    if (q.brand) conditions.push(ilike(gear.brand, q.brand));
    if (q.type)
      conditions.push(sql`${gear.specs}->>'type' = ${q.type}`);
    if (q.yearMin) conditions.push(sql`${gear.yearReleased} >= ${q.yearMin}`);
    if (q.yearMax) conditions.push(sql`${gear.yearReleased} <= ${q.yearMax}`);
    if (q.status === 'in_production')
      conditions.push(isNull(gear.yearDiscontinued));
    if (q.status === 'discontinued')
      conditions.push(sql`${gear.yearDiscontinued} IS NOT NULL`);

    // FT + trigram search. The generated tsvector handles the heavy
    // lifting; we additionally OR in a trigram similarity so typos
    // ("mooog") still match.
    if (q.q && q.q.trim().length >= 2) {
      const term = q.q.trim();
      conditions.push(
        sql`(
          ${gear.searchVector} @@ websearch_to_tsquery('sintezaur_ro', ${term})
          OR lower(${gear.brand}) % lower(${term})
          OR lower(${gear.model}) % lower(${term})
        )`,
      );
    }

    const whereClause = and(...conditions);

    const sortClause = (() => {
      switch (q.sort) {
        case 'alpha':
          return [asc(gear.brand), asc(gear.model)];
        case 'newest':
          return [desc(gear.createdAt)];
        case 'year_asc':
          return [asc(gear.yearReleased)];
        case 'year_desc':
          return [desc(gear.yearReleased)];
        case 'popular':
        default:
          return [desc(gear.ownersPublicCount), asc(gear.brand)];
      }
    })();

    const items = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        category: gear.category,
        formFactor: gear.formFactor,
        yearReleased: gear.yearReleased,
        yearDiscontinued: gear.yearDiscontinued,
        ownersPublicCount: gear.ownersPublicCount,
        avgRating: gear.avgRating,
        reviewCount: gear.reviewCount,
        type: sql<string | null>`${gear.specs}->>'type'`,
        thumb: sql<string | null>`(
          SELECT path FROM ${gearImages}
          WHERE ${gearImages.gearId} = ${gear.id}
            AND ${gearImages.variant} = 'square_thumb'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(gear)
      .where(whereClause)
      .orderBy(...sortClause)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(gear)
      .where(whereClause);

    return {
      items: items as PublicGearListItem[],
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  /* ============================================================
     public detail (slug → gear + family + lineage + media + description)
     ============================================================ */

  async findBySlug(
    slug: string,
    lang: 'ro' | 'en' = 'ro',
  ): Promise<{
    gear: typeof gear.$inferSelect;
    family: { id: string; slug: string; name: string } | null;
    siblings: { id: string; slug: string; brand: string; model: string; yearReleased: number | null }[];
    images: (typeof gearImages.$inferSelect)[];
    videos: (typeof gearVideos.$inferSelect)[];
    links: (typeof gearLinks.$inferSelect)[];
    description: { body: unknown; bodyHtml: string } | null;
    relationships: {
      parent: { id: string; slug: string; brand: string; model: string; type: string }[];
      child: { id: string; slug: string; brand: string; model: string; type: string }[];
    };
    /** Canonical (official) forum thread (spec §8.1), null when toggle OFF. */
    officialThread: {
      id: string;
      slug: string;
      title: string;
      postCount: number;
      lastPostAt: Date | null;
    } | null;
    relatedThreadsCount: number;
  } | null> {
    const [gearRow] = await this.db
      .select()
      .from(gear)
      .where(
        and(
          eq(gear.slug, slug),
          eq(gear.published, true),
          isNull(gear.deletedAt),
        ),
      )
      .limit(1);
    if (!gearRow) return null;

    const [familyRow] = gearRow.familyId
      ? await this.db
          .select({
            id: gearFamilies.id,
            slug: gearFamilies.slug,
            name: gearFamilies.name,
          })
          .from(gearFamilies)
          .where(eq(gearFamilies.id, gearRow.familyId))
          .limit(1)
      : [];

    const siblings = gearRow.familyId
      ? await this.db
          .select({
            id: gear.id,
            slug: gear.slug,
            brand: gear.brand,
            model: gear.model,
            yearReleased: gear.yearReleased,
          })
          .from(gear)
          .where(
            and(
              eq(gear.familyId, gearRow.familyId),
              eq(gear.published, true),
              isNull(gear.deletedAt),
            ),
          )
          .orderBy(asc(gear.yearReleased), asc(gear.model))
      : [];

    const images = await this.db
      .select()
      .from(gearImages)
      .where(eq(gearImages.gearId, gearRow.id))
      .orderBy(asc(gearImages.position));

    const videos = await this.db
      .select()
      .from(gearVideos)
      .where(eq(gearVideos.gearId, gearRow.id))
      .orderBy(asc(gearVideos.position));

    const links = await this.db
      .select()
      .from(gearLinks)
      .where(eq(gearLinks.gearId, gearRow.id))
      .orderBy(asc(gearLinks.position));

    const [desc_] = await this.db
      .select({ body: gearDescriptions.body, bodyHtml: gearDescriptions.bodyHtml })
      .from(gearDescriptions)
      .where(
        and(eq(gearDescriptions.gearId, gearRow.id), eq(gearDescriptions.lang, lang)),
      )
      .limit(1);

    // Parent-side: rows where THIS gear is the parent (so the "child"
    // is the related gear we want to display).
    const parentRels = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        type: gearRelationships.type,
      })
      .from(gearRelationships)
      .innerJoin(gear, eq(gear.id, gearRelationships.childGearId))
      .where(
        and(
          eq(gearRelationships.parentGearId, gearRow.id),
          isNull(gear.deletedAt),
        ),
      );

    // Child-side: this gear is the child; show the parent as the related node.
    const childRels = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        type: gearRelationships.type,
      })
      .from(gearRelationships)
      .innerJoin(gear, eq(gear.id, gearRelationships.parentGearId))
      .where(
        and(
          eq(gearRelationships.childGearId, gearRow.id),
          isNull(gear.deletedAt),
        ),
      );

    let officialThread:
      | { id: string; slug: string; title: string; postCount: number; lastPostAt: Date | null }
      | null = null;
    if (gearRow.canonicalThreadId) {
      const [t] = await this.db
        .select({
          id: forumThreads.id,
          slug: forumThreads.slug,
          title: forumThreads.title,
          postCount: forumThreads.postCount,
          lastPostAt: forumThreads.lastPostAt,
        })
        .from(forumThreads)
        .where(eq(forumThreads.id, gearRow.canonicalThreadId))
        .limit(1);
      if (t) officialThread = t;
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumThreads)
      .where(
        and(
          sql`${gearRow.id} = ANY(${forumThreads.gearTag})`,
          isNull(forumThreads.deletedAt),
        ),
      );

    return {
      gear: gearRow,
      family: familyRow ?? null,
      siblings: siblings.filter((s) => s.id !== gearRow.id),
      images,
      videos,
      links,
      description: desc_ ?? null,
      relationships: { parent: parentRels, child: childRels },
      officialThread,
      relatedThreadsCount: count,
    };
  }

  /* ============================================================
     slug-redirect: lookup by old slug → new slug + target id.
     ============================================================ */

  async lookupSlugRedirect(
    targetType: 'gear' | 'article' | 'forum_thread',
    oldSlug: string,
  ): Promise<{ newSlug: string; targetId: string; expired: boolean } | null> {
    const [row] = await this.db
      .select({
        newSlug: slugRedirects.newSlug,
        targetId: slugRedirects.targetId,
        expiresAt: slugRedirects.expiresAt,
      })
      .from(slugRedirects)
      .where(
        and(
          eq(slugRedirects.targetType, targetType),
          eq(slugRedirects.oldSlug, oldSlug),
        ),
      )
      .limit(1);
    if (!row) return null;
    const expired =
      !!row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
    return { newSlug: row.newSlug, targetId: row.targetId, expired };
  }

  /* ============================================================
     "X persoane dețin" recompute hook — called by user-gear-status
     service after insert/delete/update.
     ============================================================ */

  async recomputeOwnersCount(gearId: string): Promise<void> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(distinct ${userGearStatuses.userId})::int` })
      .from(userGearStatuses)
      .where(
        and(
          eq(userGearStatuses.gearId, gearId),
          eq(userGearStatuses.status, 'owned'),
          eq(userGearStatuses.isPublic, true),
        ),
      );
    await this.db
      .update(gear)
      .set({ ownersPublicCount: count })
      .where(eq(gear.id, gearId));
  }

  /* ============================================================
     internals
     ============================================================ */

  private async gearSlugExists(slug: string, excludingId?: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(eq(gear.slug, slug), isNull(gear.deletedAt)))
      .limit(1);
    if (!rows.length) return false;
    return excludingId ? rows[0].id !== excludingId : true;
  }

  private async familySlugExists(slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: gearFamilies.id })
      .from(gearFamilies)
      .where(eq(gearFamilies.slug, slug))
      .limit(1);
    return rows.length > 0;
  }

  /* ============================================================
     M11 — community contributor flow (spec §7.2)

     `me*` methods run with ownership checks against `gear.createdBy`
     and only allow mutation when the gear is in an editable state
     (`draft` or `rejected`). Admin / curator endpoints use the
     existing `update/softDelete/attachImage/...` surface.
     ============================================================ */

  /**
   * Create a new gear row in `state='draft'` owned by `userId`. All
   * fields are optional at this stage; the submit endpoint validates
   * the required set before transitioning. Returns the new row's id
   * so the FE can immediately start uploading images and patching
   * additional fields.
   */
  async meCreateDraft(
    userId: string,
    dto: MeCreateGearDto,
  ): Promise<{ id: string; slug: string }> {
    const brand = dto.brand?.trim() || 'Necunoscut';
    const model = dto.model?.trim() || 'Draft fără model';
    const slugCandidate = slugFromParts(brand, model);
    const slug = await uniqueSlug(slugCandidate, (s) => this.gearSlugExists(s));

    const familyId = dto.familyLabel
      ? await this.lookupOrCreateFamily(dto.familyLabel, userId)
      : null;

    const { body, bodyHtml } = this.descriptionFromText(dto.descriptionText);
    const specs = this.mergeTaglineIntoSpecs(dto.specs, dto.tagline);

    const [row] = await this.db
      .insert(gear)
      .values({
        slug,
        category: dto.category ?? 'synthesizer',
        brand,
        model,
        formFactor: dto.formFactor,
        familyId,
        yearReleased: dto.yearReleased,
        yearDiscontinued: dto.yearDiscontinued,
        msrpAtLaunchEur: dto.msrpAtLaunchEur?.toString(),
        specs,
        published: false,
        state: 'draft',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: gear.id, slug: gear.slug });

    if (dto.descriptionText !== undefined) {
      await this.upsertDescription(
        row.id,
        { lang: 'ro', body, bodyHtml },
        userId,
      );
    }

    return row;
  }

  /**
   * Fetch own draft regardless of state. Used by the editor to load a
   * draft for "Continuă editare" and by the drafts list page.
   */
  async meGetDraft(
    gearId: string,
    userId: string,
    actorRoles: readonly string[] = [],
  ): Promise<{
    gear: typeof gear.$inferSelect;
    family: { id: string; slug: string; name: string } | null;
    images: (typeof gearImages.$inferSelect)[];
    links: (typeof gearLinks.$inferSelect)[];
    relationships: {
      parent: {
        id: string;
        relId: string;
        slug: string;
        brand: string;
        model: string;
        type: string;
        note: string | null;
      }[];
    };
    description: { body: unknown; bodyHtml: string } | null;
  }> {
    const [gearRow] = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!gearRow) throw new NotFoundException(`gear ${gearId} not found`);
    if (gearRow.createdBy !== userId && !isModerator(actorRoles)) {
      throw new ForbiddenException('Not your draft.');
    }

    const [familyRow] = gearRow.familyId
      ? await this.db
          .select({
            id: gearFamilies.id,
            slug: gearFamilies.slug,
            name: gearFamilies.name,
          })
          .from(gearFamilies)
          .where(eq(gearFamilies.id, gearRow.familyId))
          .limit(1)
      : [];

    const images = await this.db
      .select()
      .from(gearImages)
      .where(eq(gearImages.gearId, gearRow.id))
      .orderBy(asc(gearImages.position));

    const links = await this.db
      .select()
      .from(gearLinks)
      .where(eq(gearLinks.gearId, gearRow.id))
      .orderBy(asc(gearLinks.position));

    const parentRels = await this.db
      .select({
        relId: gearRelationships.id,
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        type: gearRelationships.type,
        note: gearRelationships.note,
      })
      .from(gearRelationships)
      .innerJoin(gear, eq(gear.id, gearRelationships.childGearId))
      .where(eq(gearRelationships.parentGearId, gearRow.id));

    const [desc_] = await this.db
      .select({
        body: gearDescriptions.body,
        bodyHtml: gearDescriptions.bodyHtml,
      })
      .from(gearDescriptions)
      .where(
        and(eq(gearDescriptions.gearId, gearRow.id), eq(gearDescriptions.lang, 'ro')),
      )
      .limit(1);

    return {
      gear: gearRow,
      family: familyRow ?? null,
      images,
      links,
      relationships: { parent: parentRels },
      description: desc_ ?? null,
    };
  }

  /** Patch an editable own draft. */
  async meUpdateDraft(
    gearId: string,
    userId: string,
    dto: MeUpdateGearDto,
    actorRoles: readonly string[] = [],
    req?: Request,
  ): Promise<void> {
    const current = await this.assertOwnsEditableDraft(
      gearId,
      userId,
      actorRoles,
    );
    const asModerator = current.createdBy !== userId && isModerator(actorRoles);

    // Slug stays stable unless brand/model change AND the row hasn't
    // been published yet. Approved-then-edited rows keep their slug.
    let nextSlug = current.slug;
    const nextBrand = dto.brand?.trim() ?? current.brand;
    const nextModel = dto.model?.trim() ?? current.model;
    if (
      !current.published &&
      (nextBrand !== current.brand || nextModel !== current.model)
    ) {
      nextSlug = await uniqueSlug(
        slugFromParts(nextBrand, nextModel),
        (s) => this.gearSlugExists(s, gearId),
      );
    }

    const familyId =
      dto.familyLabel === undefined
        ? current.familyId
        : dto.familyLabel === '' || dto.familyLabel === null
          ? null
          : await this.lookupOrCreateFamily(dto.familyLabel, userId);

    const nextSpecs = this.mergeTaglineIntoSpecs(
      dto.specs ?? (current.specs as Record<string, unknown>),
      dto.tagline,
    );

    await this.db
      .update(gear)
      .set({
        slug: nextSlug,
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.brand !== undefined && { brand: nextBrand }),
        ...(dto.model !== undefined && { model: nextModel }),
        ...(dto.formFactor !== undefined && { formFactor: dto.formFactor }),
        familyId,
        ...(dto.yearReleased !== undefined && { yearReleased: dto.yearReleased }),
        ...(dto.yearDiscontinued !== undefined && {
          yearDiscontinued: dto.yearDiscontinued,
        }),
        ...(dto.msrpAtLaunchEur !== undefined && {
          msrpAtLaunchEur: dto.msrpAtLaunchEur?.toString() ?? null,
        }),
        specs: nextSpecs,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(gear.id, gearId));

    if (dto.descriptionText !== undefined) {
      const { body, bodyHtml } = this.descriptionFromText(dto.descriptionText);
      await this.upsertDescription(gearId, { lang: 'ro', body, bodyHtml }, userId);
    }

    if (asModerator) {
      await this.audit.record({
        actorId: userId,
        action: 'edit_gear',
        targetType: 'gear',
        targetId: gearId,
        details: { byModerator: true, kind: 'me_update_draft' },
        req,
      });
    }
  }

  /**
   * Soft-delete an own draft. Allowed only while editable
   * (`draft` / `rejected`) — once submitted the row is in the
   * moderator's hands. Approved rows can only be removed by an admin
   * via `softDeleteGear`.
   */
  async meDeleteDraft(
    gearId: string,
    userId: string,
    actorRoles: readonly string[] = [],
  ): Promise<void> {
    await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    await this.db
      .update(gear)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(eq(gear.id, gearId));
  }

  /**
   * Transition `draft` / `rejected` → `submitted`. Enforces the
   * minimum required field set; the contributor sees the missing-field
   * checklist live in the editor so this is a defensive validation.
   */
  async meSubmitDraft(
    gearId: string,
    userId: string,
    actorRoles: readonly string[] = [],
  ): Promise<void> {
    const current = await this.assertOwnsEditableDraft(
      gearId,
      userId,
      actorRoles,
    );

    const missing: string[] = [];
    if (!current.brand || current.brand === 'Necunoscut') missing.push('brand');
    if (!current.model || current.model === 'Draft fără model')
      missing.push('model');
    if (!current.category) missing.push('category');
    if (!current.yearReleased) missing.push('yearReleased');

    const [imgCount] = await this.db
      .select({ count: sql<number>`count(distinct ${gearImages.sourceId})::int` })
      .from(gearImages)
      .where(eq(gearImages.gearId, gearId));
    if ((imgCount?.count ?? 0) < 1) missing.push('images');

    const [desc_] = await this.db
      .select({ len: sql<number>`length(${gearDescriptions.bodyHtml})::int` })
      .from(gearDescriptions)
      .where(
        and(eq(gearDescriptions.gearId, gearId), eq(gearDescriptions.lang, 'ro')),
      )
      .limit(1);
    if ((desc_?.len ?? 0) < 80) missing.push('description');

    if (missing.length) {
      throw new BadRequestException({
        message: 'Lipsesc câmpuri obligatorii.',
        missing,
      });
    }

    await this.db
      .update(gear)
      .set({
        state: 'submitted',
        submittedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(gear.id, gearId));
  }

  /** List own contributions (drafts + submitted + rejected + approved). */
  async meListMyDrafts(userId: string): Promise<
    {
      id: string;
      slug: string;
      brand: string;
      model: string;
      category: string;
      state: string;
      rejectionReason: string | null;
      submittedAt: Date | null;
      updatedAt: Date;
      thumb: string | null;
    }[]
  > {
    return this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        category: gear.category,
        state: gear.state,
        rejectionReason: gear.rejectionReason,
        submittedAt: gear.submittedAt,
        updatedAt: gear.updatedAt,
        thumb: sql<string | null>`(
          SELECT path FROM ${gearImages}
          WHERE ${gearImages.gearId} = ${gear.id}
            AND ${gearImages.variant} = 'square_thumb'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(gear)
      .where(and(eq(gear.createdBy, userId), isNull(gear.deletedAt)))
      .orderBy(desc(gear.updatedAt));
  }

  /* ---------- me/images ---------- */

  async meAttachImage(
    gearId: string,
    userId: string,
    file: Express.Multer.File,
    caption?: string,
    actorRoles: readonly string[] = [],
    req?: Request,
  ): Promise<{ sourceId: string }> {
    const row = await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    const result = await this.attachImage(gearId, userId, file, caption);
    if (row.createdBy !== userId && isModerator(actorRoles)) {
      await this.audit.record({
        actorId: userId,
        action: 'edit_gear',
        targetType: 'gear',
        targetId: gearId,
        details: { byModerator: true, kind: 'me_attach_image' },
        req,
      });
    }
    return result;
  }

  async meDetachImage(
    gearId: string,
    userId: string,
    sourceId: string,
    actorRoles: readonly string[] = [],
    req?: Request,
  ): Promise<void> {
    const row = await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    await this.detachImage(gearId, sourceId);
    if (row.createdBy !== userId && isModerator(actorRoles)) {
      await this.audit.record({
        actorId: userId,
        action: 'edit_gear',
        targetType: 'gear',
        targetId: gearId,
        details: { byModerator: true, kind: 'me_detach_image', sourceId },
        req,
      });
    }
  }

  /**
   * Apply a user-selected crop window to a draft image. Regenerates the
   * square_thumb + square_medium variants from the original and swaps the
   * DB rows to point to the new content-addressed keys. The crop window
   * is also persisted on the row for the `original` variant so the user
   * can re-open the cropper on the same crop.
   */
  async meSetImageCrop(
    gearId: string,
    userId: string,
    sourceId: string,
    crop: { x: number; y: number; w: number; h: number },
    actorRoles: readonly string[] = [],
    req?: Request,
  ): Promise<void> {
    const gearRow = await this.assertOwnsEditableDraft(
      gearId,
      userId,
      actorRoles,
    );

    // Load all variants of this source so we can find the original
    // (input for re-render) + the square keys we'll replace.
    const rows = await this.db
      .select({
        id: gearImages.id,
        variant: gearImages.variant,
        path: gearImages.path,
      })
      .from(gearImages)
      .where(
        and(eq(gearImages.gearId, gearId), eq(gearImages.sourceId, sourceId)),
      );
    if (!rows.length) {
      throw new NotFoundException(`image source ${sourceId} not found`);
    }
    const originalRow = rows.find((r) => r.variant === 'original');
    if (!originalRow) {
      throw new NotFoundException(
        `original variant missing for source ${sourceId}`,
      );
    }

    const { variants: newVariants } =
      await this.storage.regenerateSquareVariantsWithCrop(
        'gear',
        gearId,
        sourceId,
        originalRow.path,
        crop,
        userId,
      );

    const oldSquareKeys = rows
      .filter(
        (r) => r.variant === 'square_thumb' || r.variant === 'square_medium',
      )
      .map((r) => r.path);

    await this.db.transaction(async (tx) => {
      for (const v of newVariants) {
        await tx
          .update(gearImages)
          .set({
            path: v.path,
            width: v.width,
            height: v.height,
            sizeBytes: v.sizeBytes,
            mimeType: v.mimeType,
          })
          .where(
            and(
              eq(gearImages.gearId, gearId),
              eq(gearImages.sourceId, sourceId),
              eq(gearImages.variant, v.variant),
            ),
          );
      }
      await tx
        .update(gearImages)
        .set({ crop })
        .where(eq(gearImages.id, originalRow.id));
    });

    // Delete old square keys best-effort — DB is already updated.
    await this.storage.deleteObjects(oldSquareKeys);

    await this.audit.record({
      actorId: userId,
      action: 'edit_gear',
      targetType: 'gear',
      targetId: gearId,
      details: {
        kind: 'me_set_image_crop',
        sourceId,
        crop,
        byModerator: gearRow.createdBy !== userId && isModerator(actorRoles),
      },
      req,
    });
  }

  /** Reorder the gallery — `sourceIds` is the new top-to-bottom order. */
  async meReorderImages(
    gearId: string,
    userId: string,
    sourceIds: string[],
    actorRoles: readonly string[] = [],
  ): Promise<void> {
    await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    // Apply positions in a single transaction.
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < sourceIds.length; i++) {
        await tx
          .update(gearImages)
          .set({ position: i })
          .where(
            and(
              eq(gearImages.gearId, gearId),
              eq(gearImages.sourceId, sourceIds[i]),
            ),
          );
      }
    });
  }

  /* ---------- me/links ---------- */

  async meAddLink(
    gearId: string,
    userId: string,
    dto: CreateGearLinkDto,
    actorRoles: readonly string[] = [],
  ): Promise<{ id: string }> {
    await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    return this.addLink(gearId, dto, userId);
  }

  async meRemoveLink(
    gearId: string,
    userId: string,
    linkId: string,
    actorRoles: readonly string[] = [],
  ): Promise<void> {
    await this.assertOwnsEditableDraft(gearId, userId, actorRoles);
    await this.removeLink(gearId, linkId);
  }

  /* ---------- me/relationships ---------- */

  async meAddRelationship(
    parentGearId: string,
    userId: string,
    dto: CreateGearRelationshipDto,
    actorRoles: readonly string[] = [],
  ): Promise<{ id: string }> {
    await this.assertOwnsEditableDraft(parentGearId, userId, actorRoles);
    return this.addRelationship(parentGearId, dto, userId);
  }

  async meRemoveRelationship(
    parentGearId: string,
    userId: string,
    relId: string,
    actorRoles: readonly string[] = [],
  ): Promise<void> {
    await this.assertOwnsEditableDraft(parentGearId, userId, actorRoles);
    await this.db
      .delete(gearRelationships)
      .where(
        and(
          eq(gearRelationships.id, relId),
          eq(gearRelationships.parentGearId, parentGearId),
        ),
      );
  }

  /* ============================================================
     Public auto-suggest endpoints (brand list + family list).
     ============================================================ */

  async listBrandsPublic(): Promise<{ name: string; count: number }[]> {
    return this.db
      .select({
        name: gear.brand,
        count: sql<number>`count(*)::int`,
      })
      .from(gear)
      .where(and(eq(gear.published, true), isNull(gear.deletedAt)))
      .groupBy(gear.brand)
      .orderBy(desc(sql`count(*)`), asc(gear.brand))
      .limit(200);
  }

  /**
   * Brand list for the authenticated contributor — published brands plus
   * the user's own non-published drafts/submissions. Stops "I just added
   * a Korg draft, why isn't Korg in the autocomplete?".
   */
  async listBrandsForUser(
    userId: string,
  ): Promise<{ name: string; count: number }[]> {
    return this.db
      .select({
        name: gear.brand,
        count: sql<number>`count(*)::int`,
      })
      .from(gear)
      .where(
        and(
          isNull(gear.deletedAt),
          or(eq(gear.published, true), eq(gear.createdBy, userId)),
        ),
      )
      .groupBy(gear.brand)
      .orderBy(desc(sql`count(*)`), asc(gear.brand))
      .limit(200);
  }

  /* ============================================================
     Admin: moderation queue + approve / reject.
     ============================================================ */

  async listModeration(
    q: ListModerationQueueDto,
  ): Promise<{
    items: {
      id: string;
      slug: string;
      brand: string;
      model: string;
      category: string;
      state: string;
      submittedAt: Date | null;
      createdBy: string | null;
      thumb: string | null;
    }[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;
    const state = q.state ?? 'submitted';

    const where = and(eq(gear.state, state), isNull(gear.deletedAt));

    const items = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        category: gear.category,
        state: gear.state,
        submittedAt: gear.submittedAt,
        createdBy: gear.createdBy,
        thumb: sql<string | null>`(
          SELECT path FROM ${gearImages}
          WHERE ${gearImages.gearId} = ${gear.id}
            AND ${gearImages.variant} = 'square_thumb'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(gear)
      .where(where)
      .orderBy(asc(gear.submittedAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(gear)
      .where(where);

    return {
      items,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async approveGear(
    gearId: string,
    actorId: string,
    req?: Request,
  ): Promise<void> {
    const [current] = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!current) throw new NotFoundException(`gear ${gearId} not found`);

    await this.db
      .update(gear)
      .set({
        state: 'approved',
        published: true,
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(gear.id, gearId));

    await this.audit.record({
      actorId,
      action: 'edit_gear',
      targetType: 'gear',
      targetId: gearId,
      details: { decision: 'approve', previousState: current.state },
      req,
    });
  }

  async rejectGear(
    gearId: string,
    actorId: string,
    reason: string,
    req?: Request,
  ): Promise<void> {
    const [current] = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!current) throw new NotFoundException(`gear ${gearId} not found`);

    await this.db
      .update(gear)
      .set({
        state: 'rejected',
        published: false,
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(gear.id, gearId));

    await this.audit.record({
      actorId,
      action: 'edit_gear',
      targetType: 'gear',
      targetId: gearId,
      details: { decision: 'reject', reason, previousState: current.state },
      req,
    });
  }

  /* ============================================================
     internals — contributor flow
     ============================================================ */

  /**
   * Ensure `userId` owns this gear and it is in an editable state.
   * Throws NotFound / Forbidden / Conflict as appropriate.
   */
  private async assertOwnsEditableDraft(
    gearId: string,
    userId: string,
    actorRoles: readonly string[] = [],
  ): Promise<typeof gear.$inferSelect> {
    const [row] = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException(`gear ${gearId} not found`);
    if (isModerator(actorRoles)) {
      // Moderators can view + edit any draft regardless of state.
      return row;
    }
    if (row.createdBy !== userId) {
      throw new ForbiddenException('Not your draft.');
    }
    if (row.state !== 'draft' && row.state !== 'rejected') {
      throw new ConflictException(
        `Draftul nu mai poate fi editat (stare: ${row.state}). Așteaptă decizia moderatorului.`,
      );
    }
    return row;
  }

  /**
   * Find a family by exact name (case-insensitive) under any brand, or
   * create one with `{ name: label, slug: slugify(label) }`. Returns
   * the family id. Contributors don't need to manage slugs; we derive.
   */
  private async lookupOrCreateFamily(
    label: string,
    actorId: string,
  ): Promise<string> {
    const trimmed = label.trim();
    if (!trimmed) return '';
    const [existing] = await this.db
      .select({ id: gearFamilies.id })
      .from(gearFamilies)
      .where(ilike(gearFamilies.name, trimmed))
      .limit(1);
    if (existing) return existing.id;
    const slug = await uniqueSlug(slugify(trimmed), (s) =>
      this.familySlugExists(s),
    );
    const [row] = await this.db
      .insert(gearFamilies)
      .values({ slug, name: trimmed })
      .returning({ id: gearFamilies.id });
    await this.audit.record({
      actorId,
      action: 'create_gear_family',
      targetType: 'gear_family',
      targetId: row.id,
      details: { name: trimmed, autoCreated: true },
    });
    return row.id;
  }

  /**
   * Convert plain-text description into Tiptap JSON + escaped HTML.
   * Blank lines split paragraphs. No inline marks; the contributor
   * editor is intentionally simple — curators can add bold/italic
   * later via the admin Tiptap.
   */
  private descriptionFromText(text: string | undefined): {
    body: Record<string, unknown>;
    bodyHtml: string;
  } {
    const raw = (text ?? '').trim();
    if (!raw) {
      return { body: { type: 'doc', content: [] }, bodyHtml: '' };
    }
    const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return {
      body: {
        type: 'doc',
        content: paragraphs.map((p) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        })),
      },
      bodyHtml: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
    };
  }

  /**
   * Tagline lives inside `specs.tagline` so it travels with the gear
   * row (matches the design which shows it above the long description
   * in the live preview card).
   */
  private mergeTaglineIntoSpecs(
    specs: Record<string, unknown> | null | undefined,
    tagline: string | undefined,
  ): Record<string, unknown> {
    const merged = { ...(specs ?? {}) };
    if (tagline !== undefined) {
      const trimmed = tagline.trim();
      if (trimmed) merged.tagline = trimmed;
      else delete merged.tagline;
    }
    return merged;
  }
}
