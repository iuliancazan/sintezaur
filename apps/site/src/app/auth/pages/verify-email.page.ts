import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../auth-shell.component';
import { authFormStyles } from '../auth-form.styles';

type State = 'pending' | 'ok' | 'failed';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell [title]="'auth.verify.title' | t">
      @switch (state()) {
        @case ('pending') {
          <p style="text-align:center;color:var(--fg-muted)">
            {{ 'auth.verify.in_progress' | t }}
          </p>
        }
        @case ('ok') {
          <div class="form-success">
            <strong>{{ 'auth.verify.success_title' | t }}.</strong>
            {{ 'auth.verify.success_body' | t }}
          </div>
          <div class="extra">
            <a routerLink="/login">{{ 'auth.verify.login_link' | t }}</a>
          </div>
        }
        @case ('failed') {
          <div class="form-error">
            <strong>{{ 'auth.verify.failure_title' | t }}.</strong>
            {{ 'auth.verify.failure_body' | t }}
          </div>
          <div class="extra">
            <a routerLink="/login">{{ 'auth.verify.login_link' | t }}</a>
          </div>
        }
      }
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class VerifyEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly state = signal<State>('pending');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('failed');
      return;
    }
    try {
      const res = await this.auth.verifyEmail(token);
      this.state.set(res.verified ? 'ok' : 'failed');
    } catch {
      this.state.set('failed');
    }
  }
}
