import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { ToastService } from '../ui/toast.service';
import {
  BazarService,
  type BazarListingDetail,
  type ListingPayload,
} from './bazar.service';

/* ============================================================
   V07 sell page — "Vinde un produs" (Bazar - Adaugă).
   Single-page flow with a sticky preview/checklist sidebar,
   debounced auto-save into a `status='draft'` listing, and a
   final publish step that flips the row to `status='active'`.
   ============================================================ */

interface GearHit {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
}

interface PhotoTile {
  sourceId: string;
  thumbPath: string;
}

/** UI condition slot mapped to backend `listing_condition` enum. */
interface ConditionOption {
  /** Backend enum literal. */
  value: 'new' | 'very_good' | 'good' | 'fair' | 'for_parts';
  /** RO label shown in the radio card. */
  ttl: string;
  /** /10 score sub-label. */
  num: string;
  /** One-line context blurb. */
  sub: string;
}

const CONDITION_OPTIONS: ConditionOption[] = [
  { value: 'new', ttl: 'Ca nou', num: '10/10', sub: 'cumpărat sub 6 luni' },
  { value: 'very_good', ttl: 'Foarte bun', num: '9/10', sub: 'folosit ușor, fără urme' },
  { value: 'good', ttl: 'Bun', num: '7/10', sub: 'urme minore de uz' },
  { value: 'fair', ttl: 'Folosit', num: '5/10', sub: 'urme vizibile, funcțional' },
  { value: 'for_parts', ttl: 'Piese', num: '—', sub: 'defect / pentru reparat' },
];

const KIND_OPTIONS: Array<{
  value: 'sell' | 'trade' | 'sell_or_trade';
  ttl: string;
  ic: string;
  sub: string;
}> = [
  {
    value: 'sell',
    ic: '→ RON',
    ttl: 'Vând',
    sub: 'Schimb pe bani.\nTranzacția standard.',
  },
  {
    value: 'trade',
    ic: '↔ gear',
    ttl: 'Schimb',
    sub: 'Caut altă piesă în loc.\nNiciun ban nu trece.',
  },
  {
    value: 'sell_or_trade',
    ic: '→ RON · ↔ gear',
    ttl: 'Vând sau schimb',
    sub: 'Deschis la ambele,\ncu ofertă suplimentară în bani.',
  },
];

const DELIVERY_OPTIONS: Array<{
  value: 'pickup_only' | 'shipping_only' | 'both';
  ttl: string;
  sub: string;
}> = [
  {
    value: 'pickup_only',
    ttl: 'Doar ridicare',
    sub: 'Cumpărătorul vine la tine. Cel mai sigur pentru gear scump.',
  },
  {
    value: 'shipping_only',
    ttl: 'Doar livrare',
    sub: 'Tu îl ambalezi și-l expediezi (Fan / DPD / Sameday).',
  },
  {
    value: 'both',
    ttl: 'Ambele',
    sub: 'Decide cumpărătorul — ridicare sau curier.',
  },
];

const CARRIER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'fan_courier', label: 'Fan Courier' },
  { value: 'sameday', label: 'Sameday' },
  { value: 'cargus', label: 'Cargus' },
  { value: 'dpd', label: 'DPD' },
  { value: 'gls', label: 'GLS' },
  { value: 'posta_romana', label: 'Poșta Română' },
];

const AUTOSAVE_DEBOUNCE_MS = 1500;
const MAX_PHOTOS = 12;
/** Hardcoded RON↔EUR display rate. Same number the V07 mockup uses; we
 * keep it as a UI hint only — the canonical price stored is the one
 * the seller typed in the chosen currency. */
const EUR_PER_RON = 1 / 4.97;

