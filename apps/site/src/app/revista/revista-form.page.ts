import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
  SzButtonComponent,
  SzEditorComponent,
  SzIconComponent,
  type SzEditorChange,
  type SzEditorImageUploader,
} from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  ARTICLE_CATEGORIES,
  RevistaService,
  type ArticleCategoryLiteral,
  type ArticleDetail,
  type CreateArticlePayload,
} from './revista.service';

interface GearSearchHit {
  id: string;
  slug: string;
  brand: string;
  model: string;
}

@Component({
  selector: 'app-revista-form-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    SzIconComponent,
    SzButtonComponent,
    SzEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <nav class="rf-crumb">
        <a routerLink="/revista">
          <sz-icon name="back" [size]="14" />
          {{ 'revista.back_to_list' | t }}
        </a>
        <span class="sep">·</span>
        <span class="cur">
          {{
            (isEdit() ? 'revista.form.title_edit' : 'revista.form.title_new')
              | t
          }}
        </span>
      </nav>

      <header class="rf-header">
        <h1>
          {{
            (isEdit() ? 'revista.form.title_edit' : 'revista.form.title_new')
              | t
          }}
        </h1>
        @if (existingId() && status() !== 'draft') {
          <span class="rf-status is-{{ status() }}">
            {{ 'revista.form.status_' + status() | t }}
          </span>
        }
      </header>

      @if (loadError()) {
        <p class="rf-error">{{ loadError() }}</p>
      }

      <form class="rf-form" (submit)="$event.preventDefault()">
        <!-- ===== Title + excerpt + category ===== -->
        <section class="rf-sec">
          <h2 class="rf-sec__title">// {{ 'revista.form.meta_section' | t }}</h2>
          <label class="rf-input">
            <span>{{ 'revista.form.title_label' | t }} *</span>
            <input
              type="text"
              [(ngModel)]="form.title"
              name="title"
              required
              minlength="3"
              maxlength="200"
              [placeholder]="i18n.t('revista.form.title_placeholder')"
            />
          </label>
          <label class="rf-input">
            <span>{{ 'revista.form.excerpt_label' | t }}</span>
            <textarea
              [(ngModel)]="form.excerpt"
              name="excerpt"
              maxlength="280"
              rows="2"
              [placeholder]="i18n.t('revista.form.excerpt_placeholder')"
            ></textarea>
            <span class="rf-input__hint">
              {{ 'revista.form.excerpt_hint' | t }}
            </span>
          </label>
          <div class="rf-row">
            <label class="rf-input">
              <span>{{ 'revista.form.category_label' | t }} *</span>
              <select [(ngModel)]="form.category" name="category">
                @for (c of categories; track c) {
                  <option [value]="c">{{ 'revista.cat.' + c | t }}</option>
                }
              </select>
            </label>
            <label class="rf-input">
              <span>{{ 'revista.form.tags_label' | t }}</span>
              <input
                type="text"
                [ngModel]="tagsInput()"
                name="tags"
                (input)="setTagsFromInput($any($event.target).value)"
                [placeholder]="i18n.t('revista.form.tags_placeholder')"
              />
              <span class="rf-input__hint">
                {{ 'revista.form.tags_hint' | t }}
              </span>
            </label>
          </div>
        </section>

        <!-- ===== Hero image manager ===== -->
        @if (existingId()) {
          <section class="rf-sec">
            <h2 class="rf-sec__title">// {{ 'revista.form.hero_section' | t }}</h2>
            @if (heroPath()) {
              <figure class="rf-hero">
                <img [src]="revista.imageUrl(heroPath()!)" alt="hero" />
                <button
                  type="button"
                  class="rf-hero__remove"
                  (click)="removeHero()"
                >
                  {{ 'revista.form.hero_remove' | t }}
                </button>
              </figure>
            } @else {
              <label class="rf-hero rf-hero--add">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  (change)="onHeroPicked($any($event.target))"
                />
                <span>+ {{ 'revista.form.hero_upload' | t }}</span>
              </label>
            }
          </section>
        } @else {
          <section class="rf-sec rf-sec--muted">
            <p>{{ 'revista.form.hero_after_save' | t }}</p>
          </section>
        }

        <!-- ===== Body ===== -->
        <section class="rf-sec">
          <h2 class="rf-sec__title">// {{ 'revista.form.body_section' | t }}</h2>
          <sz-editor
            [value]="form.body"
            [richMode]="true"
            [imageUploader]="imageUploader"
            [placeholder]="i18n.t('revista.form.body_placeholder')"
            [maxLength]="200000"
            (valueChange)="onBodyChange($event)"
          />
          <p class="rf-input__hint">
            {{ 'revista.form.body_hint' | t }}
          </p>
        </section>

        <!-- ===== Gear sidebar links ===== -->
        <section class="rf-sec">
          <h2 class="rf-sec__title">// {{ 'revista.form.gear_section' | t }}</h2>
          <p class="rf-sec__hint">{{ 'revista.form.gear_hint' | t }}</p>
          <label class="rf-input">
            <span>{{ 'revista.form.gear_search_label' | t }}</span>
            <input
              type="text"
              [(ngModel)]="gearSearch"
              name="gearSearch"
              (input)="onGearSearch()"
              [placeholder]="i18n.t('revista.form.gear_search_placeholder')"
              autocomplete="off"
            />
          </label>
          @if (gearHits().length > 0) {
            <ul class="rf-gear-hits">
              @for (hit of gearHits(); track hit.id) {
                <li>
                  <button type="button" (click)="addGear(hit)">
                    <strong>{{ hit.brand }}</strong> <span>{{ hit.model }}</span>
                  </button>
                </li>
              }
            </ul>
          }
          @if (linkedGear().length > 0) {
            <div class="rf-gear-chips">
              @for (g of linkedGear(); track g.id) {
                <span class="rf-gear-chip">
                  {{ g.brand }} {{ g.model }}
                  <button type="button" (click)="removeGear(g.id)">×</button>
                </span>
              }
            </div>
          }
        </section>

        <!-- ===== Footer actions ===== -->
        @if (submitError()) {
          <p class="rf-error">{{ submitError() }}</p>
        }
        <footer class="rf-footer">
          <a class="rf-cancel" routerLink="/revista">{{ 'revista.form.cancel' | t }}</a>

          @if (existingId()) {
            @if (status() === 'published') {
              <button
                type="button"
                class="rf-secondary"
                [disabled]="pending()"
                (click)="unpublish()"
              >
                {{ 'revista.form.unpublish' | t }}
              </button>
            }
            @if (status() !== 'archived') {
              <button
                type="button"
                class="rf-danger"
                [disabled]="pending()"
                (click)="archive()"
              >
                {{ 'revista.form.archive' | t }}
              </button>
            }
          }

          <button
            sz-button
            type="button"
            variant="ghost"
            [disabled]="!canSave() || pending()"
            (click)="saveDraft()"
          >
            {{
              (pending()
                ? 'revista.form.saving'
                : 'revista.form.save_draft') | t
            }}
          </button>

          @if (status() !== 'published') {
            <button
              sz-button
              type="button"
              [disabled]="!canSave() || pending()"
              (click)="publish()"
            >
              {{
                (pending()
                  ? 'revista.form.publishing'
                  : 'revista.form.publish') | t
              }}
            </button>
          }
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .rf-crumb {
        display: flex;
        gap: 8px;
        padding: 16px 0;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .rf-crumb a {
        color: var(--accent);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .rf-crumb .sep { color: var(--fg-subtle); }

      .rf-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
        flex-wrap: wrap;
        padding-bottom: 18px;
        margin-bottom: 22px;
        border-bottom: 1px dashed var(--line);
      }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 40px);
        line-height: 1.1;
        margin: 0;
      }
      .rf-status {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        padding: 4px 10px;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
      }
      .rf-status.is-published { color: var(--accent); border-color: var(--accent); }
      .rf-status.is-archived { color: #c0392b; border-color: #c0392b; }

      .rf-form { display: flex; flex-direction: column; gap: 24px; padding-bottom: 80px; }

      .rf-sec {
        padding: 18px 20px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .rf-sec--muted { background: transparent; color: var(--fg-muted); font-family: var(--font-mono); font-size: 12px; }
      .rf-sec__title {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg);
        margin: 0;
      }
      .rf-sec__hint { color: var(--fg-muted); font-size: 13px; margin: -4px 0 0; }

      .rf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 720px) { .rf-row { grid-template-columns: 1fr; } }

      .rf-input { display: flex; flex-direction: column; gap: 6px; }
      .rf-input span,
      .rf-input__label {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .rf-input input,
      .rf-input select,
      .rf-input textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
      }
      .rf-input textarea { resize: vertical; min-height: 60px; }
      .rf-input :is(input, select, textarea):focus {
        outline: 1px solid var(--accent);
        border-color: var(--accent);
      }
      .rf-input__hint {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        color: var(--fg-subtle);
        text-transform: none;
      }

      .rf-hero {
        position: relative;
        margin: 0;
        background: var(--bg);
        border: 1px solid var(--line);
        overflow: hidden;
        max-height: 480px;
      }
      .rf-hero img { width: 100%; height: auto; display: block; }
      .rf-hero__remove {
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 6px 10px;
        background: color-mix(in oklab, var(--bg) 90%, transparent);
        border: 1px solid #c0392b;
        color: #c0392b;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .rf-hero--add {
        display: grid;
        place-items: center;
        padding: 60px;
        border-style: dashed;
        cursor: pointer;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .rf-hero--add:hover { border-color: var(--accent); color: var(--accent); }
      .rf-hero--add input { display: none; }

      .rf-gear-hits {
        list-style: none;
        margin: 0;
        padding: 0;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        max-height: 220px;
        overflow-y: auto;
      }
      .rf-gear-hits li + li { border-top: 1px solid var(--line); }
      .rf-gear-hits button {
        background: none;
        border: 0;
        text-align: left;
        width: 100%;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
        color: var(--fg);
      }
      .rf-gear-hits button:hover { background: var(--bg-elev); }
      .rf-gear-hits strong {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--accent);
        margin-right: 8px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .rf-gear-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .rf-gear-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
      }
      .rf-gear-chip button {
        background: none;
        border: 0;
        color: var(--fg-muted);
        cursor: pointer;
        font-size: 14px;
      }
      .rf-gear-chip button:hover { color: var(--accent); }

      .rf-footer {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: flex-end;
        padding: 14px 0;
        border-top: 1px dashed var(--line);
        flex-wrap: wrap;
      }
      .rf-cancel {
        margin-right: auto;
        color: var(--fg-muted);
        text-decoration: none;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .rf-cancel:hover { color: var(--fg); }
      .rf-secondary,
      .rf-danger {
        padding: 12px 16px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .rf-danger { color: #c0392b; border-color: #c0392b; }
      .rf-danger:hover { background: #c0392b; color: var(--bg); }
      .rf-danger:disabled,
      .rf-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

      .rf-error {
        margin: 0;
        padding: 10px 14px;
        background: color-mix(in oklab, #c0392b 12%, var(--bg));
        border: 1px solid #c0392b;
        color: #c0392b;
        font-family: var(--font-mono);
        font-size: 12px;
      }
    `,
  ],
})
export class RevistaFormPage {
  readonly i18n = inject(I18nService);
  readonly revista = inject(RevistaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly categories = ARTICLE_CATEGORIES;

  readonly existingId = signal<string | null>(null);
  readonly existingSlug = signal<string | null>(null);
  readonly status = signal<'draft' | 'published' | 'archived'>('draft');
  readonly heroPath = signal<string | null>(null);
  readonly linkedGear = signal<
    { id: string; brand: string; model: string }[]
  >([]);

  form: {
    title: string;
    excerpt: string;
    category: ArticleCategoryLiteral;
    body: Record<string, unknown>;
    bodyHtml: string;
    tags: string[];
    heroSourceId: string | null;
  } = freshForm();

  readonly tagsInput = signal('');

  readonly pending = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly isEdit = computed(() => this.existingId() !== null);
  readonly canSave = computed(
    () => this.form.title.trim().length >= 3 && !!this.form.category,
  );

  gearSearch = '';
  readonly gearHits = signal<GearSearchHit[]>([]);
  private gearDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly imageUploader: SzEditorImageUploader = async (file) => {
    if (!this.existingId()) {
      throw new Error('Articolul trebuie salvat înainte de a încărca imagini.');
    }
    const res = await this.revista.uploadImage(this.existingId()!, file);
    return this.revista.imageUrl(res.path);
  };

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug');
      if (slug) {
        void this.loadBySlug(slug);
      }
    });
  }

  private async loadBySlug(slug: string): Promise<void> {
    this.loadError.set(null);
    try {
      const detail = await this.revista.loadOwnBySlug(slug);
      this.fillFromDetail(detail);
    } catch (err) {
      console.error('[revista] form load failed', err);
      this.loadError.set(this.i18n.t('revista.form.load_error'));
    }
  }

  private fillFromDetail(d: ArticleDetail): void {
    this.existingId.set(d.article.id);
    this.existingSlug.set(d.article.slug);
    this.status.set(d.article.status);
    this.heroPath.set(d.heroImage?.path ?? null);
    this.form = {
      title: d.article.title,
      excerpt: d.article.excerpt ?? '',
      category: d.article.category,
      body: d.article.body,
      bodyHtml: d.article.bodyHtml,
      tags: d.article.tags,
      heroSourceId: d.article.heroSourceId,
    };
    this.tagsInput.set(d.article.tags.join(', '));
    this.linkedGear.set(
      d.gear.map((g) => ({ id: g.id, brand: g.brand, model: g.model })),
    );
  }

  setTagsFromInput(value: string): void {
    this.tagsInput.set(value);
    this.form.tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 40)
      .slice(0, 20);
  }

  onBodyChange(change: SzEditorChange): void {
    this.form.body = change.json as Record<string, unknown>;
    this.form.bodyHtml = change.html;
  }

  onGearSearch(): void {
    if (this.gearDebounce) clearTimeout(this.gearDebounce);
    this.gearDebounce = setTimeout(() => this.runGearSearch(), 250);
  }

  private async runGearSearch(): Promise<void> {
    const q = this.gearSearch.trim();
    if (q.length < 2) {
      this.gearHits.set([]);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{
          items: { id: string; slug: string; brand: string; model: string }[];
        }>(`${environment.apiBaseUrl}/tezaur`, {
          params: { q, pageSize: 10 },
        }),
      );
      this.gearHits.set(res.items);
    } catch (err) {
      console.warn('[revista] gear search failed', err);
      this.gearHits.set([]);
    }
  }

  addGear(hit: GearSearchHit): void {
    if (this.linkedGear().some((g) => g.id === hit.id)) return;
    this.linkedGear.update((rows) => [
      ...rows,
      { id: hit.id, brand: hit.brand, model: hit.model },
    ]);
    this.gearHits.set([]);
    this.gearSearch = '';
  }

  removeGear(id: string): void {
    this.linkedGear.update((rows) => rows.filter((g) => g.id !== id));
  }

  async onHeroPicked(input: HTMLInputElement): Promise<void> {
    if (!this.existingId() || !input.files?.[0]) return;
    const file = input.files[0];
    input.value = '';
    this.submitError.set(null);
    try {
      const res = await this.revista.uploadImage(this.existingId()!, file);
      this.form.heroSourceId = res.sourceId;
      this.heroPath.set(res.path);
      await this.revista.update(this.existingId()!, {
        heroSourceId: res.sourceId,
      });
    } catch (err) {
      console.error('[revista] hero upload failed', err);
      this.submitError.set(this.i18n.t('revista.form.hero_error'));
    }
  }

  async removeHero(): Promise<void> {
    if (!this.existingId() || !this.form.heroSourceId) return;
    try {
      await this.revista.deleteImage(
        this.existingId()!,
        this.form.heroSourceId,
      );
      this.form.heroSourceId = null;
      this.heroPath.set(null);
    } catch (err) {
      console.error('[revista] hero remove failed', err);
      this.submitError.set(this.i18n.t('revista.form.hero_error'));
    }
  }

  private buildPayload(): CreateArticlePayload {
    return {
      title: this.form.title.trim(),
      excerpt: this.form.excerpt.trim() || undefined,
      category: this.form.category,
      body: this.form.body,
      bodyHtml: this.form.bodyHtml,
      tags: this.form.tags,
      gearIds: this.linkedGear().map((g) => g.id),
      heroSourceId: this.form.heroSourceId ?? undefined,
    };
  }

  async saveDraft(): Promise<void> {
    if (!this.canSave() || this.pending()) return;
    this.pending.set(true);
    this.submitError.set(null);
    try {
      const payload = this.buildPayload();
      if (this.existingId()) {
        const res = await this.revista.update(this.existingId()!, payload);
        this.existingSlug.set(res.slug);
      } else {
        const res = await this.revista.create(payload);
        this.existingId.set(res.id);
        this.existingSlug.set(res.slug);
        // Switch URL to edit mode so /editare appears in the address bar
        void this.router.navigate(['/revista', res.slug, 'editare'], {
          replaceUrl: true,
        });
      }
    } catch (err) {
      console.error('[revista] save failed', err);
      this.submitError.set(this.i18n.t('revista.form.save_error'));
    } finally {
      this.pending.set(false);
    }
  }

  async publish(): Promise<void> {
    if (!this.canSave() || this.pending()) return;
    // Save latest state first, then flip to published.
    this.pending.set(true);
    this.submitError.set(null);
    try {
      const payload = this.buildPayload();
      let id = this.existingId();
      let slug = this.existingSlug();
      if (!id) {
        const created = await this.revista.create(payload);
        id = created.id;
        slug = created.slug;
        this.existingId.set(id);
        this.existingSlug.set(slug);
      } else {
        await this.revista.update(id, payload);
      }
      const res = await this.revista.publish(id);
      this.status.set('published');
      this.existingSlug.set(res.slug);
      void this.router.navigate(['/revista', res.slug]);
    } catch (err) {
      console.error('[revista] publish failed', err);
      this.submitError.set(this.i18n.t('revista.form.publish_error'));
    } finally {
      this.pending.set(false);
    }
  }

  async unpublish(): Promise<void> {
    if (!this.existingId()) return;
    this.pending.set(true);
    try {
      await this.revista.unpublish(this.existingId()!);
      this.status.set('draft');
    } catch (err) {
      console.error('[revista] unpublish failed', err);
      this.submitError.set(this.i18n.t('revista.form.unpublish_error'));
    } finally {
      this.pending.set(false);
    }
  }

  async archive(): Promise<void> {
    if (!this.existingId()) return;
    const ok = window.confirm(this.i18n.t('revista.form.archive_confirm'));
    if (!ok) return;
    this.pending.set(true);
    try {
      await this.revista.archive(this.existingId()!);
      void this.router.navigate(['/revista']);
    } catch (err) {
      console.error('[revista] archive failed', err);
      this.submitError.set(this.i18n.t('revista.form.archive_error'));
    } finally {
      this.pending.set(false);
    }
  }
}

function freshForm(): RevistaFormPage['form'] {
  return {
    title: '',
    excerpt: '',
    category: 'reviews',
    body: {},
    bodyHtml: '',
    tags: [],
    heroSourceId: null,
  };
}
