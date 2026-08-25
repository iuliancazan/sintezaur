import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (01·05 EN The Mixer / 01·05 RO The Mixer).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const SLIDE_S01_05_THE_MIXER: SlideDef = {
  id: '01·05',
  module: '01',
  label: "The Mixer",
  en: `<section data-label="01·05 EN The Mixer" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← COURSE MAP</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULE 01 · SIGNAL FLOW</p>
  <div style="position:absolute; left:27px; top:428px; width:1866px; height:558px;">
    <svg viewBox="0 0 1866 558" width="100%" height="100%" preserveAspectRatio="none" style="display:block;">
      <defs><linearGradient id="hm1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop><stop offset="0.25" stop-color="#EDEDED" stop-opacity="0.5"></stop><stop offset="0.62" stop-color="#FF8A48" stop-opacity="0.8"></stop><stop offset="1" stop-color="#FF8A48" stop-opacity="0"></stop></linearGradient></defs>
      <rect x="4" y="4" width="1858" height="550" rx="30" fill="rgba(255,255,255,0.02)" stroke="#454545" stroke-width="2.5"></rect>
      <rect x="80" y="150" width="400 " height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="280" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSC A</text>
      <path d="M140 300L210 230L210 300L280 230L280 300L350 230L350 300L420 240" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="280" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">SAW + PULSE</text>
      <text x="280" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">THE BRIGHT BACKBONE</text>
      <rect x="540" y="150" width="400" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="740" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSC B</text>
      <path d="M600 300L670 230L740 300L810 230L845 265" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="740" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">TRI + SAW + PULSE</text>
      <text x="740" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">WEIGHT, DETUNE, LO MODES</text>
      <rect x="1000" y="150" width="400" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1200" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">NOISE</text>
      <path d="M1060 270L1078 246L1096 292L1114 238L1132 284L1150 252L1168 296L1186 240L1204 278L1222 248L1240 290L1258 244L1276 286L1294 254L1312 292L1330 246" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="1200" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">WHITE / PINK / VIOLET</text>
      <text x="1200" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">AIR, PERCUSSION, TEXTURE</text>
      <rect x="1460" y="150" width="326" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1623" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">FEEDBACK</text>
      <path d="M1543 236H1680Q1706 236 1706 262V274Q1706 300 1680 300H1566" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <path d="M1548 300L1572 288L1572 312Z" fill="#FF8A48"></path>
      <text x="1623" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">OUTPUT LOOP</text>
      <text x="1623" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">SOFT-CLIP SATURATION</text>
      <text x="933" y="522" text-anchor="middle" font-family="Lato, sans-serif" font-size="27" font-weight="700" letter-spacing="1" fill="#FF8A48">TURN UP AT LEAST ONE SOURCE, OR LET RESONANCE SELF-OSCILLATE</text>
    </svg>
  </div>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">THE MIXER</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Every voice starts here: four sources feed the filter</p>
</section>`,
  ro: `<section data-label="01·05 RO The Mixer" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← CUPRINS</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULUL 01 · SIGNAL FLOW</p>
  <div style="position:absolute; left:27px; top:428px; width:1866px; height:558px;">
    <svg viewBox="0 0 1866 558" width="100%" height="100%" preserveAspectRatio="none" style="display:block;">
      
      <defs><linearGradient id="hm1r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop><stop offset="0.25" stop-color="#EDEDED" stop-opacity="0.5"></stop><stop offset="0.62" stop-color="#FF8A48" stop-opacity="0.8"></stop><stop offset="1" stop-color="#FF8A48" stop-opacity="0"></stop></linearGradient></defs>
      <rect x="4" y="4" width="1858" height="550" rx="30" fill="rgba(255,255,255,0.02)" stroke="#454545" stroke-width="2.5"></rect>
      <rect x="80" y="150" width="400 " height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="280" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSC A</text>
      <path d="M140 300L210 230L210 300L280 230L280 300L350 230L350 300L420 240" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="280" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">SAW + PULSE</text>
      <text x="280" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">BAZA STRĂLUCITOARE</text>
      <rect x="540" y="150" width="400" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="740" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">OSC B</text>
      <path d="M600 300L670 230L740 300L810 230L845 265" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="740" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">TRI + SAW + PULSE</text>
      <text x="740" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">GREUTATE, DETUNE, LO1/LO2</text>
      <rect x="1000" y="150" width="400" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1200" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">NOISE</text>
      <path d="M1060 270L1078 246L1096 292L1114 238L1132 284L1150 252L1168 296L1186 240L1204 278L1222 248L1240 290L1258 244L1276 286L1294 254L1312 292L1330 246" stroke="#FF8A48" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="1200" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">WHITE / PINK / VIOLET</text>
      <text x="1200" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">AER, PERCUȚIE, TEXTURĂ</text>
      <rect x="1460" y="150" width="326" height="330" rx="14" fill="none" stroke="#C9C9C9" stroke-width="2.5"></rect>
      <text x="1623" y="205" text-anchor="middle" font-family="Lato, sans-serif" font-size="33" letter-spacing="3" fill="#DBDBDB">FEEDBACK</text>
      <path d="M1543 236H1680Q1706 236 1706 262V274Q1706 300 1680 300H1566" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round"></path>
      <path d="M1548 300L1572 288L1572 312Z" fill="#FF8A48"></path>
      <text x="1623" y="368" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">BUCLĂ DIN IEȘIRE</text>
      <text x="1623" y="404" text-anchor="middle" font-family="Lato, sans-serif" font-size="25" letter-spacing="2" fill="#C6C6C6">SATURAȚIE SOFT-CLIP</text>
      <text x="933" y="522" text-anchor="middle" font-family="Lato, sans-serif" font-size="27" font-weight="700" letter-spacing="1" fill="#FF8A48">RIDICĂ CEL PUȚIN O SURSĂ, SAU LASĂ REZONANȚA SĂ AUTO-OSCILEZE</text>
    
    </svg>
  </div>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">MIXERUL</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Aici începe orice voce: patru surse alimentează filtrul</p>
</section>`,
};
