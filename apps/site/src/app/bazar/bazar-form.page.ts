import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DISPLAY_CURRENCIES,
  LISTING_CONDITIONS,
  LISTING_DELIVERIES,
  LISTING_KINDS,
  SHIPPING_CARRIERS,
  formatPrice,
  type DisplayCurrencyLiteral,
  type ListingConditionLiteral,
  type ListingDeliveryLiteral,
  type ListingKindLiteral,
  type ShippingCarrierLiteral,
} from '@sintezaur/shared';
import {
  SzButtonComponent,
  SzEditorComponent,
  SzIconComponent,
  type SzEditorChange,
} from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  BazarService,
  type BazarListingDetail,
  type ListingPayload,
  type QuickListSuggestion,
} from './bazar.service';

interface GearSearchHit {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
}

interface PhotoTile {
  sourceId: string;
  thumbPath: string;
}

@Component({
  selector: 'app-bazar-form-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    SzIconComponent,
    SzButtonComponent,
    SzEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- BREADCRUMB -->
      <nav class="bf-crumb" aria-label="Breadcrumb">
        <a routerLink="/bazar" class="bf-crumb__back">
          <sz-icon name="back" [size]="14" />
          {{ 'bazar.detail.back_to_list' | t }}
        </a>
        <span class="sep">·</span>
        <span class="cur">
          {{
            (isEdit() ? 'bazar.form.title_edit' : 'bazar.form.title_new') | t
          }}
        </span>
      </nav>

      <header class="bf-header">
        <h1>
          {{
            (isEdit() ? 'bazar.form.title_edit' : 'bazar.form.title_new') | t
          }}
        </h1>
        <p class="bf-header__lede">{{ 'bazar.form.lede' | t }}</p>
      </header>

      @if (loadError()) {
        <p class="bf-error">{{ loadError() }}</p>
      }

      <form class="bf-form" (submit)="save($event)">
        <!-- ===== Gear linkage ===== -->
        <section class="bf-sec">
          <h2 class="bf-sec__title">// {{ 'bazar.form.gear_section' | t }}</h2>
          <p class="bf-sec__hint">{{ 'bazar.form.gear_hint' | t }}</p>

          <div class="bf-gear-toggle">
            <label class="bf-radio">
              <input
                type="radio"
                name="gearMode"
                value="catalog"
                [checked]="gearMode() === 'catalog'"
                (change)="setGearMode('catalog')"
              />
              <span>{{ 'bazar.form.gear_from_catalog' | t }}</span>
            </label>
            <label class="bf-radio">
              <input
                type="radio"
                name="gearMode"
                value="free"
                [checked]="gearMode() === 'free'"
                (change)="setGearMode('free')"
              />
              <span>{{ 'bazar.form.gear_free_text' | t }}</span>
            </label>
          </div>

          @if (gearMode() === 'catalog') {
            <div class="bf-gear-search">
              @if (selectedGear(); as g) {
                <div class="bf-gear-chip">
                  <strong>{{ g.brand }}</strong>
                  <span>{{ g.model }}</span>
                  <button type="button" (click)="clearSelectedGear()">
                    <sz-icon name="x" [size]="12" />
                  </button>
                </div>
              } @else {
                <label class="bf-input">
                  <span>{{ 'bazar.form.gear_search_label' | t }}</span>
                  <input
                    type="text"
                    [(ngModel)]="gearSearch"
                    name="gearSearch"
                    [placeholder]="i18n.t('bazar.form.gear_search_placeholder')"
                    (input)="onGearSearch()"
                    autocomplete="off"
                  />
                </label>
                @if (gearHits().length > 0) {
                  <ul class="bf-gear-hits">
                    @for (hit of gearHits(); track hit.id) {
                      <li>
                        <button type="button" (click)="selectGear(hit)">
                          <strong>{{ hit.brand }}</strong>
                          <span>{{ hit.model }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                }
              }
            </div>
          } @else {
            <div class="bf-row">
              <label class="bf-input">
                <span>{{ 'bazar.form.raw_make' | t }} *</span>
                <input
                  type="text"
                  name="rawMake"
                  [(ngModel)]="form.rawMake"
                  maxlength="80"
                />
              </label>
              <label class="bf-input">
                <span>{{ 'bazar.form.raw_model' | t }} *</span>
                <input
                  type="text"
                  name="rawModel"
                  [(ngModel)]="form.rawModel"
                  maxlength="120"
                />
              </label>
              <label class="bf-input bf-input--narrow">
                <span>{{ 'bazar.form.raw_year' | t }}</span>
                <input
                  type="number"
                  name="rawYear"
                  [(ngModel)]="form.rawYear"
                  min="1900"
                  max="2100"
                />
              </label>
            </div>
          }
        </section>

        @if (priceSuggestion(); as s) {
          <section class="bf-suggestion">
            <h3>// {{ 'bazar.form.price_suggestion' | t }}</h3>
            <p>
              @if (s.avg !== null) {
                {{
                  'bazar.form.price_suggestion_body'
                    | t
                      : {
                          avg: formatPrice(s.avg, s.currency),
                          low: formatPrice(s.low ?? 0, s.currency),
                          high: formatPrice(s.high ?? 0, s.currency),
                          count: s.soldCount
                        }
                }}
              } @else {
                {{ 'bazar.form.price_suggestion_none' | t }}
              }
            </p>
          </section>
        }

        <!-- ===== Title + description ===== -->
        <section class="bf-sec">
          <h2 class="bf-sec__title">// {{ 'bazar.form.content_section' | t }}</h2>
          <label class="bf-input">
            <span>{{ 'bazar.form.title_label' | t }} *</span>
            <input
              type="text"
              name="title"
              [(ngModel)]="form.title"
              required
              minlength="3"
              maxlength="140"
              [placeholder]="i18n.t('bazar.form.title_placeholder')"
            />
          </label>
          <div class="bf-editor">
            <span class="bf-input__label">{{ 'bazar.form.description_label' | t }}</span>
            <sz-editor
              [value]="form.description"
              [maxLength]="8000"
              [placeholder]="i18n.t('bazar.form.description_placeholder')"
              (valueChange)="onDescriptionChange($event)"
            />
          </div>
        </section>

        <!-- ===== Price + condition ===== -->
        <section class="bf-sec">
          <h2 class="bf-sec__title">// {{ 'bazar.form.price_section' | t }}</h2>
          <div class="bf-row">
            <label class="bf-input">
              <span>{{ 'bazar.form.price_label' | t }} *</span>
              <input
                type="number"
                name="price"
                [(ngModel)]="form.price"
                min="0"
                max="1000000"
                step="1"
                required
              />
            </label>
            <label class="bf-input bf-input--narrow">
              <span>{{ 'bazar.form.currency_label' | t }} *</span>
              <select name="currency" [(ngModel)]="form.currency">
                @for (cur of currencies; track cur) {
                  <option [value]="cur">{{ cur | uppercase }}</option>
                }
              </select>
            </label>
            <label class="bf-input">
              <span>{{ 'bazar.form.condition_label' | t }} *</span>
              <select name="condition" [(ngModel)]="form.condition">
                @for (c of conditions; track c) {
                  <option [value]="c">{{ 'bazar.condition.' + c | t }}</option>
                }
              </select>
            </label>
          </div>
          @if (form.condition === 'mint') {
            <label class="bf-input">
              <span>{{ 'bazar.form.condition_note_label' | t }} *</span>
              <textarea
                name="conditionNote"
                rows="3"
                [(ngModel)]="form.conditionNote"
                minlength="50"
                maxlength="500"
                [placeholder]="i18n.t('bazar.form.condition_note_placeholder')"
              ></textarea>
              <span class="bf-input__hint">
                {{ 'bazar.form.condition_note_hint' | t }}
              </span>
            </label>
          }
          <label class="bf-checkbox">
            <input
              type="checkbox"
              name="acceptsOffers"
              [(ngModel)]="form.acceptsOffers"
            />
            <span>{{ 'bazar.form.accepts_offers' | t }}</span>
          </label>
        </section>

        <!-- ===== Kind + delivery ===== -->
        <section class="bf-sec">
          <h2 class="bf-sec__title">// {{ 'bazar.form.kind_section' | t }}</h2>
          <div class="bf-row">
            <label class="bf-input">
              <span>{{ 'bazar.form.kind_label' | t }} *</span>
              <select name="kind" [(ngModel)]="form.kind">
                @for (k of kinds; track k) {
                  <option [value]="k">{{ 'bazar.kind.' + k | t }}</option>
                }
              </select>
            </label>
            <label class="bf-input">
              <span>{{ 'bazar.form.delivery_label' | t }} *</span>
              <select name="delivery" [(ngModel)]="form.delivery">
                @for (d of deliveries; track d) {
                  <option [value]="d">{{ 'bazar.delivery.' + d | t }}</option>
                }
              </select>
            </label>
          </div>
          @if (form.kind !== 'sell') {
            <label class="bf-input">
              <span>{{ 'bazar.form.looking_for_label' | t }} *</span>
              <textarea
                name="lookingFor"
                rows="3"
                [(ngModel)]="form.lookingFor"
                minlength="5"
                maxlength="500"
                [placeholder]="i18n.t('bazar.form.looking_for_placeholder')"
              ></textarea>
            </label>
          }
          @if (form.delivery !== 'pickup_only') {
            <label class="bf-input bf-input--narrow">
              <span>{{ 'bazar.form.shipping_cost_label' | t }}</span>
              <input
                type="number"
                name="shippingCost"
                [(ngModel)]="form.shippingCost"
                min="0"
                max="10000"
                step="1"
              />
            </label>
            <div class="bf-carriers">
              <span class="bf-input__label">{{ 'bazar.form.carriers_label' | t }}</span>
              <div class="bf-carriers__grid">
                @for (c of carriers; track c) {
                  <label class="bf-check">
                    <input
                      type="checkbox"
                      [checked]="carrierSet().has(c)"
                      (change)="toggleCarrier(c, $any($event.target).checked)"
                    />
                    <span class="box"></span>
                    <span>{{ carrierLabel(c) }}</span>
                  </label>
                }
              </div>
            </div>
          }
        </section>

        <!-- ===== Location + contact ===== -->
        <section class="bf-sec">
          <h2 class="bf-sec__title">// {{ 'bazar.form.location_section' | t }}</h2>
          <div class="bf-row">
            <label class="bf-input">
              <span>{{ 'bazar.form.location_label' | t }} *</span>
              <input
                type="text"
                name="location"
                [(ngModel)]="form.location"
                required
                minlength="2"
                maxlength="80"
                [placeholder]="i18n.t('bazar.form.location_placeholder')"
              />
            </label>
            <label class="bf-input">
              <span>{{ 'bazar.form.contact_phone_label' | t }}</span>
              <input
                type="tel"
                name="contactPhone"
                [(ngModel)]="form.contactPhone"
                maxlength="40"
                [placeholder]="i18n.t('bazar.form.contact_phone_placeholder')"
              />
              <span class="bf-input__hint">
                {{ 'bazar.form.contact_phone_hint' | t }}
              </span>
            </label>
          </div>
        </section>

        <!-- ===== Photos (only after listing exists) ===== -->
        @if (existingId()) {
          <section class="bf-sec">
            <h2 class="bf-sec__title">// {{ 'bazar.form.photos_section' | t }}</h2>
            <p class="bf-sec__hint">{{ 'bazar.form.photos_hint' | t }}</p>

            <div class="bf-photos">
              @for (p of photoTiles(); track p.sourceId; let i = $index) {
                <div class="bf-photo">
                  <img [src]="bazar.imageUrl(p.thumbPath)" alt="" />
                  <div class="bf-photo__bar">
                    <button
                      type="button"
                      [disabled]="i === 0 || photoActionId() === p.sourceId"
                      (click)="movePhoto(i, i - 1)"
                      [attr.aria-label]="i18n.t('bazar.form.photo_move_up')"
                    >
                      <sz-icon name="chevron-left" [size]="12" />
                    </button>
                    <button
                      type="button"
                      [disabled]="i === photoTiles().length - 1 || photoActionId() === p.sourceId"
                      (click)="movePhoto(i, i + 1)"
                      [attr.aria-label]="i18n.t('bazar.form.photo_move_down')"
                    >
                      <sz-icon name="chevron-right" [size]="12" />
                    </button>
                    <button
                      type="button"
                      class="bf-photo__del"
                      [disabled]="photoActionId() === p.sourceId"
                      (click)="removePhoto(p.sourceId)"
                      [attr.aria-label]="i18n.t('bazar.form.photo_remove')"
                    >
                      <sz-icon name="x" [size]="12" />
                    </button>
                  </div>
                  @if (i === 0) {
                    <span class="bf-photo__hero">{{ 'bazar.form.photo_hero' | t }}</span>
                  }
                </div>
              }
              <label class="bf-photo bf-photo--add">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  (change)="onPhotoSelected($any($event.target))"
                />
                <span>+</span>
                <span class="bf-photo__add-label">
                  {{ 'bazar.form.photo_add' | t }}
                </span>
              </label>
            </div>
            @if (photoError()) {
              <p class="bf-error">{{ photoError() }}</p>
            }
          </section>
        } @else {
          <section class="bf-sec bf-sec--muted">
            <p>{{ 'bazar.form.photos_after_save' | t }}</p>
          </section>
        }

        <!-- ===== Submit ===== -->
        @if (submitError()) {
          <p class="bf-error">{{ submitError() }}</p>
        }
        <footer class="bf-footer">
          <a class="bf-cancel" routerLink="/bazar">{{ 'bazar.form.cancel' | t }}</a>
          @if (isEdit() && existingId()) {
            <button
              type="button"
              class="bf-delete"
              (click)="confirmDelete()"
              [disabled]="pending()"
            >
              {{ 'bazar.form.delete' | t }}
            </button>
          }
          <button
            sz-button
            type="submit"
            [disabled]="!canSubmit() || pending()"
          >
            {{
              (pending()
                ? 'bazar.form.saving'
                : isEdit()
                  ? 'bazar.form.save_changes'
                  : 'bazar.form.publish') | t
            }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .bf-crumb {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 0;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .bf-crumb a { color: var(--accent); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
      .bf-crumb .sep { color: var(--fg-subtle); }
      .bf-crumb .cur { color: var(--fg); }

      .bf-header {
        margin: 12px 0 22px;
        padding-bottom: 18px;
        border-bottom: 1px dashed var(--line);
      }
      .bf-header h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 42px);
        line-height: 1.1;
        margin: 0 0 8px;
      }
      .bf-header__lede {
        color: var(--fg-muted);
        font-size: 15px;
        max-width: 60ch;
        margin: 0;
      }

      .bf-form { display: flex; flex-direction: column; gap: 28px; padding-bottom: var(--gutter-y); }

      .bf-sec {
        padding: 18px 20px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .bf-sec--muted { background: transparent; color: var(--fg-muted); font-family: var(--font-mono); font-size: 12px; }
      .bf-sec__title {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg);
        margin: 0;
      }
      .bf-sec__hint { color: var(--fg-muted); font-size: 13px; margin: -4px 0 0; }

      .bf-suggestion {
        padding: 14px 20px;
        border: 1px dashed var(--accent);
        background: color-mix(in oklab, var(--accent) 5%, var(--bg-elev));
      }
      .bf-suggestion h3 {
        margin: 0 0 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--accent);
      }
      .bf-suggestion p { margin: 0; font-size: 14px; color: var(--fg); }

      .bf-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
      @media (max-width: 720px) { .bf-row { grid-template-columns: 1fr; } }

      .bf-input { display: flex; flex-direction: column; gap: 6px; }
      .bf-input--narrow { max-width: 220px; }
      .bf-input span,
      .bf-input__label {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .bf-input input,
      .bf-input select,
      .bf-input textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
      }
      .bf-input textarea { resize: vertical; min-height: 60px; }
      .bf-input :is(input, select, textarea):focus {
        outline: 1px solid var(--accent);
        border-color: var(--accent);
      }
      .bf-input__hint {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        color: var(--fg-subtle);
        text-transform: none;
      }

      .bf-editor { display: flex; flex-direction: column; gap: 8px; }

      .bf-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: var(--fg);
        cursor: pointer;
      }
      .bf-checkbox input { width: 16px; height: 16px; accent-color: var(--accent); }

      .bf-gear-toggle { display: flex; gap: 18px; }
      .bf-radio {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: var(--fg);
        font-family: var(--font-mono);
        letter-spacing: 0.06em;
      }
      .bf-radio input { accent-color: var(--accent); }

      .bf-gear-search { position: relative; }
      .bf-gear-hits {
        position: absolute;
        z-index: 10;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        max-height: 260px;
        overflow-y: auto;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .bf-gear-hits li + li { border-top: 1px solid var(--line); }
      .bf-gear-hits button {
        width: 100%;
        text-align: left;
        background: none;
        border: 0;
        padding: 10px 14px;
        cursor: pointer;
        display: flex;
        gap: 8px;
        align-items: baseline;
        font-size: 14px;
      }
      .bf-gear-hits button:hover { background: var(--bg-elev); color: var(--accent); }
      .bf-gear-hits strong { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--accent); text-transform: uppercase; }

      .bf-gear-chip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--bg);
        border: 1px solid var(--accent);
      }
      .bf-gear-chip strong { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; color: var(--accent); text-transform: uppercase; }
      .bf-gear-chip button {
        background: none;
        border: 0;
        cursor: pointer;
        color: var(--fg-muted);
        padding: 2px;
      }
      .bf-gear-chip button:hover { color: var(--accent); }

      .bf-carriers { display: flex; flex-direction: column; gap: 6px; }
      .bf-carriers__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px 12px;
      }
      @media (max-width: 720px) { .bf-carriers__grid { grid-template-columns: 1fr 1fr; } }
      .bf-check {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: var(--fg-muted);
      }
      .bf-check input { display: none; }
      .bf-check .box {
        width: 14px; height: 14px;
        border: 1px solid var(--line-strong);
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .bf-check .box::after {
        content: '';
        width: 8px; height: 8px;
        background: var(--accent);
        opacity: 0;
      }
      .bf-check input:checked + .box { border-color: var(--accent); }
      .bf-check input:checked + .box::after { opacity: 1; }
      .bf-check input:checked ~ span { color: var(--fg); }

      .bf-photos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
      }
      .bf-photo {
        position: relative;
        aspect-ratio: 1 / 1;
        background: var(--bg);
        border: 1px solid var(--line);
        overflow: hidden;
      }
      .bf-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .bf-photo__bar {
        position: absolute;
        inset: auto 0 0 0;
        display: flex;
        background: color-mix(in oklab, var(--bg) 88%, transparent);
        backdrop-filter: blur(6px);
      }
      .bf-photo__bar button {
        flex: 1;
        padding: 8px;
        background: none;
        border: 0;
        cursor: pointer;
        color: var(--fg-muted);
      }
      .bf-photo__bar button:not(:last-child) { border-right: 1px solid var(--line); }
      .bf-photo__bar button:hover:not(:disabled) { color: var(--accent); }
      .bf-photo__bar button:disabled { opacity: 0.35; cursor: not-allowed; }
      .bf-photo__del { color: #c0392b !important; }
      .bf-photo__hero {
        position: absolute;
        top: 6px;
        left: 6px;
        padding: 2px 6px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .bf-photo--add {
        display: grid;
        place-items: center;
        cursor: pointer;
        border-style: dashed;
        color: var(--fg-muted);
      }
      .bf-photo--add:hover { border-color: var(--accent); color: var(--accent); }
      .bf-photo--add input { display: none; }
      .bf-photo--add > span { font-size: 32px; font-weight: 200; }
      .bf-photo__add-label {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .bf-footer {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: flex-end;
        padding-top: 18px;
        border-top: 1px dashed var(--line);
      }
      .bf-cancel {
        color: var(--fg-muted);
        text-decoration: none;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 12px 16px;
        margin-right: auto;
      }
      .bf-cancel:hover { color: var(--fg); }
      .bf-delete {
        padding: 12px 16px;
        background: var(--bg-elev);
        border: 1px solid #c0392b;
        color: #c0392b;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .bf-delete:hover { background: #c0392b; color: var(--bg); }
      .bf-delete:disabled { opacity: 0.5; cursor: not-allowed; }

      .bf-error {
        margin: 0;
        padding: 10px 14px;
        background: color-mix(in oklab, #c0392b 12%, var(--bg));
        border: 1px solid #c0392b;
        color: #c0392b;
        font-family: var(--font-mono);
        font-size: 12px;
      }
    `,
  ],
})
export class BazarFormPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly conditions = LISTING_CONDITIONS;
  readonly kinds = LISTING_KINDS;
  readonly deliveries = LISTING_DELIVERIES;
  readonly carriers = SHIPPING_CARRIERS;
  readonly currencies = DISPLAY_CURRENCIES;

  readonly slug = signal<string | null>(null);
  readonly existingId = signal<string | null>(null);
  readonly existingSlug = signal<string | null>(null);
  readonly isEdit = computed(() => this.slug() !== null);

  readonly gearMode = signal<'catalog' | 'free'>('catalog');
  readonly selectedGear = signal<GearSearchHit | null>(null);
  gearSearch = '';
  readonly gearHits = signal<GearSearchHit[]>([]);

  readonly priceSuggestion = signal<QuickListSuggestion['priceStats'] | null>(
    null,
  );

  readonly photoTiles = signal<PhotoTile[]>([]);
  readonly photoActionId = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);

  readonly pending = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly formatPrice = formatPrice;

  form: FormState = freshForm();

  readonly carrierSet = computed(() => new Set(this.form.shippingCarriers));

  readonly canSubmit = computed(() => {
    const f = this.form;
    if (!f.title || f.title.length < 3) return false;
    if (typeof f.price !== 'number' || f.price < 0) return false;
    if (!f.location || f.location.length < 2) return false;
    if (this.gearMode() === 'free') {
      if (!f.rawMake || !f.rawModel) return false;
    } else if (!this.selectedGear()) {
      return false;
    }
    if (f.condition === 'mint' && (!f.conditionNote || f.conditionNote.length < 50))
      return false;
    if (f.kind !== 'sell' && (!f.lookingFor || f.lookingFor.length < 5))
      return false;
    return true;
  });

  private gearSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      this.slug.set(slug);
      if (slug) {
        void this.loadForEdit(slug);
      } else {
        void this.maybeQuickList();
      }
    });
  }

  private async maybeQuickList(): Promise<void> {
    const qp = this.route.snapshot.queryParamMap;
    const gearId = qp.get('gearId');
    if (!gearId) return;
    try {
      const sug = await this.bazar.quickList(gearId);
      this.selectedGear.set(sug.gear);
      this.form.title = sug.suggestedTitle;
      this.form.currency = sug.priceStats.currency;
      if (sug.suggestedConditions[0]) {
        this.form.condition =
          sug.suggestedConditions[0] as ListingConditionLiteral;
      }
      if (sug.priceStats.avg !== null) {
        this.form.price = sug.priceStats.avg;
      }
      this.priceSuggestion.set(sug.priceStats);
    } catch (err) {
      console.warn('[bazar] quick-list fetch failed', err);
    }
  }

  private async loadForEdit(slug: string): Promise<void> {
    this.loadError.set(null);
    try {
      const d = await this.bazar.detail(slug);
      this.fillFromDetail(d);
    } catch (err) {
      console.error('[bazar] load for edit failed', err);
      this.loadError.set(this.i18n.t('bazar.form.load_error'));
    }
  }

  private fillFromDetail(d: BazarListingDetail): void {
    this.existingId.set(d.listing.id);
    this.existingSlug.set(d.listing.slug);
    this.gearMode.set(d.gear ? 'catalog' : 'free');
    this.selectedGear.set(d.gear);
    this.form = {
      rawMake: d.listing.rawMake ?? '',
      rawModel: d.listing.rawModel ?? '',
      rawYear: d.listing.rawYear ?? null,
      title: d.listing.title,
      description: d.listing.description,
      descriptionHtml: d.listing.descriptionHtml,
      price: Number(d.listing.price),
      currency: d.listing.currency,
      condition: d.listing.condition,
      conditionNote: d.listing.conditionNote ?? '',
      kind: d.listing.kind,
      lookingFor: d.listing.lookingFor ?? '',
      delivery: d.listing.delivery,
      shippingCost: d.listing.shippingCost
        ? Number(d.listing.shippingCost)
        : null,
      shippingCarriers: d.listing.shippingCarriers as ShippingCarrierLiteral[],
      acceptsOffers: d.listing.acceptsOffers,
      location: d.listing.location,
      contactPhone: d.listing.contactPhone ?? '',
    };
    // Build photo tiles from variants grouped by sourceId.
    const bySource = new Map<string, typeof d.photos>();
    for (const p of d.photos) {
      const arr = bySource.get(p.sourceId) ?? [];
      arr.push(p);
      bySource.set(p.sourceId, arr);
    }
    const tiles: PhotoTile[] = Array.from(bySource.entries())
      .map(([sourceId, group]) => {
        const thumb =
          group.find((g) => g.variant === 'square_thumb') ??
          group.find((g) => g.variant === 'square_medium') ??
          group[0];
        return {
          sourceId,
          thumbPath: thumb.path,
          position: thumb.position,
        };
      })
      .sort((a, b) => a.position - b.position)
      .map(({ sourceId, thumbPath }) => ({ sourceId, thumbPath }));
    this.photoTiles.set(tiles);
  }

  setGearMode(mode: 'catalog' | 'free'): void {
    this.gearMode.set(mode);
    if (mode === 'catalog') {
      this.form.rawMake = '';
      this.form.rawModel = '';
      this.form.rawYear = null;
    } else {
      this.selectedGear.set(null);
      this.gearHits.set([]);
      this.priceSuggestion.set(null);
    }
  }

  onGearSearch(): void {
    if (this.gearSearchDebounce) clearTimeout(this.gearSearchDebounce);
    this.gearSearchDebounce = setTimeout(() => this.runGearSearch(), 250);
  }

  private async runGearSearch(): Promise<void> {
    const q = this.gearSearch.trim();
    if (q.length < 2) {
      this.gearHits.set([]);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{
          items: { id: string; slug: string; brand: string; model: string; category: string }[];
        }>(`${environment.apiBaseUrl}/tezaur`, {
          params: { q, pageSize: 10 },
        }),
      );
      this.gearHits.set(
        res.items.map((i) => ({
          id: i.id,
          slug: i.slug,
          brand: i.brand,
          model: i.model,
          category: i.category,
        })),
      );
    } catch (err) {
      console.warn('[bazar] gear search failed', err);
      this.gearHits.set([]);
    }
  }

  async selectGear(hit: GearSearchHit): Promise<void> {
    this.selectedGear.set(hit);
    this.gearHits.set([]);
    this.gearSearch = '';
    // Fetch quick-list to suggest price + title.
    try {
      const sug = await this.bazar.quickList(hit.id);
      if (!this.form.title) this.form.title = sug.suggestedTitle;
      this.priceSuggestion.set(sug.priceStats);
      if (!this.form.price && sug.priceStats.avg !== null) {
        this.form.price = sug.priceStats.avg;
        this.form.currency = sug.priceStats.currency;
      }
    } catch (err) {
      console.warn('[bazar] quick-list fetch failed', err);
    }
  }

  clearSelectedGear(): void {
    this.selectedGear.set(null);
    this.priceSuggestion.set(null);
  }

  toggleCarrier(c: ShippingCarrierLiteral, checked: boolean): void {
    this.form.shippingCarriers = checked
      ? Array.from(new Set([...this.form.shippingCarriers, c]))
      : this.form.shippingCarriers.filter((x) => x !== c);
  }

  onDescriptionChange(change: SzEditorChange): void {
    this.form.description = change.json as Record<string, unknown>;
    this.form.descriptionHtml = change.html;
  }

  carrierLabel(c: ShippingCarrierLiteral): string {
    return c
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  async save(ev: Event): Promise<void> {
    ev.preventDefault();
    if (!this.canSubmit() || this.pending()) return;
    this.pending.set(true);
    this.submitError.set(null);
    const payload = this.buildPayload();
    try {
      if (this.isEdit() && this.existingId()) {
        const res = await this.bazar.updateOwn(this.existingId()!, payload);
        this.existingSlug.set(res.slug);
        // Reload to refresh data.
        await this.loadForEdit(res.slug);
      } else {
        const res = await this.bazar.create(payload);
        // Navigate into edit mode so photos section appears.
        void this.router.navigate(['/bazar', res.slug, 'editare']);
      }
    } catch (err: unknown) {
      console.error('[bazar] save failed', err);
      this.submitError.set(this.i18n.t('bazar.form.save_error'));
    } finally {
      this.pending.set(false);
    }
  }

  private buildPayload(): ListingPayload {
    const f = this.form;
    const isCatalog = this.gearMode() === 'catalog';
    const sel = this.selectedGear();
    return {
      gearId: isCatalog && sel ? sel.id : undefined,
      rawMake: !isCatalog ? f.rawMake || undefined : undefined,
      rawModel: !isCatalog ? f.rawModel || undefined : undefined,
      rawYear: !isCatalog ? f.rawYear ?? undefined : undefined,
      title: f.title,
      description: f.description ?? {},
      descriptionHtml: f.descriptionHtml,
      price: Number(f.price),
      currency: f.currency,
      condition: f.condition,
      conditionNote: f.condition === 'mint' ? f.conditionNote : undefined,
      kind: f.kind,
      lookingFor: f.kind !== 'sell' ? f.lookingFor : undefined,
      delivery: f.delivery,
      shippingCost:
        f.delivery !== 'pickup_only' && typeof f.shippingCost === 'number'
          ? f.shippingCost
          : undefined,
      shippingCarriers:
        f.delivery !== 'pickup_only' ? f.shippingCarriers : undefined,
      acceptsOffers: f.acceptsOffers,
      location: f.location,
      contactPhone: f.contactPhone || undefined,
    };
  }

  async confirmDelete(): Promise<void> {
    if (!this.existingId()) return;
    const ok = window.confirm(this.i18n.t('bazar.form.delete_confirm'));
    if (!ok) return;
    this.pending.set(true);
    try {
      await this.bazar.removeOwn(this.existingId()!);
      void this.router.navigate(['/bazar']);
    } catch (err) {
      console.error('[bazar] delete failed', err);
      this.submitError.set(this.i18n.t('bazar.form.delete_error'));
    } finally {
      this.pending.set(false);
    }
  }

  async onPhotoSelected(input: HTMLInputElement): Promise<void> {
    if (!this.existingId() || !input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';
    this.photoError.set(null);
    for (const file of files) {
      this.photoActionId.set(file.name);
      try {
        await this.bazar.uploadPhoto(this.existingId()!, file);
      } catch (err) {
        console.error('[bazar] photo upload failed', err);
        this.photoError.set(
          this.i18n.t('bazar.form.photo_upload_error', { name: file.name }),
        );
        break;
      } finally {
        this.photoActionId.set(null);
      }
    }
    // Reload to pick up newly attached photos in canonical order.
    if (this.existingSlug()) await this.loadForEdit(this.existingSlug()!);
  }

  async removePhoto(sourceId: string): Promise<void> {
    if (!this.existingId()) return;
    this.photoActionId.set(sourceId);
    this.photoError.set(null);
    try {
      await this.bazar.removePhoto(this.existingId()!, sourceId);
      this.photoTiles.update((tiles) =>
        tiles.filter((t) => t.sourceId !== sourceId),
      );
    } catch (err) {
      console.error('[bazar] photo delete failed', err);
      this.photoError.set(this.i18n.t('bazar.form.photo_delete_error'));
    } finally {
      this.photoActionId.set(null);
    }
  }

  async movePhoto(from: number, to: number): Promise<void> {
    if (!this.existingId()) return;
    const tiles = [...this.photoTiles()];
    if (to < 0 || to >= tiles.length) return;
    const [moved] = tiles.splice(from, 1);
    tiles.splice(to, 0, moved);
    this.photoTiles.set(tiles);
    try {
      await this.bazar.reorderPhotos(
        this.existingId()!,
        tiles.map((t) => t.sourceId),
      );
    } catch (err) {
      console.error('[bazar] photo reorder failed', err);
      this.photoError.set(this.i18n.t('bazar.form.photo_reorder_error'));
    }
  }
}

interface FormState {
  rawMake: string;
  rawModel: string;
  rawYear: number | null;
  title: string;
  description: Record<string, unknown>;
  descriptionHtml: string;
  price: number | null;
  currency: DisplayCurrencyLiteral;
  condition: ListingConditionLiteral;
  conditionNote: string;
  kind: ListingKindLiteral;
  lookingFor: string;
  delivery: ListingDeliveryLiteral;
  shippingCost: number | null;
  shippingCarriers: ShippingCarrierLiteral[];
  acceptsOffers: boolean;
  location: string;
  contactPhone: string;
}

function freshForm(): FormState {
  return {
    rawMake: '',
    rawModel: '',
    rawYear: null,
    title: '',
    description: {},
    descriptionHtml: '',
    price: null,
    currency: 'ron',
    condition: 'very_good',
    conditionNote: '',
    kind: 'sell',
    lookingFor: '',
    delivery: 'pickup_only',
    shippingCost: null,
    shippingCarriers: [],
    acceptsOffers: true,
    location: '',
    contactPhone: '',
  };
}
