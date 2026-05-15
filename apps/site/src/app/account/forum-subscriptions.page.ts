import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CategorySubscriptionItem,
  ForumService,
  MySubscriptionsResponse,
  SubscriptionLevel,
  ThreadSubscriptionItem,
} from '../forum/forum.service';
import { SubscribeBellComponent } from '../forum/subscribe-bell.component';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

@Component({
  selector: 'app-forum-subscriptions-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, SubscribeBellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="fs-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <h1 class="fs-header__title">{{ 'forum.account.title' | t }}</h1>
        <p class="fs-header__lede">{{ 'forum.account.lede' | t }}</p>
      </header>

      @if (loading()) {
        <p class="fs-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fs-empty">{{ 'forum.load_error' | t }}</p>
      } @else if (data(); as d) {
        <section class="fs-section">
          <h2 class="fs-section__title">{{ 'forum.account.threads' | t }}</h2>
          @if (d.threads.length === 0) {
            <p class="fs-empty">{{ 'forum.account.no_threads' | t }}</p>
          } @else {
            <ul class="fs-list">
              @for (t of d.threads; track t.threadId) {
                <li>
                  <a
                    class="fs-row__name"
                    [routerLink]="['/forum', t.categorySlug, t.threadSlug]"
                  >
                    {{ t.threadTitle }}
                    <span class="fs-row__cat">{{ t.categoryName }}</span>
                  </a>
                  <app-forum-subscribe-bell
                    [level]="t.level"
                    [busy]="busy().has(t.threadId)"
                    (levelChange)="onThreadChange(t, $event)"
                  />
                </li>
              }
            </ul>
          }
        </section>

        <section class="fs-section">
          <h2 class="fs-section__title">{{ 'forum.account.categories' | t }}</h2>
          @if (d.categories.length === 0) {
            <p class="fs-empty">{{ 'forum.account.no_categories' | t }}</p>
          } @else {
            <ul class="fs-list">
              @for (c of d.categories; track c.categoryId) {
                <li>
                  <a class="fs-row__name" [routerLink]="['/forum', c.categorySlug]">
                    {{ c.categoryName }}
                  </a>
                  <app-forum-subscribe-bell
                    [level]="c.level"
                    [busy]="busy().has(c.categoryId)"
                    (levelChange)="onCategoryChange(c, $event)"
                  />
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .fs-header {
        position: relative;
        padding: clamp(28px, 4vw, 48px) clamp(20px, 3vw, 32px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: var(--gutter-y) 0 24px;
      }
      .fs-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(32px, 4vw, 48px);
        line-height: 1;
        margin: 0 0 10px;
        text-transform: uppercase;
      }
      .fs-header__lede {
        color: var(--fg-muted);
        font-size: 14px;
        max-width: 60ch;
        margin: 0;
      }

      .fs-section { margin: 0 0 32px; }
      .fs-section__title {
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 12px;
      }
      .fs-section__title::before {
        content: '// ';
        color: var(--accent);
      }

      .fs-list {
        list-style: none;
        margin: 0;
        padding: 0;
        border: var(--grid-line) solid var(--line);
      }
      .fs-list li + li { border-top: var(--grid-line) solid var(--line); }
      .fs-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: var(--bg-elev);
        flex-wrap: wrap;
      }
      .fs-row__name {
        color: var(--fg);
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 15px;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 200px;
      }
      .fs-row__name:hover { color: var(--accent); }
      .fs-row__cat {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        font-weight: 400;
      }

      .fs-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 30px 20px;
        text-align: center;
      }
    `,
  ],
})
export class ForumSubscriptionsPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);

  readonly data = signal<MySubscriptionsResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly busy = signal<Set<string>>(new Set());

  constructor() {
    void this.load();
  }

  async onThreadChange(
    t: ThreadSubscriptionItem,
    level: SubscriptionLevel | null,
  ): Promise<void> {
    if (this.busy().has(t.threadId)) return;
    this.markBusy(t.threadId, true);
    try {
      await this.forum.setThreadSubscription(t.threadId, level);
      const cur = this.data();
      if (cur) {
        this.data.set({
          ...cur,
          threads:
            level === null
              ? cur.threads.filter((x) => x.threadId !== t.threadId)
              : cur.threads.map((x) =>
                  x.threadId === t.threadId ? { ...x, level } : x,
                ),
        });
      }
    } catch (err) {
      console.error('[forum] thread sub change failed', err);
    } finally {
      this.markBusy(t.threadId, false);
    }
  }

  async onCategoryChange(
    c: CategorySubscriptionItem,
    level: SubscriptionLevel | null,
  ): Promise<void> {
    if (this.busy().has(c.categoryId)) return;
    this.markBusy(c.categoryId, true);
    try {
      await this.forum.setCategorySubscription(c.categoryId, level);
      const cur = this.data();
      if (cur) {
        this.data.set({
          ...cur,
          categories:
            level === null
              ? cur.categories.filter((x) => x.categoryId !== c.categoryId)
              : cur.categories.map((x) =>
                  x.categoryId === c.categoryId ? { ...x, level } : x,
                ),
        });
      }
    } catch (err) {
      console.error('[forum] category sub change failed', err);
    } finally {
      this.markBusy(c.categoryId, false);
    }
  }

  private markBusy(id: string, on: boolean): void {
    const next = new Set(this.busy());
    if (on) next.add(id);
    else next.delete(id);
    this.busy.set(next);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const data = await this.forum.listMySubscriptions();
      this.data.set(data);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
