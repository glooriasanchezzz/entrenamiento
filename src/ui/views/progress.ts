import { exerciseHistory, exerciseRecords, finishedWorkouts, fmtKg, fmtVolume, weeklySummary } from '../../calc';
import { formatDate, formatShort } from '../../dates';
import { h } from '../../dom';
import type { Ctx } from '../context';
import { lineChart, weekBars } from '../chart';

let selected: string | null = null;

export function renderProgress(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const today = ctx.today();
  const view = h('div', { class: 'view' }, h('h1', null, 'Progreso'));

  if (finishedWorkouts(data).length === 0) {
    view.append(h('div', { class: 'empty' }, h('p', null, 'Cuando termines tu primer entrenamiento verás aquí tu progreso.')));
    return view;
  }

  const weeks = weeklySummary(data, today, 8);
  view.append(
    h(
      'section',
      { class: 'panel' },
      h('h2', null, 'Constancia'),
      weekBars({ labels: weeks.map((w) => formatDate(w.start).slice(0, 5)), values: weeks.map((w) => w.sessions), goal: data.settings.weeklyGoal }),
      h('p', { class: 'muted small' }, `Semanas que empiezan el lunes indicado. Esta semana: ${fmtVolume(weeks[weeks.length - 1].volume)} levantados.`),
    ),
  );

  // Ejercicios con datos
  const withData = data.exercises.filter((e) => exerciseHistory(data, e.id).length > 0).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (withData.length === 0) return view;
  if (!selected || !withData.some((e) => e.id === selected)) {
    // por defecto, el que más veces se ha hecho
    selected = [...withData].sort((a, b) => exerciseHistory(data, b.id).length - exerciseHistory(data, a.id).length)[0].id;
  }
  const sel = h('select', { 'aria-label': 'Ejercicio' }, withData.map((e) => h('option', { value: e.id, selected: e.id === selected }, e.name)));
  sel.value = selected;
  sel.addEventListener('change', () => {
    selected = sel.value;
    ctx.rerender();
  });

  const hist = exerciseHistory(data, selected);
  const rec = exerciseRecords(data, selected);
  const stat = (label: string, value: string, sub: string) => h('div', { class: 'stat' }, h('p', { class: 'stat__label' }, label), h('p', { class: 'stat__value' }, value), h('p', { class: 'muted small' }, sub));

  const hasE1 = hist.some((p) => p.e1rm !== null);
  const panel = h('section', { class: 'panel stack' }, h('h2', null, 'Por ejercicio'), sel);
  panel.append(
    h(
      'div',
      { class: 'stats' },
      rec.maxKg ? stat('Peso máximo', `${fmtKg(rec.maxKg.value)} kg`, formatDate(rec.maxKg.date)) : null,
      rec.e1rm ? stat('1RM estimado', `${fmtKg(Math.round(rec.e1rm.value * 10) / 10)} kg`, formatDate(rec.e1rm.date)) : null,
      rec.volume ? stat('Mejor volumen', fmtVolume(rec.volume.value), formatDate(rec.volume.date)) : null,
      stat('Sesiones', String(rec.sessions), `desde ${formatDate(hist[0].date)}`),
    ),
  );
  if (hist.length >= 2) {
    const labels = hist.map((p) => formatDate(p.date).slice(0, 5));
    panel.append(
      lineChart({
        labels,
        unit: 'kg',
        ariaLabel: `Evolución de ${data.exercises.find((e) => e.id === selected)?.name}: peso máximo${hasE1 ? ' y 1RM estimado' : ''} por sesión.`,
        series: [
          { label: 'Peso máximo', className: 'line--a', values: hist.map((p) => p.maxKg) },
          ...(hasE1 ? [{ label: '1RM estimado', className: 'line--b', values: hist.map((p) => (p.e1rm === null ? null : Math.round(p.e1rm * 10) / 10)) }] : []),
        ],
      }),
    );
  } else {
    panel.append(h('p', { class: 'muted' }, 'Con dos sesiones de este ejercicio verás la gráfica de evolución.'));
  }
  panel.append(
    h('h3', null, 'Últimas sesiones'),
    h(
      'ul',
      { class: 'sessions' },
      [...hist].reverse().slice(0, 6).map((p) => h('li', null, h('strong', null, formatShort(p.date)), h('span', null, p.sets.map((s) => `${fmtKg(s.kg)}×${s.reps}`).join('  ')))),
    ),
    h('p', { class: 'muted small' }, 'El 1RM estimado (fórmula de Epley) es el máximo que podrías levantar una vez; solo se calcula con series de 1 a 12 repeticiones y es orientativo.'),
  );
  view.append(panel);
  return view;
}
