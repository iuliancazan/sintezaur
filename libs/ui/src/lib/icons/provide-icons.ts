import { DOCUMENT } from '@angular/common';
import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { SINTEZAUR_SPRITE_SVG } from './sintezaur-icons';

/**
 * Injects the Sintezaur SVG icon sprite into <body> once at bootstrap.
 * After this, `<sz-icon name="..." />` can reference any of the symbols
 * via `<use href="#sz-i-..." />`.
 */
export function provideSintezaurIcons(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const document = inject(DOCUMENT);
    if (document.querySelector('svg[data-sintezaur-sprite]')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = SINTEZAUR_SPRITE_SVG;
    const sprite = wrapper.firstElementChild;
    if (sprite) document.body.insertBefore(sprite, document.body.firstChild);
  });
}
