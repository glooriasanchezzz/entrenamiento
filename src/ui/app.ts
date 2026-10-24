import { h, icon, type IconName } from '../dom';
import type { DataStore } from '../store';
import { todayISO } from '../dates';
import { callout } from './components';
import type { Ctx, Tab } from './context';
import { RestTimer } from './timer';
import { renderExercises } from './views/exercises';
import { renderHistory } from './views/history';
import { renderProgress } from './views/progress';
import { renderSettings } from './views/settings';
import { renderToday } from './views/today';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'entrenar', label: 'Entrenar', icon: 'dumbbell' },
  { id: 'historial', label: 'Historial', icon: 'clock' },
  { id: 'progreso', label: 'Progreso', icon: 'chart' },
  { id: 'ejercicios', label: 'Ejercicios', icon: 'list' },
  { id: 'ajustes', label: 'Ajustes', icon: 'gear' },
];

export function mountApp(root: HTMLElement, store: DataStore, now: () => Date = () => new Date()): { go(tab: Tab): void } {
  let tab: Tab = 'entrenar';
  const timer = new RestTimer();
  const main = h('main', { id: 'main', tabindex: -1 });
  const nav = h('nav', { class: 'tabs', 'aria-label': 'Secciones' });

  const ctx: Ctx = {
    store,
    timer,
    today: () => todayISO(now()),
    rerender: () => render(),
    go: (t) => {
      tab = t;
      render();
      window.scrollTo?.(0, 0);
    },
  };

  const views: Record<Tab, (c: Ctx) => HTMLElement> = {
    entrenar: renderToday,
    historial: renderHistory,
    progreso: renderProgress,
    ejercicios: renderExercises,
    ajustes: renderSettings,
  };

  function render(): void {
    const scroll = window.scrollY;
    nav.replaceChildren(
      ...TABS.map((t) =>
        h('button', { type: 'button', class: `tab${t.id === tab ? ' is-on' : ''}`, 'aria-current': t.id === tab ? 'page' : undefined, onClick: () => ctx.go(t.id) }, icon(t.icon, 22), h('span', null, t.label)),
      ),
    );
    main.replaceChildren();
    if (store.saveFailed) main.append(callout('bad', 'No se pueden guardar los datos en este navegador (¿modo privado o sin espacio?). Lo que apuntes se perderá al cerrar.'));
    main.append(views[tab](ctx));
    window.scrollTo?.(0, scroll);
  }

  store.subscribe(render);
  root.append(h('a', { class: 'skip', href: '#main' }, 'Saltar al contenido'), timer.el, main, nav);
  render();
  return { go: ctx.go };
}
