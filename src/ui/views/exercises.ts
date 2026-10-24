import { exerciseHistory } from '../../calc';
import { h } from '../../dom';
import { newId } from '../../storage';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup, type Routine } from '../../types';
import { button, confirmDialog, exercisePhotos, exerciseThumb, openDialog, toast, videoLink } from '../components';
import type { Ctx } from '../context';
import { GROUP_LABEL, createExercise, openExercisePicker } from '../picker';

export function renderExercises(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const view = h('div', { class: 'view' }, h('h1', null, 'Ejercicios'));

  // --- Rutinas ---
  const routines = h('section', { class: 'panel stack' }, h('h2', null, 'Rutinas'), h('p', { class: 'muted small' }, 'Una rutina es una lista de ejercicios para empezar un entrenamiento con todo ya puesto.'));
  if (data.routines.length) {
    routines.append(
      h(
        'ul',
        { class: 'rows' },
        data.routines.map((r) =>
          h(
            'li',
            null,
            h('button', { type: 'button', class: 'row-btn', onClick: () => editRoutine(ctx, r) }, h('strong', null, r.name), h('span', { class: 'muted small' }, `${r.exerciseIds.length} ejercicios`)),
          ),
        ),
      ),
    );
  }
  routines.append(button('Nueva rutina', { icon: 'plus', onClick: () => editRoutine(ctx, null) }));
  view.append(routines);

  // --- Ejercicios ---
  const used = (id: string) => exerciseHistory(data, id).length;
  const lib = h('section', { class: 'panel stack' }, h('h2', null, 'Tus ejercicios'), button('Nuevo ejercicio', { icon: 'plus', onClick: () => editExercise(ctx, null) }));
  for (const g of MUSCLE_GROUPS) {
    const items = data.exercises.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!items.length) continue;
    lib.append(
      h('h3', { class: 'picker__group' }, GROUP_LABEL[g]),
      h(
        'ul',
        { class: 'rows' },
        items.map((e) => h('li', null, h('button', { type: 'button', class: 'row-btn', onClick: () => editExercise(ctx, e) }, h('span', { class: 'row-btn__name' }, exerciseThumb(e.id, e.name, { size: 'sm' }), e.name), used(e.id) ? h('span', { class: 'muted small' }, `${used(e.id)} ${used(e.id) === 1 ? 'sesión' : 'sesiones'}`) : null))),
      ),
    );
  }
  view.append(lib);
  return view;
}

function editExercise(ctx: Ctx, ex: Exercise | null): void {
  const name = h('input', { type: 'text', maxlength: 60, value: ex?.name ?? '', 'aria-label': 'Nombre', autocomplete: 'off' });
  const group = h('select', { 'aria-label': 'Grupo muscular' }, MUSCLE_GROUPS.map((g) => h('option', { value: g, selected: g === (ex?.group ?? 'otro') }, GROUP_LABEL[g])));
  group.value = ex?.group ?? 'otro';
  const body = h('div', { class: 'stack' }, ex ? exercisePhotos(ex.id, ex.name) : null, ex ? h('div', { class: 'row' }, videoLink(ex.name, false)) : null, h('label', { class: 'field' }, h('span', null, 'Nombre'), name), h('label', { class: 'field' }, h('span', null, 'Grupo muscular'), group));
  const dlg = openDialog(ex ? 'Editar ejercicio' : 'Nuevo ejercicio', body);
  body.append(
    h(
      'div',
      { class: 'dlg__actions dlg__actions--wrap' },
      ex
        ? button('Eliminar', {
            variant: 'ghost',
            icon: 'trash',
            onClick: async () => {
              const n = exerciseHistory(ctx.store.get(), ex.id).length;
              const ok = await confirmDialog({
                title: 'Eliminar ejercicio',
                message: n ? `«${ex.name}» sale de tu lista, pero tus ${n} sesiones anteriores se mantienen en el historial.` : `Se quitará «${ex.name}» de tu lista.`,
                confirmLabel: 'Eliminar',
                danger: true,
              });
              if (!ok) return;
              ctx.store.update((d) => {
                d.exercises = d.exercises.filter((e) => e.id !== ex.id);
                for (const r of d.routines) r.exerciseIds = r.exerciseIds.filter((id) => id !== ex.id);
              });
              dlg.close();
            },
          })
        : h('span'),
      button('Guardar', {
        variant: 'primary',
        onClick: () => {
          const n = name.value.trim();
          if (!n) return toast('Ponle un nombre.', 'warn');
          if (ex) ctx.store.update(() => ((ex.name = n.slice(0, 60)), (ex.group = group.value as MuscleGroup)));
          else {
            createExercise(ctx, n, group.value as MuscleGroup);
            ctx.rerender();
          }
          dlg.close();
        },
      }),
    ),
  );
  name.focus();
}

