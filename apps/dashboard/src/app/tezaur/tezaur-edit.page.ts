import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FORM_FACTORS,
  GEAR_CATEGORIES,
  type FormFactorLiteral,
  type GearCategoryLiteral,
} from '@sintezaur/shared';
import { SzButtonComponent } from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import {
  TezaurAdminService,
  type CreateGearPayload,
  type GearFamily,
} from './tezaur-admin.service';
import type { TezaurDetail } from './tezaur.types';

/* ============================================================
   Option tables — RO labels, backend literals.
   ============================================================ */

const SYNTH_TYPE_OPTIONS = [
  { value: '', label: '—' },
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

const AFTERTOUCH_OPTIONS = [
  { value: 'none', label: 'Nu are' },
  { value: 'channel', label: 'Channel (mono)' },
  { value: 'poly', label: 'Poly aftertouch' },
  { value: 'mpe', label: 'MPE' },
];

const MIDI_IO_OPTIONS = [
  { value: 'din_in', label: 'DIN in' },
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
  { value: 'mic_in', label: 'Mic in' },
  { value: 'cv_gate', label: 'CV / gate out' },
];

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: 'inspired_by', label: 'Inspirat de' },
  { value: 'based_on', label: 'Bazat pe' },
  { value: 'successor', label: 'Succesor' },
  { value: 'variant', label: 'Variantă' },
  { value: 'replaces', label: 'Înlocuiește' },
];

const LINK_KIND_OPTIONS = [
  { value: 'manufacturer', label: 'Producător' },
  { value: 'manual', label: 'Manual PDF' },
  { value: 'service_notes', label: 'Service notes' },
  { value: 'wikipedia', label: 'Wikipedia' },
  { value: 'price_guide', label: 'Reverb price guide' },
  { value: 'firmware', label: 'Firmware notes' },
  { value: 'affiliate', label: 'Afiliere' },
  { value: 'other', label: 'Altă sursă' },
];

const VIDEO_PROVIDER_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'bandcamp', label: 'Bandcamp' },
];

/* ============================================================
   Form types
   ============================================================ */

interface AdminGearForm {
  brand: string;
  model: string;
  slug: string;
  category: GearCategoryLiteral;
  formFactor: FormFactorLiteral | null;
  familyId: string | null;
  yearReleased: number | null;
  yearDiscontinued: number | null;
  msrpAtLaunchEur: number | null;
  msrpAtLaunchUsd: number | null;
  msrpSourceUrl: string | null;
  taglineRo: string | null;
  taglineEn: string | null;
  latestFirmwareVersion: string | null;
  firmwareNotesUrl: string | null;

  // Specs — structured
  synthType: string;
  polyphony: number | null;
  oscPerVoice: number | null;
  filterType: string;
  hasArpeggiator: boolean;
  hasSequencer: boolean;
  hasKeys: boolean;
  numKeys: number | null;
  aftertouch: string;
  midiIo: string[];
  audioOut: string[];
  cvGate: boolean;
  pedalsLabel: string;
  patchMemoryLabel: string;
  weightKg: number | null;
  dimensionsLabel: string;
  powerLabel: string;

  published: boolean;
  officialThreadOn: boolean;
}

interface LinkRow {
  /** Server id (existing row) or null for new. */
  id: string | null;
  kind: string;
  label: string;
  url: string;
}

interface VideoRow {
  id: string | null;
  provider: 'youtube' | 'vimeo' | 'soundcloud' | 'bandcamp';
  externalId: string;
  title: string;
}

interface RelRow {
  /** gear_relationships row id (when row reflects a saved relation). */
  relId: string | null;
  type: string;
  brand: string;
  model: string;
  note: string;
}

/** Per-scalar diff drawn into the conflict modal when JSON-paste would
 *  overwrite a populated form field. */
interface ScalarConflict {
  key: keyof AdminGearForm | string;
  label: string;
  oldVal: unknown;
  newVal: unknown;
  apply: boolean;
}

/** List-level conflict (links/videos/relationships) — replacing the
 *  entire collection is the only granularity supported. */
interface ListConflict {
  key: 'links' | 'videos' | 'relationships';
  label: string;
  oldCount: number;
  newCount: number;
  apply: boolean;
}

/** The product of `parseJsonImport` — applied either immediately (no
 *  conflicts) or after the conflict modal closes with selected entries. */
interface ParsedImport {
  patch: Partial<AdminGearForm>;
  /** Specs keys the parser couldn't map to a structured field — dumped
   *  into the "Extra (raw JSON)" textarea so nothing is silently lost. */
  unmappedSpecs: Record<string, unknown>;
  links: LinkRow[] | null;
  videos: VideoRow[] | null;
  relationships: RelRow[] | null;
  /** Inline warning ("Familia X nu există") shown under the family field
   *  when `family_name` from JSON doesn't match an existing row. */
  familyWarning: string | null;
}

/* ============================================================
   Helpers
   ============================================================ */

