/**
 * Shared SCSS string for the auth form layout. Inlined into the
 * standalone components' `styles` array so the bundle splitter
 * keeps it together with each page chunk (each form is a small
 * leaf component, no benefit to a separate stylesheet).
 *
 * Tokens come from libs/ui/src/lib/tokens/tokens.css (loaded via
 * apps/site/src/styles.scss at the application root).
 */
export const authFormStyles = `
  form { display: flex; flex-direction: column; gap: 18px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field__label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .field__input {
    width: 100%;
    padding: 12px 14px;
    background: var(--bg-card);
    border: var(--grid-line) solid var(--line);
    color: var(--fg);
    outline: none;
    border-radius: var(--radius);
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .field__input:focus {
    border-color: var(--accent);
    background: var(--bg-card-2);
  }
  .field__input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .field__help {
    font-size: 12px;
    color: var(--fg-subtle);
  }
  .field__error {
    font-size: 12px;
    color: #e07a5f;
  }
  .submit {
    margin-top: 8px;
    padding: 14px 18px;
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    transition: filter 0.15s ease, transform 0.1s ease;
    border-radius: var(--radius);
    width: 100%;
  }
  .submit:hover:not(:disabled) { filter: brightness(1.08); }
  .submit:active:not(:disabled) { transform: translateY(1px); }
  .submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-error {
    background: rgba(224, 122, 95, 0.12);
    border: 1px solid rgba(224, 122, 95, 0.45);
    color: #e07a5f;
    padding: 10px 14px;
    font-size: 13px;
    border-radius: var(--radius);
  }
  .form-success {
    background: rgba(120, 180, 100, 0.12);
    border: 1px solid rgba(120, 180, 100, 0.4);
    color: oklch(0.78 0.12 145);
    padding: 12px 14px;
    font-size: 14px;
    border-radius: var(--radius);
    margin-bottom: 16px;
  }
  .extra {
    margin-top: 20px;
    text-align: center;
    font-size: 13px;
    color: var(--fg-muted);
  }
  .extra a {
    color: var(--fg);
    text-decoration: underline;
    text-underline-offset: 4px;
    min-height: 0;
  }
  .extra a:hover {
    color: var(--accent);
  }
`;