function editRoutine(ctx: Ctx, routine: Routine | null): void {
  let name = routine?.name ?? '';
  let ids = [...(routine?.exerciseIds ?? [])];
  const body = h('div', { class: 'stack' });
  const dlg = openDialog(routine ? 'Editar rutina' : 'Nueva rutina', body);

  const draw = (): void => {
    const data = ctx.store.get();
    body.replaceChildren();
    const nameInput = h('input', { type: 'text', maxlength: 60, value: name, placeholder: 'Por ejemplo: Pierna, Día A…', 'aria-label': 'Nombre de la rutina', autocomplete: 'off' });
    nameInput.addEventListener('input', () => (name = nameInput.value));
    body.append(h('label', { class: 'field' }, h('span', null, 'Nombre'), nameInput));
    body.append(
      h(
        'ol',
        { class: 'rows rows--num' },
        ids.map((id, i) =>
          h(
            'li',
            { class: 'rowline' },
            h('span', null, data.exercises.find((e) => e.id === id)?.name ?? 'Ejercicio'),
            h(
              'span',
              { class: 'rowline__btns' },
              button(null, { small: true, variant: 'ghost', icon: 'chevL', title: 'Subir', disabled: i === 0, onClick: () => ([ids[i - 1], ids[i]] = [ids[i], ids[i - 1]], draw()) }),
              button(null, { small: true, variant: 'ghost', icon: 'chevR', title: 'Bajar', disabled: i === ids.length - 1, onClick: () => ([ids[i + 1], ids[i]] = [ids[i], ids[i + 1]], draw()) }),
              button(null, { small: true, variant: 'ghost', icon: 'x', title: 'Quitar', onClick: () => ((ids = ids.filter((x) => x !== id)), draw()) }),
            ),
          ),
        ),
      ),
      button('Elegir ejercicios', { icon: 'plus', onClick: () => openExercisePicker(ctx, { title: 'Ejercicios de la rutina', multi: true, selected: ids, onDone: (picked) => ((ids = picked), draw()) }) }),
      h(
        'div',
        { class: 'dlg__actions dlg__actions--wrap' },
        routine
          ? button('Eliminar', {
              variant: 'ghost',
              icon: 'trash',
              onClick: async () => {
                if (!(await confirmDialog({ title: 'Eliminar rutina', message: `Se borrará la rutina «${routine.name}».`, confirmLabel: 'Eliminar', danger: true }))) return;
                ctx.store.update((d) => (d.routines = d.routines.filter((r) => r.id !== routine.id)));
                dlg.close();
              },
            })
          : h('span'),
        button('Guardar', {
          variant: 'primary',
          onClick: () => {
            const n = name.trim();
            if (!n) return toast('Ponle un nombre a la rutina.', 'warn');
            if (ids.length === 0) return toast('Añade al menos un ejercicio.', 'warn');
            ctx.store.update((d) => {
              if (routine) {
                const r = d.routines.find((x) => x.id === routine.id);
                if (r) ((r.name = n.slice(0, 60)), (r.exerciseIds = ids));
              } else d.routines.push({ id: newId(), name: n.slice(0, 60), exerciseIds: ids });
            });
            dlg.close();
          },
        }),
      ),
    );
  };
  draw();
}

