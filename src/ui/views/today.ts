import { activeWorkout, doneSets, exerciseHistory, finishedWorkouts, fmtKg, fmtVolume, goalStreak, isNewRecord, lastSessionSets, weeklySummary, workoutSetCount, workoutVolume } from '../../calc';
import { formatDate, formatShort, isValidISO } from '../../dates';
import { h, icon } from '../../dom';
import { newId, readMeta, shouldRemindBackup, snoozeBackup } from '../../storage';
import type { SetEntry, Workout, WorkoutExercise } from '../../types';
import { exportBackup } from '../backup';
import { button, callout, confirmDialog, exerciseThumb, toast } from '../components';
import type { Ctx } from '../context';
import { openExercisePicker } from '../picker';

/** Series iniciales de un ejercicio: las de la última vez (sin marcar) o tres vacías. */
function initialSets(ctx: Ctx, exerciseId: string, before: string): SetEntry[] {
  const last = lastSessionSets(ctx.store.get(), exerciseId, before);
  if (last) return last.sets.map((s) => ({ kg: s.kg, reps: s.reps, done: false }));
  return [0, 1, 2].map(() => ({ kg: 0, reps: 0, done: false }));
}

function startWorkout(ctx: Ctx, name: string, exerciseIds: string[]): void {
  const today = ctx.today();
  const data = ctx.store.get();
  const exercises: WorkoutExercise[] = exerciseIds.flatMap((id) => {
    const ex = data.exercises.find((e) => e.id === id);
    return ex ? [{ exerciseId: id, name: ex.name, sets: initialSets(ctx, id, today) }] : [];
  });
  ctx.store.update((d) => d.workouts.push({ id: newId(), date: today, name, exercises, finished: false }));
}

export function renderToday(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const active = activeWorkout(data);
  return active ? renderEditor(ctx, active) : renderHome(ctx);
}

// --- Inicio (sin entrenamiento abierto) ---------------------------------------

function renderHome(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const today = ctx.today();
  const { weeklyGoal } = data.settings;
  const week = weeklySummary(data, today, 1)[0];
  const streak = goalStreak(data, today, weeklyGoal);
  const last = finishedWorkouts(data)[0];

  const dots = h(
    'div',
    { class: 'goal__dots', 'aria-hidden': 'true' },
    Array.from({ length: Math.max(weeklyGoal, week.sessions) }, (_, i) => h('span', { class: `goal__dot${i < week.sessions ? ' is-on' : ''}` })),
  );

  const routines = data.routines.map((r) =>
    button(r.name, { icon: 'dumbbell', onClick: () => startWorkout(ctx, r.name, r.exerciseIds) }),
  );

  const alerts: HTMLElement[] = [];
  if (shouldRemindBackup(readMeta(), today, data.workouts.some((w) => w.finished))) {
    const meta = readMeta();
    alerts.push(
      callout(
        'warn',
        h('strong', null, meta.last ? `Hace más de un mes de tu última copia (${formatDate(meta.last)}). ` : 'Todavía no has guardado ninguna copia de seguridad. '),
        'Si borras los datos del navegador o quitas la app, se pierden. ',
        button('Guardar copia', { small: true, onClick: () => void exportBackup(data).then(() => ctx.rerender()) }),
        ' ',
        button('En una semana', {
          small: true,
          variant: 'ghost',
          onClick: () => {
            snoozeBackup(today);
            ctx.rerender();
          },
        }),
      ),
    );
  }

  return h(
    'div',
    { class: 'view' },
    h('h1', null, 'Entrenar'),
    ...alerts,
    h(
      'section',
      { class: 'panel goal' },
      h('p', { class: 'goal__title' }, 'Esta semana'),
      h('p', { class: 'goal__big' }, `${week.sessions}`, h('span', null, ` / ${weeklyGoal} entrenamientos`)),
      dots,
      streak > 0 ? h('p', { class: 'muted small' }, `${streak} ${streak === 1 ? 'semana seguida' : 'semanas seguidas'} cumpliendo tu objetivo.`) : h('p', { class: 'muted small' }, week.sessions >= weeklyGoal ? 'Objetivo cumplido.' : 'Cada entrenamiento cuenta.'),
    ),
    h(
      'section',
      { class: 'panel stack' },
      h('h2', null, 'Empezar'),
      button('Entrenamiento vacío', { variant: 'primary', icon: 'plus', onClick: () => startWorkout(ctx, 'Entrenamiento', []) }),
      routines.length
        ? h('div', { class: 'stack stack--tight' }, h('p', { class: 'muted small' }, 'O desde una rutina:'), ...routines)
        : h('p', { class: 'muted small' }, 'Crea rutinas en «Ejercicios» para empezar con tus ejercicios ya puestos.'),
    ),
    last
      ? h(
          'section',
          { class: 'panel' },
          h('h2', null, 'Último entrenamiento'),
          h('p', null, h('strong', null, last.name), ` · ${formatShort(last.date)}`),
          h('p', { class: 'muted' }, `${last.exercises.length} ejercicios · ${workoutSetCount(last)} series · ${fmtVolume(workoutVolume(last))}`),
          button('Repetirlo', { small: true, icon: 'copy', onClick: () => startWorkout(ctx, last.name, last.exercises.map((e) => e.exerciseId).filter(Boolean)) }),
        )
      : null,
  );
}

