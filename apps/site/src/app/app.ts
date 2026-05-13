import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="hello">
      <h1>Hello Sintezaur</h1>
      <p>Platforma în limba română pentru sintetizatoare și music gear.</p>
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .hello {
        padding: 2rem 1rem;
        max-width: 720px;
        margin: 0 auto;
      }
      h1 {
        font-size: clamp(1.5rem, 4vw, 2.25rem);
        margin: 0 0 0.5rem;
      }
      p {
        margin: 0 0 1.5rem;
        opacity: 0.75;
      }
    `,
  ],
})
export class App {}
