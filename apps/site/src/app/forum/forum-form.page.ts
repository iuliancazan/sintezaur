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
import { ForumCategory, ForumService } from './forum.service';

interface FormState {
  title: string;
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
}

const MIN_TITLE = 4;
const MAX_TITLE = 200;
const MIN_BODY_TEXT = 4;

@Component({
  selector: 'app-forum-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <nav class="ff-crumbs">
        <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
        <span class="sep">/</span>
        <a [routerLink]="['/forum', categorySlug()]">
          {{ category()?.name ?? '...' }}
        </a>
        <span class="sep">/</span>
        <span>{{ 'forum.compose.new_thread' | t }}</span>
      </nav>

      @if (loadError()) {
        <p class="ff-empty">{{ 'forum.load_error' | t }}</p>
      } @else if (category(); as c) {
        <header class="ff-header crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <p class="ff-header__sub">{{ c.name }}</p>
          <h1 class="ff-header__title">{{ 'forum.compose.new_thread' | t }}</h1>
          <p class="ff-header__lede">{{ 'forum.compose.new_thread_lede' | t }}</p>
        </header>

        <form class="ff-form" (submit)="$event.preventDefault(); submit()">
          <label class="ff-field">
            <span class="ff-label">{{ 'forum.compose.title_label' | t }}</span>
            <input
              type="text"
              [(ngModel)]="state.title"
              name="title"
              [maxlength]="MAX_TITLE"
              [placeholder]="i18n.t('forum.compose.title_placeholder')"
              required
            />
            <span class="ff-hint">
              {{ state.title.length }} / {{ MAX_TITLE }}
              · {{ 'forum.compose.title_hint' | t }}
            </span>
          </label>

          <div class="ff-field">
            <span class="ff-label">{{ 'forum.compose.body_label' | t }}</span>
            <sz-editor
              [value]="initialBody"
              [richMode]="true"
              [maxLength]="4000"
              [mentionSuggest]="mentionSuggest"
              [placeholder]="i18n.t('forum.compose.body_placeholder')"
              (valueChange)="onBodyChange($event)"
            />
            <span class="ff-hint">{{ 'forum.compose.body_hint' | t }}</span>
          </div>

          @if (error()) {
            <p class="ff-error">{{ error() }}</p>
          }

          <div class="ff-actions">
            <a class="ff-btn ff-btn--ghost" [routerLink]="['/forum', c.slug]">
              {{ 'forum.compose.cancel' | t }}
            </a>
            <button
              type="submit"
              class="ff-btn ff-btn--primary"
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
      } @else {
        <p class="ff-empty">{{ 'app.loading' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .ff-crumbs {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        padding: 16px 0 8px;
      }
      .ff-crumbs a { color: var(--fg-muted); text-decoration: none; }
      .ff-crumbs a:hover { color: var(--accent); }
      .ff-crumbs .sep { margin: 0 8px; color: var(--fg-subtle); }

      .ff-header {
        position: relative;
        padding: clamp(24px, 4vw, 40px) clamp(20px, 3vw, 32px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: 8px 0 20px;
      }
      .ff-header__sub {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--accent);
        margin: 0 0 10px;
      }
      .ff-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(32px, 4vw, 44px);
        line-height: 1;
        margin: 0 0 10px;
        letter-spacing: 0.005em;
      }
      .ff-header__lede {
        color: var(--fg-muted);
        font-size: 14px;
        max-width: 60ch;
        margin: 0;
      }

      .ff-form { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
      .ff-field { display: flex; flex-direction: column; gap: 8px; }
      .ff-label {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .ff-field input[type='text'] {
        font-family: var(--font-display);
        font-size: 20px;
        padding: 12px 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
      }
      .ff-field input[type='text']:focus { outline: none; border-color: var(--accent); }
      .ff-hint {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-subtle);
      }
      .ff-error {
        font-family: var(--font-mono);
        font-size: 12px;
        color: #e8665b;
        padding: 10px 14px;
        background: color-mix(in oklab, #e8665b 14%, var(--bg-elev));
        border-left: 3px solid #e8665b;
        margin: 0;
      }

      .ff-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .ff-btn {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 10px 18px;
        border: 1px solid var(--line-strong);
        cursor: pointer;
        text-decoration: none;
        background: transparent;
        color: var(--fg-muted);
      }
      .ff-btn:hover { color: var(--fg); border-color: var(--accent); }
      .ff-btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .ff-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .ff-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }

      .ff-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }
    `,
  ],
})
export class ForumFormPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly MAX_TITLE = MAX_TITLE;
  readonly initialBody = '';

  readonly category = signal<ForumCategory | null>(null);
  readonly categorySlug = signal<string>('');
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  state: FormState = {
    title: '',
    bodyJson: {},
    bodyHtml: '',
    bodyText: '',
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