/** Keys of `specs` that the structured UI consumes. Anything outside
 *  this set lands in the Extra textarea. */
const STRUCTURED_SPEC_KEYS = new Set([
  'synth_type',
  'type', // alias from scraper JSON
  'polyphony',
  'osc_per_voice',
  'oscillators_per_voice', // alias
  'filter_type',
  'has_arpeggiator',
  'has_sequencer',
  'has_keys',
  'has_keyboard', // alias
  'num_keys',
  'key_count', // alias
  'aftertouch',
  'midi_io',
  'audio_out',
  'cv_gate',
  'pedals_label',
  'patch_memory_label',
  'weight_kg',
  'dimensions_label',
  'power_label',
]);

function normaliseMidiTokens(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => String(v))
    .map((v) => (v === 'usb' ? 'usb_host' : v));
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

@Component({
  selector: 'app-tezaur-admin-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SzButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tezaur-edit.page.html',
  styleUrls: ['./tezaur-edit.page.css'],
})
export class TezaurAdminEditPage {
  readonly i18n = inject(I18nService);
  readonly tezaur = inject(TezaurAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = GEAR_CATEGORIES;
  readonly formFactors = FORM_FACTORS;
  readonly synthTypeOptions = SYNTH_TYPE_OPTIONS;
  readonly aftertouchOptions = AFTERTOUCH_OPTIONS;
  readonly midiIoOptions = MIDI_IO_OPTIONS;
  readonly audioOutOptions = AUDIO_OUT_OPTIONS;
  readonly relationshipTypeOptions = RELATIONSHIP_TYPE_OPTIONS;
  readonly linkKindOptions = LINK_KIND_OPTIONS;
  readonly videoProviderOptions = VIDEO_PROVIDER_OPTIONS;

  readonly isEdit = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly detail = signal<TezaurDetail | null>(null);
  readonly families = signal<GearFamily[]>([]);

  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly specsError = signal<string | null>(null);
  readonly jsonError = signal<string | null>(null);
  readonly familyWarning = signal<string | null>(null);
  readonly dropHover = signal(false);

  readonly saving = signal(false);
  readonly uploading = signal(false);

  readonly form = signal<AdminGearForm>(this.emptyForm());

  readonly linkRows = signal<LinkRow[]>([]);
  readonly videoRows = signal<VideoRow[]>([]);
  readonly relRows = signal<RelRow[]>([]);
  /** Snapshot of sub-resource ids loaded from the server — used to
   *  compute deletes at save time. */
  private originalLinkIds = new Set<string>();
  private originalVideoIds = new Set<string>();
  private originalRelIds = new Set<string>();

  /** Specs keys not represented in the structured form — surfaced as
   *  a raw JSON textarea so admins can still see / hand-edit them. */
  specsExtraText = '{}';

  descriptionHtml = '';

  /* ---------- thread toggle (edit only) ---------- */
  readonly officialBusy = signal(false);
  readonly officialError = signal<string | null>(null);

  /* ---------- JSON conflict modal ---------- */
  readonly conflictOpen = signal(false);
  readonly conflictScalars = signal<ScalarConflict[]>([]);
  readonly conflictLists = signal<ListConflict[]>([]);
  private pendingImport: ParsedImport | null = null;

  readonly hasConflicts = computed(
    () => this.conflictScalars().length > 0 || this.conflictLists().length > 0,
  );

  constructor() {
    void this.loadFamilies();
    this.route.paramMap.subscribe((params) => {
      const idOrSlug = params.get('id');
      if (idOrSlug && idOrSlug !== 'new') {
        this.isEdit.set(true);
        void this.loadDetail(idOrSlug);
      } else {
        this.isEdit.set(false);
      }
    });
  }

  /* ============================================================
     load
     ============================================================ */

  private emptyForm(): AdminGearForm {
    return {
      brand: '',
      model: '',
      slug: '',
      category: 'synthesizer',
      formFactor: null,
      familyId: null,
      yearReleased: null,
      yearDiscontinued: null,
      msrpAtLaunchEur: null,
      msrpAtLaunchUsd: null,
      msrpSourceUrl: null,
      taglineRo: null,
      taglineEn: null,
      latestFirmwareVersion: null,
      firmwareNotesUrl: null,
      synthType: '',
      polyphony: null,
      oscPerVoice: null,
      filterType: '',
      hasArpeggiator: false,
      hasSequencer: false,
      hasKeys: false,
      numKeys: null,
      aftertouch: 'none',
      midiIo: [],
      audioOut: [],
      cvGate: false,
      pedalsLabel: '',
      patchMemoryLabel: '',
      weightKg: null,
      dimensionsLabel: '',
      powerLabel: '',
      published: false,
      officialThreadOn: false,
    };
  }

  squareThumbs(d: TezaurDetail): typeof d.images {
    return d.images.filter((i) => i.variant === 'square_thumb');
  }

  humanize(s: string): string {
    return s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  private async loadFamilies(): Promise<void> {
    try {
      const list = await this.tezaur.listFamilies();
      this.families.set(list);
    } catch (err) {
      console.error('[tezaur-edit] families fetch failed', err);
    }
  }

  private async loadDetail(idOrSlug: string): Promise<void> {
    try {
      const isUuid = /^[0-9a-f]{8}-/.test(idOrSlug);
      const d = isUuid
        ? await this.tezaur.detailById(idOrSlug)
        : await this.tezaur.detail(idOrSlug);
      this.applyDetail(d);
    } catch (err) {
      console.error('[tezaur-edit] detail fetch failed', err);
      this.loadError.set('Eroare la încărcare. Verifică dacă gear-ul există.');
    }
  }

  private applyDetail(d: TezaurDetail): void {
    this.detail.set(d);
    this.editingId.set(d.gear.id);

    const specs = (d.gear.specs ?? {}) as Record<string, unknown>;
    this.form.set({
      brand: d.gear.brand,
      model: d.gear.model,
      slug: d.gear.slug,
      category: d.gear.category as GearCategoryLiteral,
      formFactor: d.gear.formFactor as FormFactorLiteral | null,
      familyId: d.gear.familyId,
      yearReleased: d.gear.yearReleased,
      yearDiscontinued: d.gear.yearDiscontinued,
      msrpAtLaunchEur: d.gear.msrpAtLaunchEur
        ? Number(d.gear.msrpAtLaunchEur)
        : null,
      msrpAtLaunchUsd: d.gear.msrpAtLaunchUsd
        ? Number(d.gear.msrpAtLaunchUsd)
        : null,
      msrpSourceUrl: d.gear.msrpSourceUrl,
      taglineRo: d.gear.taglineRo,
      taglineEn: d.gear.taglineEn,
      latestFirmwareVersion: d.gear.latestFirmwareVersion,
      firmwareNotesUrl: d.gear.firmwareNotesUrl,
      synthType: (specs['synth_type'] as string) ?? '',
      polyphony: (specs['polyphony'] as number) ?? null,
      oscPerVoice: (specs['osc_per_voice'] as number) ?? null,
      filterType: (specs['filter_type'] as string) ?? '',
      hasArpeggiator: !!specs['has_arpeggiator'],
      hasSequencer: !!specs['has_sequencer'],
      hasKeys: !!specs['has_keys'],
      numKeys: (specs['num_keys'] as number) ?? null,
      aftertouch: (specs['aftertouch'] as string) ?? 'none',
      midiIo: Array.isArray(specs['midi_io'])
        ? (specs['midi_io'] as string[])
        : [],
      audioOut: Array.isArray(specs['audio_out'])
        ? (specs['audio_out'] as string[])
        : [],
      cvGate: !!specs['cv_gate'],
      pedalsLabel: (specs['pedals_label'] as string) ?? '',
      patchMemoryLabel: (specs['patch_memory_label'] as string) ?? '',
      weightKg: (specs['weight_kg'] as number) ?? null,
      dimensionsLabel: (specs['dimensions_label'] as string) ?? '',
      powerLabel: (specs['power_label'] as string) ?? '',
      published: d.gear.published,
      officialThreadOn: !!d.gear.canonicalThreadId,
    });

    // Anything in specs not consumed by the structured form lands in
    // the Extra textarea so it's editable.
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(specs)) {
      if (!STRUCTURED_SPEC_KEYS.has(k)) extra[k] = v;
    }
    this.specsExtraText = Object.keys(extra).length
      ? JSON.stringify(extra, null, 2)
      : '{}';

    this.linkRows.set(
      d.links.map((l) => ({
        id: l.id,
        kind: l.kind,
        label: l.label ?? '',
        url: l.url,
      })),
    );
    this.originalLinkIds = new Set(d.links.map((l) => l.id));

    this.videoRows.set(
      d.videos.map((v) => ({
        id: v.id,
        provider: v.provider as VideoRow['provider'],
        externalId: v.externalId,
        title: v.title ?? '',
      })),
    );
    this.originalVideoIds = new Set(d.videos.map((v) => v.id));

    this.relRows.set(
      d.relationships.parent.map((r) => ({
        relId: r.relId,
        type: r.type,
        brand: r.brand,
        model: r.model,
        note: r.note ?? '',
      })),
    );
    this.originalRelIds = new Set(
      d.relationships.parent.map((r) => r.relId).filter((x): x is string => !!x),
    );

    this.descriptionHtml = d.description?.bodyHtml ?? '';
  }

  /* ============================================================
     ngModel update helper — keeps `form` signal immutable for OnPush.
     ============================================================ */

  setField<K extends keyof AdminGearForm>(key: K, value: AdminGearForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  toggleArrayValue(key: 'midiIo' | 'audioOut', value: string): void {
    this.form.update((f) => {
      const arr = f[key] as string[];
      return {
        ...f,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  isMidiChecked(v: string): boolean {
    return this.form().midiIo.includes(v);
  }
  isAudioOutChecked(v: string): boolean {
    return this.form().audioOut.includes(v);
  }

  onSpecsExtraInput(): void {
    this.specsError.set(null);
    try {
      JSON.parse(this.specsExtraText || '{}');
    } catch {
      this.specsError.set('JSON invalid');
    }
  }

  /* ============================================================
     JSON drop-zone
     ============================================================ */

  onJsonDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.dropHover()) this.dropHover.set(true);
  }
  onJsonDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    const currentEl = event.currentTarget as Node | null;
    if (currentEl && related && currentEl.contains(related)) return;
    this.dropHover.set(false);
  }

  async onJsonDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dropHover.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.ingestJsonFile(file);
  }

  async onJsonFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.ingestJsonFile(file);
  }

  async onJsonPaste(text: string): Promise<void> {
    this.handleParsedJson(text);
  }

  private async ingestJsonFile(file: File): Promise<void> {
    this.jsonError.set(null);
    try {
      const text = await file.text();
      this.handleParsedJson(text);
    } catch (err) {
      console.error('[tezaur-edit] json read failed', err);
      this.jsonError.set('Nu am putut citi fișierul.');
    }
  }

  private handleParsedJson(text: string): void {
    this.jsonError.set(null);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.jsonError.set('JSON invalid.');
      return;
    }
    if (!raw || typeof raw !== 'object') {
      this.jsonError.set('JSON-ul trebuie să fie un obiect.');
      return;
    }
    const parsed = this.parseJsonImport(raw as Record<string, unknown>);
    this.familyWarning.set(parsed.familyWarning);

    // Build conflict list against current form.
    const { scalars, lists } = this.buildConflicts(parsed);
    if (scalars.length === 0 && lists.length === 0) {
      this.applyImport(parsed);
      return;
    }
    this.pendingImport = parsed;
    this.conflictScalars.set(scalars);
    this.conflictLists.set(lists);
    this.conflictOpen.set(true);
  }

