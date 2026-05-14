/**
 * @sintezaur/ui — shared Angular UI primitives consumed by site + dashboard.
 *
 * Tokens are exposed as a plain CSS file (consumed via `@use` in each
 * app's `styles.scss`); the TypeScript exports here are services and
 * standalone components.
 */

// Theme
export {
  ThemeService,
  type ThemeMode,
  type ResolvedTheme,
} from './lib/theme/theme.service';
export { SintezaurPreset } from './lib/theme/primeng-preset';

// Icons
export {
  SINTEZAUR_ICON_NAMES,
  SINTEZAUR_SPRITE_SVG,
  type SintezaurIconName,
} from './lib/icons/sintezaur-icons';
export { SzIconComponent } from './lib/icons/icon.component';
export { provideSintezaurIcons } from './lib/icons/provide-icons';

// Atomic components
export {
  SzButtonComponent,
  type SzButtonSize,
  type SzButtonVariant,
} from './lib/components/button.component';
export {
  SzBadgeComponent,
  type SzBadgeVariant,
} from './lib/components/badge.component';
export {
  SzInputComponent,
  type SzInputVariant,
} from './lib/components/input.component';
export {
  SzAvatarComponent,
  type SzAvatarSize,
} from './lib/components/avatar.component';
export {
  SzCardComponent,
  type SzCardVariant,
} from './lib/components/card.component';
export {
  SzTopbarComponent,
  type SzNavLink,
  type SzTopbarUser,
} from './lib/components/topbar.component';
export {
  SzEditorComponent,
  type SzEditorChange,
  type SzEditorImageUploader,
} from './lib/components/editor.component';
