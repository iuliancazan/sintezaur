import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SeoService } from '../seo/seo.service';

type Variant = 'gone' | 'not-found';

/**
 * Catch-all 404 + 410 page (M6-C). Variant is controlled by route
 * `data: { variant: 'gone' }` for the `/gone` route used after slug
 * redirect expiry (currently un-wired — see `docs/seo-todo.md` for
 * the 410 plan). Default = 404.
 *
 * The page intentionally does NOT carry the topbar / footer accents;
 * the root shell already wraps it, so we only render the body.
 */
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="nf">
      <div class="nf__shell">
        <p class="nf__code">{{ variantInfo().code }}</p>
        <h1 class="nf__title">{{ variantInfo().title }}</h1>
        <p class="nf__lede">{{ variantInfo().lede }}</p>

        <div class="nf__suggest">
          <p>Poate cauți:</p>
          <ul>
            <li><a routerLink="/tezaur">Tezaur — catalog de echipamente</a></li>
            <li><a routerLink="/bazar">Bazar — anunțuri</a></li>
            <li><a routerLink="/revista">Revista — articole</a></li>
            <li><a routerLink="/forum">Forum — discuții</a></li>
          </ul>
        </div>

        <div class="nf__actions">
          <a routerLink="/" class="nf__btn">← Înapoi la pagina principală</a>
          <a routerLink="/contact" class="nf__btn nf__btn--ghost">
            Raportează problema
          </a>
        </div>
      </div>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .nf {
        min-height: calc(100vh - 200px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
      }
      .nf__shell {
        max-width: 560px;
        text-align: center;
      }
      .nf__code {
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 14px;
        letter-spacing: 0.12em;
        margin: 0 0 8px;
        color: var(--ink-soft);
        text-transform: uppercase;
      }
      .nf__title {
        font-size: clamp(28px, 5vw, 40px);
        line-height: 1.15;
        margin: 0 0 12px;
        color: var(--ink);
      }
      .nf__lede {
        font-size: 16px;
        line-height: 1.6;
        color: var(--ink-soft);
        margin: 0 0 32px;
      }
      .nf__suggest {
        text-align: left;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 16px 20px;
        margin: 0 0 28px;
      }
      .nf__suggest p {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }
      .nf__suggest ul {
        margin: 0;
        padding-left: 22px;
        font-size: 14px;
      }
      .nf__suggest li { margin-bottom: 4px; }
      .nf__suggest a {
        color: var(--accent);
        text-decoration: underline;
      }
      .nf__suggest a:hover { text-decoration: none; }
      .nf__actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .nf__btn {
        display: inline-block;
        padding: 10px 18px;
        background: var(--accent);
        color: var(--accent-ink, #fff);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }
      .nf__btn:hover { opacity: 0.9; }
      .nf__btn--ghost {
        background: transparent;
        color: var(--ink);
        border: 1px solid var(--line);
      }
    `,
  ],
})
export class NotFoundPage {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  /** When used directly as a component (not via the route), the input wins. */
  readonly variant = input<Variant | null>(null);

  private readonly routeVariant = toSignal(
    this.route.data.pipe(map((d) => (d['variant'] as Variant) ?? null)),
    { initialValue: null },
  );

  readonly variantInfo = computed(() => {
    const v: Variant = this.variant() ?? this.routeVariant() ?? 'not-found';
    if (v === 'gone') {
      this.seo.set({
        title: 'Pagină eliminată definitiv',
        description:
          'Această pagină a existat dar nu mai este disponibilă. Te-am redirecționat aici pentru că nu mai există o adresă nouă echivalentă.',
      });
      return {
        code: '410 · GONE',
        title: 'Pagina nu mai este disponibilă',
        lede:
          'Acest URL a existat în trecut, dar nu mai duce nicăieri. Probabil conținutul a fost șters sau redenumit fără o redirecționare validă. Caută în secțiunea relevantă mai jos.',
      };
    }
    this.seo.set({
      title: 'Pagină inexistentă',
      description: 'Pagina pe care o cauți nu există pe Sintezaur.',
    });
    return {
      code: '404 · NOT FOUND',
      title: 'Nu am găsit pagina',
      lede:
        'Adresa pe care ai accesat-o nu există. Poate ai folosit un link vechi sau un URL scris greșit. Încearcă căutarea în secțiunile principale.',
    };
  });
}