  /** Map scraped JSON → form patch + sub-resource lists. Unknown specs
   *  keys are collected separately so they end up in the Extra textarea
   *  rather than silently dropped. */
  private parseJsonImport(json: Record<string, unknown>): ParsedImport {
    const patch: Partial<AdminGearForm> = {};

    if (typeof json['brand'] === 'string') patch.brand = json['brand'];
    if (typeof json['model'] === 'string') patch.model = json['model'];
    if (typeof json['category'] === 'string')
      patch.category = json['category'] as GearCategoryLiteral;
    if (typeof json['form_factor'] === 'string')
      patch.formFactor = json['form_factor'] as FormFactorLiteral;
    if (typeof json['year_released'] === 'number')
      patch.yearReleased = json['year_released'];
    if (typeof json['year_discontinued'] === 'number')
      patch.yearDiscontinued = json['year_discontinued'];
    if (typeof json['msrp_at_launch_eur'] === 'number')
      patch.msrpAtLaunchEur = json['msrp_at_launch_eur'];
    if (typeof json['msrp_at_launch_usd'] === 'number')
      patch.msrpAtLaunchUsd = json['msrp_at_launch_usd'];
    if (typeof json['msrp_source_url'] === 'string')
      patch.msrpSourceUrl = json['msrp_source_url'];
    if (typeof json['tagline_ro'] === 'string')
      patch.taglineRo = json['tagline_ro'];
    if (typeof json['tagline_en'] === 'string')
      patch.taglineEn = json['tagline_en'];
    if (typeof json['latest_firmware_version'] === 'string')
      patch.latestFirmwareVersion = json['latest_firmware_version'];
    if (typeof json['firmware_notes_url'] === 'string')
      patch.firmwareNotesUrl = json['firmware_notes_url'];

    // Family lookup — match by case-insensitive name. No auto-create.
    let familyWarning: string | null = null;
    if (typeof json['family_name'] === 'string' && json['family_name']) {
      const name = json['family_name'].trim().toLowerCase();
      const match = this.families().find(
        (f) => f.name.trim().toLowerCase() === name,
      );
      if (match) {
        patch.familyId = match.id;
      } else {
        familyWarning = `Familia „${json['family_name']}" nu există — creeaz-o din /tezaur/families dacă vrei să o atașezi.`;
      }
    }

    // Specs — pick structured keys, collect unmapped into `extra`.
    const specs = (json['specs'] as Record<string, unknown>) ?? {};
    const unmappedSpecs: Record<string, unknown> = {};

    if (typeof specs['synth_type'] === 'string')
      patch.synthType = specs['synth_type'];
    else if (typeof specs['type'] === 'string') patch.synthType = specs['type'];

    if (typeof specs['polyphony'] === 'number')
      patch.polyphony = specs['polyphony'];
    if (typeof specs['osc_per_voice'] === 'number')
      patch.oscPerVoice = specs['osc_per_voice'];
    else if (typeof specs['oscillators_per_voice'] === 'number')
      patch.oscPerVoice = specs['oscillators_per_voice'];

    if (typeof specs['filter_type'] === 'string')
      patch.filterType = specs['filter_type'];
    if (typeof specs['has_arpeggiator'] === 'boolean')
      patch.hasArpeggiator = specs['has_arpeggiator'];
    if (typeof specs['has_sequencer'] === 'boolean')
      patch.hasSequencer = specs['has_sequencer'];

    if (typeof specs['has_keys'] === 'boolean')
      patch.hasKeys = specs['has_keys'];
    else if (typeof specs['has_keyboard'] === 'boolean')
      patch.hasKeys = specs['has_keyboard'];

    if (typeof specs['num_keys'] === 'number') patch.numKeys = specs['num_keys'];
    else if (typeof specs['key_count'] === 'number')
      patch.numKeys = specs['key_count'];

    if (typeof specs['aftertouch'] === 'string')
      patch.aftertouch = specs['aftertouch'];

    if (Array.isArray(specs['midi_io']))
      patch.midiIo = normaliseMidiTokens(specs['midi_io']);
    if (Array.isArray(specs['audio_out']))
      patch.audioOut = (specs['audio_out'] as unknown[]).map(String);

    if (typeof specs['cv_gate'] === 'boolean') patch.cvGate = specs['cv_gate'];
    if (typeof specs['pedals_label'] === 'string')
      patch.pedalsLabel = specs['pedals_label'];
    if (typeof specs['patch_memory_label'] === 'string')
      patch.patchMemoryLabel = specs['patch_memory_label'];
    if (typeof specs['weight_kg'] === 'number')
      patch.weightKg = specs['weight_kg'];
    if (typeof specs['dimensions_label'] === 'string')
      patch.dimensionsLabel = specs['dimensions_label'];
    if (typeof specs['power_label'] === 'string')
      patch.powerLabel = specs['power_label'];

    for (const [k, v] of Object.entries(specs)) {
      if (!STRUCTURED_SPEC_KEYS.has(k)) unmappedSpecs[k] = v;
    }

    // Sub-resources — links, videos, relationships.
    const rawLinks = Array.isArray(json['links'])
      ? (json['links'] as Record<string, unknown>[])
      : null;
    const links: LinkRow[] | null = rawLinks
      ? rawLinks
          .filter((l) => typeof l['url'] === 'string')
          .map((l) => ({
            id: null,
            kind: typeof l['kind'] === 'string' ? (l['kind'] as string) : 'other',
            label: typeof l['label'] === 'string' ? (l['label'] as string) : '',
            url: l['url'] as string,
          }))
      : null;

    const rawVideos = Array.isArray(json['videos'])
      ? (json['videos'] as Record<string, unknown>[])
      : null;
    const videos: VideoRow[] | null = rawVideos
      ? rawVideos
          .filter(
            (v) =>
              typeof v['provider'] === 'string' &&
              typeof v['external_id'] === 'string',
          )
          .map((v) => ({
            id: null,
            provider: v['provider'] as VideoRow['provider'],
            externalId: v['external_id'] as string,
            title: typeof v['title'] === 'string' ? (v['title'] as string) : '',
          }))
      : null;

    const rawRels = Array.isArray(json['relationships'])
      ? (json['relationships'] as Record<string, unknown>[])
      : null;
    const relationships: RelRow[] | null = rawRels
      ? rawRels
          .filter(
            (r) =>
              typeof r['type'] === 'string' &&
              typeof r['to_brand'] === 'string' &&
              typeof r['to_model'] === 'string',
          )
          .map((r) => ({
            relId: null,
            type: r['type'] as string,
            brand: r['to_brand'] as string,
            model: r['to_model'] as string,
            note: typeof r['note'] === 'string' ? (r['note'] as string) : '',
          }))
      : null;

    return { patch, unmappedSpecs, links, videos, relationships, familyWarning };
  }

