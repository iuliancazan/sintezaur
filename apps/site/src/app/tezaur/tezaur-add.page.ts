import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { AuthService } from '../auth/auth.service';
import { hasAnyRole } from '../auth/auth.types';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurService,
  type GearState,
  type ImageCropRect,
  type TezaurBrandSuggestion,
  type TezaurDraftDetail,
  type TezaurDraftImage,
  type TezaurDraftPayload,
  type TezaurFamilySuggestion,
} from './tezaur.service';
import { ImageCropperModalComponent } from './image-cropper-modal.component';

/* ============================================================
   Static option tables — RO labels for backend enum literals.
   The literals (left of `:`) MUST match `GEAR_CATEGORIES` /
   `FORM_FACTORS` exported from @sintezaur/shared.
   ============================================================ */

const CATEGORY_LABELS: Array<{ value: string; label: string; group: string }> =
  [
    { group: 'Sinteza & ritmica', value: 'synthesizer', label: 'Sintetizator' },
    {
      group: 'Sinteza & ritmica',
      value: 'drum_machine',
      label: 'Drum machine',
    },
    { group: 'Sinteza & ritmica', value: 'sampler', label: 'Sampler' },
    {
      group: 'Sinteza & ritmica',
      value: 'sequencer',
      label: 'Sequencer hardware',
    },
    {
      group: 'Modular & control',
      value: 'eurorack_module',
      label: 'Eurorack · modul',
    },
    {
      group: 'Modular & control',
      value: 'eurorack_case',
      label: 'Eurorack · case',
    },
    {
      group: 'Modular & control',
      value: 'midi_controller',
      label: 'Controller MIDI',
    },
    {
      group: 'Modular & control',
      value: 'audio_interface',
      label: 'Interfață audio / MIDI',
    },
    { group: 'Modular & control', value: 'mixer', label: 'Mixer / table' },
    {
      group: 'Procesare & efecte',
      value: 'effect',
      label: 'Pedală / efect hardware',
    },
    {
      group: 'Procesare & efecte',
      value: 'software_fx',
      label: 'Efect software',
    },
    {
      group: 'Procesare & efecte',
      value: 'software_synth',
      label: 'Synth software',
    },
    {
      group: 'Procesare & efecte',
      value: 'daw',
      label: 'DAW / suită producție',
    },
    {
      group: 'Studio & captură',
      value: 'audio_interface',
      label: 'Interfață audio',
    },
    { group: 'Studio & captură', value: 'monitor', label: 'Monitor de studio' },
    { group: 'Studio & captură', value: 'headphones', label: 'Căști' },
    { group: 'Studio & captură', value: 'microphone', label: 'Microfon' },
    { group: 'Studio & captură', value: 'recorder', label: 'Recorder portabil' },
    { group: 'Diverse', value: 'accessory', label: 'Accesoriu / alt instrument' },
  ];
// Dedupe — `audio_interface` appears twice on purpose (modular & studio
// groupings); the dropdown deduplicates on `value` and keeps the first
// encountered group.
const CATEGORY_OPTIONS = (() => {
  const seen = new Set<string>();
  return CATEGORY_LABELS.filter((c) => {
    if (seen.has(c.value)) return false;
    seen.add(c.value);
    return true;
  });
})();

const FORM_FACTOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'rack_unit', label: 'Rack' },
  { value: 'eurorack', label: 'Modular' },
  { value: 'pedal', label: 'Pedală' },
  { value: 'module', label: 'Modul' },
  { value: 'standalone', label: 'Standalone' },
  { value: 'software', label: 'Software' },
];

const SYNTH_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'analog_mono', label: 'Analog (monofonic)' },
  { value: 'analog_poly', label: 'Analog (polifonic)' },
  { value: 'analog_paraphonic', label: 'Analog parafonic' },
  { value: 'virtual_analog', label: 'Virtual analog' },
  { value: 'hybrid', label: 'Hibrid (digital + modeling)' },
  { value: 'digital', label: 'Digital' },
  { value: 'fm', label: 'FM' },
  { value: 'wavetable', label: 'Wavetable' },
  { value: 'modular_voice', label: 'Modular voice' },
  { value: 'drone', label: 'Drone' },
  { value: 'other', label: 'Alt tip' },
];

const AFTERTOUCH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'Nu are' },
  { value: 'channel', label: 'Channel (mono)' },
  { value: 'poly', label: 'Poly aftertouch' },
  { value: 'mpe', label: 'MPE' },
];

