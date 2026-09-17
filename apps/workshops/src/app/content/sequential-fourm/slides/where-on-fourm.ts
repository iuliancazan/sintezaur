import type { SlideDef } from '../../types';
import { SLIDE_S01_04_WHERE_ON_FOURM } from './s01-04-where-on-fourm';

/**
 * "Where on Fourm" focus slides: the panel map from 01·04 with one or two
 * sections lit and everything else dimmed, a big caption naming the
 * control(s) and one line with the gesture. They sit right after the
 * content slide whose demo they support, because the room has one fixed
 * camera and the presenter cannot zoom into a section — the slide does it.
 *
 * The map is derived from 01·04 at load time so the panel drawing has one
 * source; every `<g>` there is one section, labelled by its `<text>`.
 */
export type PanelSection =
  | 'MODULATION'
  | 'AFTERTOUCH'
  | 'PROGRAM'
  | 'OSC A'
  | 'OSC B'
  | 'MIXER'
  | 'FILTER'
  | 'FILTER ENV'
  | 'AMP ENV'
  | 'UNISON'
  | 'GLIDE'
  | 'LFO'
  | 'CLOCK'
  | 'ARP'
  | 'MISC'
  | 'MAIN';

export interface WhereOnFourmDef {
  /** Focus slide id: the supported content slide's id + "·W". */
  id: string;
  module: string;
  /** Rail label, e.g. "Where · Filter › Cutoff". */
  label: string;
  /** Sections kept lit; the rest of the panel is dimmed. */
  sections: PanelSection[];
  /** Big caption, panel wording — identical in both languages. */
  caption: string;
  /** One line with the gesture, under the caption. */
  gesture: { en: string; ro: string };
  /** Footer, e.g. "MODULE 03 · FILTER" / "MODULUL 03 · FILTER". */
  moduleTitle: { en: string; ro: string };
}

const LIT = {
  frame: 'fill="rgba(255,138,72,0.08)" stroke="#FF8A48"',
  pill: 'stroke="#FF8A48"',
  text: '#FF8A48',
  control: '#FFFFFF',
};
const DIM = {
  frame: 'fill="none" stroke="#4A4A4A"',
  pill: 'stroke="#4A4A4A"',
  text: '#7A7A7A',
  control: '#5A5A5A',
};

const PANEL_SVG: string = (() => {
  const match = SLIDE_S01_04_WHERE_ON_FOURM.en.match(/<svg[\s\S]*?<\/svg>/);
  if (!match) {
    throw new Error('01·04 Where on Fourm: panel map SVG not found');
  }
  return match[0];
})();

function styleGroup(group: string, lit: boolean): string {
  const tone = lit ? LIT : DIM;
  let rects = 0;
  return group
    .replace(/<rect ([^>]*?)fill="[^"]*" stroke="[^"]*"/g, (whole, attrs) => {
      rects += 1;
      if (rects === 1) {
        return `<rect ${attrs}${tone.frame}`;
      }
      if (rects === 2) {
        return `<rect ${attrs}fill="#000000" ${tone.pill}`;
      }
      return `<rect ${attrs}fill="none" stroke="${tone.control}"`;
    })
    .replace(/(<text [^>]*?)fill="[^"]*"/g, `$1fill="${tone.text}"`)
    .replace(/stroke="#C9C9C9"/g, `stroke="${tone.control}"`);
}

function panelMap(sections: PanelSection[]): string {
  return PANEL_SVG.replace(/<g>[\s\S]*?<\/g>/g, (group) => {
    const label = group.match(/<text[^>]*>([^<]*)<\/text>/)?.[1] ?? '';
    return styleGroup(group, sections.includes(label as PanelSection));
  });
}

function section(
  def: WhereOnFourmDef,
  lang: 'en' | 'ro',
  map: string,
): string {
  const kicker = lang === 'ro' ? 'UNDE PE FOURM' : 'WHERE ON FOURM';
  const back = lang === 'ro' ? '← CUPRINS' : '← COURSE MAP';
  return `<section data-label="${def.id} ${lang.toUpperCase()} Where on Fourm" style="background:#000000; overflow:hidden;">
  <img src="/course/logo-sintezaur-white.png" alt="Sintezaur" style="position:absolute; left:48px; top:20px; height:84px; width:auto; opacity:0.85;">
  <div style="position:absolute; right:48px; top:48px; display:flex; align-items:center; gap:26px;"><img src="/course/logo-zeedo-white.svg" alt="Zeedo" style="height:26px; width:auto; opacity:0.6;"><img src="/course/logo-sequential.png" alt="Sequential" style="height:24px; width:auto; opacity:0.55;"></div>
  <p style="position:absolute; left:0; width:1920px; top:118px; margin:0; text-align:center; font-family:'Lato',sans-serif; font-size:24px; letter-spacing:5px; color:#A7A7A7;">${kicker}</p>
  <h1 style="position:absolute; left:0; width:1920px; top:162px; margin:0; text-align:center; font-family:'Aptos Display','Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:88%; font-weight:400; font-size:84px; line-height:1; color:#FF8A48;">${def.caption}</h1>
  <svg style="position:absolute; left:650px; top:270px; width:620px; height:18px;" viewBox="0 0 860 24" fill="none"><path d="M6 12.5C120 10 260 14.5 400 12S640 10.5 740 13 830 11.5 854 12.3" stroke="#E97132" stroke-width="6.5" stroke-linecap="round"></path></svg>
  <p style="position:absolute; left:160px; width:1600px; top:316px; margin:0; text-align:center; font-family:'Aptos','Instrument Sans','Segoe UI',sans-serif; font-stretch:92%; font-weight:400; font-size:36px; line-height:1.2; color:#E8E8E8;">${def.gesture[lang]}</p>
  <div style="position:absolute; left:75px; top:414px; width:1770px; height:580px;">
    ${map}
  </div>
  <p style="position:absolute; left:48px; top:1028px; margin:0; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F;">${def.moduleTitle[lang]}</p>
  <a data-go="hub" style="cursor:pointer; position:absolute; right:48px; top:1028px; font-family:'Lato',sans-serif; font-size:19px; letter-spacing:3px; color:#8F8F8F; text-decoration:none;" class="ws-hover-accent">${back}</a>
</section>`;
}

export function whereOnFourm(def: WhereOnFourmDef): SlideDef {
  const map = panelMap(def.sections);
  return {
    id: def.id,
    module: def.module,
    label: def.label,
    en: section(def, 'en', map),
    ro: section(def, 'ro', map),
  };
}
