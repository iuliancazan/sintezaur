import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Sintezaur PrimeNG theme preset.
 *
 * Re-binds the primary palette to Sintezaur's gold accent and remaps
 * surface scales to the warm-cream / neutral-dark palettes used
 * elsewhere via CSS tokens. Per-component design tokens that we want
 * to fine-tune live in each component's own template (via CSS class
 * overrides on `var(--token)`); they're intentionally NOT in the
 * preset because the typed PrimeNG `*DesignTokens` interfaces don't
 * cover every property we care about.
 *
 * Apps consume via:
 *   providePrimeNG({
 *     theme: {
 *       preset: SintezaurPreset,
 *       options: { darkModeSelector: '[data-theme="dark"]' },
 *     },
 *   });
 */
export const SintezaurPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff8e6',
      100: '#fdebbf',
      200: '#fadd96',
      300: '#f6cf6c',
      400: '#f1c149',
      500: '#ebb023',
      600: '#d59c1c',
      700: '#b58414',
      800: '#8e6710',
      900: '#634809',
      950: '#3a2a04',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#faf6e8',
          50: '#f3eedd',
          100: '#ebe5cf',
          200: '#d4ccaf',
          300: '#b4a983',
          400: '#948a6c',
          500: '#6a6147',
          600: '#4a432d',
          700: '#312b1a',
          800: '#1f1b0f',
          900: '#18140c',
          950: '#0b0905',
        },
      },
      dark: {
        surface: {
          0: '#181819',
          50: '#1f1f20',
          100: '#2a2a2c',
          200: '#3e3e40',
          300: '#5c5b58',
          400: '#8e8d8a',
          500: '#a8a7a4',
          600: '#c1bfbc',
          700: '#d5d3d0',
          800: '#e5e3e0',
          900: '#edecea',
          950: '#f5f4f1',
        },
      },
    },
  },
});