// --- Editor del entrenamiento en curso -----------------------------------------

function renderEditor(ctx: Ctx, w: Workout): HTMLElement {
  const data = ctx.store.get();
  const silent = (fn: () => void) => ctx.store.update(fn, true);

  const nameInput = h('input', { type: 'text', value: w.name, maxlength: 60, 'aria-label': 'Nombre del entrenamiento', class: 'title-input' });
  nameInput.addEventListener('input', () => silent(() => (w.name = nameInput.value.slice(0, 60) || 'Entrenamiento')));
  const dateInput = h('input', { type: 'date', value: w.date, 'aria-label': 'Fecha' });
  dateInput.addEventListener('change', () => {
    if (isValidISO(dateInput.value)) ctx.store.update(() => (w.date = dateInput.value));
  });

  const cards = w.exercises.map((we, idx) => exerciseCard(ctx, w, we, idx));

  const noteBox = h('textarea', { rows: 2, maxlength: 200, placeholder: 'Nota del entrenamiento (opcional)', 'aria-label': 'Nota' }, w.note ?? '');
  noteBox.addEventListener('input', () => silent(() => (noteBox.value.trim() ? (w.note = noteBox.value.trim().slice(0, 200)) : delete w.note)));

  const finish = async (): Promise<void> => {
    const sets = w.exercises.reduce((n, e) => n + doneSets(e.sets).length, 0);
    if (sets === 0) {
      const ok = await confirmDialog({ title: 'Sin series hechas', message: 'No has marcado ninguna serie como hecha. ¿Descartar este entrenamiento?', confirmLabel: 'Descartar', danger: true });
      if (ok) {
        ctx.store.update((d) => (d.workouts = d.workouts.filter((x) => x.id !== w.id)));
        ctx.timer.stop();
      }
      return;
    }
    ctx.store.update(() => {
      w.finished = true;
      // quita las series sin hacer y los ejercicios que se quedan vacíos
      for (const e of w.exercises) e.sets = e.sets.filter((s) => s.done);
      w.exercises = w.exercises.filter((e) => e.sets.length > 0);
    });
    ctx.timer.stop();
    toast(`Entrenamiento guardado: ${sets} series, ${fmtVolume(workoutVolume(w))}.`, 'good');
  };

  const discard = async (): Promise<void> => {
    const ok = await confirmDialog({ title: 'Descartar entrenamiento', message: 'Se borrará lo que has apuntado en este entrenamiento.', confirmLabel: 'Descartar', danger: true });
    if (!ok) return;
    ctx.store.update((d) => (d.workouts = d.workouts.filter((x) => x.id !== w.id)));
    ctx.timer.stop();
  };

  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'editor__head' }, nameInput, dateInput),
    ...cards,
    button('Añadir ejercicio', {
      icon: 'plus',
      variant: 'secondary',
      onClick: () =>
        openExercisePicker(ctx, {
          title: 'Añadir ejercicio',
          onDone: ([id]) => {
            const ex = data.exercises.find((e) => e.id === id);
            if (!ex) return;
            ctx.store.update(() => w.exercises.push({ exerciseId: ex.id, name: ex.name, sets: initialSets(ctx, ex.id, w.date) }));
          },
        }),
    }),
    noteBox,
    h('div', { class: 'editor__actions' }, button('Terminar entrenamiento', { variant: 'primary', icon: 'check', onClick: () => void finish() }), button('Descartar', { variant: 'ghost', onClick: () => void discard() })),
  );
}