  private buildConflicts(parsed: ParsedImport): {
    scalars: ScalarConflict[];
    lists: ListConflict[];
  } {
    const current = this.form();
    const labels: Record<string, string> = {
      brand: 'Brand',
      model: 'Model',
      category: 'Categorie',
      formFactor: 'Form factor',
      familyId: 'Familie',
      yearReleased: 'An lansare',
      yearDiscontinued: 'An discontinuare',
      msrpAtLaunchEur: 'MSRP EUR',
      msrpAtLaunchUsd: 'MSRP USD',
      msrpSourceUrl: 'Sursă MSRP',
      taglineRo: 'Tagline RO',
      taglineEn: 'Tagline EN',
      latestFirmwareVersion: 'Versiune firmware',
      firmwareNotesUrl: 'Note firmware',
      synthType: 'Tip sinteză',
      polyphony: 'Polifonie',
      oscPerVoice: 'Osc / voce',
      filterType: 'Tip filtru',
      hasArpeggiator: 'Are arpegiator',
      hasSequencer: 'Are sequencer',
      hasKeys: 'Are claviatură',
      numKeys: 'Nr. clape',
      aftertouch: 'Aftertouch',
      midiIo: 'MIDI I/O',
      audioOut: 'Ieșiri audio',
      cvGate: 'CV / gate',
      pedalsLabel: 'Pedale',
      patchMemoryLabel: 'Memorie patch-uri',
      weightKg: 'Greutate (kg)',
      dimensionsLabel: 'Dimensiuni',
      powerLabel: 'Alimentare',
    };

    const scalars: ScalarConflict[] = [];
    for (const [k, newVal] of Object.entries(parsed.patch)) {
      const key = k as keyof AdminGearForm;
      const oldVal = current[key];
      if (isBlank(oldVal)) continue;
      // Comparison: skip when the new value is identical.
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
      scalars.push({
        key,
        label: labels[k] ?? k,
        oldVal,
        newVal,
        apply: true,
      });
    }

    const lists: ListConflict[] = [];
    if (parsed.links && parsed.links.length && this.linkRows().length > 0) {
      lists.push({
        key: 'links',
        label: 'Linkuri',
        oldCount: this.linkRows().length,
        newCount: parsed.links.length,
        apply: true,
      });
    }
    if (parsed.videos && parsed.videos.length && this.videoRows().length > 0) {
      lists.push({
        key: 'videos',
        label: 'Videos',
        oldCount: this.videoRows().length,
        newCount: parsed.videos.length,
        apply: true,
      });
    }
    if (
      parsed.relationships &&
      parsed.relationships.length &&
      this.relRows().length > 0
    ) {
      lists.push({
        key: 'relationships',
        label: 'Relații',
        oldCount: this.relRows().length,
        newCount: parsed.relationships.length,
        apply: true,
      });
    }

    return { scalars, lists };
  }

