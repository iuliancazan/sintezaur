/**
 * Romanian transactional email templates for M1. Plain TypeScript
 * template literals — no template engine. Body comes out as both HTML
 * (rendered in mail clients) and a plain-text fallback.
 *
 * UI strings here live in code (not in `ro.json`) because email
 * templates are authored / reviewed in tandem with the SMTP wiring,
 * and the editorial tone is set per-template anyway. The site's
 * `ro.json` covers in-app strings.
 *
 * All links should be absolute URLs against SITE_BASE_URL (set in
 * .env). Callers pass the prebuilt URL to keep this module config-free.
 */

const SIGNATURE_HTML =
  '<p style="margin-top:32px;font-size:14px;color:#555">' +
  'Cu drag,<br/>Echipa <strong>Sintezaur</strong><br/>' +
  '<a href="https://sintezaur.ro">sintezaur.ro</a></p>';

const SIGNATURE_TEXT = '\n\nCu drag,\nEchipa Sintezaur\nhttps://sintezaur.ro\n';

const SHELL = (innerHtml: string): string =>
  `<!doctype html>
<html lang="ro">
  <body style="margin:0;padding:24px;background:#f6f6f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1c1c1c;line-height:1.55">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px 28px">
      <tr><td>${innerHtml}</td></tr>
    </table>
  </body>
</html>`;

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export function verificationEmail(params: {
  fullName: string;
  verifyUrl: string;
}): EmailMessage {
  const subject = 'Confirmă-ți adresa de email pe Sintezaur';
  const html = SHELL(
    `<h1 style="font-size:22px;margin:0 0 16px">Bine ai venit, ${escapeHtml(params.fullName)}!</h1>
     <p style="margin:0 0 16px">Mai e un singur pas: confirmă-ți adresa de email apăsând butonul de mai jos.</p>
     <p style="margin:24px 0">
       <a href="${escapeHtml(params.verifyUrl)}"
          style="display:inline-block;background:#1c1c1c;color:#ffffff;padding:14px 24px;border-radius:6px;text-decoration:none;font-weight:600">
         Confirmă email
       </a>
     </p>
     <p style="margin:0;font-size:14px;color:#555">
       Sau copiază linkul în browser:<br/>
       <a href="${escapeHtml(params.verifyUrl)}" style="word-break:break-all">${escapeHtml(params.verifyUrl)}</a>
     </p>
     <p style="margin:24px 0 0;font-size:14px;color:#555">
       Linkul expiră în 24 de ore. Dacă nu ai cerut tu acest cont, ignoră acest mesaj.
     </p>
     ${SIGNATURE_HTML}`,
  );
  const text =
    `Bine ai venit, ${params.fullName}!\n\n` +
    `Confirmă-ți adresa de email accesând linkul:\n${params.verifyUrl}\n\n` +
    `Linkul expiră în 24 de ore. Dacă nu ai cerut tu acest cont, ignoră acest mesaj.` +
    SIGNATURE_TEXT;
  return { subject, html, text };
}

export function passwordResetEmail(params: {
  fullName: string;
  resetUrl: string;
}): EmailMessage {
  const subject = 'Resetează-ți parola pe Sintezaur';
  const html = SHELL(
    `<h1 style="font-size:22px;margin:0 0 16px">Salut, ${escapeHtml(params.fullName)}</h1>
     <p style="margin:0 0 16px">Am primit o cerere de resetare a parolei pentru contul tău. Apasă butonul de mai jos pentru a alege o parolă nouă.</p>
     <p style="margin:24px 0">
       <a href="${escapeHtml(params.resetUrl)}"
          style="display:inline-block;background:#1c1c1c;color:#ffffff;padding:14px 24px;border-radius:6px;text-decoration:none;font-weight:600">
         Resetează parola
       </a>
     </p>
     <p style="margin:0;font-size:14px;color:#555">
       Sau copiază linkul în browser:<br/>
       <a href="${escapeHtml(params.resetUrl)}" style="word-break:break-all">${escapeHtml(params.resetUrl)}</a>
     </p>
     <p style="margin:24px 0 0;font-size:14px;color:#555">
       Linkul expiră într-o oră și poate fi folosit o singură dată. Dacă nu tu ai cerut resetarea, ignoră acest mesaj — parola rămâne neschimbată.
     </p>
     ${SIGNATURE_HTML}`,
  );
  const text =
    `Salut, ${params.fullName}\n\n` +
    `Resetează-ți parola accesând linkul:\n${params.resetUrl}\n\n` +
    `Linkul expiră într-o oră. Dacă nu tu ai cerut resetarea, ignoră acest mesaj.` +
    SIGNATURE_TEXT;
  return { subject, html, text };
}

export function emailChangeVerificationEmail(params: {
  fullName: string;
  verifyUrl: string;
  newEmail: string;
}): EmailMessage {
  const subject = 'Confirmă noua adresă de email pe Sintezaur';
  const html = SHELL(
    `<h1 style="font-size:22px;margin:0 0 16px">Salut, ${escapeHtml(params.fullName)}</h1>
     <p style="margin:0 0 16px">Ai cerut schimbarea adresei de email la <strong>${escapeHtml(params.newEmail)}</strong>. Confirmă noua adresă apăsând butonul de mai jos.</p>
     <p style="margin:24px 0">
       <a href="${escapeHtml(params.verifyUrl)}"
          style="display:inline-block;background:#1c1c1c;color:#ffffff;padding:14px 24px;border-radius:6px;text-decoration:none;font-weight:600">
         Confirmă noua adresă
       </a>
     </p>
     <p style="margin:0;font-size:14px;color:#555">
       Sau copiază linkul în browser:<br/>
       <a href="${escapeHtml(params.verifyUrl)}" style="word-break:break-all">${escapeHtml(params.verifyUrl)}</a>
     </p>
     <p style="margin:24px 0 0;font-size:14px;color:#555">
       Linkul expiră în 24 de ore. Până la confirmare contul tău rămâne pe adresa veche.
     </p>
     ${SIGNATURE_HTML}`,
  );
  const text =
    `Salut, ${params.fullName}\n\n` +
    `Ai cerut schimbarea adresei de email la ${params.newEmail}. ` +
    `Confirmă accesând linkul:\n${params.verifyUrl}\n\n` +
    `Linkul expiră în 24 de ore.` +
    SIGNATURE_TEXT;
  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
