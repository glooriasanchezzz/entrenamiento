import { activeWorkout, doneSets, finishedWorkouts, fmtKg, fmtVolume, workoutSetCount, workoutVolume } from '../../calc';
import { formatShort } from '../../dates';
import { h } from '../../dom';
import { newId } from '../../storage';
import type { Workout } from '../../types';
import { button, confirmDialog, openDialog, toast } from '../components';
import type { Ctx } from '../context';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function renderHistory(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const list = finishedWorkouts(data);
  const view = h('div', { class: 'view' }, h('h1', null, 'Historial'));

  if (list.length === 0) {
    view.append(h('div', { class: 'empty' }, h('p', null, 'Aún no has terminado ningún entrenamiento.'), button('Empezar uno', { variant: 'primary', onClick: () => ctx.go('entrenar') })));
    return view;
  }

  let month = '';
  let ul: HTMLElement | null = null;
  for (const w of list) {
    const key = w.date.slice(0, 7);
    if (key !== month) {
      month = key;
      view.append(h('h2', { class: 'month' }, `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`));
      ul = h('ul', { class: 'cards' });
      view.append(ul);
    }
    ul!.append(
      h(
        'li',
        null,
        h(
          'button',
          { type: 'button', class: 'card', onClick: () => openDetail(ctx, w) },
          h('span', { class: 'card__title' }, w.name),
          h('span', { class: 'card__date' }, formatShort(w.date)),
          h('span', { class: 'card__meta' }, `${w.exercises.length} ejercicios · ${workoutSetCount(w)} series · ${fmtVolume(workoutVolume(w))}`),
        ),
      ),
    );
  }
  return view;
}

function openDetail(ctx: Ctx, w: Workout): void {
  const body = h('div', { class: 'stack' });
  const dlg = openDialog(`${w.name} · ${formatShort(w.date)}`, body);
  for (const e of w.exercises) {
    body.append(
      h(
        'div',
        { class: 'detail__ex' },
        h('h3', null, e.name),
        h('p', null, doneSets(e.sets).map((s) => `${fmtKg(s.kg)} kg × ${s.reps}`).join('  ·  ')),
      ),
    );
  }
  if (w.note) body.append(h('p', { class: 'muted' }, w.note));
  body.append(
    h(
      'div',
      { class: 'dlg__actions dlg__actions--wrap' },
      button('Eliminar', {
        variant: 'ghost',
        icon: 'trash',
        onClick: async () => {
          if (!(await confirmDialog({ title: 'Eliminar entrenamiento', message: `Se borrará «${w.name}» del ${formatShort(w.date)}.`, confirmLabel: 'Eliminar', danger: true }))) return;
          ctx.store.update((d) => (d.workouts = d.workouts.filter((x) => x.id !== w.id)));
          dlg.close();
          toast('Entrenamiento eliminado.');
        },
      }),
      button('Editar', {
        icon: 'edit',
        onClick: () => {
          if (activeWorkout(ctx.store.get())) return toast('Termina o descarta primero el entrenamiento que tienes abierto.', 'warn', 5000);
          ctx.store.update(() => (w.finished = false));
          dlg.close();
          ctx.go('entrenar');
        },
      }),
      button('Repetir', {
        icon: 'copy',
        variant: 'primary',
        onClick: () => {
          if (activeWorkout(ctx.store.get())) return toast('Termina o descarta primero el entrenamiento que tienes abierto.', 'warn', 5000);
          ctx.store.update((d) =>
            d.workouts.push({
              id: newId(),
              date: ctx.today(),
              name: w.name,
              finished: false,
              exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, name: e.name, sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps, done: false })) })),
            }),
          );
          dlg.close();
          ctx.go('entrenar');
        },
      }),
    ),
  );
}
