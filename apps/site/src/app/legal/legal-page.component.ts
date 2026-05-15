import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { marked } from 'marked';
import { LegalService } from './legal.service';

/**
 * Generic renderer used by routes /termeni, /confidentialitate, /cookies,
 * /regulament-forum, /despre. The slug comes from the route data
 * configured in `app.routes.ts`. The Contact page has its own
 * component because it also hosts the form.
 *
 * Markdown → HTML conversion is client-side via `marked`. Output is
 * trusted: bodies come from admin-edited DB rows, not user input.
 * `DomSanitizer.bypassSecurityTrustHtml` is intentional and limited
 * to this surface.
 */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="legal">
      <article class="legal__shell">
        @if (loading()) {
          <p class="legal__loading">Se încarcă…</p>
        } @else if (error()) {
          <div class="legal__error">
            <h1>Pagina nu poate fi afișată</h1>
            <p>{{ error() }}</p>
            <p><a routerLink="/">← Înapoi la pagina principală</a></p>
          </div>
        } @else if (page()) {
          <header class="legal__head">
            <h1>{{ page()!.title }}</h1>
            <p class="legal__updated">
              Ultima actualizare: {{ updatedLabel() }}
            </p>
          </header>
          <div class="legal__body" [innerHTML]="renderedBody()"></div>
        }
      </article>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .legal { padding: 24px 0 64px; }
      .legal__shell {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 20px;
      }
      .legal__head { margin-bottom: 32px; }
      .legal__head h1 {
        font-size: 32px;
        line-height: 1.15;
        margin: 0 0 6px;
        color: var(--ink);
      }
      .legal__updated {
        font-size: 13px;
        color: var(--ink-soft);
        margin: 0;
      }
      .legal__body { color: var(--ink); line-height: 1.65; }
      .legal__body h2 {
        font-size: 22px;
        margin: 32px 0 12px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 6px;
      }
      .legal__body h3 { font-size: 18px; margin: 20px 0 8px; }
      .legal__body p { margin: 0 0 12px; }
      .legal__body ul,
      .legal__body ol { margin: 0 0 12px; padding-left: 22px; }
      .legal__body li { margin-bottom: 4px; }
      .legal__body a { color: var(--accent); text-decoration: underline; }
      .legal__body a:hover { text-decoration: none; }
      .legal__body code {
        background: var(--surface-2);
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 13px;
      }
      .legal__body table {
        border-collapse: collapse;
        margin: 12px 0 16px;
        width: 100%;
        font-size: 14px;
      }
      .legal__body th,
      .legal__body td {
        border: 1px solid var(--line);
        padding: 6px 10px;
        text-align: left;
      }
      .legal__body th {
        background: var(--surface-2);
        font-weight: 600;
      }
      .legal__body hr {
        border: none;
        border-top: 1px solid var(--line);
        margin: 24px 0;
      }
      .legal__body strong { font-weight: 600; }
      .legal__loading,
      .legal__error {
        text-align: center;
        padding: 80px 20px;
        color: var(--ink-soft);
      }
      .legal__error h1 {
        font-size: 22px;
        color: var(--ink);
        margin: 0 0 12px;
      }
    `,
  ],
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  private readonly legal = inject(LegalService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly slug = toSignal(
    this.route.data.pipe(map((d) => (d['slug'] as string) ?? '')),
    { initialValue: '' },
  );

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal<import('./legal.service').LegalPage | null>(null);

  readonly renderedBody = computed<SafeHtml>(() => {
    const p = this.page();
    if (!p) return '';
    const html = marked.parse(p.bodyMd, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  readonly updatedLabel = computed(() => {
    const p = this.page();
    if (!p) return '';
    try {
      return new Date(p.updatedAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return p.updatedAt;
    }
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) this.fetch(slug);
    });
  }

  private async fetch(slug: string): Promise<void> {
    if (!slug) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.legal.getPage(slug);
      this.page.set(page);
      if (typeof document !== 'undefined') {
        document.title = `${page.title} · Sintezaur`;
      }
    } catch (err) {
      this.error.set(
        err && typeof err === 'object' && 'status' in err
          ? `Răspuns ${(err as { status: number }).status} de la server.`
          : 'A apărut o eroare neașteptată.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
