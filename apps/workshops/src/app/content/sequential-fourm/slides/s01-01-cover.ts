import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (01·01 EN Cover / 01·01 RO Copertă).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const SLIDE_S01_01_COVER: SlideDef = {
  id: '01·01',
  module: '01',
  label: "Cover",
  en: `<section data-label="01·01 EN Cover" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← COURSE MAP</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULE 01 · SIGNAL FLOW</p>
  <svg style="position:absolute; left:360px; top:610px; width:1200px; height:220px;" viewBox="0 0 1200 220" fill="none">
    <rect x="10" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M50 130L75 95L75 130L100 95L100 130L125 95L125 130L150 105" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M205 110H245" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M262 110L240 99L240 121Z" fill="#FF8A48"></path>
    <rect x="275" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M310 95H340M310 110H332M310 125H344M352 95L390 110L352 125M390 110H420" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M470 110H510" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M527 110L505 99L505 121Z" fill="#FF8A48"></path>
    <rect x="540" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M575 95L655 95C672 95.5 680 102 688 118Q696 134 702 140" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path>
    <path d="M735 110H775" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M792 110L770 99L770 121Z" fill="#FF8A48"></path>
    <rect x="805" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M835 140L860 96Q872 118 886 124L900 127Q925 133 950 140" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path>
    <path d="M1000 110H1040" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M1057 110L1035 99L1035 121Z" fill="#FF8A48"></path>
    <g transform="translate(1080 84)"><path d="M0 14H18L42 -6V58L18 34H0Z" fill="none" stroke="#DBDBDB" stroke-width="3.5" stroke-linejoin="round"></path><path d="M58 6Q68 26 58 46" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path><path d="M74 -4Q90 26 74 56" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path></g>
    <text x="100" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">OSC</text>
    <text x="365" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">MIXER</text>
    <text x="630" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">FILTER</text>
    <text x="895" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">AMP</text>
    <text x="1138" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">OUT</text>
  </svg>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">SIGNAL FLOW</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">How sound travels through a subtractive synthesizer</p>
</section>`,
  ro: `<section data-label="01·01 RO Copertă" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← CUPRINS</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULUL 01 · SIGNAL FLOW</p>
  <svg style="position:absolute; left:360px; top:610px; width:1200px; height:220px;" viewBox="0 0 1200 220" fill="none">
    <rect x="10" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M50 130L75 95L75 130L100 95L100 130L125 95L125 130L150 105" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M205 110H245" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M262 110L240 99L240 121Z" fill="#FF8A48"></path>
    <rect x="275" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M310 95H340M310 110H332M310 125H344M352 95L390 110L352 125M390 110H420" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M470 110H510" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M527 110L505 99L505 121Z" fill="#FF8A48"></path>
    <rect x="540" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M575 95L655 95C672 95.5 680 102 688 118Q696 134 702 140" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path>
    <path d="M735 110H775" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M792 110L770 99L770 121Z" fill="#FF8A48"></path>
    <rect x="805" y="60" width="180" height="100" rx="12" stroke="#454545" stroke-width="2.5"></rect>
    <path d="M835 140L860 96Q872 118 886 124L900 127Q925 133 950 140" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path>
    <path d="M1000 110H1040" stroke="#FF8A48" stroke-width="4" stroke-linecap="round"></path><path d="M1057 110L1035 99L1035 121Z" fill="#FF8A48"></path>
    <g transform="translate(1080 84)"><path d="M0 14H18L42 -6V58L18 34H0Z" fill="none" stroke="#DBDBDB" stroke-width="3.5" stroke-linejoin="round"></path><path d="M58 6Q68 26 58 46" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path><path d="M74 -4Q90 26 74 56" stroke="#FF8A48" stroke-width="4" fill="none" stroke-linecap="round"></path></g>
    <text x="100" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">OSC</text>
    <text x="365" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">MIXER</text>
    <text x="630" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">FILTER</text>
    <text x="895" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">AMP</text>
    <text x="1138" y="200" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="4" fill="#A7A7A7">OUT</text>
  </svg>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">SIGNAL FLOW</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Cum călătorește sunetul printr-un subtractive synthesizer (sintetizator subtractiv)</p>
</section>`,
};
