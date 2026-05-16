import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { hasAnyRole } from '../auth/auth.types';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurService,
  type GearState,
  type TezaurModerationItem,
  type TezaurMyDraft,
} from '../tezaur/tezaur.service';

type MineFilter = 'all' | 'approved' | 'submitted' | 'draft' | 'rejected';
type TabKey = 'mine' | 'queue';

/**
 * V08 — „Contribuții Tezaur" (account / contributor & moderator surface).
 *
 * Două file:
 *  1. "Contribuțiile mele" — listare cross-state din `/me/tezaur/drafts`
 *     (draft / submitted / approved / rejected), cu stats clickabile
 *     pentru filtrare și o secțiune separată „Necesită răspuns" pentru
 *     itemii respinși cu motivare (user-ul trebuie să răspundă).
 *  2. "De moderat" — vizibilă doar pentru `curator` / `admin` /
 *     `superadmin`. Listează coada `/admin/tezaur/moderation` cu acțiuni
 *     de aprobare / respingere inline.
 *
 * Deep-link prin hash: `#mine` (default) sau `#queue`.
 */
@Component({
  selector: 'app-contributii-tezaur-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- PAGE HEAD -->
      <header class="ct-head crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div class="ct-head__row">
          <div>
            <span class="ct-head__sub">// {{ 'contributii_tezaur.breadcrumb' | t }}</span>
            <h1 class="ct-head__title">
              {{ 'contributii_tezaur.title' | t }}<span class="dot">.</span>
            </h1>
            <p class="ct-head__lede">{{ 'contributii_tezaur.lede' | t }}</p>
          </div>
          <a routerLink="/tezaur/adauga" class="ct-head__cta">
            <span class="plus">+</span> {{ 'contributii_tezaur.add_cta' | t }}
          </a>
        </div>
      </header>

      <!-- TABS -->
      <div class="ct-tabs" role="tablist">
        <button
          class="ct-tab"
          [class.is-active]="activeTab() === 'mine'"
          (click)="setTab('mine')"
          type="button"
          role="tab"
        >
          {{ 'contributii_tezaur.tab_mine' | t }}
          <span class="ct-tab__count">{{ drafts().length }}</span>
        </button>
        @if (isModerator()) {
          <button
            class="ct-tab"
            [class.is-active]="activeTab() === 'queue'"
            (click)="setTab('queue')"
            type="button"
            role="tab"
          >
            {{ 'contributii_tezaur.tab_queue' | t }}
            <span class="ct-tab__count">{{ queueTotalCount() }}</span>
          </button>
        }
      </div>

      <!-- ============================================================
           TAB 1: CONTRIBUȚIILE MELE
           ============================================================ -->
      @if (activeTab() === 'mine') {
        <section>
          @if (loadingMine()) {
            <p class="ct-loading">{{ 'app.loading' | t }}</p>
          } @else if (drafts().length === 0) {
            <div class="ct-empty">
              <h3>{{ 'contributii_tezaur.empty_title' | t }}</h3>
              <p>{{ 'contributii_tezaur.empty_body' | t }}</p>
              <a routerLink="/tezaur/adauga" class="ct-head__cta">
                <span class="plus">+</span> {{ 'contributii_tezaur.add_cta' | t }}
              </a>
            </div>
          } @else {
            <!-- summary strip -->
            <div class="cn-strip">
              <button
                class="cn-strip__cell"
                [class.is-active]="filter() === 'all'"
                (click)="setFilter('all')"
                type="button"
              >
                <span class="cn-strip__k">// {{ 'contributii_tezaur.stat_total' | t }}</span>
                <span class="cn-strip__v">{{ drafts().length }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.stat_total_sub' | t }}</span>
              </button>
              <button
                class="cn-strip__cell"
                [class.is-active]="filter() === 'approved'"
                (click)="setFilter('approved')"
                type="button"
              >
                <span class="cn-strip__k">// {{ 'contributii_tezaur.stat_approved' | t }}</span>
                <span class="cn-strip__v up">{{ counts().approved }}</span>
                <span class="cn-strip__sub">{{ approvalRate() }}</span>
              </button>
              <button
                class="cn-strip__cell"
                [class.is-active]="filter() === 'submitted'"
                (click)="setFilter('submitted')"
                type="button"
              >
                <span class="cn-strip__k">// {{ 'contributii_tezaur.stat_pending' | t }}</span>
                <span class="cn-strip__v warn">{{ counts().submitted }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.stat_pending_sub' | t }}</span>
              </button>
              <button
                class="cn-strip__cell"
                [class.is-active]="filter() === 'draft'"
                (click)="setFilter('draft')"
                type="button"
              >
                <span class="cn-strip__k">// {{ 'contributii_tezaur.stat_draft' | t }}</span>
                <span class="cn-strip__v muted">{{ counts().draft }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.stat_draft_sub' | t }}</span>
              </button>
              <button
                class="cn-strip__cell"
                [class.is-active]="filter() === 'rejected'"
                (click)="setFilter('rejected')"
                type="button"
              >
                <span class="cn-strip__k">// {{ 'contributii_tezaur.stat_rejected' | t }}</span>
                <span class="cn-strip__v bad">{{ counts().rejected }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.stat_rejected_sub' | t }}</span>
              </button>
            </div>

            <!-- toolbar -->
            <div class="cn-toolbar">
              <div class="cn-search">
                <svg><use href="#i-search" /></svg>
                <input
                  type="search"
                  [placeholder]="'contributii_tezaur.search_placeholder_mine' | t"
                  [value]="searchMine()"
                  (input)="onSearchMine($event)"
                />
              </div>
              <div class="cn-sel">
                <span class="cn-sel__label">{{ 'contributii_tezaur.filter_sort' | t }}</span>
                <select [value]="sortMine()" (change)="onSortMine($event)">
                  <option value="newest">{{ 'contributii_tezaur.sort_newest' | t }}</option>
                  <option value="oldest">{{ 'contributii_tezaur.sort_oldest' | t }}</option>
                  <option value="state">{{ 'contributii_tezaur.sort_state' | t }}</option>
                </select>
              </div>
            </div>

            <!-- Necesită răspuns — only if there are rejected items -->
            @if (rejectedNeedingResponse().length > 0 && (filter() === 'all' || filter() === 'rejected')) {
              <div class="cn-h">
                <h2>{{ 'contributii_tezaur.needs_response' | t }}</h2>
                <span class="meta">{{ rejectedNeedingResponse().length }} {{ 'contributii_tezaur.items' | t }}</span>
              </div>
              <div class="cn-tbl-wrap">
                <table class="cn-tbl">
                  <thead>
                    <tr>
                      <th>{{ 'contributii_tezaur.col_piece' | t }}</th>
                      <th>{{ 'contributii_tezaur.col_type' | t }}</th>
                      <th class="hide-sm">{{ 'contributii_tezaur.col_category' | t }}</th>
                      <th class="hide-sm">{{ 'contributii_tezaur.col_submitted' | t }}</th>
                      <th>{{ 'contributii_tezaur.col_status' | t }}</th>
                      <th style="width: 80px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of rejectedNeedingResponse(); track d.id) {
                      <tr>
                        <td>
                          <div class="cn-gear">
                            <div
                              class="cn-gear__thumb"
                              [class.is-empty]="!d.thumb"
                              [style.background]="!d.thumb ? brandColor(d.brand) : null"
                            >
                              @if (d.thumb) {
                                <img [src]="tezaur.imageUrl(d.thumb)" [alt]="d.brand + ' ' + d.model" />
                              } @else {
                                <span class="cn-gear__thumb-initial">{{ brandInitial(d.brand) }}</span>
                              }
                            </div>
                            <div class="cn-gear__txt">
                              <span class="cn-gear__brand">{{ d.brand === 'Necunoscut' ? '—' : d.brand }}</span>
                              <span class="cn-gear__model">
                                <a [routerLink]="['/tezaur/adauga']" [queryParams]="{ draft: d.id }">
                                  {{ d.model === 'Draft fără model' ? ('contributii_tezaur.unnamed' | t) : d.model }}
                                </a>
                              </span>
                              @if (d.rejectionReason) {
                                <span class="cn-gear__reason">{{ d.rejectionReason }}</span>
                              }
                            </div>
                          </div>
                        </td>
                        <td><span class="cn-type" data-t="new">{{ 'contributii_tezaur.type_new' | t }}</span></td>
                        <td class="t-meta hide-sm">{{ d.category || '—' }}</td>
                        <td class="t-meta hide-sm">{{ formatDate(d.submittedAt || d.updatedAt) }}</td>
                        <td><span class="cn-stat" data-s="changes">{{ 'contributii_tezaur.status_changes' | t }}</span></td>
                        <td>
                          <div class="cn-row-act">
                            <a
                              [routerLink]="['/tezaur/adauga']"
                              [queryParams]="{ draft: d.id }"
                              [title]="'contributii_tezaur.action_respond' | t"
                            >
                              <svg><use href="#i-edit" /></svg>
                            </a>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Toate contribuțiile -->
            <div class="cn-h">
              <h2>{{ allSectionLabel() }}</h2>
              <span class="meta">{{ filteredDrafts().length }} {{ 'contributii_tezaur.items' | t }}</span>
            </div>
            <div class="cn-tbl-wrap">
              <table class="cn-tbl">
                <thead>
                  <tr>
                    <th>{{ 'contributii_tezaur.col_piece' | t }}</th>
                    <th>{{ 'contributii_tezaur.col_type' | t }}</th>
                    <th class="hide-sm">{{ 'contributii_tezaur.col_category' | t }}</th>
                    <th class="hide-sm">{{ 'contributii_tezaur.col_submitted' | t }}</th>
                    <th>{{ 'contributii_tezaur.col_status' | t }}</th>
                    <th style="width: 90px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of filteredDrafts(); track d.id) {
                    <tr>
                      <td>
                        <div class="cn-gear">
                          <div
                            class="cn-gear__thumb"
                            [class.is-empty]="!d.thumb"
                            [style.background]="!d.thumb ? brandColor(d.brand) : null"
                          >
                            @if (d.thumb) {
                              <img [src]="tezaur.imageUrl(d.thumb)" [alt]="d.brand + ' ' + d.model" />
                            } @else {
                              <span class="cn-gear__thumb-initial">{{ brandInitial(d.brand) }}</span>
                            }
                          </div>
                          <div class="cn-gear__txt">
                            <span class="cn-gear__brand">{{ d.brand === 'Necunoscut' ? '—' : d.brand }}</span>
                            <span class="cn-gear__model">
                              @if (d.state === 'approved') {
                                <a [routerLink]="['/tezaur', d.slug]">
                                  {{ d.model === 'Draft fără model' ? ('contributii_tezaur.unnamed' | t) : d.model }}
                                </a>
                              } @else if (d.state === 'draft' || d.state === 'rejected') {
                                <a [routerLink]="['/tezaur/adauga']" [queryParams]="{ draft: d.id }">
                                  {{ d.model === 'Draft fără model' ? ('contributii_tezaur.unnamed' | t) : d.model }}
                                </a>
                              } @else {
                                <span>{{ d.model === 'Draft fără model' ? ('contributii_tezaur.unnamed' | t) : d.model }}</span>
                              }
                            </span>
                          </div>
                        </div>
                      </td>
                      <td><span class="cn-type" data-t="new">{{ 'contributii_tezaur.type_new' | t }}</span></td>
                      <td class="t-meta hide-sm">{{ d.category || '—' }}</td>
                      <td class="t-meta hide-sm">{{ formatDate(d.submittedAt || d.updatedAt) }}</td>
                      <td>
                        <span class="cn-stat" [attr.data-s]="stateToPill(d.state)">
                          {{ ('contributii_tezaur.status_' + stateToPill(d.state)) | t }}
                        </span>
                      </td>
                      <td>
                        <div class="cn-row-act">
                          @if (d.state === 'draft' || d.state === 'rejected') {
                            <a
                              [routerLink]="['/tezaur/adauga']"
                              [queryParams]="{ draft: d.id }"
                              [title]="'contributii_tezaur.action_continue' | t"
                            >
                              <svg><use href="#i-edit" /></svg>
                            </a>
                            <button
                              type="button"
                              [title]="'contributii_tezaur.action_delete' | t"
                              (click)="deleteDraft(d.id)"
                              [disabled]="deleting() === d.id"
                            >
                              <svg><use href="#i-x" /></svg>
                            </button>
                          } @else if (d.state === 'approved') {
                            <a
                              [routerLink]="['/tezaur', d.slug]"
                              [title]="'contributii_tezaur.action_view' | t"
                            >
                              <svg><use href="#i-eye" /></svg>
                            </a>
                          } @else {
                            <!-- submitted: owner can still open the editor in read-only mode -->
                            <a
                              [routerLink]="['/tezaur/adauga']"
                              [queryParams]="{ draft: d.id }"
                              [title]="'contributii_tezaur.action_view_submitted' | t"
                            >
                              <svg><use href="#i-eye" /></svg>
                            </a>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- ============================================================
           TAB 2: DE MODERAT
           ============================================================ -->
      @if (activeTab() === 'queue' && isModerator()) {
        <section>
          <div class="mod-hint">
            <span class="mod-hint__ic">!</span>
            <span class="mod-hint__txt" [innerHTML]="'contributii_tezaur.mod_hint' | t"></span>
          </div>

          @if (loadingQueue()) {
            <p class="ct-loading">{{ 'app.loading' | t }}</p>
          } @else {
            <!-- stats strip -->
            <div class="cn-strip">
              <div class="cn-strip__cell is-static">
                <span class="cn-strip__k">// {{ 'contributii_tezaur.queue_stat_pending' | t }}</span>
                <span class="cn-strip__v warn">{{ queueTotalCount() }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.queue_stat_pending_sub' | t }}</span>
              </div>
              <div class="cn-strip__cell is-static">
                <span class="cn-strip__k">// {{ 'contributii_tezaur.queue_stat_total' | t }}</span>
                <span class="cn-strip__v">{{ queue().length }}</span>
                <span class="cn-strip__sub">{{ 'contributii_tezaur.queue_stat_total_sub' | t }}</span>
              </div>
            </div>

            <!-- toolbar -->
            <div class="cn-toolbar">
              <div class="cn-search">
                <svg><use href="#i-search" /></svg>
                <input
                  type="search"
                  [placeholder]="'contributii_tezaur.search_placeholder_queue' | t"
                  [value]="searchQueue()"
                  (input)="onSearchQueue($event)"
                />
              </div>
            </div>

            @if (filteredQueue().length === 0) {
              <div class="cn-empty">
                <h3>{{ 'contributii_tezaur.queue_empty_title' | t }}</h3>
                <p>{{ 'contributii_tezaur.queue_empty_body' | t }}</p>
              </div>
            } @else {
              @for (item of filteredQueue(); track item.id) {
                <article class="mod-card">
                  <div
                    class="mod-card__thumb"
                    [class.is-empty]="!item.thumb"
                    [style.background]="!item.thumb ? brandColor(item.brand) : null"
                  >
                    @if (item.thumb) {
                      <img [src]="tezaur.imageUrl(item.thumb)" [alt]="item.brand + ' ' + item.model" />
                    } @else {
                      <span class="mod-card__thumb-initial">{{ brandInitial(item.brand) }}</span>
                    }
                    <span class="mod-card__thumb-tag" data-t="new">
                      {{ 'contributii_tezaur.type_new' | t }}
                    </span>
                  </div>
                  <div class="mod-card__body">
                    <div class="mod-card__head">
                      <h3 class="mod-card__title">
                        <a
                          [routerLink]="['/tezaur/adauga']"
                          [queryParams]="{ draft: item.id, mod: 1 }"
                        >
                          {{ item.brand }} · {{ item.model }}
                        </a>
                      </h3>
                      <span class="cn-type" data-t="new">
                        {{ 'contributii_tezaur.type_new' | t }}
                      </span>
                    </div>
                    <div class="mod-card__meta">
                      <span>{{ 'contributii_tezaur.queue_submitted_at' | t }} {{ formatDate(item.submittedAt) }}</span>
                      <span class="sep">·</span>
                      <span class="chip-cat">{{ item.category || '—' }}</span>
                    </div>
                  </div>
                  <aside class="mod-card__side">
                    <div class="mod-card__actions">
                      <a
                        class="mod-btn mod-btn--ghost"
                        [routerLink]="['/tezaur/adauga']"
                        [queryParams]="{ draft: item.id, mod: 1 }"
                      >
                        <svg width="13" height="13"><use href="#i-edit" /></svg>
                        {{ 'contributii_tezaur.action_open_editor' | t }}
                      </a>
                      <button
                        class="mod-btn mod-btn--ok"
                        type="button"
                        (click)="approveItem(item.id)"
                        [disabled]="acting() === item.id"
                      >
                        <svg width="13" height="13"><use href="#i-check" /></svg>
                        {{ acting() === item.id ? ('contributii_tezaur.action_processing' | t) : ('contributii_tezaur.action_approve' | t) }}
                      </button>
                      <button
                        class="mod-btn mod-btn--bad"
                        type="button"
                        (click)="rejectItem(item.id)"
                        [disabled]="acting() === item.id"
                      >
                        <svg width="13" height="13"><use href="#i-x" /></svg>
                        {{ 'contributii_tezaur.action_request_changes' | t }}
                      </button>
                    </div>
                  </aside>
                </article>
              }
            }
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-top: 0;
        padding-bottom: 80px;
      }

      /* page head */
      .ct-head {
        padding: 56px 0 28px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 28px;
        position: relative;
      }
      .ct-head__sub {
        display: block;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .ct-head__title {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: clamp(48px, 7vw, 88px);
        line-height: 0.92;
        letter-spacing: 0.01em;
        margin: 0 0 12px;
        text-transform: uppercase;
      }
      .ct-head__title .dot { color: var(--accent); }
      .ct-head__lede {
        margin: 0;
        max-width: 64ch;
        font-size: 17px;
        color: var(--fg-muted);
        line-height: 1.5;
      }
      .ct-head__row {
        display: flex;
        align-items: end;
        gap: 36px;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .ct-head__cta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        background: var(--accent);
        color: var(--accent-fg);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 1px solid var(--accent);
        text-decoration: none;
        transition: background 0.15s, transform 0.15s;
      }
      .ct-head__cta:hover {
        background: var(--accent-2, var(--accent));
        opacity: 0.92;
        transform: translateY(-1px);
      }
      .ct-head__cta .plus {
        font-size: 16px;
        line-height: 1;
      }

      /* tabs */
      .ct-tabs {
        display: flex;
        gap: 2px;
        border-bottom: 1px solid var(--line);
        margin: 0 0 28px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .ct-tabs::-webkit-scrollbar { display: none; }
      .ct-tab {
        flex-shrink: 0;
        padding: 14px 18px;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg-muted);
        background: transparent;
        border: 0;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        position: relative;
        transition: color 0.15s, border-color 0.15s;
        min-height: auto;
      }
      .ct-tab:hover { color: var(--fg); }
      .ct-tab.is-active {
        color: var(--fg);
        border-bottom-color: var(--accent);
      }
      .ct-tab__count {
        display: inline-block;
        margin-left: 6px;
        padding: 1px 6px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 10px;
        color: var(--fg-muted);
      }
      .ct-tab.is-active .ct-tab__count {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }

      .ct-loading {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
        padding: 32px 0;
        text-align: center;
      }

      /* stats strip */
      .cn-strip {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        border: 1px solid var(--line);
        background: var(--bg-card);
        margin-bottom: 22px;
      }
      .cn-strip__cell {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border-right: 1px dashed var(--line);
        position: relative;
        cursor: pointer;
        transition: background 0.12s;
        background: transparent;
        text-align: left;
        font: inherit;
        color: inherit;
        border-top: 0;
        border-bottom: 0;
        border-left: 0;
      }
      .cn-strip__cell:last-child { border-right: 0; }
      .cn-strip__cell:hover { background: var(--bg-elev); }
      .cn-strip__cell.is-active { background: var(--bg-elev); }
      .cn-strip__cell.is-active::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 2px;
        background: var(--accent);
      }
      .cn-strip__cell.is-static { cursor: default; }
      .cn-strip__cell.is-static:hover { background: transparent; }
      .cn-strip__k {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .cn-strip__v {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 30px;
        line-height: 1;
        letter-spacing: 0.005em;
        color: var(--fg);
      }
      .cn-strip__v.up { color: oklch(0.62 0.16 145); }
      .cn-strip__v.warn { color: var(--accent); }
      .cn-strip__v.bad { color: oklch(0.62 0.18 28); }
      .cn-strip__v.muted { color: var(--fg-muted); }
      [data-theme='dark'] .cn-strip__v.up { color: oklch(0.78 0.16 145); }
      [data-theme='dark'] .cn-strip__v.bad { color: oklch(0.72 0.18 28); }
      .cn-strip__sub {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        letter-spacing: 0.04em;
      }

      /* toolbar */
      .cn-toolbar {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-bottom: 14px;
        align-items: stretch;
      }
      .cn-search {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        transition: border-color 0.12s;
      }
      .cn-search:focus-within { border-color: var(--accent); }
      .cn-search svg {
        width: 14px;
        height: 14px;
        color: var(--fg-muted);
        flex-shrink: 0;
      }
      .cn-search input {
        flex: 1;
        border: 0;
        background: transparent;
        padding: 11px 0;
        font-size: 14px;
        color: var(--fg);
        outline: none;
      }
      .cn-search input::placeholder { color: var(--fg-subtle); }

      .cn-sel {
        position: relative;
        display: inline-flex;
        background: var(--bg);
        border: 1px solid var(--line-strong);
      }
      .cn-sel select {
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: 0;
        outline: none;
        padding: 11px 36px 11px 14px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.04em;
        color: var(--fg);
        cursor: pointer;
        min-width: 160px;
      }
      .cn-sel::after {
        content: '▾';
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--fg-muted);
        pointer-events: none;
        font-size: 10px;
      }
      .cn-sel__label {
        align-self: center;
        padding: 0 0 0 12px;
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-subtle);
        border-right: 1px dashed var(--line);
        padding-right: 10px;
      }

      /* sub-section heading */
      .cn-h {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
        margin: 22px 0 12px;
        padding-bottom: 6px;
        border-bottom: 1px dashed var(--line);
      }
      .cn-h h2 {
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg);
        font-weight: 600;
        margin: 0;
      }
      .cn-h h2::before { content: '// '; color: var(--accent); }
      .cn-h .meta {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-subtle);
        letter-spacing: 0.04em;
      }

      /* table */
      .cn-tbl-wrap {
        border: 1px solid var(--line);
        background: var(--bg-card);
        overflow-x: auto;
      }
      .cn-tbl {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .cn-tbl thead th {
        text-align: left;
        padding: 11px 14px;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        font-weight: 600;
        border-bottom: 1px solid var(--line);
        background: var(--bg-elev);
        white-space: nowrap;
      }
      .cn-tbl tbody tr {
        border-bottom: 1px solid var(--line);
        transition: background 0.12s;
      }
      .cn-tbl tbody tr:hover { background: var(--bg-elev); }
      .cn-tbl tbody tr:last-child { border-bottom: 0; }
      .cn-tbl td {
        padding: 12px 14px;
        vertical-align: middle;
      }
      .cn-tbl td.t-meta {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
      }

      .cn-gear {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .cn-gear__thumb {
        position: relative;
        width: 56px;
        height: 42px;
        border: 1px solid var(--line);
        background: var(--bg-card-2, var(--bg-elev));
        flex-shrink: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cn-gear__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .cn-gear__thumb-placeholder {
        font-family: var(--font-mono);
        font-size: 16px;
        color: var(--fg-subtle);
      }
      .cn-gear__thumb.is-empty {
        border-color: transparent;
      }
      .cn-gear__thumb-initial {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 22px;
        color: oklch(0.18 0 0 / 0.85);
        line-height: 1;
      }
      .cn-gear__txt {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .cn-gear__brand {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
      }
      .cn-gear__brand::before {
        content: '// ';
        color: var(--accent);
      }
      .cn-gear__model {
        font-weight: 600;
        color: var(--fg);
        font-size: 14px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 36ch;
      }
      .cn-gear__model a {
        color: inherit;
        text-decoration: none;
      }
      .cn-gear__model a:hover { color: var(--accent); }
      .cn-gear__reason {
        font-family: var(--font-mono);
        font-size: 11px;
        color: oklch(0.62 0.16 28);
        margin-top: 4px;
        line-height: 1.4;
        max-width: 60ch;
        font-style: italic;
        word-break: break-word;
        white-space: normal;
      }
      [data-theme='dark'] .cn-gear__reason { color: oklch(0.82 0.16 28); }

      /* type chips */
      .cn-type {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        border: 1px solid var(--line-strong);
        background: var(--bg);
        color: var(--fg-muted);
        white-space: nowrap;
      }
      .cn-type::before {
        content: '';
        width: 6px;
        height: 6px;
        background: var(--fg-subtle);
        display: block;
        flex-shrink: 0;
      }
      .cn-type[data-t='new']::before { background: var(--accent); }
      .cn-type[data-t='new'] {
        color: var(--fg);
        border-color: var(--accent);
      }

      /* status pills */
      .cn-stat {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px 3px 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--fg-muted);
        white-space: nowrap;
      }
      .cn-stat::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--fg-subtle);
      }
      .cn-stat[data-s='approved'] {
        color: oklch(0.55 0.16 145);
        border-color: oklch(0.55 0.12 145);
      }
      .cn-stat[data-s='approved']::before { background: oklch(0.62 0.16 145); }
      [data-theme='dark'] .cn-stat[data-s='approved'] {
        color: oklch(0.82 0.16 145);
        border-color: oklch(0.45 0.12 145);
      }
      [data-theme='dark'] .cn-stat[data-s='approved']::before { background: oklch(0.72 0.16 145); }

      .cn-stat[data-s='pending'] {
        color: oklch(0.55 0.14 80);
        border-color: oklch(0.55 0.14 80);
      }
      .cn-stat[data-s='pending']::before {
        background: var(--accent);
        animation: cn-pulse 1.4s ease-in-out infinite;
      }
      [data-theme='dark'] .cn-stat[data-s='pending'] {
        color: var(--accent);
      }

      .cn-stat[data-s='changes'] {
        color: oklch(0.55 0.14 60);
        border-color: oklch(0.55 0.12 60);
      }
      .cn-stat[data-s='changes']::before { background: oklch(0.65 0.14 60); }
      [data-theme='dark'] .cn-stat[data-s='changes'] {
        color: oklch(0.82 0.14 60);
        border-color: oklch(0.50 0.12 60);
      }

      .cn-stat[data-s='draft'] {
        color: var(--fg-muted);
        border-color: var(--line);
      }

      @keyframes cn-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }

      /* row actions */
      .cn-row-act {
        display: inline-flex;
        gap: 4px;
      }
      .cn-row-act button,
      .cn-row-act a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--bg);
        border: 1px solid var(--line);
        color: var(--fg-muted);
        cursor: pointer;
        transition: color 0.12s, border-color 0.12s, background 0.12s;
        text-decoration: none;
        min-height: auto;
        min-width: auto;
        padding: 0;
      }
      .cn-row-act button:hover:not(:disabled),
      .cn-row-act a:hover {
        color: var(--accent);
        border-color: var(--accent);
      }
      .cn-row-act button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .cn-row-act svg {
        width: 13px;
        height: 13px;
      }
      .cn-row-act__lock {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        color: var(--fg-subtle);
        cursor: not-allowed;
      }
      .cn-row-act__lock svg {
        width: 13px;
        height: 13px;
      }

      /* moderation queue cards */
      .mod-hint {
        display: grid;
        grid-template-columns: 18px 1fr;
        gap: 12px;
        align-items: center;
        padding: 12px 16px;
        border: 1px solid var(--accent);
        background: oklch(0.55 0.14 80 / 0.08);
        color: var(--fg);
        margin-bottom: 18px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.02em;
        line-height: 1.5;
      }
      .mod-hint__ic {
        color: var(--accent);
        font-weight: 700;
        font-family: var(--font-mono);
        font-size: 14px;
      }
      .mod-hint__txt :is(b, strong) {
        color: var(--accent);
        font-weight: 600;
      }

      .mod-card {
        border: 1px solid var(--line);
        background: var(--bg-card);
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 160px 1fr 280px;
        gap: 0;
        transition: border-color 0.12s;
      }
      .mod-card:hover { border-color: var(--line-strong); }
      .mod-card__thumb {
        position: relative;
        aspect-ratio: 4 / 3;
        background: var(--bg-card-2, var(--bg-elev));
        border-right: 1px solid var(--line);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mod-card__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .mod-card__thumb-placeholder {
        font-family: var(--font-mono);
        font-size: 18px;
        color: var(--fg-subtle);
      }
      .mod-card__thumb.is-empty {
        border-color: transparent;
      }
      .mod-card__thumb-initial {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 56px;
        color: oklch(0.18 0 0 / 0.82);
        line-height: 1;
      }
      .mod-card__thumb-tag {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 3px 7px;
        background: var(--bg);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg);
      }
      .mod-card__thumb-tag[data-t='new'] {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .mod-card__body {
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
      }
      .mod-card__head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .mod-card__title {
        font-weight: 600;
        font-size: 16px;
        color: var(--fg);
        line-height: 1.2;
        margin: 0;
      }
      .mod-card__title a {
        color: inherit;
        text-decoration: none;
      }
      .mod-card__title a:hover { color: var(--accent); }
      .mod-card__meta {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .mod-card__meta .sep { color: var(--fg-subtle); }
      .chip-cat {
        display: inline-flex;
        align-items: center;
        padding: 1px 7px;
        background: var(--bg);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
      }

      .mod-card__side {
        padding: 14px 16px;
        border-left: 1px solid var(--line);
        background: var(--bg);
        display: flex;
        flex-direction: column;
        gap: 10px;
        justify-content: center;
      }
      .mod-card__actions {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .mod-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid var(--line-strong);
        background: var(--bg);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
        text-decoration: none;
        text-align: left;
        min-height: auto;
        min-width: auto;
      }
      .mod-btn:hover:not(:disabled) { border-color: var(--fg-muted); }
      .mod-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mod-btn--ok {
        background: oklch(0.45 0.12 145);
        color: oklch(0.96 0.04 145);
        border-color: oklch(0.50 0.12 145);
      }
      .mod-btn--ok:hover:not(:disabled) {
        background: oklch(0.50 0.14 145);
        border-color: oklch(0.55 0.14 145);
      }
      [data-theme='dark'] .mod-btn--ok {
        background: oklch(0.30 0.10 145);
        color: oklch(0.94 0.04 145);
        border-color: oklch(0.40 0.10 145);
      }
      [data-theme='dark'] .mod-btn--ok:hover:not(:disabled) {
        background: oklch(0.36 0.12 145);
        border-color: oklch(0.50 0.14 145);
      }
      .mod-btn--bad {
        color: oklch(0.55 0.16 28);
      }
      .mod-btn--bad:hover:not(:disabled) {
        background: oklch(0.92 0.04 28);
        color: oklch(0.45 0.18 28);
        border-color: oklch(0.55 0.12 28);
      }
      [data-theme='dark'] .mod-btn--bad {
        color: oklch(0.82 0.16 28);
      }
      [data-theme='dark'] .mod-btn--bad:hover:not(:disabled) {
        background: oklch(0.32 0.08 28 / 0.28);
        color: oklch(0.88 0.18 28);
        border-color: oklch(0.50 0.12 28);
      }
      .mod-btn--ghost {
        border-color: var(--line);
        color: var(--fg-muted);
      }
      .mod-btn--ghost:hover:not(:disabled) { color: var(--fg); }

      /* empty state */
      .ct-empty {
        border: 1px dashed var(--line);
        background: var(--bg-card);
        padding: 48px 32px;
        text-align: center;
        color: var(--fg-muted);
      }
      .ct-empty h3 {
        font-family: var(--font-display);
        font-size: 28px;
        margin: 0 0 8px;
        text-transform: uppercase;
        color: var(--fg);
        letter-spacing: 0.01em;
      }
      .ct-empty p {
        margin: 0 0 16px;
        font-size: 14px;
        max-width: 56ch;
        margin-left: auto;
        margin-right: auto;
      }
      .ct-empty .ct-head__cta {
        display: inline-flex;
      }

      /* responsive */
      @media (max-width: 1100px) {
        .mod-card { grid-template-columns: 130px 1fr; }
        .mod-card__side {
          grid-column: 1 / -1;
          border-left: 0;
          border-top: 1px solid var(--line);
        }
      }
      @media (max-width: 800px) {
        .cn-strip {
          grid-template-columns: repeat(2, 1fr);
        }
        .cn-strip__cell:nth-child(odd) {
          border-right: 1px dashed var(--line);
        }
        .cn-strip__cell {
          border-bottom: 1px dashed var(--line);
        }
        .cn-strip__cell:nth-last-child(-n + 2) {
          border-bottom: 0;
        }
        .cn-toolbar { grid-template-columns: 1fr; }
        .mod-card { grid-template-columns: 1fr; }
        .mod-card__thumb {
          aspect-ratio: 16 / 6;
          border-right: 0;
          border-bottom: 1px solid var(--line);
        }
        .cn-tbl thead th.hide-sm,
        .cn-tbl td.hide-sm { display: none; }
        .cn-gear__model { max-width: 22ch; }
      }
    `,
  ],
})
export class ContributiiTezaurPage {
  readonly tezaur = inject(TezaurService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly drafts = signal<TezaurMyDraft[]>([]);
  readonly loadingMine = signal(true);

  readonly queue = signal<TezaurModerationItem[]>([]);
  readonly queueTotalCount = signal(0);
  readonly loadingQueue = signal(false);

  readonly deleting = signal<string | null>(null);
  readonly acting = signal<string | null>(null);

  readonly filter = signal<MineFilter>('all');
  readonly searchMine = signal('');
  readonly sortMine = signal<'newest' | 'oldest' | 'state'>('newest');
  readonly searchQueue = signal('');
  readonly activeTab = signal<TabKey>('mine');

  readonly isModerator = computed(() =>
    hasAnyRole(this.auth.currentUser(), ['curator', 'admin', 'superadmin']),
  );

  readonly counts = computed(() => {
    const rows = this.drafts();
    return {
      draft: rows.filter((r) => r.state === 'draft').length,
      submitted: rows.filter((r) => r.state === 'submitted').length,
      approved: rows.filter((r) => r.state === 'approved').length,
      rejected: rows.filter((r) => r.state === 'rejected').length,
    };
  });

  readonly approvalRate = computed(() => {
    const c = this.counts();
    const decided = c.approved + c.rejected;
    if (decided === 0) return this.i18n.t('contributii_tezaur.approval_rate_none');
    const pct = Math.round((c.approved / decided) * 100);
    return this.i18n.t('contributii_tezaur.approval_rate', { pct: String(pct) });
  });

  readonly rejectedNeedingResponse = computed(() =>
    this.drafts().filter((d) => d.state === 'rejected'),
  );

  readonly filteredDrafts = computed(() => {
    const all = this.drafts();
    const f = this.filter();
    const q = this.searchMine().trim().toLowerCase();
    const sort = this.sortMine();

    let rows =
      f === 'all'
        ? all
        : all.filter((r) => r.state === (f as GearState));

    if (q) {
      rows = rows.filter(
        (r) =>
          r.brand.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q),
      );
    }

    const stateOrder: Record<GearState, number> = {
      rejected: 0,
      submitted: 1,
      draft: 2,
      approved: 3,
    };

    return [...rows].sort((a, b) => {
      if (sort === 'state') {
        return stateOrder[a.state] - stateOrder[b.state];
      }
      const at = new Date(a.submittedAt || a.updatedAt).getTime();
      const bt = new Date(b.submittedAt || b.updatedAt).getTime();
      return sort === 'oldest' ? at - bt : bt - at;
    });
  });

  readonly filteredQueue = computed(() => {
    const all = this.queue();
    const q = this.searchQueue().trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.brand.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q),
    );
  });

  readonly allSectionLabel = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.i18n.t('contributii_tezaur.section_all');
    return this.i18n.t('contributii_tezaur.section_filtered', {
      label: this.i18n.t('contributii_tezaur.status_' + this.stateToPill(f as GearState)),
    });
  });

  constructor() {
    // Restore active tab from URL hash so refresh remembers.
    const hash = (location.hash || '').replace('#', '');
    if (hash === 'queue') this.activeTab.set('queue');

    void this.refreshMine();
    if (this.isModerator()) {
      void this.refreshQueue();
    }
  }

  setTab(tab: TabKey): void {
    if (tab === 'queue' && !this.isModerator()) return;
    this.activeTab.set(tab);
    history.replaceState(null, '', '#' + tab);
    if (tab === 'queue' && this.queue().length === 0 && !this.loadingQueue()) {
      void this.refreshQueue();
    }
  }

  setFilter(f: MineFilter): void {
    this.filter.set(f);
  }

  onSearchMine(event: Event): void {
    this.searchMine.set((event.target as HTMLInputElement).value);
  }

  onSearchQueue(event: Event): void {
    this.searchQueue.set((event.target as HTMLInputElement).value);
  }

  onSortMine(event: Event): void {
    this.sortMine.set((event.target as HTMLSelectElement).value as 'newest' | 'oldest' | 'state');
  }

  stateToPill(state: GearState): 'approved' | 'pending' | 'changes' | 'draft' {
    switch (state) {
      case 'approved':
        return 'approved';
      case 'submitted':
        return 'pending';
      case 'rejected':
        return 'changes';
      case 'draft':
      default:
        return 'draft';
    }
  }

  async deleteDraft(id: string): Promise<void> {
    const ok = confirm(this.i18n.t('contributii_tezaur.delete_confirm'));
    if (!ok) return;
    this.deleting.set(id);
    try {
      await this.tezaur.deleteDraft(id);
      this.drafts.update((rows) => rows.filter((r) => r.id !== id));
    } catch (err) {
      console.error('[contributii-tezaur] delete failed', err);
    } finally {
      this.deleting.set(null);
    }
  }

  async approveItem(id: string): Promise<void> {
    this.acting.set(id);
    try {
      await this.tezaur.approveModerationItem(id);
      this.queue.update((rows) => rows.filter((r) => r.id !== id));
      this.queueTotalCount.update((n) => Math.max(0, n - 1));
      void this.refreshMine();
    } catch (err) {
      console.error('[contributii-tezaur] approve failed', err);
      alert(this.i18n.t('contributii_tezaur.action_error'));
    } finally {
      this.acting.set(null);
    }
  }

  async rejectItem(id: string): Promise<void> {
    const reason = prompt(this.i18n.t('contributii_tezaur.reject_prompt'));
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      alert(this.i18n.t('contributii_tezaur.reject_too_short'));
      return;
    }
    this.acting.set(id);
    try {
      await this.tezaur.rejectModerationItem(id, trimmed);
      this.queue.update((rows) => rows.filter((r) => r.id !== id));
      this.queueTotalCount.update((n) => Math.max(0, n - 1));
      void this.refreshMine();
    } catch (err) {
      console.error('[contributii-tezaur] reject failed', err);
      alert(this.i18n.t('contributii_tezaur.action_error'));
    } finally {
      this.acting.set(null);
    }
  }

  brandInitial(brand: string | null | undefined): string {
    const b = (brand ?? '').trim();
    if (!b || b === 'Necunoscut') return '?';
    return b[0].toUpperCase();
  }

  /** Deterministic hue from the brand name so each brand gets its own tint. */
  brandColor(brand: string | null | undefined): string {
    const b = (brand ?? '').trim() || 'unknown';
    let h = 0;
    for (let i = 0; i < b.length; i++) h = ((h << 5) - h + b.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return `oklch(0.78 0.08 ${hue})`;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      const today = new Date();
      const diffMs = today.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const time = date.toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (diffDays === 0) return this.i18n.t('contributii_tezaur.today') + ' · ' + time;
      if (diffDays === 1) return this.i18n.t('contributii_tezaur.yesterday') + ' · ' + time;
      if (diffDays < 14) {
        return this.i18n.t('contributii_tezaur.days_ago', { n: String(diffDays) });
      }
      return date.toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  private async refreshMine(): Promise<void> {
    this.loadingMine.set(true);
    try {
      const list = await this.tezaur.listMyDrafts();
      this.drafts.set(list);
    } catch (err) {
      console.error('[contributii-tezaur] load mine failed', err);
    } finally {
      this.loadingMine.set(false);
    }
  }

  private async refreshQueue(): Promise<void> {
    this.loadingQueue.set(true);
    try {
      const res = await this.tezaur.listModerationQueue({
        state: 'submitted',
        pageSize: 100,
      });
      this.queue.set(res.items);
      this.queueTotalCount.set(res.totalCount);
    } catch (err) {
      console.error('[contributii-tezaur] load queue failed', err);
    } finally {
      this.loadingQueue.set(false);
    }
  }
}
