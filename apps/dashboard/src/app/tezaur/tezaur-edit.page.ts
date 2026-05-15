import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import {
  FORM_FACTORS,
  GEAR_CATEGORIES,
  type FormFactorLiteral,
  type GearCategoryLiteral,
} from '@sintezaur/shared';
import { SzButtonComponent } from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import { TezaurAdminService, type GearFamily } from './tezaur-admin.service';
import type { TezaurDetail } from './tezaur.types';

@Component({
  selector: 'app-tezaur-admin-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    SelectModule,
    SzButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/tezaur" class="admin__back">← Înapoi la listă</a>
        <h1>
          @if (isEdit()) {
            {{ form().brand }} {{ form().model }}
          } @else {
            Gear nou
          }
        </h1>
      </header>

      @if (loadError()) {
        <p class="error">{{ loadError() }}</p>
      }

      <form class="admin__form" (submit)="save($event)">
        <section class="admin__sec">
          <h2>General</h2>
          <div class="admin__row">
            <label>
              <span>Brand *</span>
              <input pInputText type="text" [(ngModel)]="form().brand" name="brand" required />
            </label>
            <label>
              <span>Model *</span>
              <input pInputText type="text" [(ngModel)]="form().model" name="model" required />
            </label>
          </div>
          <div class="admin__row">
            <label>
              <span>Categorie *</span>
              <select [(ngModel)]="form().category" name="category" required>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ humanize(cat) }}</option>
                }
              </select>
            </label>
            <label>
              <span>Form factor</span>
              <select [(ngModel)]="form().formFactor" name="formFactor">
                <option [ngValue]="null">—</option>
                @for (ff of formFactors; track ff) {
                  <option [value]="ff">{{ humanize(ff) }}</option>
                }
              </select>
            </label>
          </div>
          <div class="admin__row">
            <label>
              <span>Familie</span>
              <select [(ngModel)]="form().familyId" name="familyId">
                <option [ngValue]="null">—</option>
                @for (f of families(); track f.id) {
                  <option [value]="f.id">{{ f.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Slug (auto din brand+model dacă lipsește)</span>
              <input pInputText type="text" [(ngModel)]="form().slug" name="slug" />
            </label>
          </div>
          <div class="admin__row">
            <label>
              <span>An lansare</span>
              <input pInputText type="number" [(ngModel)]="form().yearReleased" name="yearReleased" />
            </label>
            <label>
              <span>An discontinuare (gol = în producție)</span>
              <input pInputText type="number" [(ngModel)]="form().yearDiscontinued" name="yearDiscontinued" />
            </label>
          </div>
          <div class="admin__row">
            <label>
              <span>MSRP la lansare (EUR)</span>
              <input pInputText type="number" step="0.01" [(ngModel)]="form().msrpAtLaunchEur" name="msrpAtLaunchEur" />
            </label>
            <label>
              <span>Firmware version</span>
              <input pInputText type="text" [(ngModel)]="form().latestFirmwareVersion" name="latestFirmwareVersion" />
            </label>
          </div>
          <label class="admin__check">
            <input type="checkbox" [(ngModel)]="form().published" name="published" />
            <span>Publicat (vizibil public). Slug-ul se blochează la prima publicare.</span>
          </label>

          @if (isEdit()) {
            <label class="admin__check">
              <input
                type="checkbox"
                [ngModel]="form().officialThreadOn"
                (ngModelChange)="onOfficialToggle($event)"
                [disabled]="officialBusy()"
                name="officialThreadOn"
              />
              <span>
                <strong>Thread oficial pe forum</strong> — creează un thread unic
                de discuții pentru acest echipament în „Discuții echipamente".
                Recomandat ON pentru gear current, OFF pentru vintage / istoric.
                @if (officialBusy()) {
                  <em>· se aplică...</em>
                }
                @if (officialError()) {
                  <span class="admin__err">{{ officialError() }}</span>
                }
              </span>
            </label>
          } @else {
            <p class="admin__hint">
              💡 După prima salvare, vei putea activa „Thread oficial" pentru acest echipament.
            </p>
          }
        </section>

        <section class="admin__sec">
          <h2>Specs (JSONB)</h2>
          <label>
            <span>JSON (e.g. {{ '{' }} "type": "analog_poly", "polyphony": 6 {{ '}' }})</span>
            <textarea
              rows="6"
              [(ngModel)]="specsText"
              name="specs"
              (input)="onSpecsInput()"
              placeholder='{ "type": "analog_poly", "polyphony": 6 }'
            ></textarea>
            @if (specsError()) {
              <span class="admin__err">{{ specsError() }}</span>
            }
          </label>
        </section>

        @if (isEdit()) {
          <section class="admin__sec">
            <h2>Descriere (RO)</h2>
            <label>
              <span>HTML — Tiptap editor land în M4. Pentru M2, HTML raw.</span>
              <textarea rows="10" [(ngModel)]="descriptionHtml" name="descriptionHtml"></textarea>
            </label>
            <p class="muted">Body Tiptap JSON e regenerat dintr-un singur paragraf cuprinzând HTML-ul de mai sus.</p>
          </section>

          <section class="admin__sec">
            <h2>Imagini</h2>
            @if (detail(); as d) {
              <div class="admin__images">
                @for (img of squareThumbs(d); track img.sourceId) {
                  <div class="admin__image">
                    <img [src]="tezaur.imageUrl(img.path)" [alt]="img.caption ?? ''" />
                    <button type="button" (click)="deleteImage(img.sourceId)">×</button>
                  </div>
                }
                @if (squareThumbs(d).length === 0) {
                  <p class="muted">Nicio imagine încărcată.</p>
                }
              </div>
            }
            <input type="file" accept="image/jpeg,image/png,image/webp" (change)="uploadImage($event)" />
            @if (uploadError()) {
              <span class="admin__err">{{ uploadError() }}</span>
            }
            @if (uploading()) {
              <p class="muted">Se procesează imaginea (Sharp generează 7 variante)...</p>
            }
          </section>
        }

        @if (saveError()) {
          <p class="error">{{ saveError() }}</p>
        }

        <div class="admin__actions">
          <button sz-button variant="primary" type="submit" [disabled]="saving()">
            @if (isEdit()) { Salvează } @else { Creează }
          </button>
          <a sz-button variant="ghost" routerLink="/tezaur">Anulează</a>
          @if (isEdit()) {
            <button
              sz-button
              variant="ghost"
              type="button"
              (click)="softDelete()"
              [disabled]="saving()"
              style="margin-left: auto"
            >
              Șterge
            </button>
          }
        </div>
      </form>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .admin {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .admin__head { margin-bottom: 32px; }
      .admin__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 48px);
        text-transform: uppercase;
        margin: 0;
        font-weight: 600;
      }
      .admin__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        text-transform: uppercase;
        margin-bottom: 8px;
        display: inline-block;
        min-height: auto;
        min-width: auto;
      }
      .admin__back:hover { color: var(--accent); }

      .admin__form {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      .admin__sec {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 24px;
      }
      .admin__sec h2 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg);
        margin: 0 0 18px;
      }
      .admin__sec h2::before { content: '// '; color: var(--accent); }

      .admin__row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
      }
      .admin__row label,
      .admin__sec > label {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .admin__row label > span,
      .admin__sec > label > span {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      input, select, textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 13px;
        outline: none;
      }
      input:focus, select:focus, textarea:focus { border-color: var(--accent); }
      textarea { font-family: var(--font-mono); resize: vertical; }
      .admin__check {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
      }

      .admin__err {
        color: #d93025;
        font-family: var(--font-mono);
        font-size: 11px;
      }
      .admin__hint {
        font-size: 12px;
        color: var(--p-text-muted-color, #666);
        font-style: italic;
        margin: 8px 0 0;
      }

      .admin__images {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .admin__image {
        position: relative;
        aspect-ratio: 1;
        background: var(--bg-card);
        border: 1px solid var(--line);
        overflow: hidden;
      }
      .admin__image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .admin__image button {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
      }
      .admin__image button:hover {
        background: var(--accent);
        color: var(--accent-fg);
      }

      .admin__actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .error {
        color: #d93025;
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 12px;
        background: var(--bg-elev);
        border: 1px solid #d93025;
      }
      .muted {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        margin: 6px 0 0;
      }

      @media (max-width: 720px) {
        .admin__row { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class TezaurAdminEditPage {
  readonly i18n = inject(I18nService);
  readonly tezaur = inject(TezaurAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = GEAR_CATEGORIES;
  readonly formFactors = FORM_FACTORS;

  readonly isEdit = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly detail = signal<TezaurDetail | null>(null);
  readonly families = signal<GearFamily[]>([]);

  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly specsError = signal<string | null>(null);

  readonly saving = signal(false);
  readonly uploading = signal(false);

  readonly form = signal<{
    brand: string;
    model: string;
    slug: string;
    category: GearCategoryLiteral;
    formFactor: FormFactorLiteral | null;
    familyId: string | null;
    yearReleased: number | null;
    yearDiscontinued: number | null;
    msrpAtLaunchEur: number | null;
    latestFirmwareVersion: string | null;
    published: boolean;
    officialThreadOn: boolean;
  }>({
    brand: '',
    model: '',
    slug: '',
    category: 'synthesizer',
    formFactor: null,
    familyId: null,
    yearReleased: null,
    yearDiscontinued: null,
    msrpAtLaunchEur: null,
    latestFirmwareVersion: null,
    published: false,
    officialThreadOn: false,
  });

  readonly officialBusy = signal(false);
  readonly officialError = signal<string | null>(null);

  specsText = '{}';
  descriptionHtml = '';

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

  squareThumbs(d: TezaurDetail): typeof d.images {
    return d.images.filter((i) => i.variant === 'square_thumb');
  }

  humanize(s: string): string {
    return s.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  onSpecsInput(): void {
    this.specsError.set(null);
    try {
      JSON.parse(this.specsText || '{}');
    } catch {
      this.specsError.set('JSON invalid');
    }
  }

  async onOfficialToggle(next: boolean): Promise<void> {
    const id = this.editingId();
    if (!id || this.officialBusy()) return;
    const prev = this.form().officialThreadOn;
    this.officialBusy.set(true);
    this.officialError.set(null);
    // Optimistic flip.
    this.form.set({ ...this.form(), officialThreadOn: next });
    try {
      if (next) {
        await this.tezaur.enableOfficialThread(id);
      } else {
        await this.tezaur.disableOfficialThread(id);
      }
    } catch (err) {
      this.form.set({ ...this.form(), officialThreadOn: prev });
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Acțiunea a eșuat.';
      this.officialError.set(msg);
    } finally {
      this.officialBusy.set(false);
    }
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saveError.set(null);
    if (this.specsError()) return;

    let specs: Record<string, unknown> = {};
    try {
      specs = JSON.parse(this.specsText || '{}');
    } catch {
      this.specsError.set('JSON invalid');
      return;
    }

    const f = this.form();
    const payload = {
      brand: f.brand,
      model: f.model,
      slug: f.slug || undefined,
      category: f.category,
      formFactor: f.formFactor ?? undefined,
      familyId: f.familyId ?? undefined,
      yearReleased: f.yearReleased ?? undefined,
      yearDiscontinued: f.yearDiscontinued ?? undefined,
      msrpAtLaunchEur: f.msrpAtLaunchEur ?? undefined,
      latestFirmwareVersion: f.latestFirmwareVersion ?? undefined,
      specs,
      published: f.published,
    };

    this.saving.set(true);
    try {
      if (this.isEdit() && this.editingId()) {
        await this.tezaur.update(this.editingId()!, payload);
        if (this.descriptionHtml) {
          await this.tezaur.upsertDescription(this.editingId()!, {
            lang: 'ro',
            body: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '(see html)' }] }],
            },
            bodyHtml: this.descriptionHtml,
          });
        }
      } else {
        const created = await this.tezaur.create(payload);
        await this.router.navigate(['/tezaur', created.id, 'edit']);
        return;
      }
    } catch (err) {
      this.saveError.set(
        (err as { error?: { message?: string } })?.error?.message ?? 'Eroare la salvare.',
      );
    } finally {
      this.saving.set(false);
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
      const d = await this.tezaur.detail(this.detail()!.gear.slug);
      this.detail.set(d);
      input.value = '';
    } catch (err) {
      this.uploadError.set(
        (err as { error?: { message?: string } })?.error?.message ?? 'Upload eșuat.',
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
      const d = await this.tezaur.detail(this.detail()!.gear.slug);
      this.detail.set(d);
    } catch (err) {
      console.error('[tezaur-edit] deleteImage failed', err);
    }
  }

  async softDelete(): Promise<void> {
    if (!this.editingId()) return;
    if (!confirm('Soft-delete acest gear? Poți restaura ulterior din admin.')) return;
    try {
      await this.tezaur.softDelete(this.editingId()!);
      await this.router.navigateByUrl('/tezaur');
    } catch (err) {
      this.saveError.set(
        (err as { error?: { message?: string } })?.error?.message ?? 'Soft-delete eșuat.',
      );
    }
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
      // Edit page receives the gear `id` (uuid) in the URL; the detail
      // endpoint expects a slug. Resolve via list lookup first when the
      // param isn't an existing slug — for M2 the list returns the slug
      // already, so we fetch via list with q=id and fall back to slug
      // directly when the param looks like a slug.
      const isUuid = /^[0-9a-f]{8}-/.test(idOrSlug);
      let slug = idOrSlug;
      if (isUuid) {
        // Pull all (paged) and find by id — admin list isn't huge. A
        // dedicated /api/admin/tezaur/gear/:id endpoint would be cleaner,
        // but defers to M2.5.
        const all = await this.tezaur.list({ pageSize: 200 });
        const match = all.items.find((it) => it.id === idOrSlug);
        if (!match) {
          this.loadError.set(`Gear ${idOrSlug} nu a fost găsit.`);
          return;
        }
        slug = match.slug;
      }
      const d = await this.tezaur.detail(slug);
      this.detail.set(d);
      this.editingId.set(d.gear.id);
      this.form.set({
        brand: d.gear.brand,
        model: d.gear.model,
        slug: d.gear.slug,
        category: d.gear.category as GearCategoryLiteral,
        formFactor: d.gear.formFactor as FormFactorLiteral | null,
        familyId: d.gear.familyId,
        yearReleased: d.gear.yearReleased,
        yearDiscontinued: d.gear.yearDiscontinued,
        msrpAtLaunchEur: d.gear.msrpAtLaunchEur ? Number(d.gear.msrpAtLaunchEur) : null,
        latestFirmwareVersion: d.gear.latestFirmwareVersion,
        published: d.gear.published,
        officialThreadOn: !!d.gear.canonicalThreadId,
      });
      this.specsText = JSON.stringify(d.gear.specs, null, 2);
      this.descriptionHtml = d.description?.bodyHtml ?? '';
    } catch (err) {
      console.error('[tezaur-edit] detail fetch failed', err);
      this.loadError.set('Eroare la încărcare. Verifică dacă gear-ul există.');
    }
  }
}
