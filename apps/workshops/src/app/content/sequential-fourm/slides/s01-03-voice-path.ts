import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (01·03 EN Voice Path / 01·03 RO Voice Path).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const SLIDE_S01_03_VOICE_PATH: SlideDef = {
  id: '01·03',
  module: '01',
  label: "Voice Path",
  en: `<section data-label="01·03 EN Voice Path" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← COURSE MAP</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULE 01 · SIGNAL FLOW</p>
  <div style="position:absolute; left:27px; top:428px; width:1866px; height:558px;">
    <svg viewBox="0 0 1866 558" width="100%" height="100%" preserveAspectRatio="none" style="display:block;">
      <defs><linearGradient id="hv1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop><stop offset="0.25" stop-color="#EDEDED" stop-opacity="0.5"></stop><stop offset="0.62" stop-color="#FF8A48" stop-opacity="0.8"></stop><stop offset="1" stop-color="#FF8A48" stop-opacity="0"></stop></linearGradient></defs>
      <rect x="4" y="4" width="1858" height="550" rx="30" fill="rgba(255,255,255,0.02)" stroke="#454545" stroke-width="2.5"></rect>
      <rect x="90" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="235" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSCILLATORS</text>
      <path d="M145 320L190 262L190 320L235 262L235 320L280 262L280 320L322 268" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="235" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">TWO ANALOG VCOs</text>
      <svg x="396" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="524" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="669" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">MIXER</text>
      <path d="M580 262H640M580 292H628M580 322H646M660 262L716 292L660 322M716 292H758" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="669" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">A + B + NOISE + FEEDBACK</text>
      <svg x="830" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="958" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1103" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">FILTER</text>
      <path d="M1014 268L1140 268C1166 268.5 1178 276 1191 302Q1204 330 1214 340" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <text x="1103" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">LOW-PASS, RESONANT</text>
      <svg x="1264" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="1392" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1537" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">AMPLIFIER</text>
      <path d="M1448 340L1483 264Q1502 302 1526 312L1552 318Q1590 328 1614 340" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <text x="1537" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">VCA + AMP ENVELOPE</text>
      <g transform="translate(1728 240)"><path d="M0 16H22L52 -8V68L22 44H0Z" fill="none" stroke="#DBDBDB" stroke-width="4" stroke-linejoin="round"></path><path d="M70 8Q82 30 70 52" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round"></path><path d="M88 -4Q106 30 88 64" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round"></path></g>
      <path d="M1248 340H1290V452H430V340H510" stroke="#FF8A48" stroke-width="4" stroke-dasharray="14 10" fill="none"></path>
      <path d="M524 340L502 329L502 351Z" fill="#FF8A48"></path>
      <text x="886" y="492" text-anchor="middle" font-family="Lato, sans-serif" font-size="27" font-weight="700" letter-spacing="1" fill="#FF8A48">FEEDBACK: THE OUTPUT FED BACK INTO THE MIXER</text>
    </svg>
  </div>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">THE VOICE PATH</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Oscillators, mixer, filter, amplifier: one road for every sound</p>
</section>`,
  ro: `<section data-label="01·03 RO Voice Path" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← CUPRINS</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULUL 01 · SIGNAL FLOW</p>
  <div style="position:absolute; left:27px; top:428px; width:1866px; height:558px;">
    <svg viewBox="0 0 1866 558" width="100%" height="100%" preserveAspectRatio="none" style="display:block;">
      <defs><linearGradient id="hv2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop><stop offset="0.25" stop-color="#EDEDED" stop-opacity="0.5"></stop><stop offset="0.62" stop-color="#FF8A48" stop-opacity="0.8"></stop><stop offset="1" stop-color="#FF8A48" stop-opacity="0"></stop></linearGradient></defs>
      <rect x="4" y="4" width="1858" height="550" rx="30" fill="rgba(255,255,255,0.02)" stroke="#454545" stroke-width="2.5"></rect>
      <rect x="90" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="235" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSCILLATORS</text>
      <path d="M145 320L190 262L190 320L235 262L235 320L280 262L280 320L322 268" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="235" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">DOUĂ VCO-URI ANALOGICE</text>
      <svg x="396" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="524" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="669" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">MIXER</text>
      <path d="M580 262H640M580 292H628M580 322H646M660 262L716 292L660 322M716 292H758" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="669" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">A + B + NOISE + FEEDBACK</text>
      <svg x="830" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="958" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1103" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">FILTER</text>
      <path d="M1014 268L1140 268C1166 268.5 1178 276 1191 302Q1204 330 1214 340" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <text x="1103" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">LOW-PASS, REZONANT</text>
      <svg x="1264" y="240" width="112" height="60" viewBox="0 0 112 60"><path d="M12 30H74" stroke="#FF8A48" stroke-width="6" stroke-linecap="round"></path><path d="M98 30L70 16L70 44Z" fill="#FF8A48"></path></svg>
      <rect x="1392" y="170" width="290" height="200" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1537" y="225" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">AMPLIFIER</text>
      <path d="M1448 340L1483 264Q1502 302 1526 312L1552 318Q1590 328 1614 340" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <text x="1537" y="420" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#C6C6C6">VCA + AMP ENVELOPE</text>
      <g transform="translate(1728 240)"><path d="M0 16H22L52 -8V68L22 44H0Z" fill="none" stroke="#DBDBDB" stroke-width="4" stroke-linejoin="round"></path><path d="M70 8Q82 30 70 52" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round"></path><path d="M88 -4Q106 30 88 64" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round"></path></g>
      <path d="M1248 340H1290V452H430V340H510" stroke="#FF8A48" stroke-width="4" stroke-dasharray="14 10" fill="none"></path>
      <path d="M524 340L502 329L502 351Z" fill="#FF8A48"></path>
      <text x="886" y="492" text-anchor="middle" font-family="Lato, sans-serif" font-size="27" font-weight="700" letter-spacing="1" fill="#FF8A48">FEEDBACK: IEȘIREA, ÎNTOARSĂ ÎN MIXER</text>
    </svg>
  </div>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">DRUMUL SEMNALULUI</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Oscilatoare, mixer, filtru, amplificator: același drum pentru orice sunet</p>
</section>`,
};
