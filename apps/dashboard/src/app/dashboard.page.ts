import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FeedEntry {
  time: string;
  actorInitials: string;
  actorHandle: string;
  action: string;
  klass: string;
  target: string;
  ref: string;
}

interface QuickAction {
  icon: string;
  title: string;
  sub: string;
  link: string;
}

interface PulseRow {
  label: string;
  metric: string;
  delta: string;
}

/**
 * Admin overview per v04 design (Admin - Dashboard.html). Data is
 * stubbed for the M11 import — wiring to real audit_log + section
 * counters is out of scope for the design import milestone.
 */
@Component({
  selector: 'sz-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main__pad">
      <div class="ph-row">
        <div class="ph-title-block">
          <span class="ph-eyebrow">/admin</span>
          <h1 class="ph-title">Dashboard</h1>
          <p class="ph-sub">Vedere de ansamblu Sintezaur · {{ updatedHint() }}</p>
        </div>
        <div class="ph-actions">
          <button class="btn btn--ghost" type="button" (click)="refresh()">
            <svg><use href="#i-refresh" /></svg>Reîmprospătează
          </button>
          <a class="btn btn--primary" routerLink="/tezaur/new">
            <svg><use href="#i-plus" /></svg>Acțiune rapidă
          </a>
        </div>
      </div>

      <div class="stat-strip">
        @for (s of stats(); track s.label) {
          <div class="stat">
            <span class="stat__label">{{ s.label }}</span>
            @if (s.corner) {
              <span class="stat__corner">{{ s.corner }}</span>
            }
            <span class="stat__num" [class.is-warn]="s.tone === 'warn'" [class.is-danger]="s.tone === 'danger'">
              {{ s.value }}
            </span>
            <span
              class="stat__delta"
              [class.is-flat]="s.deltaTone === 'flat'"
              [class.is-danger]="s.deltaTone === 'danger'"
            >{{ s.delta }}</span>
          </div>
        }
      </div>

      <div class="alerts">
        @for (a of alerts(); track a.body) {
          <div class="alert" [class.is-warn]="a.tone === 'warn'" [class.is-danger]="a.tone === 'danger'">
            <span class="alert__ico"><svg><use [attr.href]="'#' + a.icon" /></svg></span>
            <div class="alert__body" [innerHTML]="a.body"></div>
            <a class="alert__cta" [routerLink]="a.ctaLink">{{ a.ctaLabel }} →</a>
          </div>
        }
      </div>

      <div class="grid-main-side">
        <section class="card">
          <header class="card__head">
            <h2 class="card__title">Activitate recentă</h2>
            <span class="card__head-meta">audit_log · last 20 entries</span>
          </header>
          <div class="card__body card__body--flush">
            @for (f of feed(); track f.ref) {
              <div class="feed-row">
                <span class="t">{{ f.time }}</span>
                <div class="actor">
                  <span class="avt">{{ f.actorInitials }}</span>
                  <span class="nm">{{ '@' + f.actorHandle }}</span>
                </div>
                <span class="action" [class]="f.klass">{{ f.action }}</span>
                <span class="target">{{ f.target }}</span>
                <span class="ref tbl__mono">{{ f.ref }}<span class="arr"> →</span></span>
              </div>
            }
          </div>
          <div class="pager">
            <span>Afișând <b style="color:var(--fg)">1–20</b> din 14,728 entries</span>
            <a class="btn btn--quiet btn--sm" routerLink="/audit-log">Deschide audit log complet →</a>
          </div>
        </section>

        <aside>
          <section class="card">
            <header class="card__head">
              <h2 class="card__title">Acțiuni rapide</h2>
            </header>
            <div class="card__body card__body--flush">
              <div class="qa-grid qa-grid--stack">
                @for (q of quickActions; track q.link) {
                  <a class="qa-item" [routerLink]="q.link">
                    <span class="qa-item__ico"><svg><use [attr.href]="'#' + q.icon" /></svg></span>
                    <div>
                      <div class="qa-item__title">{{ q.title }}</div>
                      <div class="qa-item__sub">{{ q.sub }}</div>
                    </div>
                    <span class="qa-item__arr"><svg width="14" height="14"><use href="#i-arrow" /></svg></span>
                  </a>
                }
              </div>
            </div>
          </section>

          <section class="card">
            <header class="card__head">
              <h2 class="card__title">Pulse pe secțiuni</h2>
              <span class="card__head-meta">azi</span>
            </header>
            <div class="card__body card__body--flush">
              @for (p of pulse; track p.label) {
                <div class="pulse-row">
                  <span class="lbl">{{ p.label }}</span>
                  <span class="tbl__mono">{{ p.metric }}</span>
                  <span class="delta">{{ p.delta }}</span>
                </div>
              }
            </div>
          </section>
        </aside>
      </div>
    </div>
  `,
})
export class DashboardPage {
  readonly updatedHint = signal('ultima actualizare acum câteva secunde');

  refresh(): void {
    this.updatedHint.set('reîmprospătat acum');
  }

  readonly stats = signal<
    {
      label: string;
      value: string;
      delta: string;
      deltaTone: 'flat' | 'danger' | 'ok';
      tone: 'none' | 'warn' | 'danger';
      corner: string;
    }[]
  >([
    { label: 'Utilizatori activi', value: '—', delta: '— din audit_log', deltaTone: 'flat', tone: 'none', corner: '' },
    { label: 'Listings active', value: '—', delta: '— din /bazar', deltaTone: 'flat', tone: 'none', corner: '' },
    { label: 'Articole publicate', value: '—', delta: '— din /revista', deltaTone: 'flat', tone: 'none', corner: '' },
    { label: 'Threaduri active', value: '—', delta: '— din /forum', deltaTone: 'flat', tone: 'none', corner: '' },
    { label: 'Rapoarte open', value: '—', delta: '— din /rapoarte', deltaTone: 'flat', tone: 'warn', corner: 'acțiune' },
    { label: 'Tranzacții confirmate', value: '—', delta: '— total ultimele 30 zile', deltaTone: 'flat', tone: 'none', corner: '' },
  ]);

  readonly alerts = signal([
    {
      icon: 'i-flag',
      tone: 'danger' as const,
      body:
        '<strong>Rapoarte deschise</strong> · verifică coada și prioritizează cazurile critice (CSAM, hate speech).',
      ctaLink: '/rapoarte',
      ctaLabel: 'Rezolvă acum',
    },
    {
      icon: 'i-alert',
      tone: 'warn' as const,
      body:
        'Verifică <code>EUR/RON</code> currency rate. Listing-urile cu prețuri dual depind de această valoare.',
      ctaLink: '/currency-rates',
      ctaLabel: 'Actualizează',
    },
    {
      icon: 'i-info',
      tone: 'info' as const,
      body:
        '<strong>Useri în așteptare</strong> · cereri de promovare la editor / curator. Verifică-le periodic.',
      ctaLink: '/useri',
      ctaLabel: 'Vezi useri',
    },
  ]);

  readonly feed = signal<FeedEntry[]>([
    {
      time: '—',
      actorInitials: '—',
      actorHandle: 'system',
      action: 'INFO',
      klass: 'is-update',
      target: 'Activitatea se va popula din /audit-log când endpoint-ul de feed e livrat.',
      ref: 'sys_0001',
    },
  ]);

  readonly quickActions: QuickAction[] = [
    { icon: 'i-archive', title: 'Adaugă gear nou', sub: '/tezaur/new', link: '/tezaur/new' },
    { icon: 'i-book', title: 'Articol nou', sub: '/revista', link: '/revista' },
    { icon: 'i-coins', title: 'Update currency rate', sub: '/currency-rates', link: '/currency-rates' },
    { icon: 'i-flag', title: 'Verifică rapoarte', sub: '/rapoarte', link: '/rapoarte' },
  ];

  readonly pulse: PulseRow[] = [
    { label: 'Tezaur', metric: 'gear catalog', delta: '/tezaur' },
    { label: 'Bazar', metric: 'listings', delta: '/bazar' },
    { label: 'Revistă', metric: 'articole', delta: '/revista' },
    { label: 'Forum', metric: 'threaduri', delta: '/forum-queue' },
  ];
}
