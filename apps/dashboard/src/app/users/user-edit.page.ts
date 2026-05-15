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
import { AuthService } from '../auth/auth.service';
import {
  UsersAdminService,
  type AdminUserRow,
} from './users-admin.service';

type Tab = 'profile' | 'activity' | 'audit' | 'reports';

const ROLE_OPTIONS: { id: string; name: string; desc: string }[] = [
  { id: 'user', name: 'User', desc: 'Cumpără, vinde, postează în forum. Default pentru cont nou.' },
  { id: 'contributor', name: 'Contributor', desc: 'Poate propune gear / articole / corecții. Necesită approval pentru publicare.' },
  { id: 'curator', name: 'Curator', desc: 'Verifică propuneri de gear, întreține Tezaur. Necesită approval admin.' },
  { id: 'editor', name: 'Editor', desc: 'Poate scrie + publica în Revistă. Necesită approval admin.' },
  { id: 'moderator', name: 'Moderator', desc: 'Editează / șterge postări forum + listings. Răspunde rapoarte.' },
  { id: 'admin', name: 'Admin', desc: 'Full access la dashboard. Doar superadmin acordă rolul.' },
  { id: 'superadmin', name: 'Superadmin', desc: 'Acces total + poate promova alți admini. Doar pentru founderi.' },
];

