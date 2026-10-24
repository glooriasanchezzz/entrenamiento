import { h } from '../dom';
import { backupFileName, markBackupDone, parseBackup, serializeBackup } from '../storage';
import type { DataStore } from '../store';
import { todayISO } from '../dates';
import type { AppData } from '../types';
import { button, callout, confirmDialog, openDialog, toast } from './components';

/** En iPhone abre la hoja de compartir (Guardar en Archivos…); en ordenador descarga el archivo. */
export async function exportBackup(data: AppData): Promise<boolean> {
  const text = serializeBackup(data);
  const name = backupFileName();
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Copia de Mi entrenamiento' });
      markBackupDone(todayISO());
      toast('Copia lista.', 'good');
      return true;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  markBackupDone(todayISO());
  toast('Copia descargada.', 'good');
  return true;
}

export async function copyBackup(data: AppData): Promise<void> {
  const text = serializeBackup(data);
  try {
    await navigator.clipboard.writeText(text);
    markBackupDone(todayISO());
    toast('Copia en el portapapeles. Pégala en una nota para guardarla.', 'good');
  } catch {
    const area = h('textarea', { rows: 8, readonly: true, 'aria-label': 'Copia de seguridad' }, text);
    openDialog('Copia de seguridad', h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'No se pudo copiar solo. Selecciona el texto y cópialo a mano.'), area));
    area.focus();
    area.select();
  }
}

async function importText(store: DataStore, text: string): Promise<boolean> {
  const result = parseBackup(text);
  if (!result.ok) {
    toast(result.error, 'bad', 6000);
    return false;
  }
  const { data, dropped } = result;
  const n = data.workouts.filter((w) => w.finished).length;
  const ok = await confirmDialog({
    title: 'Importar copia de seguridad',
    message: `Se sustituirán tus datos actuales por la copia: ${n} ${n === 1 ? 'entrenamiento' : 'entrenamientos'} y ${data.exercises.length} ejercicios.${dropped ? ` Se omitirán ${dropped} elementos incompletos.` : ''} No se puede deshacer.`,
    confirmLabel: 'Importar',
    danger: true,
  });
  if (!ok) return false;
  store.replace(data);
  toast('Copia importada.', 'good');
  return true;
}

export function pickBackupFile(store: DataStore): void {
  const input = h('input', { type: 'file', accept: '.json,application/json,text/plain', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    try {
      await importText(store, await file.text());
    } catch {
      toast('No se pudo leer el archivo.', 'bad');
    }
  });
  document.body.append(input);
  input.click();
}

export function openPasteDialog(store: DataStore): void {
  const area = h('textarea', { rows: 8, placeholder: '{ "app": "entrenamiento", … }', 'aria-label': 'Copia de seguridad en texto' });
  const body = h('div', { class: 'stack' });
  const dlg = openDialog('Pegar copia de seguridad', body);
  body.append(
    callout('info', 'Pega aquí el texto de una copia que hayas guardado antes.'),
    area,
    h(
      'div',
      { class: 'dlg__actions' },
      button('Cancelar', { variant: 'ghost', onClick: () => dlg.close() }),
      button('Importar', {
        variant: 'primary',
        onClick: async () => {
          if (await importText(store, area.value)) dlg.close();
        },
      }),
    ),
  );
}
