/**
 * The course-map road (hub + "The road, again"): numbered nodes on a wavy
 * orange line, labels alternating above / below. The eight-node originals
 * are ported prototype SVG; this builds the same drawing for any node count
 * so the short cut gets a six-node map without a second hand-drawn copy.
 */
export interface CourseMapNode {
  num: string;
  label: string;
  /** Hub map only: the slide id to jump to (`data-go`). */
  go?: string;
}

const FIRST_X = 172;
const LAST_X = 1656;
const Y_UP = 176;
const Y_DOWN = 224;

export function courseMapSvg(
  nodes: CourseMapNode[],
  mode: 'hub' | 'road',
): string {
  const step = (LAST_X - FIRST_X) / Math.max(nodes.length - 1, 1);
  const half = step / 2;
  const pos = nodes.map((_, i) => ({
    x: Number((FIRST_X + i * step).toFixed(1)),
    y: i % 2 === 0 ? Y_UP : Y_DOWN,
  }));

  let d = `M80 200 C ${80 + half} 200, ${pos[0].x - half} ${pos[0].y}, ${pos[0].x} ${pos[0].y}`;
  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1];
    const b = pos[i];
    d += ` C ${a.x + half} ${a.y}, ${b.x - half} ${b.y}, ${b.x} ${b.y}`;
  }
  const last = pos[pos.length - 1];
  d += ` C ${last.x + 50} ${last.y}, 1700 200, 1748 200`;

  const groups = nodes
    .map((node, i) => {
      const { x, y } = pos[i];
      const up = i % 2 === 0;
      const labelY = up ? 106 : 316;
      const tick = up ? `M${x} 124V142` : `M${x} 258V276`;
      const circle =
        mode === 'hub'
          ? `<circle cx="${x}" cy="${y}" r="26" fill="#000000" stroke="#FF8A48" stroke-width="3"></circle><text x="${x}" y="${y + 9}" text-anchor="middle" font-family="Lato, sans-serif" font-weight="700" font-size="24" fill="#FF8A48">${node.num}</text>`
          : `<circle cx="${x}" cy="${y}" r="26" fill="#FF8A48" stroke="#FF8A48" stroke-width="3"></circle><text x="${x}" y="${y + 9}" text-anchor="middle" font-family="Lato, sans-serif" font-weight="700" font-size="24" fill="#000000">${node.num}</text>`;
      const label =
        mode === 'hub'
          ? `<text x="${x}" y="${labelY}" text-anchor="middle" font-family="Lato, sans-serif" font-size="24" letter-spacing="2" fill="#E8E8E8">${node.label}</text>`
          : `<text x="${x}" y="${labelY}" text-anchor="middle" font-family="Lato, sans-serif" font-weight="700" font-size="24" letter-spacing="2" fill="#FF8A48">${node.label}</text>`;
      const open =
        mode === 'hub' && node.go
          ? `<g data-go="${node.go}" style="cursor:pointer;">`
          : '<g>';
      return `${open}${circle}${label}<path d="${tick}" stroke="#5A5A5A" stroke-width="2"></path></g>`;
    })
    .join('');

  return `<svg viewBox="0 0 1866 400" width="100%" height="100%" fill="none"><path d="${d}" stroke="#FF8A48" stroke-width="4" fill="none"></path><path d="M1780 200L1748 185L1748 215Z" fill="#FF8A48"></path>${groups}</svg>`;
}

/** Replaces the road SVG inside a ported hub / road slide with a new one. */
export function swapCourseMap(html: string, svg: string): string {
  const next = html.replace(
    /<svg viewBox="0 0 1866 400"[\s\S]*?<\/svg>/,
    () => svg,
  );
  if (next === html) {
    throw new Error('course map SVG not found in slide');
  }
  return next;
}

/** The six modules the short cut presents (07 Expression and 08 Arp & Seq stay in the handbook). */
export const SHORT_COURSE_NODES: CourseMapNode[] = [
  { num: '01', label: 'SIGNAL FLOW', go: '01·01' },
  { num: '02', label: 'OSCILLATORS', go: '02·01' },
  { num: '03', label: 'FILTER', go: '03·01' },
  { num: '04', label: 'ENVELOPES', go: '04·01' },
  { num: '05', label: 'LFO &amp; MODULATION', go: '05·01' },
  { num: '06', label: 'VOICES &amp; UNISON', go: '06·01' },
];
