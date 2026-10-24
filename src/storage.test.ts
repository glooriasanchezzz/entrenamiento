import { describe, expect, it } from 'vitest';
import { emptyData } from './seed';
import { META_KEY, STORAGE_KEY, loadData, markBackupDone, parseBackup, readMeta, sanitizeData, saveData, serializeBackup, shouldRemindBackup, snoozeBackup } from './storage';

class Mem {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('guardado', () => {
  it('sin datos arranca con los ejercicios base y sin entrenamientos', () => {
    const d = loadData(new Mem());
    expect(d.exercises.length).toBeGreaterThan(10);
    expect(d.workouts).toEqual([]);
  });
  it('guarda y recupera', () => {
    const s = new Mem();
    const d = emptyData();
    d.workouts.push({ id: 'w', date: '2026-10-22', name: 'Pierna', finished: true, exercises: [{ exerciseId: 'sentadilla', name: 'Sentadilla', sets: [{ kg: 80, reps: 5, done: true }] }] });
    expect(saveData(d, s)).toBe(true);
    expect(loadData(s).workouts[0].exercises[0].sets[0]).toEqual({ kg: 80, reps: 5, done: true });
  });
  it('datos corruptos no rompen', () => {
    const s = new Mem();
    s.setItem(STORAGE_KEY, '{no');
    expect(loadData(s).workouts).toEqual([]);
  });
  it('informa si no se puede guardar', () => {
    expect(saveData(emptyData(), { getItem: () => null, setItem: () => { throw new Error('lleno'); } })).toBe(false);
    expect(saveData(emptyData(), null)).toBe(false);
  });
});

describe('saneado', () => {
  it('descarta lo roto y corrige valores absurdos', () => {
    const res = sanitizeData({
      seedVersion: 2,
      exercises: [{ id: 'a', name: 'Banca', group: 'nada' }, { name: '' }],
      workouts: [
        { id: '1', date: '2026-13-40', exercises: [] },
        { id: '2', date: '2026-10-01', exercises: [{ exerciseId: 'a', sets: [{ kg: -5, reps: 5000, done: 'si' }] }] },
        { id: '3', date: '2026-10-02', finished: false, exercises: [] },
        { id: '4', date: '2026-10-03', finished: false, exercises: [] },
      ],
      settings: { restSeconds: 99999, weeklyGoal: 0 },
    })!;
    expect(res.dropped).toBe(2);
    expect(res.data.exercises).toHaveLength(1);
    expect(res.data.exercises[0].group).toBe('otro');
    expect(res.data.workouts).toHaveLength(3);
    expect(res.data.workouts[0].exercises[0].sets[0]).toEqual({ kg: 0, reps: 999, done: false });
    expect(res.data.workouts.filter((w) => !w.finished)).toHaveLength(1); // solo uno abierto
    expect(res.data.settings).toEqual({ restSeconds: 600, weeklyGoal: 1 });
  });
  it('rechaza lo que no es un objeto', () => {
    expect(sanitizeData(null)).toBeNull();
    expect(sanitizeData([])).toBeNull();
  });
});

describe('copia de seguridad', () => {
  it('ida y vuelta', () => {
    const d = emptyData();
    const r = parseBackup(serializeBackup(d));
    expect(r.ok && r.data.exercises.length).toBe(d.exercises.length);
  });
  it('rechaza archivos de otra app o rotos', () => {
    expect(parseBackup('{no').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'mis-vacaciones', data: {} })).ok).toBe(false);
  });
});

describe('recordatorio de copia', () => {
  it('sin datos propios no avisa; sin copia previa sí', () => {
    expect(shouldRemindBackup({ last: null, snoozeUntil: null }, '2026-10-22', false)).toBe(false);
    expect(shouldRemindBackup({ last: null, snoozeUntil: null }, '2026-10-22', true)).toBe(true);
  });
  it('avisa a los 30 días', () => {
    expect(shouldRemindBackup({ last: '2026-10-01', snoozeUntil: null }, '2026-10-30', true)).toBe(false);
    expect(shouldRemindBackup({ last: '2026-10-01', snoozeUntil: null }, '2026-10-31', true)).toBe(true);
  });
  it('posponer calla 7 días y hacer copia reinicia', () => {
    const s = new Mem();
    snoozeBackup('2026-10-22', s);
    expect(shouldRemindBackup(readMeta(s), '2026-10-28', true)).toBe(false);
    expect(shouldRemindBackup(readMeta(s), '2026-10-29', true)).toBe(true);
    markBackupDone('2026-10-29', s);
    expect(readMeta(s)).toEqual({ last: '2026-10-29', snoozeUntil: null });
    s.setItem(META_KEY, 'basura');
    expect(readMeta(s)).toEqual({ last: null, snoozeUntil: null });
  });
});

describe('ampliación de la lista de ejercicios', () => {
  it('quien ya tenía datos recibe los ejercicios nuevos sin perder los suyos', () => {
    const vieja = {
      exercises: [{ id: 'press-banca', name: 'Press banca', group: 'pecho' }, { id: 'mio', name: 'Mi ejercicio', group: 'otro' }],
      workouts: [],
    };
    const res = sanitizeData(vieja)!;
    const ids = res.data.exercises.map((e) => e.id);
    expect(ids).toContain('mio');
    expect(ids).toContain('flexiones');
    expect(ids.filter((i) => i === 'press-banca')).toHaveLength(1);
    expect(res.data.seedVersion).toBe(2);
    expect(ids).not.toContain('sentadilla'); // uno de los 26 originales que borró: no vuelve
  });
  it('si ya está al día no vuelve a añadir los que borraste', () => {
    const al_dia = { seedVersion: 2, exercises: [{ id: 'mio', name: 'Mi ejercicio', group: 'otro' }], workouts: [] };
    expect(sanitizeData(al_dia)!.data.exercises).toHaveLength(1);
  });
  it('los datos nuevos traen todos los ejercicios', () => {
    expect(emptyData().exercises.length).toBe(157);
  });
});