  toggleConflictScalar(key: string): void {
    this.conflictScalars.update((rows) =>
      rows.map((r) => (r.key === key ? { ...r, apply: !r.apply } : r)),
    );
  }
  toggleConflictList(key: string): void {
    this.conflictLists.update((rows) =>
      rows.map((r) => (r.key === key ? { ...r, apply: !r.apply } : r)),
    );
  }
  conflictSelectAll(apply: boolean): void {
    this.conflictScalars.update((rows) => rows.map((r) => ({ ...r, apply })));
    this.conflictLists.update((rows) => rows.map((r) => ({ ...r, apply })));
  }

  applyConflictSelection(): void {
    if (!this.pendingImport) return;
    const blockedScalars = new Set(
      this.conflictScalars().filter((r) => !r.apply).map((r) => r.key as string),
    );
    const blockedLists = new Set(
      this.conflictLists().filter((r) => !r.apply).map((r) => r.key),
    );
    const filtered: ParsedImport = {
      ...this.pendingImport,
      patch: Object.fromEntries(
        Object.entries(this.pendingImport.patch).filter(
          ([k]) => !blockedScalars.has(k),
        ),
      ),
      links: blockedLists.has('links') ? null : this.pendingImport.links,
      videos: blockedLists.has('videos') ? null : this.pendingImport.videos,
      relationships: blockedLists.has('relationships')
        ? null
        : this.pendingImport.relationships,
    };
    this.applyImport(filtered);
    this.closeConflictModal();
  }