const RELATIONSHIP_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'inspired_by', label: 'Inspirat de' },
  { value: 'based_on', label: 'Bazat pe' },
  { value: 'successor', label: 'Succesor' },
  { value: 'variant', label: 'Variantă' },
  { value: 'replaces', label: 'Înlocuiește' },
];

const LINK_KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'manufacturer', label: 'Producător' },
  { value: 'manual', label: 'Manual PDF' },
  { value: 'service_notes', label: 'Service notes' },
  { value: 'wikipedia', label: 'Wikipedia' },
  { value: 'price_guide', label: 'Reverb price guide' },
  { value: 'firmware', label: 'Firmware notes' },
  { value: 'affiliate', label: 'Afiliere' },
  { value: 'other', label: 'Altă sursă' },
];

const MIDI_IO_OPTIONS = [
  { value: 'din_in', label: 'DIN in (5-pin)' },
  { value: 'din_out', label: 'DIN out' },
  { value: 'din_thru', label: 'DIN thru' },
  { value: 'usb_host', label: 'USB host' },
  { value: 'trs_midi', label: 'TRS MIDI' },
  { value: 'bluetooth_midi', label: 'Bluetooth MIDI' },
];

const AUDIO_OUT_OPTIONS = [
  { value: 'trs_lr', label: 'TS / TRS L+R' },
  { value: 'xlr', label: 'XLR balansate' },
  { value: 'phones', label: 'Phones' },
  { value: 'aux_in', label: 'AUX in' },
  { value: 'mic_in', label: 'Mic in (XLR/TRS)' },
  { value: 'cv_gate', label: 'CV / gate out' },
];

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface SpecsShape {
  tagline?: string;
  synth_type?: string;
  polyphony?: number | null;
  osc_per_voice?: number | null;
  filter_type?: string;
  has_arpeggiator?: boolean;
  has_sequencer?: boolean;
  has_keys?: boolean;
  num_keys?: number | null;
  aftertouch?: string;
  midi_io?: string[];
  audio_out?: string[];
  pedals_label?: string;
  patch_memory_label?: string;
  weight_kg?: number | null;
  dimensions_label?: string;
  power_label?: string;
}

interface RelationshipRow {
  // Empty for new rows (not yet saved). Populated after API create.
  relId: string | null;
  type: string;
  brand: string;
  model: string;
  note: string;
}

interface LinkRow {
  linkId: string | null;
  kind: string;
  label: string;
  url: string;
}

