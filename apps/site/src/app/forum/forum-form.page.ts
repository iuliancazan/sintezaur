import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SzEditorChange,
  SzEditorComponent,
  type SzEditorMentionItem,
} from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  ForumCategory,
  ForumService,
  GearPickItem,
} from './forum.service';

interface FormState {
  title: string;
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  tagsInput: string;
  gearTags: GearPickItem[];
}

const MIN_TITLE = 4;
const MAX_TITLE = 200;
const MIN_BODY_TEXT = 4;
const MAX_TAGS = 6;
const MAX_GEAR_TAGS = 5;
const TAG_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;

@Component({
  selector: 'app-forum-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <nav class="td-crumb" aria-label="Breadcrumb">
        <a routerLink="/forum" class="td-crumb__back">
          <svg width="14" height="14" aria-hidden="true"><use href="#i-back"/></svg>
          {{ 'forum.crumb_root' | t }}
        </a>
        <span class="sep">/</span>
        <a [routerLink]="['/forum', categorySlug()]">
          {{ category()?.name ?? '...' }}
        </a>
        <span class="sep">/</span>
        <span class="cur">{{ 'forum.compose.new_thread' | t }}</span>
      </nav>

      @if (loadError()) {
        <p class="fn-empty">{{ 'forum.load_error' | t }}</p>
      } @else if (category(); as c) {
        <div class="fn-shell">

          <!-- LEFT: form -->
          <form class="fn-form crosses" (submit)="$event.preventDefault(); submit()">
            <span class="crosses-tl"></span><span class="crosses-tr"></span>

            <header class="fn-form__head">
              <p class="fn-form__kicker">
                {{ 'forum.compose.kicker_in' | t }}
                <span class="acc">{{ c.name }}</span>
              </p>
              <h1 class="fn-form__title">{{ 'forum.compose.new_thread' | t }}</h1>
            </header>

            <div class="fn-form__body">

              <!-- TITLE -->
              <div class="fn-field">
                <label class="fn-field__label" for="ft-title">
                  {{ 'forum.compose.title_label' | t }}
                  <span class="req">*</span>
                  — {{ 'forum.compose.title_hint_short' | t }}
                </label>
                <input
                  id="ft-title"
                  class="fn-input-title"
                  type="text"
                  [(ngModel)]="state.title"
                  name="title"
                  [maxlength]="MAX_TITLE"
                  [placeholder]="i18n.t('forum.compose.title_placeholder')"
                  required
                />
                <div class="fn-input-title-meta">
                  <span>{{ 'forum.compose.title_hint' | t }}</span>
                  <span>
                    <b>{{ state.title.length }}</b>
                    / {{ MAX_TITLE }} {{ 'forum.compose.chars' | t }}
                  </span>
                </div>
              </div>

              <!-- BODY EDITOR -->
              <div class="fn-field">
                <label class="fn-field__label">
                  {{ 'forum.compose.body_label' | t }}
                  <span class="req">*</span>
                  — {{ 'forum.compose.body_hint_short' | t }}
                </label>
                <sz-editor
                  [value]="initialBody"
                  [richMode]="true"
                  [maxLength]="4000"
                  [mentionSuggest]="mentionSuggest"
                  [placeholder]="i18n.t('forum.compose.body_placeholder')"
                  (valueChange)="onBodyChange($event)"
                />
                <p class="fn-field__hint">{{ 'forum.compose.body_hint' | t }}</p>
              </div>

              <!-- GEAR TAG PICKER -->
              <div class="fn-field">
                <label class="fn-field__label">
                  {{ 'forum.compose.gear_label' | t }}
                </label>
                <p class="fn-field__hint">{{ 'forum.compose.gear_hint' | t }}</p>

                <div class="fn-tag-input">
                  @for (g of state.gearTags; track g.id) {
                    <span class="fr-gear-chip">
                      <span class="fr-gear-chip__photo"></span>
                      {{ g.brand }} {{ g.model }}
                      <button
                        type="button"
                        class="fn-tag-input__rm"
                        (click)="removeGearTag(g.id)"
                        aria-label="Elimină"
                      >✕</button>
                    </span>
                  }
                  <input
                    type="search"
                    [ngModel]="gearQuery()"
                    (ngModelChange)="onGearQuery($event)"
                    [placeholder]="i18n.t('forum.compose.gear_placeholder')"
                    [disabled]="state.gearTags.length >= MAX_GEAR_TAGS"
                    name="gearSearch"
                  />
                </div>

                @if (gearResults().length > 0) {
                  <div class="fn-autocomp">
                    <div class="fn-autocomp__hd">
                      {{ 'forum.compose.gear_results' | t: { n: gearResults().length, q: gearQuery() } }}
                    </div>
                    @for (g of gearResults(); track g.id; let i = $index) {
                      <button
                        type="button"
                        class="fn-autocomp__item"
                        [class.is-hl]="i === 0"
                        (click)="addGearTag(g)"
                      >
                        <span class="mini"></span>
                        <span class="nm">
                          <span class="b">{{ g.brand }} {{ g.model }}</span>
                          <span class="m">{{ g.category }}</span>
                        </span>
                        <span class="key">+</span>
                      </button>
                    }
                  </div>
                }
                <span class="fn-field__hint">
                  {{ state.gearTags.length }} / {{ MAX_GEAR_TAGS }}
                </span>
              </div>

              <!-- FREE TAGS -->
              <div class="fn-field">
                <label class="fn-field__label">
                  {{ 'forum.compose.tags_label_v08' | t }}
                </label>
                <div class="fn-tag-input">
                  @for (t of parsedTags(); track t) {
                    <span class="fr-tag">{{ t }}</span>
                  }
                  <input
                    type="text"
                    [ngModel]="state.tagsInput"
                    (ngModelChange)="onTagsInput($event)"
                    name="tags"
                    [placeholder]="i18n.t('forum.compose.tags_placeholder')"
                  />
                </div>
                <span class="fn-field__hint">
                  {{ 'forum.compose.tags_hint' | t: { max: MAX_TAGS } }}
                </span>
              </div>

              <!-- honeypot -->
              <div class="fn-honeypot" aria-hidden="true">
                <label>
                  Nu completa
                  <input
                    type="text"
                    name="hp"
                    [(ngModel)]="state.hp"
                    tabindex="-1"
                    autocomplete="off"
                  />
                </label>
              </div>

              @if (error()) {
                <p class="fn-error">{{ error() }}</p>
              }
            </div>

            <!-- ACTIONS -->
            <div class="fn-actions">
              <a class="ghost" [routerLink]="['/forum', c.slug]">
                {{ 'forum.compose.cancel' | t }}
              </a>
              <button
                type="submit"
                class="pri"
                [disabled]="!canSubmit() || submitting()"
              >
                @if (submitting()) {
                  {{ 'forum.compose.submitting' | t }}
                } @else {
                  {{ 'forum.compose.publish' | t }}
                }
              </button>
            </div>
          </form>

          <!-- RIGHT: sidebar -->
          <aside class="fn-side">

            <div class="fn-side__block">
              <header class="fn-side__head">
                {{ 'forum.compose.tips_title' | t }}
              </header>
              <div class="fn-side__body">
                <ul class="fn-side__list">
                  <li>
                    <span class="n">01</span>
                    <span [innerHTML]="i18n.t('forum.compose.tip_1')"></span>
                  </li>
                  <li>
                    <span class="n">02</span>
                    <span [innerHTML]="i18n.t('forum.compose.tip_2')"></span>
                  </li>
                  <li>
                    <span class="n">03</span>
                    <span [innerHTML]="i18n.t('forum.compose.tip_3')"></span>
                  </li>
                  <li>
                    <span class="n">04</span>
                    <span [innerHTML]="i18n.t('forum.compose.tip_4')"></span>
                  </li>
                  <li>
                    <span class="n">05</span>
                    <span [innerHTML]="i18n.t('forum.compose.tip_5')"></span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="fn-side__block">
              <header class="fn-side__head">
                {{ 'forum.compose.rules_title' | t }}
              </header>
              <div class="fn-side__body fn-rules">
                <p>· {{ 'forum.compose.rule_1' | t }}</p>
                <p>· {{ 'forum.compose.rule_2' | t }}</p>
                <p>· {{ 'forum.compose.rule_3' | t }}</p>
                <p>· {{ 'forum.compose.rule_4' | t }}</p>
              </div>
            </div>
          </aside>
        </div>
      } @else {
        <p class="fn-empty">{{ 'app.loading' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      /* Most layout is global (v05-forum.css .fn-shell / .fn-form /
         .fn-field / .fn-input-title / .fn-tag-input / .fn-autocomp /
         .fn-actions / .fn-side). Page-local rules below cover the
         honeypot, error box, and a couple of tweaks not in V08. */

      .fn-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }
      .fn-honeypot {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .fn-error {
        font-family: var(--font-mono);
        font-size: 12px;
        color: #e8665b;
        padding: 10px 14px;
        background: color-mix(in oklab, #e8665b 14%, var(--bg-elev));
        border-left: 3px solid #e8665b;
        margin: 0;
      }
      .fn-rules p {
        font-family: var(--font-mono);
        font-size: 11px;
        line-height: 1.7;
        letter-spacing: 0.04em;
        color: var(--fg-muted);
        margin: 0 0 8px;
      }
      .fn-rules p:last-child { margin: 0; }
      .fn-tag-input__rm {
        background: none;
        border: none;
        color: inherit;
        margin-left: 6px;
        cursor: pointer;
        padding: 0;
        font-size: 12px;
        opacity: 0.6;
      }
      .fn-tag-input__rm:hover { opacity: 1; }

      .req { color: #e8665b; }
    `,
  ],
})
export class ForumFormPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly MAX_TITLE = MAX_TITLE;
  readonly MAX_TAGS = MAX_TAGS;
  readonly MAX_GEAR_TAGS = MAX_GEAR_TAGS;
  readonly initialBody = '';

  readonly category = signal<ForumCategory | null>(null);
  readonly categorySlug = signal<string>('');
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly gearQuery = signal('');
  readonly gearResults = signal<GearPickItem[]>([]);
  readonly parsedTags = signal<string[]>([]);
  private readonly formStartedAt = Date.now();
  private gearSearchTimer: ReturnType<typeof setTimeout> | null = null;

  state: FormState & { hp: string } = {
    title: '',
    bodyJson: {},
    bodyHtml: '',
    bodyText: '',
    tagsInput: '',
    gearTags: [],
    hp: '',
  };

  readonly mentionSuggest = async (
    q: string,
  ): Promise<SzEditorMentionItem[]> => {
    try {
      return await this.forum.searchMentions(q);
    } catch {
      return [];
    }
  };

  constructor() {
    this.route.paramMap.subscribe((p) => {
      this.categorySlug.set(p.get('category') ?? '');
      void this.loadCategory();
    });
  }

  onBodyChange(change: SzEditorChange): void {
    this.state = {
      ...this.state,
      bodyJson: change.json as Record<string, unknown>,
      bodyHtml: change.html,
      bodyText: change.text,
    };
  }

  onTagsInput(value: string): void {
    this.state = { ...this.state, tagsInput: value };
    const tags: string[] = [];
    const seen = new Set<string>();
    for (const raw of value.split(/[,\s]+/)) {
      const t = raw.trim().toLowerCase().replace(/^#/, '');
      if (!t || !TAG_RE.test(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      tags.push(t);
      if (tags.length >= MAX_TAGS) break;
    }
    this.parsedTags.set(tags);
  }

  onGearQuery(value: string): void {
    this.gearQuery.set(value);
    if (this.gearSearchTimer) clearTimeout(this.gearSearchTimer);
    if (value.trim().length < 2) {
      this.gearResults.set([]);
      return;
    }
    this.gearSearchTimer = setTimeout(async () => {
      try {
        const res = await this.forum.searchGear(value.trim());
        const selectedIds = new Set(this.state.gearTags.map((g) => g.id));
        this.gearResults.set(
          res.items.filter((g) => !selectedIds.has(g.id)).slice(0, 8),
        );
      } catch {
        this.gearResults.set([]);
      }
    }, 250);
  }

  addGearTag(g: GearPickItem): void {
    if (this.state.gearTags.length >= MAX_GEAR_TAGS) return;
    if (this.state.gearTags.some((x) => x.id === g.id)) return;
    this.state = { ...this.state, gearTags: [...this.state.gearTags, g] };
    this.gearResults.set([]);
    this.gearQuery.set('');
  }

  removeGearTag(id: string): void {
    this.state = {
      ...this.state,
      gearTags: this.state.gearTags.filter((g) => g.id !== id),
    };
  }

  canSubmit(): boolean {
    const titleOk =
      this.state.title.trim().length >= MIN_TITLE &&
      this.state.title.trim().length <= MAX_TITLE;
    const bodyOk = this.state.bodyText.trim().length >= MIN_BODY_TEXT;
    return titleOk && bodyOk && !!this.category();
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) return;
    const cat = this.category();
    if (!cat) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await this.forum.createThread({
        categoryId: cat.id,
        title: this.state.title.trim(),
        body: this.state.bodyJson,
        bodyHtml: this.state.bodyHtml,
        tags: this.parsedTags(),
        gearTag: this.state.gearTags.map((g) => g.id),
        hp: this.state.hp,
        formStartedAt: this.formStartedAt,
      });
      await this.router.navigate(['/forum', cat.slug, res.slug]);
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        this.i18n.t('forum.compose.submit_error');
      this.error.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadCategory(): Promise<void> {
    const slug = this.categorySlug();
    if (!slug) return;
    try {
      const cats = await this.forum.listCategories();
      const found = cats.find((c) => c.slug === slug);
      if (!found || found.kind === 'system') {
        this.loadError.set(true);
        return;
      }
      this.category.set(found);
    } catch {
      this.loadError.set(true);
    }
  }
}
