/** Gráficos SVG sencillos y accesibles (valor exacto al tocar o con las flechas). */
import { fmtKg } from '../calc';
import { h, s } from '../dom';

export interface LineSeries {
  label: string;
  className: string;
  values: (number | null)[];
}

export function lineChart(o: { labels: string[]; series: LineSeries[]; unit: string; ariaLabel: string }): HTMLElement {
  const W = 640;
  const H = 300;
  const m = { l: 46, r: 14, t: 14, b: 34 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const n = o.labels.length;
  const nums = o.series.flatMap((x) => x.values).filter((v): v is number => v !== null);
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  if (hi - lo < 1) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const x = (i: number) => m.l + (n === 1 ? pw / 2 : (pw * i) / (n - 1));
  const y = (v: number) => m.t + ph * (1 - (v - lo) / (hi - lo));

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', role: 'img', tabindex: 0, 'aria-label': o.ariaLabel });
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'chart__grid' }), s('text', { x: m.l - 6, y: y(v) + 5, class: 'chart__tick', 'text-anchor': 'end' }, String(Math.round(v))));
  }
  const every = Math.max(1, Math.ceil(n / 6));
  o.labels.forEach((l, i) => {
    if (i % every === 0 || i === n - 1) svg.append(s('text', { x: x(i), y: H - 10, class: 'chart__tick', 'text-anchor': 'middle' }, l));
  });
  const cursor = s('line', { y1: m.t, y2: H - m.b, class: 'chart__cursor' });
  svg.append(cursor);

  const dots: SVGCircleElement[][] = [];
  o.series.forEach((sr) => {
    let d = '';
    sr.values.forEach((v, i) => {
      if (v === null) return;
      d += `${d ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    });
    if (d) svg.append(s('path', { d, class: `chart__line ${sr.className}` }));
    dots.push(
      sr.values.map((v, i) => {
        const c = s('circle', { cx: x(i), cy: v === null ? -10 : y(v), r: 4, class: `chart__dot ${sr.className}`, style: v === null ? { display: 'none' } : undefined });
        svg.append(c);
        return c;
      }),
    );
  });

  const legend = h('ul', { class: 'legend' }, o.series.map((sr) => h('li', { class: 'legend__item' }, s('svg', { viewBox: '0 0 28 10', width: 28, height: 10, 'aria-hidden': 'true' }, s('line', { x1: 2, x2: 26, y1: 5, y2: 5, class: `chart__line ${sr.className}` })), h('span', null, sr.label))));
  const readout = h('p', { class: 'chart__readout', 'aria-live': 'polite' });

  let cur = n - 1;
  const select = (i: number): void => {
    cur = Math.min(n - 1, Math.max(0, i));
    cursor.setAttribute('x1', String(x(cur)));
    cursor.setAttribute('x2', String(x(cur)));
    dots.forEach((row) => row.forEach((c, k) => c.setAttribute('r', k === cur ? '7' : '4')));
    readout.replaceChildren(h('strong', null, `${o.labels[cur]}: `), ...o.series.flatMap((sr, k) => [k ? ' · ' : '', `${sr.label.toLowerCase()} `, h('strong', null, sr.values[cur] === null ? '—' : `${fmtKg(sr.values[cur]!)} ${o.unit}`)]));
  };
  const idx = (e: PointerEvent): number => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    return n === 1 ? 0 : Math.round(((px - m.l) / pw) * (n - 1));
  };
  svg.addEventListener('pointermove', (e) => select(idx(e)));
  svg.addEventListener('pointerdown', (e) => select(idx(e)));
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      select(cur + (e.key === 'ArrowRight' ? 1 : -1));
      e.preventDefault();
    }
  });
  select(cur);
  return h('figure', { class: 'chart' }, legend, svg, readout);
}

/** Barras de entrenamientos por semana, con una línea para el objetivo. */
export function weekBars(o: { labels: string[]; values: number[]; goal: number }): HTMLElement {
  const W = 640;
  const H = 200;
  const m = { l: 30, r: 10, t: 14, b: 30 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const top = Math.max(o.goal, ...o.values, 3);
  const bw = pw / o.values.length;
  const y = (v: number) => m.t + ph * (1 - v / top);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', role: 'img', 'aria-label': `Entrenamientos por semana: ${o.values.join(', ')}. Objetivo ${o.goal}.` });
  for (let v = 0; v <= top; v++) svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'chart__grid' }), s('text', { x: m.l - 6, y: y(v) + 5, class: 'chart__tick', 'text-anchor': 'end' }, String(v)));
  o.values.forEach((v, i) => {
    const x0 = m.l + i * bw + bw * 0.2;
    if (v > 0) svg.append(s('rect', { x: x0, y: y(v), width: bw * 0.6, height: y(0) - y(v), rx: 4, class: `bar${v >= o.goal ? ' bar--goal' : ''}` }), s('text', { x: x0 + bw * 0.3, y: y(v) - 4, class: 'chart__tick', 'text-anchor': 'middle' }, String(v)));
    svg.append(s('text', { x: x0 + bw * 0.3, y: H - 10, class: 'chart__tick', 'text-anchor': 'middle' }, o.labels[i]));
  });
  svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(o.goal), y2: y(o.goal), class: 'chart__goal' }));
  return h('figure', { class: 'chart' }, svg, h('p', { class: 'muted small' }, 'La línea discontinua es tu objetivo semanal.'));
}