@Component({
  selector: 'app-tezaur-add-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    ImageCropperModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tezaur-add.page.html',
  styles: [
    `
      :host {
        display: block;
      }
      /* Lightweight enhancements over the v06 base styles — these
         exist only because the live preview / save-status pill need
         page-local positioning that doesn't belong in the shared
         stylesheet. */
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
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--fg-subtle);
      }
      .save-status--saving .save-status__dot {
        background: var(--accent);
        animation: pulse 1.2s ease-in-out infinite;
      }
      .save-status--saved .save-status__dot {
        background: oklch(0.7 0.15 145);
      }
      .save-status--error .save-status__dot {
        background: oklch(0.7 0.16 28);
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 1;
        }
      }
      .img-tile-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .reject-notice {
        margin: 0 0 24px;
        padding: 14px 18px;
        border: 1px solid oklch(0.45 0.18 28);
        background: oklch(0.42 0.14 28 / 0.12);
        color: var(--fg);
        font-size: 14px;
        line-height: 1.55;
      }
      .reject-notice__head {
        display: block;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: oklch(0.72 0.16 28);
        margin-bottom: 6px;
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
export class TezaurAddPage {
  private readonly fb = inject(FormBuilder);
  readonly tezaur = inject(TezaurService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  /* ---------- option tables for the template ---------- */
  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly formFactorOptions = FORM_FACTOR_OPTIONS;
  readonly synthTypeOptions = SYNTH_TYPE_OPTIONS;
  readonly aftertouchOptions = AFTERTOUCH_OPTIONS;
  readonly relationshipTypeOptions = RELATIONSHIP_TYPE_OPTIONS;
  readonly linkKindOptions = LINK_KIND_OPTIONS;
  readonly midiIoOptions = MIDI_IO_OPTIONS;
  readonly audioOutOptions = AUDIO_OUT_OPTIONS;

  /* ---------- form ---------- */
  readonly form: FormGroup = this.fb.nonNullable.group({
    brand: ['', [Validators.maxLength(80)]],
    model: ['', [Validators.maxLength(120)]],
    category: ['synthesizer', [Validators.required]],
    formFactor: [''],
    familyLabel: ['', [Validators.maxLength(120)]],
    yearReleased: this.fb.control<number | null>(null),
    yearDiscontinued: this.fb.control<number | null>(null),
    msrpAtLaunchEur: this.fb.control<number | null>(null),
    tagline: ['', [Validators.maxLength(200)]],
    descriptionText: ['', [Validators.maxLength(8000)]],

    // Specs (flat keys → mapped into `specs` JSONB on save)
    synth_type: [''],
    polyphony: this.fb.control<number | null>(null),
    osc_per_voice: this.fb.control<number | null>(null),
    filter_type: [''],
    has_arpeggiator: [false],
    has_sequencer: [false],
    has_keys: [true],
    num_keys: this.fb.control<number | null>(null),
    aftertouch: ['none'],
    midi_io: this.fb.control<string[]>([]),
    audio_out: this.fb.control<string[]>([]),
    pedals_label: [''],
    patch_memory_label: [''],
    weight_kg: this.fb.control<number | null>(null),
    dimensions_label: [''],
    power_label: [''],
  });

  /* ---------- draft state ---------- */
  readonly draftId = signal<string | null>(null);
  readonly draftState = signal<GearState>('draft');
  readonly draftCreatedBy = signal<string | null>(null);
  readonly rejectionReason = signal<string | null>(null);
  readonly images = signal<TezaurDraftImage[]>([]);

  /** Current user has curator/admin/superadmin role + is NOT the draft owner. */
  readonly isModeratorViewingOther = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return false;
    if (!hasAnyRole(user, ['curator', 'admin', 'superadmin'])) return false;
    const createdBy = this.draftCreatedBy();
    return createdBy !== null && createdBy !== user.id;
  });

  /** Mod approval/rejection from inside the editor. */
  readonly modAction = signal<'idle' | 'approving' | 'rejecting'>('idle');
  readonly relationships = signal<RelationshipRow[]>([]);
  readonly linkRows = signal<LinkRow[]>([]);

  /** Source-id → original variant row, for the cropper. */
  readonly originalsBySourceId = signal<Map<string, TezaurDraftImage>>(new Map());

  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly submitError = signal<string | null>(null);
  readonly submitMissing = signal<string[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly uploadingImages = signal(0);

  /* ---------- cropper modal ---------- */
  readonly cropperOpen = signal(false);
  readonly cropperSourceId = signal<string | null>(null);
  readonly cropperSrc = signal<string>('');
  readonly cropperInitialCrop = signal<ImageCropRect | null>(null);
  readonly cropperSaving = signal(false);

  /* ---------- auto-suggest ---------- */
  readonly brandSuggestions = signal<TezaurBrandSuggestion[]>([]);
  readonly familySuggestions = signal<TezaurFamilySuggestion[]>([]);
  readonly brandMenuOpen = signal(false);
  readonly familyMenuOpen = signal(false);
  readonly categoryMenuOpen = signal(false);
  readonly synthTypeMenuOpen = signal(false);
  readonly aftertouchMenuOpen = signal(false);

  readonly filteredBrands = computed(() => {
    const q = (this.form.controls['brand'].value ?? '').toLowerCase().trim();
    const all = this.brandSuggestions();
    if (!q) return all.slice(0, 20);
    return all.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 20);
  });

  readonly filteredFamilies = computed(() => {
    const q = (this.form.controls['familyLabel'].value ?? '')
      .toLowerCase()
      .trim();
    const all = this.familySuggestions();
    if (!q) return all.slice(0, 15);
    return all.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 15);
  });

  /* ---------- live preview + progress ---------- */
  readonly previewImage = computed(() => {
    const first = this.images()[0];
    return first ? this.tezaur.imageUrl(first.path) : null;
  });

  readonly previewBrand = computed(() => this.form.controls['brand'].value || '—');
  readonly previewModel = computed(() => this.form.controls['model'].value || '—');
  readonly previewYear = computed(
    () => this.form.controls['yearReleased'].value ?? '—',
  );
  readonly previewTagsList = computed<string[]>(() => {
    const v = this.form.value;
    const tags: string[] = [];
    if (v.synth_type) {
      const opt = SYNTH_TYPE_OPTIONS.find((o) => o.value === v.synth_type);
      if (opt) tags.push(opt.label);
    }
    if (v.has_keys && v.num_keys) tags.push(`${v.num_keys} clape`);
    if (v.formFactor) {
      const opt = FORM_FACTOR_OPTIONS.find((o) => o.value === v.formFactor);
      if (opt) tags.push(opt.label);
    }
    if (v.polyphony) tags.push(`Poli ${v.polyphony}`);
    return tags.slice(0, 4);
  });

  readonly descriptionLength = computed(
    () => (this.form.controls['descriptionText'].value ?? '').length,
  );

  /** Checklist items mirror backend `meSubmitDraft` validation. */
  readonly checklist = computed(() => {
    const v = this.form.value;
    const imageCount = this.images().length;
    const descLen = (v.descriptionText ?? '').length;
    return [
      { key: 'brand_model', label: 'Brand & model', done: !!(v.brand && v.model) },
      { key: 'category', label: 'Categorie', done: !!v.category },
      { key: 'year', label: 'An lansare', done: !!v.yearReleased },
      { key: 'images', label: '≥ 1 imagine', done: imageCount >= 1 },
      {
        key: 'description',
        label: `Descriere (${descLen} caract.)`,
        done: descLen >= 80,
      },
      { key: 'tagline', label: 'Tagline', done: !!v.tagline },
      {
        key: 'specs',
        label: 'Specs: tip + polifonie',
        done: !!(v.synth_type && v.polyphony),
      },
      {
        key: 'dimensions',
        label: 'Dimensiuni & greutate',
        done: !!(v.dimensions_label && v.weight_kg),
      },
      {
        key: 'sources',
        label: '≥ 1 sursă verificabilă',
        done: this.linkRows().some((l) => l.url),
      },
    ];
  });

  readonly progressPercent = computed(() => {
    const items = this.checklist();
    const done = items.filter((i) => i.done).length;
    return Math.round((done / items.length) * 100);
  });

  readonly canSubmit = computed(() => {
    return (
      this.checklist().slice(0, 5).every((i) => i.done) &&
      this.draftState() !== 'submitted' &&
      this.draftState() !== 'approved'
    );
  });

  /**
   * True if the form is locked (submitted to mod queue or approved).
   * Moderators viewing someone else's draft keep edit access at every state
   * — the BE allows it and audit-logs each mutation.
   */
  readonly isLocked = computed(() => {
    if (this.isModeratorViewingOther()) return false;
    return this.draftState() === 'submitted' || this.draftState() === 'approved';
  });

  /* ---------- auto-save debouncing ---------- */
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    // Boot: kick off both lookups + maybe-load existing draft in parallel.
    void this.bootstrap();

    // Subscribe to form value changes → debounced auto-save.
    this.form.valueChanges.subscribe(() => {
      this.dirty = true;
      this.scheduleAutoSave();
    });
  }

  /* ---------- bootstrap ---------- */

  private async bootstrap(): Promise<void> {
    try {
      const [brands, families] = await Promise.all([
        this.tezaur.listMyBrandSuggestions().catch(() => []),
        this.tezaur.listFamilySuggestions().catch(() => []),
      ]);
      this.brandSuggestions.set(brands);
      this.familySuggestions.set(families);

      const draftId = this.route.snapshot.queryParamMap.get('draft');
      if (draftId) {
        await this.loadDraft(draftId);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDraft(id: string): Promise<void> {
    const detail = await this.tezaur.getDraft(id);
    this.applyDraft(detail);
  }

  private applyDraft(detail: TezaurDraftDetail): void {
    const g = detail.gear;
    const specs = (g.specs ?? {}) as SpecsShape;
    this.draftId.set(g.id);
    this.draftState.set(g.state);
    this.draftCreatedBy.set(g.createdBy);
    this.rejectionReason.set(g.rejectionReason);
    this.images.set(detail.images.filter((i) => i.variant === 'square_thumb'));
    this.originalsBySourceId.set(this.buildOriginalsMap(detail.images));
    this.linkRows.set(
      detail.links.map((l) => ({
        linkId: l.id,
        kind: l.kind,
        label: l.label ?? '',
        url: l.url,
      })),
    );
    this.relationships.set(
      detail.relationships.parent.map((r) => ({
        relId: r.relId,
        type: r.type,
        brand: r.brand,
        model: r.model,
        note: r.note ?? '',
      })),
    );

    // Recover plain-text description from bodyHtml (rough — strip <p>).
    const descText = detail.description
      ? detail.description.bodyHtml
          .replace(/<\/p><p>/g, '\n\n')
          .replace(/<\/?p>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
      : '';

    this.form.patchValue(
      {
        brand: g.brand === 'Necunoscut' ? '' : g.brand,
        model: g.model === 'Draft fără model' ? '' : g.model,
        category: g.category,
        formFactor: g.formFactor ?? '',
        familyLabel: detail.family?.name ?? '',
        yearReleased: g.yearReleased,
        yearDiscontinued: g.yearDiscontinued,
        msrpAtLaunchEur: g.msrpAtLaunchEur ? Number(g.msrpAtLaunchEur) : null,
        tagline: specs.tagline ?? '',
        descriptionText: descText,
        synth_type: specs.synth_type ?? '',
        polyphony: specs.polyphony ?? null,
        osc_per_voice: specs.osc_per_voice ?? null,
        filter_type: specs.filter_type ?? '',
        has_arpeggiator: specs.has_arpeggiator ?? false,
        has_sequencer: specs.has_sequencer ?? false,
        has_keys: specs.has_keys ?? true,
        num_keys: specs.num_keys ?? null,
        aftertouch: specs.aftertouch ?? 'none',
        midi_io: specs.midi_io ?? [],
        audio_out: specs.audio_out ?? [],
        pedals_label: specs.pedals_label ?? '',
        patch_memory_label: specs.patch_memory_label ?? '',
        weight_kg: specs.weight_kg ?? null,
        dimensions_label: specs.dimensions_label ?? '',
        power_label: specs.power_label ?? '',
      },
      { emitEvent: false },
    );
    this.dirty = false;
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
    const payload = this.collectPayload();
    try {
      if (!this.draftId()) {
        const created = await this.tezaur.createDraft(payload);
        this.draftId.set(created.id);
        // Replace query param so refresh resumes draft, without nav.
        const url = this.router
          .createUrlTree([], {
            relativeTo: this.route,
            queryParams: { draft: created.id },
            queryParamsHandling: 'merge',
          })
          .toString();
        history.replaceState(history.state, '', url);
      } else {
        await this.tezaur.updateDraft(this.draftId()!, payload);
      }
      this.dirty = false;
      this.saveStatus.set('saved');
    } catch (err) {
      console.error('[tezaur-add] auto-save failed', err);
      this.saveStatus.set('error');
    }
  }

  /** Manual save — fires immediately, skipping the debounce. */
  async saveDraftNow(): Promise<void> {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    await this.persistDraft();
  }

  private collectPayload(): TezaurDraftPayload {
    const v = this.form.value;
    const specs: SpecsShape = {};
    if (v.tagline) specs.tagline = (v.tagline as string).trim();
    if (v.synth_type) specs.synth_type = v.synth_type as string;
    if (v.polyphony) specs.polyphony = Number(v.polyphony);
    if (v.osc_per_voice) specs.osc_per_voice = Number(v.osc_per_voice);
    if (v.filter_type) specs.filter_type = (v.filter_type as string).trim();
    if (v.has_arpeggiator !== undefined)
      specs.has_arpeggiator = !!v.has_arpeggiator;
    if (v.has_sequencer !== undefined) specs.has_sequencer = !!v.has_sequencer;
    specs.has_keys = !!v.has_keys;
    if (v.num_keys) specs.num_keys = Number(v.num_keys);
    if (v.aftertouch) specs.aftertouch = v.aftertouch as string;
    if (Array.isArray(v.midi_io) && v.midi_io.length) specs.midi_io = v.midi_io;
    if (Array.isArray(v.audio_out) && v.audio_out.length)
      specs.audio_out = v.audio_out;
    if (v.pedals_label) specs.pedals_label = (v.pedals_label as string).trim();
    if (v.patch_memory_label)
      specs.patch_memory_label = (v.patch_memory_label as string).trim();
    if (v.weight_kg) specs.weight_kg = Number(v.weight_kg);
    if (v.dimensions_label)
      specs.dimensions_label = (v.dimensions_label as string).trim();
    if (v.power_label) specs.power_label = (v.power_label as string).trim();

    return {
      brand: (v.brand as string)?.trim() || undefined,
      model: (v.model as string)?.trim() || undefined,
      category: v.category as string,
      formFactor: (v.formFactor as string) || null,
      familyLabel: (v.familyLabel as string)?.trim() || null,
      yearReleased: v.yearReleased ?? null,
      yearDiscontinued: v.yearDiscontinued ?? null,
      msrpAtLaunchEur: v.msrpAtLaunchEur ?? null,
      tagline: (v.tagline as string)?.trim() || undefined,
      descriptionText: (v.descriptionText as string) ?? '',
      specs: specs as Record<string, unknown>,
    };
  }

  /* ---------- combo dropdown handlers ---------- */

  selectBrand(name: string): void {
    this.form.controls['brand'].setValue(name);
    this.brandMenuOpen.set(false);
  }

  selectFamily(name: string): void {
    this.form.controls['familyLabel'].setValue(name);
    this.familyMenuOpen.set(false);
  }

  selectCategory(value: string): void {
    this.form.controls['category'].setValue(value);
    this.categoryMenuOpen.set(false);
  }

  categoryLabel(value: string): string {
    return (
      CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? 'Necunoscută'
    );
  }

  selectSynthType(value: string): void {
    this.form.controls['synth_type'].setValue(value);
    this.synthTypeMenuOpen.set(false);
  }

  synthTypeLabel(value: string): string {
    return (
      SYNTH_TYPE_OPTIONS.find((s) => s.value === value)?.label ?? 'Alege tip…'
    );
  }

  selectAftertouch(value: string): void {
    this.form.controls['aftertouch'].setValue(value);
    this.aftertouchMenuOpen.set(false);
  }

  aftertouchLabel(value: string): string {
    return AFTERTOUCH_OPTIONS.find((a) => a.value === value)?.label ?? 'Nu are';
  }

  toggleMidiIo(value: string): void {
    const current = this.form.controls['midi_io'].value as string[];
    if (current.includes(value)) {
      this.form.controls['midi_io'].setValue(
        current.filter((v) => v !== value),
      );
    } else {
      this.form.controls['midi_io'].setValue([...current, value]);
    }
  }

  toggleAudioOut(value: string): void {
    const current = this.form.controls['audio_out'].value as string[];
    if (current.includes(value)) {
      this.form.controls['audio_out'].setValue(
        current.filter((v) => v !== value),
      );
    } else {
      this.form.controls['audio_out'].setValue([...current, value]);
    }
  }

  isMidiChecked(value: string): boolean {
    return (this.form.controls['midi_io'].value as string[]).includes(value);
  }

  isAudioOutChecked(value: string): boolean {
    return (this.form.controls['audio_out'].value as string[]).includes(value);
  }

  /* ---------- images ---------- */

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    input.value = '';
    await this.uploadFiles(files);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const files = Array.from(event.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (!files.length) return;
    await this.uploadFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Upload one or more files. If we don't have a draft id yet, force
   * a save first so the gear row exists. Upload sequentially to keep
   * positions stable and surface errors per-file cleanly.
   */
  private async uploadFiles(files: File[]): Promise<void> {
    if (this.isLocked()) return;
    if (this.images().length + files.length > 12) {
      this.submitError.set('Maxim 12 imagini per piesă.');
      return;
    }
    if (!this.draftId()) {
      await this.saveDraftNow();
    }
    const id = this.draftId();
    if (!id) {
      this.submitError.set('Nu am putut crea draftul — încearcă din nou.');
      return;
    }
    for (const file of files) {
      this.uploadingImages.update((n) => n + 1);
      try {
        await this.tezaur.uploadDraftImage(id, file);
      } catch (err) {
        console.error('[tezaur-add] upload failed', err);
        this.submitError.set(
          `Upload eșuat pentru „${file.name}" (max 8 MB, PNG/JPG/WEBP).`,
        );
      } finally {
        this.uploadingImages.update((n) => n - 1);
      }
    }
    await this.refreshImages();
  }

  async deleteImage(sourceId: string): Promise<void> {
    if (this.isLocked()) return;
    const id = this.draftId();
    if (!id) return;
    await this.tezaur.deleteDraftImage(id, sourceId);
    await this.refreshImages();
  }

  private async refreshImages(): Promise<void> {
    const id = this.draftId();
    if (!id) return;
    const detail = await this.tezaur.getDraft(id);
    this.images.set(detail.images.filter((i) => i.variant === 'square_thumb'));
    this.originalsBySourceId.set(this.buildOriginalsMap(detail.images));
  }

  private buildOriginalsMap(
    all: TezaurDraftImage[],
  ): Map<string, TezaurDraftImage> {
    const map = new Map<string, TezaurDraftImage>();
    for (const i of all) {
      if (i.variant === 'original') map.set(i.sourceId, i);
    }
    return map;
  }

  /* ---------- cropper modal ---------- */
  openCropper(sourceId: string): void {
    if (this.isLocked()) return;
    const original = this.originalsBySourceId().get(sourceId);
    if (!original) return;
    this.cropperSourceId.set(sourceId);
    this.cropperSrc.set(this.tezaur.imageUrl(original.path));
    this.cropperInitialCrop.set(original.crop ?? null);
    this.cropperOpen.set(true);
  }

  closeCropper(): void {
    this.cropperOpen.set(false);
    this.cropperSourceId.set(null);
    this.cropperSrc.set('');
    this.cropperInitialCrop.set(null);
  }

  async onCropperSave(crop: ImageCropRect): Promise<void> {
    const id = this.draftId();
    const sourceId = this.cropperSourceId();
    if (!id || !sourceId) return;
    this.cropperSaving.set(true);
    try {
      await this.tezaur.setDraftImageCrop(id, sourceId, crop);
      await this.refreshImages();
      this.closeCropper();
    } catch (err) {
      console.error('[tezaur-add] crop save failed', err);
      alert(this.i18n.t('cropper.error'));
    } finally {
      this.cropperSaving.set(false);
    }
  }

  /* ---------- drag-to-reorder ---------- */
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

  onImgDragOver(event: DragEvent, overIndex: number): void {
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
    const current = [...this.images()];
    const [moved] = current.splice(dragIdx, 1);
    current.splice(dropIndex, 0, moved);
    this.images.set(current);
    const id = this.draftId();
    if (id) {
      await this.tezaur.reorderDraftImages(
        id,
        current.map((i) => i.sourceId),
      );
    }
  }

  /* ---------- links ---------- */

  addLinkRow(): void {
    this.linkRows.update((rows) => [
      ...rows,
      { linkId: null, kind: 'other', label: '', url: '' },
    ]);
  }

  removeLinkRow(idx: number): void {
    if (this.isLocked()) return;
    const row = this.linkRows()[idx];
    this.linkRows.update((rows) => rows.filter((_, i) => i !== idx));
    if (row.linkId && this.draftId()) {
      void this.tezaur.deleteDraftLink(this.draftId()!, row.linkId).catch(() => {
        /* swallow — row removed locally */
      });
    }
  }

  updateLinkRow(idx: number, field: keyof LinkRow, value: string): void {
    this.linkRows.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  async saveLinkRow(idx: number): Promise<void> {
    if (this.isLocked()) return;
    const row = this.linkRows()[idx];
    if (!row.url) return;
    if (!this.draftId()) {
      await this.saveDraftNow();
    }
    const id = this.draftId();
    if (!id) return;

    try {
      if (row.linkId) {
        // PATCH not implemented — delete & re-create simpler.
        await this.tezaur.deleteDraftLink(id, row.linkId);
      }
      const created = await this.tezaur.addDraftLink(id, {
        kind: row.kind,
        url: row.url,
        label: row.label || undefined,
      });
      this.linkRows.update((rows) =>
        rows.map((r, i) =>
          i === idx ? { ...r, linkId: created.id } : r,
        ),
      );
    } catch (err) {
      console.error('[tezaur-add] save link failed', err);
    }
  }

  /* ---------- relationships ---------- */

  addRelRow(): void {
    this.relationships.update((rows) => [
      ...rows,
      { relId: null, type: 'inspired_by', brand: '', model: '', note: '' },
    ]);
  }

  removeRelRow(idx: number): void {
    if (this.isLocked()) return;
    const row = this.relationships()[idx];
    this.relationships.update((rows) => rows.filter((_, i) => i !== idx));
    if (row.relId && this.draftId()) {
      void this.tezaur
        .deleteDraftRelationship(this.draftId()!, row.relId)
        .catch(() => {
          /* swallow */
        });
    }
  }

  updateRelRow(
    idx: number,
    field: keyof RelationshipRow,
    value: string,
  ): void {
    this.relationships.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  /**
   * Resolve a brand/model pair to an existing published gear via the
   * `/tezaur` list endpoint, then attach the relationship. We don't
   * surface a search UI on this page; the contributor types the
   * brand + model and we look it up — if not found we surface a tip.
   */
  async saveRelRow(idx: number): Promise<void> {
    if (this.isLocked()) return;
    const row = this.relationships()[idx];
    if (!row.brand || !row.model) return;

    if (!this.draftId()) {
      await this.saveDraftNow();
    }
    const parentId = this.draftId();
    if (!parentId) return;

    try {
      const found = await this.tezaur.list({
        q: `${row.brand} ${row.model}`,
        pageSize: 5,
      });
      const match = found.items.find(
        (g) =>
          g.brand.toLowerCase() === row.brand.toLowerCase() &&
          g.model.toLowerCase() === row.model.toLowerCase(),
      );
      if (!match) {
        // Soft fail — keep row, surface tip
        this.submitError.set(
          `Nu am găsit „${row.brand} ${row.model}" în Tezaur. Verifică ortografia sau lasă relația pentru curator.`,
        );
        return;
      }
      if (row.relId) {
        await this.tezaur.deleteDraftRelationship(parentId, row.relId);
      }
      const created = await this.tezaur.addDraftRelationship(parentId, {
        childGearId: match.id,
        type: row.type,
        note: row.note || undefined,
      });
      this.relationships.update((rows) =>
        rows.map((r, i) =>
          i === idx ? { ...r, relId: created.id } : r,
        ),
      );
    } catch (err) {
      console.error('[tezaur-add] save relationship failed', err);
    }
  }

  /* ---------- moderator inline actions ---------- */

  async approveAsModerator(): Promise<void> {
    if (!this.isModeratorViewingOther() || this.modAction() !== 'idle') return;
    const id = this.draftId();
    if (!id) return;
    const ok = confirm(this.i18n.t('tezaur.add.mod.approve_confirm'));
    if (!ok) return;
    this.modAction.set('approving');
    try {
      // Persist any pending field edits before publishing.
      await this.saveDraftNow();
      await this.tezaur.approveModerationItem(id);
      this.draftState.set('approved');
    } catch (err) {
      console.error('[tezaur-add] mod approve failed', err);
      alert(this.i18n.t('tezaur.add.mod.action_error'));
    } finally {
      this.modAction.set('idle');
    }
  }

  async requestChangesAsModerator(): Promise<void> {
    if (!this.isModeratorViewingOther() || this.modAction() !== 'idle') return;
    const id = this.draftId();
    if (!id) return;
    const reason = prompt(this.i18n.t('tezaur.add.mod.reject_prompt'));
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      alert(this.i18n.t('tezaur.add.mod.reject_too_short'));
      return;
    }
    this.modAction.set('rejecting');
    try {
      // Persist any pending field edits first so the contributor sees them.
      await this.saveDraftNow();
      await this.tezaur.rejectModerationItem(id, trimmed);
      this.draftState.set('rejected');
      this.rejectionReason.set(trimmed);
    } catch (err) {
      console.error('[tezaur-add] mod reject failed', err);
      alert(this.i18n.t('tezaur.add.mod.action_error'));
    } finally {
      this.modAction.set('idle');
    }
  }

  /* ---------- submit / discard ---------- */

  async submitForModeration(): Promise<void> {
    if (this.submitting() || this.isLocked()) return;
    await this.saveDraftNow();
    const id = this.draftId();
    if (!id) {
      this.submitError.set('Salvează draftul mai întâi.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitMissing.set([]);
    try {
      await this.tezaur.submitDraft(id);
      this.draftState.set('submitted');
      // Stay on the page — the form will be locked + a success banner shows.
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const errBody = err.error as
          | { message?: string; missing?: string[] }
          | undefined;
        this.submitError.set(
          errBody?.message ?? 'Nu am putut trimite la moderare.',
        );
        this.submitMissing.set(errBody?.missing ?? []);
      } else {
        this.submitError.set('Eroare neașteptată. Încearcă din nou.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async discardAndLeave(): Promise<void> {
    const id = this.draftId();
    if (id) {
      const ok = confirm(
        'Ștergi acest draft definitiv? Acțiunea nu poate fi anulată.',
      );
      if (!ok) return;
      try {
        await this.tezaur.deleteDraft(id);
      } catch {
        /* ignore */
      }
    }
    await this.router.navigateByUrl('/tezaur');
  }

  /* ---------- menu management ---------- */

  closeAllMenus(): void {
    this.brandMenuOpen.set(false);
    this.familyMenuOpen.set(false);
    this.categoryMenuOpen.set(false);
    this.synthTypeMenuOpen.set(false);
    this.aftertouchMenuOpen.set(false);
  }
}