@Component({
  selector: 'sz-user-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main__pad">
      <nav class="crumb">
        <a routerLink="/">Admin</a>
        <span class="sep">/</span>
        <a routerLink="/useri">Useri</a>
        <span class="sep">/</span>
        <span class="cur">&#64;{{ row()?.username || '—' }}</span>
        <span class="sep" style="margin-left:auto">·</span>
        <span style="font-family:var(--font-mono);font-size:10px;color:var(--fg-subtle);letter-spacing:.06em">{{ shortId() }}</span>
      </nav>

      @if (loading()) {
        <p class="ph-sub">Se încarcă…</p>
      } @else if (!row()) {
        <p class="ph-sub">User negăsit.</p>
      } @else {
        <div class="ph-row">
          <div class="ph-title-block">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h1 class="ph-title" style="margin:0">&#64;{{ row()!.username }}</h1>
              <span class="bdg" [class]="'bdg--trust-' + row()!.trustLevel">{{ trustLabel(row()!.trustLevel) }}</span>
              <span class="bdg bdg--status-active">Active</span>
              @for (r of row()!.roles; track r) {
                <span class="bdg" [class]="'bdg--role-' + r">{{ r }}</span>
              }
            </div>
            <p class="ph-sub">
              {{ row()!.fullName || '—' }} · membru de
              {{ formatRelative(row()!.createdAt) }}
            </p>
          </div>
          <div class="ph-actions">
            <a class="btn btn--ghost" [href]="publicProfileUrl()" target="_blank" rel="noopener">
              <svg><use href="#i-external" /></svg>Vezi profil public
            </a>
            <a class="btn btn--quiet" routerLink="/useri">← Înapoi la listă</a>
          </div>
        </div>

        <div class="savebar">
          <div class="savebar__state" [class.is-dirty]="dirty()" [class.is-clean]="!dirty()">
            <span class="savebar__dot"></span>
            <span>
              @if (dirty()) {
                <b style="color:var(--fg)">Modificări nesalvate</b> · revocă sau salvează
              } @else {
                <b style="color:var(--ok)">Sincronizat</b>
              }
            </span>
          </div>
          <div class="savebar__actions">
            <button class="btn btn--quiet" type="button" (click)="reset()" [disabled]="!dirty()">Anulează</button>
            <button class="btn btn--primary" type="button" (click)="save()" [disabled]="!dirty() || saving()">
              <svg><use href="#i-check" /></svg>Salvează modificări
            </button>
          </div>
        </div>

        <div class="tabs">
          <button type="button" [class.is-active]="tab() === 'profile'" (click)="tab.set('profile')">Profil</button>
          <button type="button" [class.is-active]="tab() === 'activity'" (click)="tab.set('activity')">
            Activitate <span class="count">—</span>
          </button>
          <button type="button" [class.is-active]="tab() === 'audit'" (click)="tab.set('audit')">
            Audit log <span class="count">—</span>
          </button>
          <button type="button" [class.is-active]="tab() === 'reports'" (click)="tab.set('reports')">
            Mesaje raportate <span class="count">—</span>
          </button>
        </div>

        <div class="grid-main-side">
          <div>
            @if (tab() === 'profile') {
              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Profil de bază</h2>
                  <span class="card__head-meta">vizibil pe site-ul public</span>
                </header>
                <div class="formsec">
                  <div class="formsec__grid">
                    <div class="field">
                      <label class="field__label" for="f-name">Display name</label>
                      <input id="f-name" class="field__input" type="text" [(ngModel)]="form.fullName" />
                    </div>
                    <div class="field">
                      <label class="field__label" for="f-handle">Username <span class="meta">&#64;</span></label>
                      <input id="f-handle" class="field__input field__input--mono" type="text" [value]="row()!.username" disabled />
                    </div>
                    <div class="field span-2">
                      <label class="field__label" for="f-email">Email</label>
                      <div class="field__row">
                        <input id="f-email" class="field__input field__input--mono" type="email" [value]="row()!.email" disabled />
                        @if (row()!.emailVerified) {
                          <span class="field__verified"><svg><use href="#i-check" /></svg>Verified</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Rol și permissions</h2>
                  <span class="card__head-meta">acțiunea se loghează în audit_log</span>
                </header>
                <div class="formsec" style="border:0;padding:22px 24px">
                  <div class="radio-grid">
                    @for (opt of roleOptions; track opt.id) {
                      <label class="radio-card" [class.is-on]="form.roles.has(opt.id)" (click)="toggleRole(opt.id)">
                        <span class="radio-card__dot"></span>
                        <div class="radio-card__name">{{ opt.name }}</div>
                        <div class="radio-card__desc">{{ opt.desc }}</div>
                      </label>
                    }
                  </div>
                  <p class="field__hint is-warn" style="margin-top:14px">
                    Rolurile admin / superadmin pot fi acordate doar de un superadmin existent.
                  </p>
                </div>
              </section>

              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Trust &amp; verification</h2>
                  <span class="card__head-meta">
                    trust_level: <b style="color:var(--accent)">{{ row()!.trustLevel }}</b>
                  </span>
                </header>
                <div class="formsec" style="border:0">
                  <p class="field__hint">
                    Trust-level se actualizează automat (email → phone → ID).
                    Override-ul manual și gestiunea documentelor sunt parte din spec §7.4
                    și ajung aici după ce backend-ul de trust-override e livrat.
                  </p>
                </div>
              </section>
            } @else if (tab() === 'activity') {
              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Activitate utilizator</h2>
                </header>
                <div class="card__body">
                  <p class="field__hint">
                    Lista cu listings, recenzii, threaduri se completează când endpoint-ul
                    /admin/users/:id/activity e disponibil.
                  </p>
                </div>
              </section>
            } @else if (tab() === 'audit') {
              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Audit log</h2>
                </header>
                <div class="card__body">
                  <p class="field__hint">
                    Filtrare după target_type=user și target_id=&#64;handle din /audit-log.
                  </p>
                </div>
              </section>
            } @else {
              <section class="card">
                <header class="card__head">
                  <h2 class="card__title">Mesaje raportate</h2>
                </header>
                <div class="card__body">
                  <p class="field__hint">
                    Lista mesajelor / posturilor raportate de alți useri se completează după
                    M11 (cuplare la /rapoarte).
                  </p>
                </div>
              </section>
            }
          </div>

          <div class="userside">
            <section class="card" style="margin-bottom:0">
              <div class="userside__head">
                <div class="userside__avt">{{ initials() }}</div>
                <div class="userside__name">{{ row()!.fullName || row()!.username }}</div>
                <div class="userside__handle">&#64;{{ row()!.username }} · {{ shortId() }}</div>
                <div class="userside__badges">
                  <span class="bdg" [class]="'bdg--trust-' + row()!.trustLevel">{{ trustLabel(row()!.trustLevel) }}</span>
                  <span class="bdg bdg--status-active">Active</span>
                </div>
              </div>
              <div class="userside__statgrid">
                <div>
                  <span class="k">Member since</span>
                  <span class="v mono">{{ formatDate(row()!.createdAt) }}</span>
                </div>
                <div>
                  <span class="k">Roluri</span>
                  <span class="v">{{ row()!.roles.length }}</span>
                </div>
                <div>
                  <span class="k">Email verified</span>
                  <span class="v" [class.accent]="row()!.emailVerified">{{ row()!.emailVerified ? 'Da' : 'Nu' }}</span>
                </div>
                <div>
                  <span class="k">Trust level</span>
                  <span class="v mono">{{ row()!.trustLevel }}</span>
                </div>
              </div>
            </section>

            <section class="card" style="margin-bottom:0">
              <header class="card__head">
                <h2 class="card__title">Linkuri rapide</h2>
              </header>
              <div class="quicklinks">
                <a [routerLink]="['/bazar']" [queryParams]="{ owner: row()!.username }">
                  <span>Listings publicate</span>
                  <span class="tbl__mono" style="color:var(--accent)">→</span>
                </a>
                <a [routerLink]="['/audit-log']" [queryParams]="{ target: row()!.id }">
                  <span>Audit log filtrat</span>
                  <span class="tbl__mono">→</span>
                </a>
                <a [href]="publicProfileUrl()" target="_blank" rel="noopener">
                  <span>Profil public</span>
                  <span class="tbl__mono">↗</span>
                </a>
              </div>
            </section>

            <section class="card danger" style="margin-bottom:0">
              <header class="card__head">
                <h2 class="card__title">Danger zone</h2>
                <span class="card__head-meta" style="color:var(--danger)">acțiuni ireversibile</span>
              </header>
              <div class="danger__item">
                <div>
                  <div class="danger__lbl">Ban user</div>
                  <div class="danger__desc">
                    Listings ascunse, forum posts păstrate, login blocat.
                  </div>
                </div>
                <div class="danger__row">
                  <button class="btn btn--danger btn--sm" type="button" disabled>Ban</button>
                </div>
              </div>
              <div class="danger__item">
                <div>
                  <div class="danger__lbl">Anonimizează &amp; șterge (GDPR)</div>
                  <div class="danger__desc">
                    Wipe permanent al datelor PII. Listings păstrate ca „user șters".
                  </div>
                </div>
                <div class="danger__row">
                  <button class="btn btn--danger btn--sm" type="button" disabled>Inițiază…</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      }
    </div>
  `,
})
export class UserEditPage {
  readonly admin = inject(UsersAdminService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tab = signal<Tab>('profile');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly row = signal<AdminUserRow | null>(null);
  readonly dirty = signal(false);

  readonly roleOptions = ROLE_OPTIONS;

  form = {
    fullName: '',
    roles: new Set<string>(),
  };

  private original: { fullName: string; roles: Set<string> } = {
    fullName: '',
    roles: new Set(),
  };

  readonly isSuperadmin = computed(() => !!this.auth.currentUser()?.roles.includes('superadmin'));

  readonly initials = computed(() => {
    const r = this.row();
    if (!r) return '?';
    const source = r.fullName || r.username;
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  readonly shortId = computed(() => this.row()?.id.slice(0, 8) ?? '');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  publicProfileUrl(): string {
    return `https://sintezaur.ro/u/${this.row()?.username ?? ''}`;
  }

  async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      // No /admin/users/:id endpoint exists yet — fall back to the
      // list search. This is good enough for the design-import
      // milestone; the dedicated endpoint is part of M12.
      const res = await this.admin.list({ q: id, page: 1, pageSize: 50 });
      const found = res.items.find((u) => u.id === id) ?? null;
      this.row.set(found);
      if (found) {
        this.form.fullName = found.fullName ?? '';
        this.form.roles = new Set(found.roles);
        this.original = {
          fullName: this.form.fullName,
          roles: new Set(this.form.roles),
        };
        this.dirty.set(false);
      }
    } catch (err) {
      console.error('[user edit] load failed', err);
      this.row.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  toggleRole(roleId: string): void {
    if (!this.canEditRole(roleId)) return;
    const next = new Set(this.form.roles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    this.form.roles = next;
    this.recomputeDirty();
  }

  canEditRole(roleId: string): boolean {
    if (roleId === 'admin' || roleId === 'superadmin') return this.isSuperadmin();
    if (roleId === 'user') return false;
    return true;
  }

  reset(): void {
    this.form.fullName = this.original.fullName;
    this.form.roles = new Set(this.original.roles);
    this.dirty.set(false);
  }

  async save(): Promise<void> {
    const row = this.row();
    if (!row) return;
    this.saving.set(true);
    try {
      const before = this.original.roles;
      const after = this.form.roles;
      const toGrant = [...after].filter((r) => !before.has(r));
      const toRevoke = [...before].filter((r) => !after.has(r));
      for (const r of toGrant) await this.admin.grantRole(row.id, r);
      for (const r of toRevoke) await this.admin.revokeRole(row.id, r);
      this.original = { fullName: this.form.fullName, roles: new Set(after) };
      this.dirty.set(false);
      await this.load(row.id);
    } catch (err) {
      console.error('[user edit] save failed', err);
      window.alert('Salvarea modificărilor a eșuat.');
    } finally {
      this.saving.set(false);
    }
  }

  private recomputeDirty(): void {
    const beforeRoles = [...this.original.roles].sort().join(',');
    const afterRoles = [...this.form.roles].sort().join(',');
    const changed =
      this.form.fullName !== this.original.fullName || beforeRoles !== afterRoles;
    this.dirty.set(changed);
  }

  trustLabel(level: string): string {
    switch (level) {
      case 'id_verified':
        return 'ID verified';
      case 'phone_verified':
        return 'Phone verified';
      case 'email_verified':
        return 'Email verified';
      case 'unverified':
        return 'Unverified';
      case 'trusted_seller':
        return 'Trusted seller';
      default:
        return level;
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatRelative(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const days = Math.floor((now - then) / 86400000);
    if (days < 1) return 'azi';
    if (days < 30) return `${days} ${days === 1 ? 'zi' : 'zile'}`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} ${months === 1 ? 'lună' : 'luni'}`;
    }
    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? 'an' : 'ani'}`;
  }
}
