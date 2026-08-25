import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (04·01 EN Cover / 04·01 RO Cover).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const SLIDE_S04_01_COVER: SlideDef = {
  id: '04·01',
  module: '04',
  label: "Cover",
  en: `<section data-label="04·01 EN Cover" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">ENVELOPES</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Controlling your sound over time</p>
  <div data-covermotif="1" style="position:absolute; left:360px; top:610px; width:1200px; height:240px;"><svg viewBox="40 20 960 220" width="100%" height="100%" fill="none"><path d="M60 200L260 30L420 120L780 120L980 200" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path><text x="150" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">A</text><text x="340" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">D</text><text x="600" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">S</text><text x="880" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">R</text></svg></div>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULE 04 · ENVELOPES</p>
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">← COURSE MAP</a>
</section>`,
  ro: `<section data-label="04·01 RO Cover" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">ENVELOPES</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Controlezi sunetul în timp</p>
  <div data-covermotif="1" style="position:absolute; left:360px; top:610px; width:1200px; height:240px;"><svg viewBox="40 20 960 220" width="100%" height="100%" fill="none"><path d="M60 200L260 30L420 120L780 120L980 200" stroke="#FF8A48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path><text x="150" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">A</text><text x="340" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">D</text><text x="600" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">S</text><text x="880" y="222" text-anchor="middle" font-family="Lato, sans-serif" font-size="26" letter-spacing="3" fill="#A7A7A7">R</text></svg></div>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULUL 04 · ENVELOPES</p>
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">← CUPRINS</a>
</section>`,
};