function numberInput(value: number, label: string, mode: 'decimal' | 'numeric', onChange: (n: number) => void): HTMLInputElement {
  const input = h('input', {
    type: 'text',
    inputmode: mode,
    value: value > 0 ? String(value).replace('.', ',') : '',
    placeholder: '0',
    'aria-label': label,
    autocomplete: 'off',
    class: 'num',
  });
  input.addEventListener('input', () => {
    const n = Number(input.value.replace(',', '.'));
    onChange(Number.isFinite(n) && n >= 0 ? (mode === 'numeric' ? Math.floor(n) : n) : 0);
  });
  input.addEventListener('focus', () => input.select());
  return input;
}

function exerciseCard(ctx: Ctx, w: Workout, we: WorkoutExercise, idx: number): HTMLElement {
  const data = ctx.store.get();
  const silent = (fn: () => void) => ctx.store.update(fn, true);
  const last = we.exerciseId ? lastSessionSets(data, we.exerciseId, w.date) : null;
  const record = we.exerciseId && doneSets(we.sets).some((s) => isNewRecord(data, we.exerciseId, w.date, s.kg));

  const rows = we.sets.map((s, i) => {
    const kg = numberInput(s.kg, `Peso de la serie ${i + 1}`, 'decimal', (n) => silent(() => (s.kg = n)));
    const reps = numberInput(s.reps, `Repeticiones de la serie ${i + 1}`, 'numeric', (n) => silent(() => (s.reps = n)));
    const done = h(
      'button',
      {
        type: 'button',
        class: `check${s.done ? ' is-on' : ''}`,
        'aria-pressed': String(s.done),
        'aria-label': `Serie ${i + 1} hecha`,
        onClick: () => {
          const next = !s.done;
          ctx.store.update(() => (s.done = next));
          if (next) ctx.timer.start(data.settings.restSeconds);
        },
      },
      icon('check', 18),
    );
    return h('div', { class: `setrow${s.done ? ' is-done' : ''}` }, h('span', { class: 'setrow__n' }, String(i + 1)), kg, h('span', { class: 'setrow__x' }, 'kg ×'), reps, done);
  });

  const lastText = last ? `Última vez (${formatShort(last.date)}): ${last.sets.map((s) => `${fmtKg(s.kg)}×${s.reps}`).join(', ')}` : we.exerciseId && exerciseHistory(data, we.exerciseId).length === 0 ? 'Primera vez con este ejercicio' : '';

  return h(
    'section',
    { class: 'panel exercise' },
    h(
      'div',
      { class: 'exercise__head' },
      exerciseThumb(we.exerciseId, we.name, { zoom: true }),
      h('h2', null, we.name, record ? h('span', { class: 'pr' }, icon('trophy', 14), ' Récord') : null),
      button(null, {
        variant: 'ghost',
        small: true,
        icon: 'trash',
        title: 'Quitar ejercicio',
        onClick: () => ctx.store.update(() => w.exercises.splice(idx, 1)),
      }),
    ),
    lastText ? h('p', { class: 'muted small' }, lastText) : null,
    h('div', { class: 'sets' }, ...rows),
    h(
      'div',
      { class: 'exercise__foot' },
      button('Añadir serie', {
        small: true,
        icon: 'plus',
        onClick: () => {
          const prev = we.sets[we.sets.length - 1];
          ctx.store.update(() => we.sets.push({ kg: prev?.kg ?? 0, reps: prev?.reps ?? 0, done: false }));
        },
      }),
      we.sets.length > 1 ? button('Quitar serie', { small: true, variant: 'ghost', onClick: () => ctx.store.update(() => we.sets.pop()) }) : null,
    ),
  );
}