@Component({
  selector: 'app-bazar-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bazar-form.page.html',
  styles: [
    `
      :host { display: block; }

      .save-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .save-status__dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--fg-subtle);
      }
      .save-status--saving .save-status__dot {
        background: var(--accent);
        animation: pulse 1.2s ease-in-out infinite;
      }
      .save-status--saved .save-status__dot { background: oklch(0.7 0.15 145); }
      .save-status--error .save-status__dot { background: oklch(0.7 0.16 28); }
      @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      .submit-error {
        margin-top: 10px;
        padding: 10px 12px;
        border: 1px solid oklch(0.45 0.18 28);
        background: oklch(0.42 0.14 28 / 0.12);
        font-size: 12px;
        line-height: 1.5;
      }

      .form-disabled .ta-sec__body,
      .form-disabled .ta-cta--primary {
        opacity: 0.55;
        pointer-events: none;
      }
    `,
  ],
})
export class BazarFormPage {
  private readonly fb = inject(FormBuilder);
  readonly bazar = inject(BazarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  /* ---------- static option tables ---------- */
  readonly conditionOptions = CONDITION_OPTIONS;
  readonly kindOptions = KIND_OPTIONS;
  readonly deliveryOptions = DELIVERY_OPTIONS;
  readonly carrierOptions = CARRIER_OPTIONS;

  /* ---------- form ---------- */
  readonly form: FormGroup = this.fb.nonNullable.group({
    rawMake: ['', [Validators.maxLength(80)]],
    rawModel: ['', [Validators.maxLength(120)]],
    rawYear: this.fb.control<number | null>(null),
    title: ['', [Validators.maxLength(140)]],
    tagline: ['', [Validators.maxLength(200)]],
    descriptionText: ['', [Validators.maxLength(8000)]],
    defects: ['', [Validators.maxLength(2000)]],
    condition: ['very_good', [Validators.required]],
    conditionNote: ['', [Validators.maxLength(500)]],
    price: this.fb.control<number | null>(null),
    currency: ['ron' as 'ron' | 'eur', [Validators.required]],
    acceptsOffers: [true],
    kind: ['sell' as 'sell' | 'trade' | 'sell_or_trade', [Validators.required]],
    lookingFor: ['', [Validators.maxLength(500)]],
    delivery: [
      'pickup_only' as 'pickup_only' | 'shipping_only' | 'both',
      [Validators.required],
    ],
    shippingCost: this.fb.control<number | null>(null),
    shippingCarriers: this.fb.control<string[]>([]),
    location: ['', [Validators.maxLength(80)]],
    contactPhone: ['', [Validators.maxLength(40)]],
  });

  /* ---------- listing state ---------- */
  readonly listingId = signal<string | null>(null);
  readonly listingSlug = signal<string | null>(null);
  readonly listingStatus = signal<
    'draft' | 'active' | 'sold' | 'expired' | 'removed'
  >('draft');
  readonly selectedGear = signal<GearHit | null>(null);
  readonly photoTiles = signal<PhotoTile[]>([]);

  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly submitError = signal<string | null>(null);
  readonly submitMissing = signal<string[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly uploadingImages = signal(0);

  /* ---------- gear search dropdown ---------- */
  readonly gearMenuOpen = signal(false);
  readonly gearHits = signal<GearHit[]>([]);
  gearSearchText = '';
  private gearSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  /* ---------- live preview ---------- */
  readonly previewBrand = computed(() => {
    this.formTick();
    const g = this.selectedGear();
    if (g) return g.brand;
    return (this.form.controls['rawMake'].value as string) || '—';
  });
  readonly previewModel = computed(() => {
    this.formTick();
    const g = this.selectedGear();
    if (g) return g.model;
    return (this.form.controls['rawModel'].value as string) || '—';
  });
  readonly previewPrice = computed(() => {
    this.formTick();
    return this.formatThousands(this.form.controls['price'].value ?? 0);
  });
  readonly previewCurrency = computed(() => {
    this.formTick();
    return (this.form.controls['currency'].value as string).toUpperCase();
  });
  readonly previewLocation = computed(() => {
    this.formTick();
    return (this.form.controls['location'].value as string) || '—';
  });
  readonly previewConditionLabel = computed(() => {
    this.formTick();
    const c = this.form.controls['condition'].value as string;
    return CONDITION_OPTIONS.find((o) => o.value === c)?.ttl ?? '—';
  });
  readonly previewTagline = computed(() => {
    this.formTick();
    return (this.form.controls['tagline'].value as string) || '';
  });
  readonly previewPhoto = computed(() => {
    const first = this.photoTiles()[0];
    return first ? this.bazar.imageUrl(first.thumbPath) : null;
  });

  /**
   * Bumped on every form valueChanges so the signal-based computeds
   * below (checklist, descriptionLength, preview tagline, price
   * conversion, etc.) re-run as the user types. `form.value` and
   * `form.controls[x].value` aren't signals on their own, so without
   * this nudge the memoized computeds would only refresh when an
   * unrelated signal (e.g. `photoTiles()`) happens to change — that's
   * the bug that made the character counter stay at 0 and the
   * "Publică" gate stay disabled even after the user filled the form.
   */
  readonly formTick = signal(0);

  /** Live RON↔EUR display next to the price input. */
  readonly priceConversion = computed(() => {
    this.formTick();
    const p = Number(this.form.controls['price'].value ?? 0);
    const cur = this.form.controls['currency'].value as string;
    if (!p) return null;
    if (cur === 'ron') return `${Math.round(p * EUR_PER_RON)} €`;
    return `${this.formatThousands(Math.round(p / EUR_PER_RON))} RON`;
  });

  readonly descriptionLength = computed(() => {
    this.formTick();
    return (this.form.controls['descriptionText'].value as string).length;
  });

  /* ---------- checklist + progress ---------- */
  readonly checklist = computed(() => {
    this.formTick();
    const v = this.form.value;
    const photoCount = this.photoTiles().length;
    const descLen = (v.descriptionText as string).length;
    const hasGear = !!this.selectedGear() || (!!v.rawMake && !!v.rawModel);
    return [
      { key: 'gear', label: 'Brand & model', done: hasGear },
      { key: 'title', label: 'Titlu listing', done: (v.title as string).length >= 3 },
      { key: 'photos', label: '≥ 3 fotografii proprii', done: photoCount >= 3 },
      {
        key: 'description',
        label: `Descriere (${descLen} caract.)`,
        done: descLen >= 80,
      },
      { key: 'condition', label: 'Condiție selectată', done: !!v.condition },
      {
        key: 'price',
        label: 'Preț cerut',
        done: typeof v.price === 'number' && v.price > 0,
      },
      {
        key: 'kind_swap',
        label: v.kind === 'sell' ? 'Tip tranzacție' : 'Ce caut la schimb',
        done:
          v.kind === 'sell'
            ? true
            : (v.lookingFor as string).length >= 5,
      },
      { key: 'location', label: 'Locație', done: (v.location as string).length >= 2 },
    ];
  });

  readonly progressPercent = computed(() => {
    const items = this.checklist();
    const done = items.filter((i) => i.done).length;
    return Math.round((done / items.length) * 100);
  });

  readonly canPublish = computed(() =>
    this.checklist().every((i) => i.done) && this.listingStatus() === 'draft',
  );

  readonly isLocked = computed(
    () => this.listingStatus() !== 'draft',
  );

  /* ---------- auto-save ---------- */
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private suppressDirty = false;

  constructor() {
    void this.bootstrap();

    this.form.valueChanges.subscribe(() => {
      // Always bump the tick so view computeds (descriptionLength,
      // checklist, previewTagline, etc.) re-evaluate — even during a
      // suppressed load where we don't want to auto-save.
      this.formTick.update((n) => n + 1);
      if (this.suppressDirty) return;
      this.dirty = true;
      this.scheduleAutoSave();
    });
  }

  /* ---------- bootstrap ---------- */

  private async bootstrap(): Promise<void> {
    try {
      // Existing listing being edited (legacy URL `/bazar/:slug/editare`).
      const slug = this.route.snapshot.paramMap.get('slug');
      const listingIdParam = this.route.snapshot.queryParamMap.get('listing');
      const gearIdSeed = this.route.snapshot.queryParamMap.get('gearId');

      if (slug) {
        await this.loadBySlug(slug);
      } else if (listingIdParam) {
        await this.loadById(listingIdParam);
      } else if (gearIdSeed) {
        // V07 "vinde din Tezaur" entry — pre-fill the catalog link.
        await this.seedFromGear(gearIdSeed);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadBySlug(slug: string): Promise<void> {
    try {
      const d = await this.bazar.detail(slug);
      this.applyDetail(d);
    } catch (err) {
      console.error('[bazar-form] load by slug failed', err);
      this.submitError.set(this.i18n.t('bazar.form.load_error'));
    }
  }

  private async loadById(id: string): Promise<void> {
    try {
      const d = await this.bazar.findOwn(id);
      if (d) this.applyDetail(d);
    } catch (err) {
      console.error('[bazar-form] load by id failed', err);
    }
  }

  private async seedFromGear(gearId: string): Promise<void> {
    try {
      const sug = await this.bazar.quickList(gearId);
      this.selectedGear.set(sug.gear);
      this.suppressDirty = true;
      this.form.patchValue({
        title: sug.suggestedTitle,
        currency: sug.priceStats.currency,
        price: sug.priceStats.avg ?? null,
      });
      this.suppressDirty = false;
      this.dirty = true;
      this.scheduleAutoSave();
    } catch (err) {
      console.warn('[bazar-form] seed-from-gear failed', err);
    }
  }

  private applyDetail(d: BazarListingDetail): void {
    this.listingId.set(d.listing.id);
    this.listingSlug.set(d.listing.slug);
    this.listingStatus.set(d.listing.status);
    this.selectedGear.set(d.gear);
    this.photoTiles.set(buildPhotoTiles(d.photos));

    const descText = htmlToPlainText(d.listing.descriptionHtml);

    this.suppressDirty = true;
    this.form.patchValue(
      {
        rawMake: d.listing.rawMake ?? '',
        rawModel: d.listing.rawModel ?? '',
        rawYear: d.listing.rawYear,
        title: d.listing.title === 'Draft anunț' ? '' : d.listing.title,
        tagline: d.listing.tagline ?? '',
        descriptionText: descText,
        defects: d.listing.defects ?? '',
        condition: d.listing.condition,
        conditionNote: d.listing.conditionNote ?? '',
        price: Number(d.listing.price) || null,
        currency: d.listing.currency,
        acceptsOffers: d.listing.acceptsOffers,
        kind: d.listing.kind,
        lookingFor: d.listing.lookingFor ?? '',
        delivery: d.listing.delivery,
        shippingCost: d.listing.shippingCost
          ? Number(d.listing.shippingCost)
          : null,
        shippingCarriers: d.listing.shippingCarriers ?? [],
        location: d.listing.location,
        contactPhone: d.listing.contactPhone ?? '',
      },
      { emitEvent: false },
    );
    this.suppressDirty = false;
    this.dirty = false;
    this.saveStatus.set('saved');
  }

  /* ---------- auto-save ---------- */

  private scheduleAutoSave(): void {
    if (this.isLocked()) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.saveStatus.set('saving');
    this.autoSaveTimer = setTimeout(() => {
      void this.persistDraft();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  private async persistDraft(): Promise<void> {
    if (!this.dirty) {
      this.saveStatus.set('saved');
      return;
    }
    try {
      if (!this.listingId()) {
        const seed = this.buildSeed();
        const created = await this.bazar.createDraft(seed);
        this.listingId.set(created.id);
        this.listingSlug.set(created.slug);
        this.replaceUrlWithDraftQuery(created.id);
      }
      const id = this.listingId();
      if (!id) return;
      await this.bazar.updateOwn(id, this.buildPayload());
      this.dirty = false;
      this.saveStatus.set('saved');
    } catch (err) {
      console.error('[bazar-form] auto-save failed', err);
      this.saveStatus.set('error');
    }
  }

  async saveDraftNow(): Promise<void> {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    await this.persistDraft();
  }

  private replaceUrlWithDraftQuery(id: string): void {
    const url = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: { listing: id },
        queryParamsHandling: 'merge',
      })
      .toString();
    history.replaceState(history.state, '', url);
  }

  private buildSeed(): {
    gearId?: string;
    rawMake?: string;
    rawModel?: string;
    rawYear?: number;
    title?: string;
  } {
    const v = this.form.value;
    const g = this.selectedGear();
    return {
      gearId: g?.id,
      rawMake: !g && v.rawMake ? (v.rawMake as string).trim() : undefined,
      rawModel: !g && v.rawModel ? (v.rawModel as string).trim() : undefined,
      rawYear: v.rawYear ?? undefined,
      title: v.title ? (v.title as string).trim() : undefined,
    };
  }

  private buildPayload(): Partial<ListingPayload> {
    const v = this.form.value;
    const g = this.selectedGear();
    const title = (v.title as string)?.trim() || 'Draft anunț';
    const descriptionText = (v.descriptionText as string) ?? '';
    return {
      gearId: g?.id ?? null,
      rawMake: g ? null : ((v.rawMake as string)?.trim() || null),
      rawModel: g ? null : ((v.rawModel as string)?.trim() || null),
      rawYear: v.rawYear ?? null,
      title,
      tagline: (v.tagline as string)?.trim() || null,
      description: descriptionToTiptap(descriptionText),
      descriptionHtml: plainTextToHtml(descriptionText),
      defects: (v.defects as string)?.trim() || null,
      condition: v.condition as ListingPayload['condition'],
      conditionNote:
        v.condition === 'mint' ? (v.conditionNote as string)?.trim() || null : null,
      price: Number(v.price ?? 0),
      currency: v.currency as ListingPayload['currency'],
      acceptsOffers: !!v.acceptsOffers,
      kind: v.kind as ListingPayload['kind'],
      lookingFor:
        v.kind !== 'sell' ? (v.lookingFor as string)?.trim() || null : null,
      delivery: v.delivery as ListingPayload['delivery'],
      shippingCost:
        v.delivery !== 'pickup_only' && typeof v.shippingCost === 'number'
          ? v.shippingCost
          : null,
      shippingCarriers:
        v.delivery !== 'pickup_only' ? (v.shippingCarriers as string[]) : [],
      location: (v.location as string)?.trim() || '',
      contactPhone: (v.contactPhone as string)?.trim() || null,
    };
  }

  /* ---------- gear search (combo) ---------- */

  onGearSearchInput(text: string): void {
    this.gearSearchText = text;
    if (this.gearSearchDebounce) clearTimeout(this.gearSearchDebounce);
    this.gearSearchDebounce = setTimeout(() => this.runGearSearch(), 250);
    this.gearMenuOpen.set(true);
  }

  private async runGearSearch(): Promise<void> {
    const q = this.gearSearchText.trim();
    if (q.length < 2) {
      this.gearHits.set([]);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: GearHit[] }>(`${environment.apiBaseUrl}/tezaur`, {
          params: { q, pageSize: '10' },
        }),
      );
      this.gearHits.set(res.items.slice(0, 10));
    } catch (err) {
      console.warn('[bazar-form] gear search failed', err);
      this.gearHits.set([]);
    }
  }

  selectGear(hit: GearHit): void {
    this.selectedGear.set(hit);
    this.gearMenuOpen.set(false);
    this.gearHits.set([]);
    this.gearSearchText = '';
    this.suppressDirty = true;
    this.form.patchValue({
      rawMake: '',
      rawModel: '',
    });
    this.suppressDirty = false;
    this.dirty = true;
    this.scheduleAutoSave();
  }

  clearGear(): void {
    this.selectedGear.set(null);
    this.dirty = true;
    this.scheduleAutoSave();
  }

  closeAllMenus(): void {
    this.gearMenuOpen.set(false);
  }

  /* ---------- condition / kind / delivery radios ---------- */

  selectCondition(v: ConditionOption['value']): void {
    this.form.controls['condition'].setValue(v);
  }

  selectKind(v: 'sell' | 'trade' | 'sell_or_trade'): void {
    this.form.controls['kind'].setValue(v);
  }

  selectDelivery(v: 'pickup_only' | 'shipping_only' | 'both'): void {
    this.form.controls['delivery'].setValue(v);
  }

  toggleCarrier(value: string, checked: boolean): void {
    const cur = this.form.controls['shippingCarriers'].value as string[];
    const next = checked
      ? Array.from(new Set([...cur, value]))
      : cur.filter((c) => c !== value);
    this.form.controls['shippingCarriers'].setValue(next);
  }

  isCarrierChecked(value: string): boolean {
    return (this.form.controls['shippingCarriers'].value as string[]).includes(
      value,
    );
  }

  /* ---------- photos ---------- */

  async onPhotoSelected(input: HTMLInputElement): Promise<void> {
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';
    await this.uploadFiles(files);
  }

  async onPhotoDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const files = Array.from(event.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (!files.length) return;
    await this.uploadFiles(files);
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async uploadFiles(files: File[]): Promise<void> {
    if (this.isLocked()) return;
    if (this.photoTiles().length + files.length > MAX_PHOTOS) {
      this.submitError.set(`Maxim ${MAX_PHOTOS} fotografii per anunț.`);
      return;
    }
    if (!this.listingId()) {
      await this.saveDraftNow();
    }
    const id = this.listingId();
    if (!id) {
      this.submitError.set('Nu am putut crea draftul — încearcă din nou.');
      return;
    }
    for (const file of files) {
      this.uploadingImages.update((n) => n + 1);
      try {
        await this.bazar.uploadPhoto(id, file);
      } catch (err) {
        console.error('[bazar-form] upload failed', err);
        this.submitError.set(
          `Upload eșuat pentru „${file.name}" (max 8 MB, PNG/JPG/WEBP).`,
        );
      } finally {
        this.uploadingImages.update((n) => n - 1);
      }
    }
    await this.refreshPhotos();
  }

  async deletePhoto(sourceId: string): Promise<void> {
    if (this.isLocked()) return;
    const id = this.listingId();
    if (!id) return;
    try {
      await this.bazar.removePhoto(id, sourceId);
      this.photoTiles.update((tiles) =>
        tiles.filter((t) => t.sourceId !== sourceId),
      );
    } catch (err) {
      console.error('[bazar-form] delete photo failed', err);
    }
  }

  private async refreshPhotos(): Promise<void> {
    const id = this.listingId();
    if (!id) return;
    try {
      const d = await this.bazar.findOwn(id);
      if (d) this.photoTiles.set(buildPhotoTiles(d.photos));
    } catch (err) {
      console.error('[bazar-form] refresh photos failed', err);
    }
  }

  /* ---------- drag-to-reorder photos ---------- */
  private draggingIndex: number | null = null;

  onImgDragStart(event: DragEvent, index: number): void {
    if (this.isLocked()) {
      event.preventDefault();
      return;
    }
    this.draggingIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    (event.target as HTMLElement).classList.add('is-dragging');
  }

  onImgDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('is-dragging');
    this.draggingIndex = null;
    document
      .querySelectorAll('.ta-img.is-over')
      .forEach((el) => el.classList.remove('is-over'));
  }

  onImgDragOver(event: DragEvent, _overIndex: number): void {
    event.preventDefault();
    document
      .querySelectorAll('.ta-img.is-over')
      .forEach((el) => el.classList.remove('is-over'));
    (event.currentTarget as HTMLElement).classList.add('is-over');
  }

  async onImgDrop(event: DragEvent, dropIndex: number): Promise<void> {
    event.preventDefault();
    const dragIdx = this.draggingIndex;
    if (dragIdx === null || dragIdx === dropIndex) return;
    const current = [...this.photoTiles()];
    const [moved] = current.splice(dragIdx, 1);
    current.splice(dropIndex, 0, moved);
    this.photoTiles.set(current);
    const id = this.listingId();
    if (id) {
      try {
        await this.bazar.reorderPhotos(
          id,
          current.map((t) => t.sourceId),
        );
      } catch (err) {
        console.error('[bazar-form] reorder failed', err);
      }
    }
  }

  /* ---------- publish ---------- */

  async publish(): Promise<void> {
    if (this.submitting()) return;

    // Front-end checklist gate — surface what's missing via toast instead
    // of silently disabling the button (general project rule: never let a
    // form action fail without telling the user why).
    if (!this.canPublish()) {
      const missing = this.checklist()
        .filter((i) => !i.done)
        .map((i) => i.label);
      this.submitMissing.set(
        this.checklist().filter((i) => !i.done).map((i) => i.key),
      );
      const detail = missing.length
        ? 'Lipsește: ' + missing.join(' · ')
        : 'Draftul mai are câmpuri obligatorii nebifate.';
      this.submitError.set(detail);
      this.toast.warn('Nu poți publica încă', { detail, ttlMs: 8000 });
      return;
    }

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    await this.persistDraft();
    const id = this.listingId();
    if (!id) {
      const msg = 'Nu există încă un draft de publicat.';
      this.submitError.set(msg);
      this.toast.error(msg);
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitMissing.set([]);
    try {
      const res = await this.bazar.publishDraft(id);
      this.listingSlug.set(res.slug);
      this.listingStatus.set('active');
      this.toast.success('Anunțul tău e live în Bazar.');
      void this.router.navigate(['/bazar', res.slug]);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const body = err.error as { missing?: string[] } | null;
        const missing = body?.missing ?? [];
        if (missing.length) this.submitMissing.set(missing);
        const msg = 'Draftul nu e gata — completează câmpurile lipsă.';
        this.submitError.set(msg);
        this.toast.warn(msg, {
          detail: missing.length ? 'Lipsește: ' + missing.join(' · ') : undefined,
          ttlMs: 8000,
        });
      } else {
        console.error('[bazar-form] publish failed', err);
        const msg = 'Publicarea a eșuat. Încearcă din nou.';
        this.submitError.set(msg);
        this.toast.error(msg);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async discardDraft(): Promise<void> {
    const id = this.listingId();
    if (!id) {
      void this.router.navigate(['/bazar']);
      return;
    }
    const ok = window.confirm(
      'Ștergi acest draft? Conținutul nu poate fi recuperat.',
    );
    if (!ok) return;
    try {
      await this.bazar.removeOwn(id);
    } catch (err) {
      console.error('[bazar-form] discard failed', err);
    } finally {
      void this.router.navigate(['/bazar']);
    }
  }

  previewAsVisitor(): void {
    const slug = this.listingSlug();
    if (slug) window.open(`/bazar/${slug}`, '_blank', 'noopener');
  }

  /* ---------- formatting helpers ---------- */

  private formatThousands(n: number | string): string {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  conditionLabel(value: string): string {
    return CONDITION_OPTIONS.find((c) => c.value === value)?.ttl ?? '—';
  }
}

/* ============================================================
   Helpers
   ============================================================ */

function buildPhotoTiles(
  photos: BazarListingDetail['photos'],
): PhotoTile[] {
  const bySource = new Map<string, BazarListingDetail['photos']>();
  for (const p of photos) {
    const arr = bySource.get(p.sourceId) ?? [];
    arr.push(p);
    bySource.set(p.sourceId, arr);
  }
  return Array.from(bySource.entries())
    .map(([sourceId, group]) => {
      const pick =
        group.find((g) => g.variant === 'square_thumb') ??
        group.find((g) => g.variant === 'square_medium') ??
        group[0];
      return { sourceId, thumbPath: pick.path, position: pick.position };
    })
    .sort((a, b) => a.position - b.position)
    .map(({ sourceId, thumbPath }) => ({ sourceId, thumbPath }));
}

/** Trivial Tiptap doc from a textarea — one paragraph per blank-line block. */
function descriptionToTiptap(text: string): Record<string, unknown> {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  if (!blocks.length) return { type: 'doc', content: [] };
  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block }],
    })),
  };
}

/** Minimal plain-text → HTML for the cached `descriptionHtml` column. */
function plainTextToHtml(text: string): string {
  if (!text.trim()) return '';
  return text
    .split(/\n{2,}/)
    .map((block) =>
      `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip the cached descriptionHtml back to plain text for the textarea. */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
