import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { TPipe } from '../i18n/t.pipe';
import { ForumCategory, ForumService } from './forum.service';

/**
 * Forum landing — V05 .fm-* layout (M13-F).
 *
 * Sections (V05 Forum.html):
 *   .fm-header (big title + lede) →
 *   .fm-actions (search CTA + tabs row) →
 *   .fm-body { .fm-cats (categories list with num + body + count) +
 *              .fm-trending (sticky right rail with trending threads) }
 */
@Component({
  selector: 'app-forum-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HEADER (V05: .fm-header) -->
      <section class="fm-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="fm-header__sub">{{ 'forum.page_eyebrow' | t }}</p>
          <h1>{{ 'forum.page_title' | t }}<span class="dot">.</span></h1>
        </div>
        <p class="fm-header__lede">{{ 'forum.page_lede' | t }}</p>
      </section>

      <!-- ACTIONS row -->
      <div class="fm-actions">
        <div class="fm-actions__tabs">
          <a class="is-active" routerLink="/forum">{{ 'forum.tab_all' | t }}</a>
          <a routerLink="/forum/cautare">🔍 {{ 'forum.search.go' | t }}</a>
        </div>
      </div>

      @if (loading()) {
        <p class="fm-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fm-empty">{{ 'forum.load_error' | t }}</p>
      } @else {
        <!-- BODY: categories list -->
        <div class="fm-cats">
          @for (c of allCats(); track c.id; let i = $index) {
            <a class="fm-cat" [routerLink]="['/forum', c.slug]">
              <span class="fm-cat__num">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <div class="fm-cat__body">
                <h3 class="fm-cat__title">{{ c.name }}</h3>
                @if (c.description) {
                  <p class="fm-cat__desc">{{ c.description }}</p>
                }
                @if (c.kind === 'system') {
                  <div class="fm-cat__subs">
                    <span class="fm-cat__sub-chip">
                      {{ (c.key === 'anunturi' ? 'forum.badge_admin' : 'forum.badge_auto') | t }}
                    </span>
                  </div>
                }
              </div>
              <div class="fm-cat__activity">
                <span>{{ c.kind === 'user' ? ('forum.kind_user' | t) : ('forum.kind_system' | t) }}</span>
              </div>
              <div class="fm-cat__count">
                <span class="v">→</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      /* All .fm-* structural classes are provided globally by v05.css
         (forum section in main stylesheet, lines 2221+). Page-local
         below covers only the empty state. */
      .fm-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }
    `,
  ],
})
export class ForumListPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly seo = inject(SeoService);

  readonly categories = signal<ForumCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  /** All categories ordered user-first, then system. */
  readonly allCats = computed(() => {
    const cats = this.categories();
    const user = cats.filter((c) => c.kind === 'user');
    const system = cats.filter((c) => c.kind === 'system');
    return [...user, ...system];
  });

  constructor() {
    this.seo.set({
      title: 'Forum — discuții despre producția muzicală',
      description:
        'Comunitatea producătorilor de muzică din România: gear, producție, live, business. Discuții pe categorii, fără spam, fără marketing.',
      canonicalPath: '/forum',
    });
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const cats = await this.forum.listCategories();
      this.categories.set(cats);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
