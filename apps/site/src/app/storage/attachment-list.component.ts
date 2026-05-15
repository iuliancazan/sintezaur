import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import type { AttachmentItem } from './attachments.service';

/**
 * Read-only renderer for a list of M7 attachments.
 *
 * Audio kinds render as a native `<audio controls>` player.
 * PDF + ZIP render as text links with a kind label + filename + size.
 *
 * Kept minimal — no thumbnails, no waveform, no preview pane. Mobile
 * Safari handles MP3/WAV/OGG natively; PDFs open in the browser
 * viewer; ZIPs download via `download` attribute.
 */
@Component({
  selector: 'app-attachment-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (items?.length) {
      <ul class="attachment-list">
        @for (a of items; track a.id) {
          <li class="attachment-row" [attr.data-kind]="a.kind">
            @if (a.kind === 'audio') {
              <div class="attachment-meta">
                <span class="kind-badge audio">Audio</span>
                <span class="filename">{{ a.originalFilename }}</span>
                <span class="size">{{ formatBytes(a.bytes) }}</span>
              </div>
              <audio
                [src]="a.url"
                controls
                preload="metadata"
                class="audio-player"
              ></audio>
              @if (a.caption) {
                <p class="caption">{{ a.caption }}</p>
              }
            } @else if (a.kind === 'pdf') {
              <a
                class="attachment-link"
                [href]="a.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="kind-badge pdf">PDF</span>
                <span class="filename">{{ a.originalFilename }}</span>
                <span class="size">{{ formatBytes(a.bytes) }}</span>
              </a>
              @if (a.caption) {
                <p class="caption">{{ a.caption }}</p>
              }
            } @else if (a.kind === 'zip') {
              <a
                class="attachment-link"
                [href]="a.url"
                [download]="a.originalFilename"
              >
                <span class="kind-badge zip">ZIP</span>
                <span class="filename">{{ a.originalFilename }}</span>
                <span class="size">{{ formatBytes(a.bytes) }}</span>
              </a>
              @if (a.caption) {
                <p class="caption">{{ a.caption }}</p>
              }
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .attachment-list {
        list-style: none;
        padding: 0;
        margin: 0.75rem 0 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .attachment-row {
        background: var(--surface-card, #fff);
        border: 1px solid var(--surface-border, #e4e4e7);
        border-radius: 6px;
        padding: 0.5rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .attachment-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
      }
      .attachment-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        color: inherit;
        font-size: 0.9rem;
      }
      .attachment-link:hover .filename {
        text-decoration: underline;
      }
      .kind-badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .kind-badge.audio { background: #f0e6ff; color: #5b21b6; }
      .kind-badge.pdf   { background: #fee2e2; color: #b91c1c; }
      .kind-badge.zip   { background: #e0f2fe; color: #075985; }
      .filename {
        font-weight: 500;
        word-break: break-word;
      }
      .size { color: var(--text-color-secondary, #71717a); font-size: 0.8rem; }
      .audio-player { width: 100%; max-width: 480px; }
      .caption {
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-color-secondary, #71717a);
        font-style: italic;
      }
    `,
  ],
})
export class AttachmentListComponent {
  @Input() items: AttachmentItem[] | null = [];

  formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }
}
