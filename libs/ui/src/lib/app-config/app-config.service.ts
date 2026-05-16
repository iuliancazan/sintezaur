import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Runtime config fetched from the API at FE bootstrap. The only thing
 * exposed today is `imageBaseUrl` — the public root of whichever storage
 * driver is active (local disk on dev, Cloudflare R2 on prod). The FE
 * uses it to resolve photo paths returned by the API (which are storage
 * keys like `gear/<id>/<sourceId>/<variant>-<hash>.jpg`).
 *
 * The fetch is wired into `provideAppInitializer` so the rest of the app
 * sees a populated value on first paint. A sane fallback is set in the
 * constructor so a network blip during bootstrap doesn't blank-out every
 * image in the app — the cached default keeps working until the real
 * value arrives.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly _imageBaseUrl = signal('');

  readonly imageBaseUrl = this._imageBaseUrl.asReadonly();

  /**
   * Resolve a storage-relative path into a full URL. Returns '' if path
   * is falsy. If the path is already absolute (http/https), returns as-is.
   */
  imageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const base = this._imageBaseUrl();
    if (!base) return path;
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  /**
   * Called from `provideAppInitializer`. Fetches `GET /config` from the
   * given API base. On failure keeps the fallback set via `setFallback`
   * (or, if none was set, leaves the value empty — the helper still
   * works for absolute URLs and degrades gracefully).
   */
  async bootstrap(apiBaseUrl: string): Promise<void> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<{ imageBaseUrl?: string }>(`${apiBaseUrl}/config`),
      );
      if (cfg?.imageBaseUrl) {
        this._imageBaseUrl.set(cfg.imageBaseUrl.replace(/\/+$/, ''));
      }
    } catch {
      // Fallback already populated — degrade silently.
    }
  }

  /** Seed a default before bootstrap finishes. Use to back the env's known URL. */
  setFallback(url: string): void {
    if (!this._imageBaseUrl()) {
      this._imageBaseUrl.set(url.replace(/\/+$/, ''));
    }
  }
}
