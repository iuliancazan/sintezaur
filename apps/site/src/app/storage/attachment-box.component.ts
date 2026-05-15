import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import {
  AttachmentsService,
  type AttachmentItem,
} from './attachments.service';
import { AttachmentListComponent } from './attachment-list.component';

export type AttachmentTarget =
  | { kind: 'forum-post'; postId: string }
  | { kind: 'revista-article'; articleId: string };

const ACCEPT_MIMES = [
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
].join(',');

/**
 * Combined uploader + list manager for M7 attachments.
 *
 * Use in author-facing surfaces only — non-authors see the read-only
 * `<app-attachment-list>` instead. The component handles its own
 * client-side pre-checks (mime + per-file size from the
 * `AttachmentsService` cached limits) before posting bytes.
 *
 * Forum posts cap at 3 attachments — the file input button hides once
 * the cap is hit. Revista articles have no cap (only the per-user
 * quota applies).
 *
 * Emits `(changed)` after every successful upload or delete so the
 * parent page can re-render attachment counts / refresh other state.
 */
@Component({
  selector: 'app-attachment-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AttachmentListComponent],
  template: `
    <section class="attachment-box" [attr.data-kind]="target.kind">
      <header class="attachment-box-header">
        <h4>Atașamente</h4>
        @if (target.kind === 'forum-post') {
          <span class="hint">max 3 — audio (MP3/WAV/OGG), PDF, ZIP</span>
        } @else {
          <span class="hint">audio (MP3/WAV/OGG), PDF, ZIP</span>
        }
      </header>

      <app-attachment-list [items]="items()" />

      @if (items().length > 0) {
        <ul class="manage-list">
          @for (a of items(); track a.id) {
            <li class="manage-row">
              <span class="filename">{{ a.originalFilename }}</span>
              <button
                type="button"
                class="delete-btn"
                (click)="onDelete(a)"
                [disabled]="busy()"
              >
                Șterge
              </button>
            </li>
          }
        </ul>
      }

      @if (canUploadMore()) {
        <label class="picker">
          <input
            type="file"
            [accept]="acceptList"
            (change)="onPick($event)"
            [disabled]="busy()"
          />
          <span class="picker-label">
            {{ busy() ? 'Se încarcă…' : 'Adaugă atașament' }}
          </span>
        </label>
      } @else if (target.kind === 'forum-post') {
        <p class="cap-message">Ai atins limita de 3 atașamente pentru postare.</p>
      }

      @if (errorMessage()) {
        <p class="error">{{ errorMessage() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .attachment-box {
        border-top: 1px dashed var(--surface-border, #e4e4e7);
        margin-top: 0.75rem;
        padding-top: 0.5rem;
      }
      .attachment-box-header {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .attachment-box-header h4 {
        margin: 0;
        font-size: 0.95rem;
      }
      .hint {
        font-size: 0.75rem;
        color: var(--text-color-secondary, #71717a);
      }
      .manage-list {
        list-style: none;
        padding: 0;
        margin: 0.5rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .manage-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
      }
      .manage-row .filename {
        flex: 1;
        word-break: break-word;
      }
      .delete-btn {
        background: transparent;
        border: 1px solid var(--red-300, #fca5a5);
        color: var(--red-700, #b91c1c);
        padding: 0.15rem 0.5rem;
        font-size: 0.75rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .delete-btn[disabled] { opacity: 0.6; cursor: wait; }
      .picker {
        display: inline-block;
        margin-top: 0.5rem;
      }
      .picker input { display: none; }
      .picker-label {
        display: inline-block;
        padding: 0.4rem 0.8rem;
        border: 1px solid var(--primary-300, #93c5fd);
        background: var(--primary-50, #eff6ff);
        color: var(--primary-700, #1d4ed8);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
      }
      .cap-message {
        margin: 0.5rem 0 0;
        font-size: 0.8rem;
        color: var(--text-color-secondary, #71717a);
      }
      .error {
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
        color: var(--red-700, #b91c1c);
      }
    `,
  ],
})
export class AttachmentBoxComponent implements OnInit {
  private readonly service = inject(AttachmentsService);

  @Input({ required: true }) target!: AttachmentTarget;
  /** Initial list to render — parent typically fetches via the service. */
  @Input() initial: AttachmentItem[] | null = null;
  @Output() changed = new EventEmitter<AttachmentItem[]>();

  readonly items = signal<AttachmentItem[]>([]);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly acceptList = ACCEPT_MIMES;

  ngOnInit(): void {
    this.items.set(this.initial ?? []);
  }

  canUploadMore(): boolean {
    if (this.target.kind === 'forum-post') return this.items().length < 3;
    return true;
  }

  async onPick(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.errorMessage.set(null);

    const preCheck = await this.preCheckFile(file);
    if (preCheck) {
      this.errorMessage.set(preCheck);
      return;
    }

    this.busy.set(true);
    try {
      const created =
        this.target.kind === 'forum-post'
          ? await this.service.uploadToForumPost(this.target.postId, file)
          : await this.service.uploadToRevistaArticle(
              this.target.articleId,
              file,
            );
      const next = [...this.items(), created];
      this.items.set(next);
      this.changed.emit(next);
    } catch (err) {
      this.errorMessage.set(AttachmentsService.describeError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async onDelete(a: AttachmentItem): Promise<void> {
    this.errorMessage.set(null);
    this.busy.set(true);
    try {
      if (this.target.kind === 'forum-post') {
        await this.service.deleteForumAttachment(this.target.postId, a.id);
      } else {
        await this.service.deleteRevistaAttachment(
          this.target.articleId,
          a.id,
        );
      }
      const next = this.items().filter((x) => x.id !== a.id);
      this.items.set(next);
      this.changed.emit(next);
    } catch (err) {
      this.errorMessage.set(AttachmentsService.describeError(err));
    } finally {
      this.busy.set(false);
    }
  }

  private async preCheckFile(file: File): Promise<string | null> {
    const fileType = this.guessFileType(file);
    if (!fileType) {
      return 'Tip de fișier neacceptat. Folosește audio, PDF sau ZIP.';
    }
    const module =
      this.target.kind === 'forum-post' ? 'forum' : 'revista';
    try {
      const cap = await this.service.getPerFileMaxBytes(fileType, module);
      if (cap !== null && file.size > cap) {
        const mb = (cap / 1024 / 1024).toFixed(0);
        return `Fișierul depășește limita de ${mb} MB.`;
      }
    } catch {
      // Network blip — let the backend guard be the source of truth.
    }
    return null;
  }

  private guessFileType(file: File): 'audio' | 'pdf' | 'zip' | null {
    const m = (file.type || '').toLowerCase();
    if (m.startsWith('audio/')) return 'audio';
    if (m === 'application/pdf') return 'pdf';
    if (m === 'application/zip' || m === 'application/x-zip-compressed')
      return 'zip';
    const name = file.name.toLowerCase();
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg'))
      return 'audio';
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.zip')) return 'zip';
    return null;
  }
}
