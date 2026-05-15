import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Editor, type Content, type JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import StarterKit from '@tiptap/starter-kit';
import type { SuggestionProps } from '@tiptap/suggestion';

export type SzEditorImageUploader = (file: File) => Promise<string>;

export interface SzEditorMentionItem {
  id: string;
  username: string;
  fullName: string;
}

export type SzEditorMentionSuggest = (
  query: string,
) => Promise<SzEditorMentionItem[]>;

export interface SzEditorChange {
  json: JSONContent;
  html: string;
  text: string;
  characterCount: number;
}

/**
 * Shared rich-text editor backed by Tiptap. Ships in M3 for listing
 * descriptions; designed to be reused by gear descriptions (M2.5 admin),
 * Revista articles (M4), and Forum posts (M5).
 *
 * Extensions kept minimal for M3 — text formatting + paragraphs + lists
 * + blockquote + links + placeholder. Image, YouTube, oEmbed extensions
 * land alongside Revista in M4 when we wire the shared image pipeline.
 *
 * Emits both JSONContent (for DB storage) and serialized HTML (for SSR /
 * read-side rendering) on every change. Parent components keep the
 * authoritative `value` and react to `(valueChange)`.
 */
@Component({
  selector: 'sz-editor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="sz-editor" [class.is-disabled]="disabled">
      <div class="sz-editor__toolbar">
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.bold"
          (click)="cmd('toggleBold')"
          aria-label="Bold"
        ><strong>B</strong></button>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.italic"
          (click)="cmd('toggleItalic')"
          aria-label="Italic"
        ><em>I</em></button>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.strike"
          (click)="cmd('toggleStrike')"
          aria-label="Strikethrough"
        ><s>S</s></button>
        <span class="sz-editor__sep"></span>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.heading2"
          (click)="cmdWithArg('toggleHeading', { level: 2 })"
          aria-label="Heading 2"
        >H2</button>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.heading3"
          (click)="cmdWithArg('toggleHeading', { level: 3 })"
          aria-label="Heading 3"
        >H3</button>
        <span class="sz-editor__sep"></span>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.bulletList"
          (click)="cmd('toggleBulletList')"
          aria-label="Bullet list"
        >•</button>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.orderedList"
          (click)="cmd('toggleOrderedList')"
          aria-label="Numbered list"
        >1.</button>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.blockquote"
          (click)="cmd('toggleBlockquote')"
          aria-label="Quote"
        >›</button>
        <span class="sz-editor__sep"></span>
        <button
          type="button"
          class="sz-editor__btn"
          [class.is-active]="states.link"
          (click)="onLinkClick()"
          aria-label="Link"
        >↗</button>
        @if (richMode) {
          <button
            type="button"
            class="sz-editor__btn"
            (click)="onImageClick()"
            aria-label="Image"
            [disabled]="!imageUploader"
          >🖼</button>
          <button
            type="button"
            class="sz-editor__btn"
            (click)="onYoutubeClick()"
            aria-label="YouTube"
          >▶</button>
          <span class="sz-editor__sep"></span>
        }
        <button
          type="button"
          class="sz-editor__btn"
          (click)="cmd('undo')"
          aria-label="Undo"
        >⟲</button>
        <button
          type="button"
          class="sz-editor__btn"
          (click)="cmd('redo')"
          aria-label="Redo"
        >⟳</button>
        @if (showCount) {
          <span class="sz-editor__count">{{ characterCount }} / {{ maxLength }}</span>
        }
      </div>
      <div #host class="sz-editor__host"></div>
    </div>
  `,
  styles: [
    `
      .sz-editor {
        border: 1px solid var(--line-strong);
        background: var(--bg);
        display: flex;
        flex-direction: column;
        min-height: 200px;
      }
      .sz-editor.is-disabled { opacity: 0.6; pointer-events: none; }
      .sz-editor:focus-within { border-color: var(--accent); }

      .sz-editor__toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--line);
        background: var(--bg-elev);
        flex-wrap: wrap;
      }
      .sz-editor__btn {
        min-width: 32px;
        min-height: 32px;
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
      }
      .sz-editor__btn:hover { color: var(--fg); background: var(--bg-card); }
      .sz-editor__btn.is-active {
        color: var(--accent-fg);
        background: var(--accent);
        border-color: var(--accent);
      }
      .sz-editor__sep {
        display: inline-block;
        width: 1px;
        height: 18px;
        background: var(--line);
        margin: 0 4px;
      }
      .sz-editor__count {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-subtle);
        letter-spacing: 0.04em;
      }

      .sz-editor__host {
        flex: 1;
        padding: 14px 18px;
        min-height: 160px;
      }
      .sz-editor__host .ProseMirror {
        outline: none;
        font-family: var(--font-ui);
        font-size: 15px;
        line-height: 1.55;
        color: var(--fg);
        min-height: 140px;
      }
      .sz-editor__host .ProseMirror p { margin: 0 0 12px; }
      .sz-editor__host .ProseMirror p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        float: left;
        color: var(--fg-subtle);
        pointer-events: none;
        height: 0;
      }
      .sz-editor__host .ProseMirror h2 {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        text-transform: uppercase;
        margin: 18px 0 10px;
      }
      .sz-editor__host .ProseMirror h3 {
        font-family: var(--font-display);
        font-size: 20px;
        font-weight: 600;
        margin: 16px 0 8px;
      }
      .sz-editor__host .ProseMirror ul,
      .sz-editor__host .ProseMirror ol { padding-left: 22px; margin: 0 0 12px; }
      .sz-editor__host .ProseMirror blockquote {
        border-left: 2px solid var(--accent);
        padding-left: 14px;
        color: var(--fg-muted);
        font-style: italic;
        margin: 12px 0;
      }
      .sz-editor__host .ProseMirror a {
        color: var(--accent);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
      }
      .sz-editor__host .ProseMirror code {
        background: var(--bg-card-2);
        padding: 2px 5px;
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px solid var(--line);
      }
      .sz-editor__host .ProseMirror .sz-mention,
      .sz-mention {
        color: var(--accent);
        background: color-mix(in oklab, var(--accent) 14%, transparent);
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 500;
      }

      .sz-mention-popup {
        position: absolute;
        z-index: 200;
        margin: 0;
        padding: 4px 0;
        list-style: none;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        min-width: 220px;
        max-width: 320px;
        max-height: 240px;
        overflow-y: auto;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        font-family: var(--font-ui);
      }
      .sz-mention-popup__item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sz-mention-popup__item:hover,
      .sz-mention-popup__item.is-selected {
        background: color-mix(in oklab, var(--accent) 18%, var(--bg-elev));
      }
      .sz-mention-popup__username {
        color: var(--accent);
        font-size: 14px;
        font-weight: 500;
      }
      .sz-mention-popup__full {
        color: var(--fg-muted);
        font-size: 12px;
      }
      .sz-mention-popup__empty {
        padding: 10px 14px;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 12px;
      }
    `,
  ],
})
export class SzEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  /** Initial value (JSONContent OR HTML string). Parent owns subsequent updates. */
  @Input() value: Content | null = null;
  @Input() placeholder = 'Scrie ceva...';
  @Input() maxLength = 8000;
  @Input() showCount = true;
  @Input() disabled = false;
  /**
   * Enables image + YouTube embed extensions and the matching toolbar
   * buttons. M4 Revista turns this on; Bazar descriptions leave it off.
   */
  @Input() richMode = false;
  /**
   * Async upload callback used by the image button. Receives the picked
   * File, returns the absolute URL to insert into the document.
   */
  @Input() imageUploader: SzEditorImageUploader | null = null;
  /**
   * When set, enables `@mention` autocomplete. The callback is invoked
   * with the in-progress query (text after the `@`) and should return
   * up to ~8 candidate users. M5-D uses this for forum mentions.
   */
  @Input() mentionSuggest: SzEditorMentionSuggest | null = null;

  @Output() valueChange = new EventEmitter<SzEditorChange>();

  private editor?: Editor;
  states = {
    bold: false,
    italic: false,
    strike: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    link: false,
  };
  characterCount = 0;

  ngAfterViewInit(): void {
    const extensions = [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
      }),
      Placeholder.configure({ placeholder: this.placeholder }),
    ];
    if (this.richMode) {
      extensions.push(
        Image.configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: { loading: 'lazy' },
        }) as never,
        Youtube.configure({
          controls: true,
          nocookie: true,
          modestBranding: true,
          // Embeds render with a thumbnail-then-click in CSS; no autoplay.
          width: 720,
          height: 405,
        }) as never,
      );
    }
    if (this.mentionSuggest) {
      extensions.push(this.buildMentionExtension() as never);
    }
    this.editor = new Editor({
      element: this.hostRef.nativeElement,
      extensions,
      content: this.value ?? '',
      editable: !this.disabled,
      onUpdate: ({ editor }) => this.emitChange(editor),
      onSelectionUpdate: ({ editor }) => this.refreshStates(editor),
      onCreate: ({ editor }) => {
        this.refreshStates(editor);
        this.characterCount = editor.getText().length;
      },
    });
  }

  ngOnDestroy(): void {
    this.hideMentionPopup();
    this.editor?.destroy();
  }

  cmd(name: string): void {
    if (!this.editor) return;
    type Cmd = { run: () => boolean };
    type Chain = Record<string, () => Chain> & {
      focus: () => Chain;
      run: () => boolean;
    };
    const chain = this.editor.chain().focus() as unknown as Chain;
    const next = (chain[name] as () => Chain)();
    (next as unknown as Cmd).run();
  }

  cmdWithArg(name: string, arg: unknown): void {
    if (!this.editor) return;
    type Chain = Record<string, (a?: unknown) => Chain> & {
      focus: () => Chain;
      run: () => boolean;
    };
    const chain = this.editor.chain().focus() as unknown as Chain;
    const next = (chain[name] as (a?: unknown) => Chain)(arg);
    next.run();
  }

  async onImageClick(): Promise<void> {
    if (!this.editor || !this.imageUploader) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.style.display = 'none';
    document.body.appendChild(input);
    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
        input.remove();
      };
      input.click();
    });
    if (!file) return;
    try {
      const url = await this.imageUploader(file);
      this.editor
        .chain()
        .focus()
        .setImage({ src: url })
        .createParagraphNear()
        .run();
    } catch (err) {
      console.error('[sz-editor] image upload failed', err);
      window.alert('Imaginea nu a putut fi încărcată.');
    }
  }

  onYoutubeClick(): void {
    if (!this.editor) return;
    const url = window.prompt('URL YouTube:');
    if (!url) return;
    type ChainWithYt = { setYoutubeVideo: (args: { src: string }) => { run: () => void } };
    const chain = this.editor.chain().focus() as unknown as ChainWithYt;
    chain.setYoutubeVideo({ src: url.trim() }).run();
  }

  onLinkClick(): void {
    if (!this.editor) return;
    const existing = this.editor.getAttributes('link')['href'] as string | undefined;
    const url = window.prompt('URL (gol = elimină):', existing ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url.trim() })
      .run();
  }

  private emitChange(editor: Editor): void {
    const text = editor.getText();
    this.characterCount = text.length;
    this.refreshStates(editor);
    this.valueChange.emit({
      json: editor.getJSON(),
      html: editor.getHTML(),
      text,
      characterCount: text.length,
    });
  }

  private refreshStates(editor: Editor): void {
    this.states = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      link: editor.isActive('link'),
    };
  }

  /* ============================================================
     Mention extension — uses @tiptap/extension-mention's built-in
     `@tiptap/suggestion` plumbing with a custom renderer. The popup
     is a plain absolutely-positioned `<ul>` to keep us off tippy.js
     (saves ~7 KB and avoids React/Vue ports). Serialized HTML uses
     `data-user-id="<uuid>"` so the backend can parse mentions out
     of the cached bodyHtml without trusting client-supplied IDs.
     ============================================================ */

  private mentionPopup: HTMLUListElement | null = null;
  private mentionItems: SzEditorMentionItem[] = [];
  private mentionSelected = 0;
  private mentionProps: SuggestionProps<SzEditorMentionItem, unknown> | null =
    null;
  private mentionQueryTok = 0;

  private buildMentionExtension() {
    const suggest = this.mentionSuggest!;
    return Mention.configure({
      HTMLAttributes: { class: 'sz-mention' },
      renderHTML: ({ options, node }) => {
        const id = node.attrs['id'] as string;
        const label = (node.attrs['label'] as string) ?? id;
        return [
          'span',
          {
            ...options.HTMLAttributes,
            'data-user-id': id,
            'data-type': 'mention',
          },
          `@${label}`,
        ];
      },
      suggestion: {
        char: '@',
        allowSpaces: false,
        items: async ({ query }: { query: string }) => {
          if (query.length < 2) return [];
          const tok = ++this.mentionQueryTok;
          const list = await suggest(query);
          if (tok !== this.mentionQueryTok) return [];
          return list;
        },
        render: () => {
          return {
            onStart: (props) => {
              this.mentionProps = props as SuggestionProps<
                SzEditorMentionItem,
                unknown
              >;
              this.mentionItems = props.items as SzEditorMentionItem[];
              this.mentionSelected = 0;
              this.showMentionPopup();
            },
            onUpdate: (props) => {
              this.mentionProps = props as SuggestionProps<
                SzEditorMentionItem,
                unknown
              >;
              this.mentionItems = props.items as SzEditorMentionItem[];
              this.mentionSelected = 0;
              this.renderMentionItems();
              this.positionMentionPopup();
            },
            onKeyDown: (props) => {
              const ev = props.event;
              if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                this.mentionSelected =
                  (this.mentionSelected + 1) %
                  Math.max(1, this.mentionItems.length);
                this.renderMentionItems();
                return true;
              }
              if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                this.mentionSelected =
                  (this.mentionSelected - 1 + this.mentionItems.length) %
                  Math.max(1, this.mentionItems.length);
                this.renderMentionItems();
                return true;
              }
              if (ev.key === 'Enter' || ev.key === 'Tab') {
                if (this.mentionItems.length === 0) return false;
                ev.preventDefault();
                this.commitMention(this.mentionItems[this.mentionSelected]);
                return true;
              }
              if (ev.key === 'Escape') {
                this.hideMentionPopup();
                return true;
              }
              return false;
            },
            onExit: () => {
              this.hideMentionPopup();
            },
          };
        },
      },
    });
  }

  private showMentionPopup(): void {
    if (this.mentionPopup) return;
    const ul = document.createElement('ul');
    ul.className = 'sz-mention-popup';
    document.body.appendChild(ul);
    this.mentionPopup = ul;
    this.renderMentionItems();
    this.positionMentionPopup();
  }

  private hideMentionPopup(): void {
    this.mentionPopup?.remove();
    this.mentionPopup = null;
    this.mentionItems = [];
    this.mentionProps = null;
  }

  private renderMentionItems(): void {
    if (!this.mentionPopup) return;
    this.mentionPopup.innerHTML = '';
    if (this.mentionItems.length === 0) {
      const li = document.createElement('li');
      li.className = 'sz-mention-popup__empty';
      li.textContent = 'Niciun utilizator.';
      this.mentionPopup.appendChild(li);
      return;
    }
    this.mentionItems.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'sz-mention-popup__item';
      if (i === this.mentionSelected) li.classList.add('is-selected');
      const username = document.createElement('span');
      username.className = 'sz-mention-popup__username';
      username.textContent = `@${item.username}`;
      const full = document.createElement('span');
      full.className = 'sz-mention-popup__full';
      full.textContent = item.fullName ?? '';
      li.appendChild(username);
      li.appendChild(full);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.commitMention(item);
      });
      this.mentionPopup!.appendChild(li);
    });
  }

  private positionMentionPopup(): void {
    if (!this.mentionPopup || !this.mentionProps) return;
    const rect = this.mentionProps.clientRect?.();
    if (!rect) return;
    const popupHeight = this.mentionPopup.offsetHeight || 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < popupHeight + 12
        ? rect.top + window.scrollY - popupHeight - 6
        : rect.bottom + window.scrollY + 6;
    this.mentionPopup.style.top = `${top}px`;
    this.mentionPopup.style.left = `${rect.left + window.scrollX}px`;
  }

  private commitMention(item: SzEditorMentionItem): void {
    if (!this.mentionProps) return;
    this.mentionProps.command({
      id: item.id,
      label: item.username,
    });
    this.hideMentionPopup();
  }
}
