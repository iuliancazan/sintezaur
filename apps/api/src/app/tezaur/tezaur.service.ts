import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import 'multer';
import {
  DATABASE,
  type SintezaurDb,
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
import { and, asc, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { StorageService, type ProcessedUpload } from './storage.service';
import type {
  CreateGearDto,
  CreateGearFamilyDto,
  CreateGearLinkDto,
  CreateGearRelationshipDto,
  CreateGearVideoDto,
  ListGearQueryDto,
  UpdateGearDto,
  UpdateGearFamilyDto,
  UpsertGearDescriptionDto,
} from './tezaur.dto';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

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
      .select({ variant: gearImages.variant })
      .from(gearImages)
      .where(
        and(eq(gearImages.gearId, gearId), eq(gearImages.sourceId, sourceId)),
      );
    if (!rows.length)
      throw new NotFoundException(`image source ${sourceId} not found`);

    await this.storage.deleteSource(
      'gear',
      gearId,
      sourceId,
      rows.map((r) => r.variant),
    );
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

    return {
      gear: gearRow,
      family: familyRow ?? null,
      siblings: siblings.filter((s) => s.id !== gearRow.id),
      images,
      videos,
      links,
      description: desc_ ?? null,
      relationships: { parent: parentRels, child: childRels },
    };
  }

  /* ============================================================
     slug-redirect: lookup by old slug → new slug + target id.
     ============================================================ */

  async lookupSlugRedirect(
    targetType: 'gear' | 'article' | 'forum_thread',
    oldSlug: string,
  ): Promise<{ newSlug: string; targetId: string } | null> {
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
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return { newSlug: row.newSlug, targetId: row.targetId };
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
}
