import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../ui/toast.service';
import { uploadUrl } from '../seo/seo.utils';

/**
 * `/cont/profil` — single-page profile editor for the public-facing
 * fields rendered on `/autor/:username` (avatar, bio, location,
 * social links, display currency).
 *
 * Email + password live on their own pages (`/cont/email`,
 * `/cont/parola`) because they need the current password re-prompt
 * for security. Everything here is best-effort save: PATCH only the
 * fields that actually changed.
 */
@Component({
  selector: 'app-profile-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="profile">
      <header class="profile__head">
        <a routerLink="/cont" class="profile__back">← Înapoi la cont</a>
        <h1>Profil public</h1>
        <p class="profile__hint">
          Datele de mai jos apar pe pagina ta publică
          <a [routerLink]="['/autor', username()]"
            >/autor/{{ username() }}</a
          >.
        </p>
      </header>

      <section class="card avatar-card">
        <div class="avatar-preview">
          @if (avatarPreview(); as src) {
            <img [src]="src" alt="Avatar" />
          } @else {
            <span class="avatar-placeholder">{{ initials() }}</span>
          }
        </div>
        <div class="avatar-actions">
          <h2>Avatar</h2>
          <p class="muted">JPEG / PNG / WebP, max 10 MB. Tăiere pătrată automată.</p>
          <div class="row">
            <button
              type="button"
              class="btn"
              (click)="fileInput().nativeElement.click()"
              [disabled]="avatarPending()"
            >
              {{ avatarPending() ? 'Se încarcă…' : 'Încarcă avatar' }}
            </button>
            @if (currentAvatarUrl()) {
              <button
                type="button"
                class="btn btn--ghost"
                (click)="removeAvatar()"
                [disabled]="avatarPending()"
              >
                Șterge
              </button>
            }
          </div>
          <input
            #fileInputEl
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            (change)="onFile($event)"
          />
        </div>
      </section>

      <form [formGroup]="form" (ngSubmit)="submit()" class="card form" novalidate>
        <div class="field">
          <label for="fullName">Nume afișat</label>
          <input
            id="fullName"
            type="text"
            formControlName="fullName"
            autocomplete="name"
            maxlength="80"
          />
          @if (
            form.controls.fullName.invalid && form.controls.fullName.touched
          ) {
            <small class="err">Numele trebuie să aibă între 2 și 80 caractere.</small>
          }
        </div>

        <div class="field">
          <label for="location">Locație</label>
          <input
            id="location"
            type="text"
            formControlName="location"
            placeholder="ex. Cluj-Napoca, RO"
            maxlength="120"
          />
        </div>

        <div class="field">
          <label for="bio">Bio</label>
          <textarea
            id="bio"
            formControlName="bio"
            rows="4"
            maxlength="600"
            placeholder="Scurt despre tine — ce produci, instrumente, scena…"
          ></textarea>
          <small class="muted">{{ form.controls.bio.value.length }}/600</small>
        </div>

        <div class="field">
          <label for="displayCurrency">Monedă afișată</label>
          <select id="displayCurrency" formControlName="displayCurrency">
            <option value="ron">RON (Leu)</option>
            <option value="eur">EUR (Euro)</option>
          </select>
          <small class="muted">
            Preferința ta pentru afișarea prețurilor; convertirea folosește rata
            curentă din baza de date.
          </small>
        </div>

        <fieldset class="social">
          <legend>Linkuri externe</legend>
          <div class="field">
            <label for="websiteUrl">Website</label>
            <input
              id="websiteUrl"
              type="url"
              formControlName="websiteUrl"
              placeholder="https://…"
              maxlength="200"
            />
          </div>
          <div class="field">
            <label for="socialInstagram">Instagram (handle)</label>
            <input
              id="socialInstagram"
              type="text"
              formControlName="socialInstagram"
              placeholder="numele_tau"
              maxlength="80"
            />
          </div>
          <div class="field">
            <label for="socialSoundcloud">SoundCloud (handle)</label>
            <input
              id="socialSoundcloud"
              type="text"
              formControlName="socialSoundcloud"
              maxlength="80"
            />
          </div>
          <div class="field">
            <label for="socialBandcamp">Bandcamp (handle)</label>
            <input
              id="socialBandcamp"
              type="text"
              formControlName="socialBandcamp"
              maxlength="80"
            />
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Confidențialitate</legend>
          <div class="field field--inline">
            <label class="checkbox-row">
              <input
                type="checkbox"
                formControlName="collectionPublic"
              />
              <span>Arată colecția mea pe profilul public</span>
            </label>
            <p class="field__help">
              Când e dezactivat, colecția ta nu se afișează pe
              <code>/autor/&lt;username&gt;</code>. Tu o vezi în continuare
              din <code>/cont</code>.
            </p>
          </div>
        </fieldset>

        @if (formError()) {
          <div class="form-error">{{ formError() }}</div>
        }

        <div class="actions">
          <button
            type="submit"
            class="btn btn--primary"
            [disabled]="form.invalid || saving() || !form.dirty"
          >
            {{ saving() ? 'Se salvează…' : 'Salvează modificările' }}
          </button>
        </div>
      </form>
    </main>
  `,
  styles: [
    `
      .profile {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      .profile__head {
        margin-bottom: 24px;
      }
      .profile__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        margin: 4px 0 8px;
        color: var(--fg);
      }
      .profile__back {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        text-decoration: none;
      }
      .profile__hint {
        margin: 0;
        color: var(--fg-muted);
        font-size: 13px;
      }
      .profile__hint a { color: var(--accent); }
      .card {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 24px;
        margin-bottom: 16px;
      }
      .avatar-card {
        display: flex;
        gap: 24px;
        align-items: center;
      }
      .avatar-preview {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--bg-card);
        border: 1px solid var(--line);
        display: grid;
        place-items: center;
        overflow: hidden;
        flex-shrink: 0;
      }
      .avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-placeholder {
        font-family: var(--font-display);
        font-size: 28px;
        color: var(--fg-muted);
      }
      .avatar-actions h2 {
        margin: 0 0 4px;
        font-size: 16px;
      }
      .row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
      .btn {
        padding: 10px 16px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .btn:hover:not(:disabled) {
        border-color: var(--accent);
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn--primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
      .btn--ghost { background: transparent; }
      .form { display: flex; flex-direction: column; gap: 18px; }
      .field { display: flex; flex-direction: column; gap: 6px; }
      .field label {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .field input,
      .field textarea,
      .field select {
        background: var(--bg-card);
        border: 1px solid var(--line);
        color: var(--fg);
        padding: 10px 12px;
        font: inherit;
      }
      .field textarea { resize: vertical; font-family: inherit; }
      .muted { color: var(--fg-muted); font-size: 12px; }
      .err { color: var(--danger, #c44); font-size: 12px; }
      .social {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px dashed var(--line);
        padding: 16px;
      }
      .social legend {
        padding: 0 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .form-error {
        background: rgba(204, 68, 68, 0.1);
        border: 1px solid rgba(204, 68, 68, 0.4);
        color: var(--danger, #c44);
        padding: 10px 12px;
        font-size: 13px;
      }
      .actions { display: flex; justify-content: flex-end; }
    `,
  ],
})
export class ProfileEditPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInputEl');

  readonly saving = signal(false);
  readonly avatarPending = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    bio: ['', [Validators.maxLength(600)]],
    location: ['', [Validators.maxLength(120)]],
    displayCurrency: ['ron' as 'ron' | 'eur'],
    websiteUrl: ['', [Validators.maxLength(200)]],
    socialInstagram: ['', [Validators.maxLength(80)]],
    socialSoundcloud: ['', [Validators.maxLength(80)]],
    socialBandcamp: ['', [Validators.maxLength(80)]],
    collectionPublic: [true],
  });

  constructor() {
    const u = this.auth.currentUser();
    if (u) this.hydrate(u);
  }

  username(): string {
    return this.auth.currentUser()?.username ?? '';
  }

  initials(): string {
    const name = this.auth.currentUser()?.fullName ?? '';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0)).join('').toUpperCase() || '·';
  }

  currentAvatarUrl(): string | null {
    return this.auth.currentUser()?.avatarUrl ?? null;
  }

  avatarPreview(): string | undefined {
    return uploadUrl(this.currentAvatarUrl());
  }

  private hydrate(u: ReturnType<AuthService['currentUser']> & object): void {
    this.form.reset({
      fullName: u.fullName,
      bio: u.bio ?? '',
      location: u.location ?? '',
      displayCurrency: u.displayCurrency,
      websiteUrl: u.websiteUrl ?? '',
      socialInstagram: u.socialInstagram ?? '',
      socialSoundcloud: u.socialSoundcloud ?? '',
      socialBandcamp: u.socialBandcamp ?? '',
      collectionPublic: u.collectionPublic ?? true,
    });
  }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Imagine prea mare (max 10 MB).');
      return;
    }
    this.avatarPending.set(true);
    try {
      await this.auth.uploadAvatar(file);
      this.toast.success('Avatar actualizat.');
    } catch {
      this.toast.error('Nu am putut încărca avatarul.');
    } finally {
      this.avatarPending.set(false);
    }
  }

  async removeAvatar(): Promise<void> {
    this.avatarPending.set(true);
    try {
      await this.auth.removeAvatar();
      this.toast.success('Avatar șters.');
    } catch {
      this.toast.error('Nu am putut șterge avatarul.');
    } finally {
      this.avatarPending.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    try {
      await this.auth.updateProfile({
        fullName: v.fullName.trim(),
        bio: emptyToNull(v.bio),
        location: emptyToNull(v.location),
        displayCurrency: v.displayCurrency,
        websiteUrl: emptyToNull(v.websiteUrl),
        socialInstagram: emptyToNull(v.socialInstagram),
        socialSoundcloud: emptyToNull(v.socialSoundcloud),
        socialBandcamp: emptyToNull(v.socialBandcamp),
        collectionPublic: v.collectionPublic ?? true,
      });
      this.form.markAsPristine();
      this.toast.success('Profil salvat.');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        this.formError.set(
          (err.error as { message?: string })?.message ??
            'Date invalide. Verifică câmpurile și încearcă din nou.',
        );
      } else {
        this.formError.set('Eroare la salvare. Încearcă din nou.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}
