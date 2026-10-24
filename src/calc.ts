/** Cálculos de entrenamiento: sin DOM, fáciles de probar. */
import { addDays, weekStart } from './dates';
import type { AppData, ISODate, SetEntry, Workout } from './types';

/**
 * 1RM estimado (fórmula de Epley). Con 1 repetición es el propio peso.
 * Por encima de 12 repeticiones la estimación pierde fiabilidad, así que no se calcula.
 */
export function estimate1RM(kg: number, reps: number): number | null {
  if (!(kg > 0) || !(reps >= 1) || reps > 12) return null;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export const doneSets = (sets: readonly SetEntry[]): SetEntry[] => sets.filter((s) => s.done && s.reps > 0);

export function setVolume(s: SetEntry): number {
  return s.done ? s.kg * s.reps : 0;
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, ex) => sum + ex.sets.reduce((a, s) => a + setVolume(s), 0), 0);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + doneSets(ex.sets).length, 0);
}

export const finishedWorkouts = (data: Pick<AppData, 'workouts'>): Workout[] =>
  data.workouts.filter((w) => w.finished).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

export const activeWorkout = (data: Pick<AppData, 'workouts'>): Workout | undefined => data.workouts.find((w) => !w.finished);

export interface SessionPoint {
  date: ISODate;
  /** Mayor peso levantado en una serie hecha. */
  maxKg: number;
  /** Mejor 1RM estimado de la sesión (null si no se puede estimar). */
  e1rm: number | null;
  volume: number;
  sets: SetEntry[];
}

/** Una entrada por entrenamiento terminado en el que aparece el ejercicio, de más antiguo a más reciente. */
export function exerciseHistory(data: Pick<AppData, 'workouts'>, exerciseId: string): SessionPoint[] {
  const out: SessionPoint[] = [];
  const sorted = data.workouts.filter((w) => w.finished).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const w of sorted) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => doneSets(e.sets));
    if (sets.length === 0) continue;
    const e1s = sets.map((s) => estimate1RM(s.kg, s.reps)).filter((x): x is number => x !== null);
    out.push({
      date: w.date,
      maxKg: Math.max(...sets.map((s) => s.kg)),
      e1rm: e1s.length ? Math.max(...e1s) : null,
      volume: sets.reduce((a, s) => a + s.kg * s.reps, 0),
      sets,
    });
  }
  return out;
}

/** Series de la última vez que se hizo el ejercicio (antes de `before`, si se indica). */
export function lastSessionSets(data: Pick<AppData, 'workouts'>, exerciseId: string, before?: ISODate): SessionPoint | null {
  const hist = exerciseHistory(data, exerciseId).filter((p) => !before || p.date < before);
  return hist.length ? hist[hist.length - 1] : null;
}

export interface Records {
  maxKg: { value: number; date: ISODate } | null;
  e1rm: { value: number; date: ISODate } | null;
  volume: { value: number; date: ISODate } | null;
  sessions: number;
}

export function exerciseRecords(data: Pick<AppData, 'workouts'>, exerciseId: string): Records {
  const hist = exerciseHistory(data, exerciseId);
  const best = <K extends 'maxKg' | 'e1rm' | 'volume'>(key: K) => {
    let r: { value: number; date: ISODate } | null = null;
    for (const p of hist) {
      const v = p[key];
      if (v !== null && v > 0 && (!r || v > r.value + 1e-9)) r = { value: v, date: p.date };
    }
    return r;
  };
  return { maxKg: best('maxKg'), e1rm: best('e1rm'), volume: best('volume'), sessions: hist.length };
}

/** ¿Algún récord de peso o de 1RM se bate en esta sesión (frente a las anteriores)? */
export function isNewRecord(data: Pick<AppData, 'workouts'>, exerciseId: string, date: ISODate, kg: number): boolean {
  const prev = exerciseHistory(data, exerciseId).filter((p) => p.date < date);
  return prev.length > 0 && kg > Math.max(...prev.map((p) => p.maxKg)) + 1e-9;
}

export interface WeekSummary {
  start: ISODate;
  sessions: number;
  volume: number;
  sets: number;
}

/** Resumen de las últimas `weeks` semanas (lunes a domingo), la actual la última. */
export function weeklySummary(data: Pick<AppData, 'workouts'>, today: ISODate, weeks: number): WeekSummary[] {
  const thisWeek = weekStart(today);
  const rows: WeekSummary[] = [];
  for (let i = weeks - 1; i >= 0; i--) rows.push({ start: addDays(thisWeek, -7 * i), sessions: 0, volume: 0, sets: 0 });
  for (const w of data.workouts) {
    if (!w.finished) continue;
    const ws = weekStart(w.date);
    const row = rows.find((r) => r.start === ws);
    if (!row) continue;
    row.sessions += 1;
    row.volume += workoutVolume(w);
    row.sets += workoutSetCount(w);
  }
  return rows;
}

/** Semanas seguidas (hasta la actual o la anterior) en las que se llegó al objetivo. */
export function goalStreak(data: Pick<AppData, 'workouts'>, today: ISODate, goal: number): number {
  const rows = weeklySummary(data, today, 52);
  let i = rows.length - 1;
  if (rows[i].sessions < goal) i -= 1; // la semana en curso aún puede cumplirse
  let n = 0;
  for (; i >= 0 && rows[i].sessions >= goal; i--) n += 1;
  return n;
}

/** Peso redondeado para mostrar: sin decimales si es entero. */
export function fmtKg(x: number): string {
  const r = Math.round(x * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

export const fmtVolume = (x: number): string => `${Math.round(x).toLocaleString('es-ES')} kg`;