  cancelConflictModal(): void {
    this.closeConflictModal();
  }

  private closeConflictModal(): void {
    this.conflictOpen.set(false);
    this.conflictScalars.set([]);
    this.conflictLists.set([]);
    this.pendingImport = null;
  }

  private applyImport(parsed: ParsedImport): void {
    this.form.update((f) => ({ ...f, ...parsed.patch }));
    if (parsed.links) this.linkRows.set(parsed.links);
    if (parsed.videos) this.videoRows.set(parsed.videos);
    if (parsed.relationships) this.relRows.set(parsed.relationships);

    // Merge unmapped specs into the Extra textarea (overwriting same keys).
    if (Object.keys(parsed.unmappedSpecs).length > 0) {
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse(this.specsExtraText || '{}');
      } catch {
        existing = {};
      }
      const merged = { ...existing, ...parsed.unmappedSpecs };
      this.specsExtraText = JSON.stringify(merged, null, 2);
    }
  }

  /* ============================================================
     sub-resource rows: add / remove
     ============================================================ */

  addLinkRow(): void {
    this.linkRows.update((rows) => [
      ...rows,
      { id: null, kind: 'other', label: '', url: '' },
    ]);
  }
  removeLinkRow(idx: number): void {
    this.linkRows.update((rows) => rows.filter((_, i) => i !== idx));
  }
  updateLinkRow(idx: number, patch: Partial<LinkRow>): void {
    this.linkRows.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  addVideoRow(): void {
    this.videoRows.update((rows) => [
      ...rows,
      { id: null, provider: 'youtube', externalId: '', title: '' },
    ]);
  }
  removeVideoRow(idx: number): void {
    this.videoRows.update((rows) => rows.filter((_, i) => i !== idx));
  }
  updateVideoRow(idx: number, patch: Partial<VideoRow>): void {
    this.videoRows.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  addRelRow(): void {
    this.relRows.update((rows) => [
      ...rows,
      { relId: null, type: 'inspired_by', brand: '', model: '', note: '' },
    ]);
  }
  removeRelRow(idx: number): void {
    this.relRows.update((rows) => rows.filter((_, i) => i !== idx));
  }
  updateRelRow(idx: number, patch: Partial<RelRow>): void {
    this.relRows.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  /* ============================================================
     payload assembly
     ============================================================ */

  private collectSpecs(): Record<string, unknown> {
    const f = this.form();
    let extra: Record<string, unknown> = {};
    try {
      extra = JSON.parse(this.specsExtraText || '{}');
    } catch {
      extra = {};
    }
    const specs: Record<string, unknown> = { ...extra };
    if (f.synthType) specs['synth_type'] = f.synthType;
    if (f.polyphony !== null) specs['polyphony'] = f.polyphony;
    if (f.oscPerVoice !== null) specs['osc_per_voice'] = f.oscPerVoice;
    if (f.filterType) specs['filter_type'] = f.filterType;
    specs['has_arpeggiator'] = f.hasArpeggiator;
    specs['has_sequencer'] = f.hasSequencer;
    specs['has_keys'] = f.hasKeys;
    if (f.numKeys !== null) specs['num_keys'] = f.numKeys;
    if (f.aftertouch) specs['aftertouch'] = f.aftertouch;
    if (f.midiIo.length) specs['midi_io'] = f.midiIo;
    if (f.audioOut.length) specs['audio_out'] = f.audioOut;
    specs['cv_gate'] = f.cvGate;
    if (f.pedalsLabel) specs['pedals_label'] = f.pedalsLabel;
    if (f.patchMemoryLabel) specs['patch_memory_label'] = f.patchMemoryLabel;
    if (f.weightKg !== null) specs['weight_kg'] = f.weightKg;
    if (f.dimensionsLabel) specs['dimensions_label'] = f.dimensionsLabel;
    if (f.powerLabel) specs['power_label'] = f.powerLabel;
    return specs;
  }

  private collectGearPayload(): CreateGearPayload {
    const f = this.form();
    return {
      brand: f.brand,
      model: f.model,
      slug: f.slug || undefined,
      category: f.category,
      formFactor: f.formFactor ?? undefined,
      familyId: f.familyId ?? undefined,
      yearReleased: f.yearReleased ?? undefined,
      yearDiscontinued: f.yearDiscontinued ?? undefined,
      msrpAtLaunchEur: f.msrpAtLaunchEur ?? undefined,
      msrpAtLaunchUsd: f.msrpAtLaunchUsd ?? undefined,
      msrpSourceUrl: f.msrpSourceUrl ?? undefined,
      taglineRo: f.taglineRo ?? undefined,
      taglineEn: f.taglineEn ?? undefined,
      latestFirmwareVersion: f.latestFirmwareVersion ?? undefined,
      firmwareNotesUrl: f.firmwareNotesUrl ?? undefined,
      specs: this.collectSpecs(),
      published: f.published,
    };
  }

  /* ============================================================
     save (create + edit, with sub-resource diff)
     ============================================================ */

  async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saveError.set(null);
    if (this.specsError()) return;

    this.saving.set(true);
    try {
      let gearId: string;
      let nextSlug: string;
      const payload = this.collectGearPayload();

      if (this.isEdit() && this.editingId()) {
        const result = await this.tezaur.update(this.editingId()!, payload);
        gearId = result.id;
        nextSlug = result.slug;
      } else {
        const created = await this.tezaur.create(payload);
        gearId = created.id;
        nextSlug = created.slug;
      }

      // Sub-resources: links, videos, relationships
      const subErrors: string[] = [];
      await this.syncLinks(gearId, subErrors);
      await this.syncVideos(gearId, subErrors);
      await this.syncRelationships(gearId, subErrors);

      // Description (edit-only)
      if (this.isEdit() && this.descriptionHtml) {
        try {
          await this.tezaur.upsertDescription(gearId, {
            lang: 'ro',
            body: {
              type: 'doc',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: '(see html)' }] },
              ],
            },
            bodyHtml: this.descriptionHtml,
          });
        } catch (err) {
          console.error('[tezaur-edit] description upsert failed', err);
          subErrors.push('Descrierea nu a putut fi salvată.');
        }
      }

      if (subErrors.length) {
        this.saveError.set(
          'Gear-ul s-a salvat, dar unele subresurse au eșuat: ' +
            subErrors.join(' · '),
        );
      }

      if (!this.isEdit()) {
        await this.router.navigate(['/tezaur', gearId, 'edit']);
        return;
      }
      // Reload to pick up server-assigned ids on freshly-created sub-resources.
      await this.loadDetail(nextSlug);
    } catch (err) {
      this.saveError.set(
        (err as { error?: { message?: string } })?.error?.message ??
          'Eroare la salvare.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async syncLinks(gearId: string, errors: string[]): Promise<void> {
    const current = this.linkRows();
    const keptIds = new Set(current.map((r) => r.id).filter((x): x is string => !!x));
    const toDelete = [...this.originalLinkIds].filter((id) => !keptIds.has(id));
    for (const id of toDelete) {
      try {
        await this.tezaur.deleteLink(gearId, id);
      } catch (err) {
        console.error('[tezaur-edit] delete link failed', err);
        errors.push(`Link ${id} nu a putut fi șters.`);
      }
    }
    for (const row of current) {
      if (row.id) continue; // existing — not editable in this revision
      if (!row.url) continue;
      try {
        await this.tezaur.addLink(gearId, {
          kind: row.kind,
          url: row.url,
          label: row.label || undefined,
        });
      } catch (err) {
        console.error('[tezaur-edit] add link failed', err);
        errors.push(`Link „${row.url}" a eșuat.`);
      }
    }
  }

  private async syncVideos(gearId: string, errors: string[]): Promise<void> {
    const current = this.videoRows();
    const keptIds = new Set(current.map((r) => r.id).filter((x): x is string => !!x));
    const toDelete = [...this.originalVideoIds].filter((id) => !keptIds.has(id));
    for (const id of toDelete) {
      try {
        await this.tezaur.deleteVideo(gearId, id);
      } catch (err) {
        console.error('[tezaur-edit] delete video failed', err);
        errors.push(`Video ${id} nu a putut fi șters.`);
      }
    }
    for (const row of current) {
      if (row.id) continue;
      if (!row.externalId) continue;
      try {
        await this.tezaur.addVideo(gearId, {
          provider: row.provider,
          externalId: row.externalId,
          title: row.title || undefined,
        });
      } catch (err) {
        console.error('[tezaur-edit] add video failed', err);
        errors.push(`Video ${row.provider}:${row.externalId} a eșuat.`);
      }
    }
  }

  private async syncRelationships(
    gearId: string,
    errors: string[],
  ): Promise<void> {
    const current = this.relRows();
    const keptIds = new Set(
      current.map((r) => r.relId).filter((x): x is string => !!x),
    );
    const toDelete = [...this.originalRelIds].filter((id) => !keptIds.has(id));
    for (const id of toDelete) {
      try {
        await this.tezaur.deleteRelationship(id);
      } catch (err) {
        console.error('[tezaur-edit] delete rel failed', err);
        errors.push(`Relația ${id} nu a putut fi ștearsă.`);
      }
    }
    for (const row of current) {
      if (row.relId) continue;
      if (!row.brand || !row.model || !row.type) continue;
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
          errors.push(`Relația „${row.brand} ${row.model}" nu există în catalog — sari peste.`);
          continue;
        }
        await this.tezaur.addRelationship(gearId, {
          childGearId: match.id,
          type: row.type,
          note: row.note || undefined,
        });
      } catch (err) {
        console.error('[tezaur-edit] add rel failed', err);
        errors.push(`Relația „${row.brand} ${row.model}" a eșuat.`);
      }
    }
  }

  /* ============================================================
     official thread (edit-only) + images + soft delete
     ============================================================ */

  async onOfficialToggle(next: boolean): Promise<void> {
    const id = this.editingId();
    if (!id || this.officialBusy()) return;
    const prev = this.form().officialThreadOn;
    this.officialBusy.set(true);
    this.officialError.set(null);
    this.setField('officialThreadOn', next);
    try {
      if (next) await this.tezaur.enableOfficialThread(id);
      else await this.tezaur.disableOfficialThread(id);
    } catch (err) {
      this.setField('officialThreadOn', prev);
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Acțiunea a eșuat.';
      this.officialError.set(msg);
    } finally {
      this.officialBusy.set(false);
    }
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.editingId()) return;
    this.uploadError.set(null);
    this.uploading.set(true);
    try {
      await this.tezaur.uploadImage(this.editingId()!, file);
      const d = await this.tezaur.detailById(this.editingId()!);
      this.detail.set(d);
      input.value = '';
    } catch (err) {
      this.uploadError.set(
        (err as { error?: { message?: string } })?.error?.message ??
          'Upload eșuat.',
      );
    } finally {
      this.uploading.set(false);
    }
  }

  async deleteImage(sourceId: string): Promise<void> {
    if (!this.editingId()) return;
    if (!confirm('Șterge această imagine?')) return;
    try {
      await this.tezaur.deleteImage(this.editingId()!, sourceId);
      const d = await this.tezaur.detailById(this.editingId()!);
      this.detail.set(d);
    } catch (err) {
      console.error('[tezaur-edit] deleteImage failed', err);
    }
  }

  async softDelete(): Promise<void> {
    if (!this.editingId()) return;
    if (!confirm('Soft-delete acest gear? Poți restaura ulterior din admin.'))
      return;
    try {
      await this.tezaur.softDelete(this.editingId()!);
      await this.router.navigateByUrl('/tezaur');
    } catch (err) {
      this.saveError.set(
        (err as { error?: { message?: string } })?.error?.message ??
          'Soft-delete eșuat.',
      );
    }
  }
}
