import type { SlideDef } from '../../types';

// Ported 1:1 from v02.1 "Full Course.dc.html" (08·01 EN Cover / 08·01 RO Cover).
// EN and RO layouts are colocated; deleting this page = delete this file +
// its line in index.ts.
export const SLIDE_S08_01_COVER: SlideDef = {
  id: '08·01',
  module: '08',
  label: "Cover",
  en: `<section data-label="08·01 EN Cover" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← COURSE MAP</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULE 08 · ARPEGGIATOR &amp; SEQUENCER</p>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">ARPEGGIATOR &amp; SEQUENCER</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Patterns from held notes</p>
<div style="position:absolute; left:360px; top:610px; width:1200px; height:220px;"><svg viewBox="0 0 1200 220" width="100%" height="100%" fill="none"><path d="M140 192H1060" stroke="#5A5A5A" stroke-width="2.5"></path><circle cx="180" cy="168" r="13" fill="#FF8A48"></circle><circle cx="274" cy="126" r="13" fill="#FF8A48"></circle><circle cx="368" cy="84" r="13" fill="#FF8A48"></circle><circle cx="462" cy="42" r="13" fill="#FF8A48"></circle><circle cx="556" cy="84" r="13" fill="#FF8A48"></circle><circle cx="650" cy="126" r="13" fill="#FF8A48"></circle><circle cx="744" cy="168" r="13" fill="#FF8A48"></circle><circle cx="838" cy="126" r="13" fill="#FF8A48"></circle><circle cx="932" cy="84" r="13" fill="#FF8A48"></circle><circle cx="1026" cy="42" r="13" fill="#FF8A48"></circle></svg></div>
</section>`,
  ro: `<section data-label="08·01 RO Cover" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">← CUPRINS</a>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">MODULUL 08 · ARPEGGIATOR &amp; SEQUENCER</p>
  <h1 style="position:absolute; left:0; width:1920px; top:110px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:92px; line-height:1; color:#E8E8E8;">ARPEGGIATOR &amp; SEQUENCER</h1>
  <svg style="position:absolute; left:650px; top:232px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:0; width:1920px; top:280px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.15; color:#B4B4B4;">Tipare din note ținute</p>
<div style="position:absolute; left:360px; top:610px; width:1200px; height:220px;"><svg viewBox="0 0 1200 220" width="100%" height="100%" fill="none"><path d="M140 192H1060" stroke="#5A5A5A" stroke-width="2.5"></path><circle cx="180" cy="168" r="13" fill="#FF8A48"></circle><circle cx="274" cy="126" r="13" fill="#FF8A48"></circle><circle cx="368" cy="84" r="13" fill="#FF8A48"></circle><circle cx="462" cy="42" r="13" fill="#FF8A48"></circle><circle cx="556" cy="84" r="13" fill="#FF8A48"></circle><circle cx="650" cy="126" r="13" fill="#FF8A48"></circle><circle cx="744" cy="168" r="13" fill="#FF8A48"></circle><circle cx="838" cy="126" r="13" fill="#FF8A48"></circle><circle cx="932" cy="84" r="13" fill="#FF8A48"></circle><circle cx="1026" cy="42" r="13" fill="#FF8A48"></circle></svg></div>
</section>`,
};
