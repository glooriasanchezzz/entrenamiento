import { formatDate } from '../../dates';
import { h } from '../../dom';
import { emptyData } from '../../seed';
import { readMeta } from '../../storage';
import { button, callout, confirmDialog, toast } from '../components';
import type { Ctx } from '../context';
import { copyBackup, exportBackup, openPasteDialog, pickBackupFile } from '../backup';

export function renderSettings(ctx: Ctx): HTMLElement {
  const data = ctx.store.get();
  const meta = readMeta();

  const rest = h('select', { 'aria-label': 'Descanso entre series' }, [30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => h('option', { value: String(s), selected: s === data.settings.restSeconds }, s < 60 ? `${s} s` : `${s / 60 >= 1 && s % 60 === 0 ? s / 60 + ' min' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s'}`)));
  rest.value = String(data.settings.restSeconds);
  rest.addEventListener('change', () => ctx.store.update((d) => (d.settings.restSeconds = Number(rest.value)), true));

  const goal = h('select', { 'aria-label': 'Objetivo semanal' }, [1, 2, 3, 4, 5, 6, 7].map((n) => h('option', { value: String(n), selected: n === data.settings.weeklyGoal }, `${n} ${n === 1 ? 'entrenamiento' : 'entrenamientos'} por semana`)));
  goal.value = String(data.settings.weeklyGoal);
  goal.addEventListener('change', () => ctx.store.update((d) => (d.settings.weeklyGoal = Number(goal.value)), true));

  return h(
    'div',
    { class: 'view' },
    h('h1', null, 'Ajustes'),
    h(
      'section',
      { class: 'panel stack' },
      h('h2', null, 'Entrenar'),
      h('label', { class: 'field' }, h('span', null, 'Descanso entre series'), rest),
      h('label', { class: 'field' }, h('span', null, 'Objetivo semanal'), goal),
    ),
    h(
      'section',
      { class: 'panel stack' },
      h('h2', null, 'Copia de seguridad'),
      callout('info', 'Tus datos solo están en este dispositivo. Guarda una copia de vez en cuando, y úsala para pasar tus datos a otro móvil o al ordenador.'),
      h('p', { class: 'muted small' }, meta.last ? `Última copia: ${formatDate(meta.last)}.` : 'Todavía no has guardado ninguna copia.'),
      h(
        'div',
        { class: 'stack stack--tight' },
        button('Guardar copia', { icon: 'download', variant: 'primary', onClick: () => void exportBackup(data).then(() => ctx.rerender()) }),
        button('Importar archivo', { icon: 'upload', onClick: () => pickBackupFile(ctx.store) }),
        button('Copiar como texto', { icon: 'copy', variant: 'ghost', onClick: () => void copyBackup(data).then(() => ctx.rerender()) }),
        button('Pegar texto de una copia', { variant: 'ghost', onClick: () => openPasteDialog(ctx.store) }),
      ),
    ),
    h(
      'section',
      { class: 'panel stack' },
      h('h2', null, 'Borrar todo'),
      h('p', { class: 'muted small' }, 'Elimina entrenamientos, rutinas y ejercicios propios y vuelve al principio.'),
      button('Borrar todos los datos', {
        icon: 'trash',
        variant: 'danger',
        onClick: async () => {
          const ok = await confirmDialog({ title: 'Borrar todos los datos', message: 'Se perderán todos tus entrenamientos. Si no tienes una copia, no se pueden recuperar.', confirmLabel: 'Borrar todo', danger: true });
          if (!ok) return;
          ctx.timer.stop();
          ctx.store.replace(emptyData());
          toast('Datos borrados.');
        },
      }),
    ),
    h('p', { class: 'muted small' }, 'Mi entrenamiento · tus datos no salen de tu dispositivo. 1RM estimado con la fórmula de Epley; los números son orientativos.'),
  );
}
