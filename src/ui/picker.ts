import { h } from '../dom';
import { newId } from '../storage';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../types';
import { button, openDialog, toast } from './components';
import type { Ctx } from './context';

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  piernas: 'Piernas',
  hombros: 'Hombros',
  brazos: 'Brazos',
  core: 'Core',
  otro: 'Otros',
};

/** Crea un ejercicio nuevo y lo devuelve (ya guardado). */
export function createExercise(ctx: Ctx, name: string, group: MuscleGroup): Exercise {
  const ex: Exercise = { id: newId(), name: name.trim().slice(0, 60), group };
  ctx.store.update((d) => d.exercises.push(ex), true);
  return ex;
}

/**
 * Elegir ejercicios de la lista (con buscador). En modo `multi` se marcan varios y se
 * confirman; si no, al tocar uno se elige y se cierra.
 */
export function openExercisePicker(ctx: Ctx, o: { title: string; multi?: boolean; selected?: string[]; onDone: (ids: string[]) => void }): void {
  const chosen = new Set(o.selected ?? []);
  const order: string[] = [...chosen];
  const search = h('input', { type: 'search', placeholder: 'Buscar ejercicio…', 'aria-label': 'Buscar ejercicio', autocomplete: 'off' });
  const list = h('div', { class: 'picker' });
  const body = h('div', { class: 'stack' }, search, list);
  const dlg = openDialog(o.title, body);

  const finish = (ids: string[]): void => {
    dlg.close();
    o.onDone(ids);
  };

  function draw(): void {
    const q = search.value.trim().toLowerCase();
    const all = ctx.store.get().exercises;
    list.replaceChildren();
    for (const g of MUSCLE_GROUPS) {
      const items = all.filter((e) => e.group === g && e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      if (!items.length) continue;
      list.append(
        h('h3', { class: 'picker__group' }, GROUP_LABEL[g]),
        ...items.map((e) =>
          h(
            'button',
            {
              type: 'button',
              class: `picker__item${chosen.has(e.id) ? ' is-on' : ''}`,
              'aria-pressed': o.multi ? String(chosen.has(e.id)) : undefined,
              onClick: () => {
                if (!o.multi) return finish([e.id]);
                if (chosen.has(e.id)) {
                  chosen.delete(e.id);
                  order.splice(order.indexOf(e.id), 1);
                } else {
                  chosen.add(e.id);
                  order.push(e.id);
                }
                draw();
              },
            },
            e.name,
          ),
        ),
      );
    }
    if (!list.childElementCount) list.append(h('p', { class: 'muted' }, 'No hay ningún ejercicio con ese nombre.'));
    if (q) {
      list.append(
        button(`Crear «${search.value.trim()}»`, {
          icon: 'plus',
          onClick: () => {
            const ex = createExercise(ctx, search.value, 'otro');
            toast('Ejercicio creado. Puedes cambiarle el grupo en «Ejercicios».', 'good');
            if (o.multi) {
              chosen.add(ex.id);
              order.push(ex.id);
              search.value = '';
              draw();
            } else finish([ex.id]);
          },
        }),
      );
    }
  }
  search.addEventListener('input', draw);
  draw();
  if (o.multi) {
    body.append(h('div', { class: 'dlg__actions' }, button('Cancelar', { variant: 'ghost', onClick: () => dlg.close() }), button(`Listo (${chosen.size})`, { variant: 'primary', onClick: () => finish(order.filter((id) => chosen.has(id))) })));
    list.addEventListener('click', () => {
      const btn = body.querySelector('.dlg__actions .btn--primary span');
      if (btn) btn.textContent = `Listo (${chosen.size})`;
    });
  }
}
