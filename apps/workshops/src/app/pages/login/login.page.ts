import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

/**
 * Workshop gate — W1 placeholder shell (form wiring lands with auth).
 * Visual language follows the course deck: black, thin #454545 cards,
 * orange scribble underline, tracked-out Lato labels.
 */
@Component({
  selector: 'ws-login-page',
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly http = inject(HttpClient);

  protected readonly apiStatus = signal<'checking' | 'ok' | 'down'>('checking');

  constructor() {
    this.http.get<{ status: string }>('/api/health').subscribe({
      next: (r) => this.apiStatus.set(r.status === 'ok' ? 'ok' : 'down'),
      error: () => this.apiStatus.set('down'),
    });
  }
}
