import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root shell — just the router outlet for M1. Top nav + footer
 * (`@sintezaur/ui` components) ship in M2 alongside the Home /
 * Tezaur design integration. Each page (`HomePage`, auth shells,
 * account shells) currently brings its own chrome.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class App {}
