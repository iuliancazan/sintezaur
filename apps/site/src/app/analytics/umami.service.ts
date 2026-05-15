import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

const SCRIPT_ID = 'umami-tracker';

/**
 * Privacy-friendly analytics via Umami Cloud. Spec §M6 deliverable.
 *
 * Activates only when both `umamiWebsiteId` AND `umamiScriptUrl` are
 * set on the build's `environment` (kept empty on dev so we don't
 * pollute prod stats from local sessions). Idempotent — calling
 * `init()` twice doesn't duplicate the script tag.
 */
@Injectable({ providedIn: 'root' })
export class UmamiService {
  private readonly doc = inject(DOCUMENT);

  init(): void {
    const websiteId = environment.umamiWebsiteId?.trim();
    const scriptUrl = environment.umamiScriptUrl?.trim();
    if (!websiteId || !scriptUrl) {
      console.log('[umami] disabled (env not set)');
      return;
    }
    if (this.doc.getElementById(SCRIPT_ID)) {
      // Hot reload / repeated boot guard.
      return;
    }
    const script = this.doc.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = scriptUrl;
    script.setAttribute('data-website-id', websiteId);
    this.doc.head.appendChild(script);
    console.log(`[umami] loaded (${websiteId})`);
  }
}
