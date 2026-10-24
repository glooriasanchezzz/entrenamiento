/** Guardado local, copias de seguridad y recordatorio de copia. */
import { addDays, diffDays, isValidISO, todayISO } from './dates';
import { SEED_V2_EXERCISES, SEED_VERSION, emptyData } from './seed';
import { MUSCLE_GROUPS } from './types';
import type { AppData, Exercise, MuscleGroup, Routine, SetEntry, Workout, WorkoutExercise } from './types';

export const STORAGE_KEY = 'entrenamiento:datos:v1';
export const META_KEY = 'entrenamiento:copia:v1';
export const BACKUP_APP = 'entrenamiento';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${counter}`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export interface SanitizeResult {
  data: AppData;
  dropped: number;
}

/** Convierte cualquier cosa leída del disco o de una copia en datos válidos, descartando lo roto. */
export function sanitizeData(raw: unknown): SanitizeResult | null {
  if (!isObj(raw)) return null;
  let dropped = 0;
  const base = emptyData();

  const exercises: Exercise[] = [];
  const exIds = new Set<string>();
  if (Array.isArray(raw.exercises)) {
    for (const e of raw.exercises) {
      const name = isObj(e) ? str(e.name, 60) : '';
      if (!isObj(e) || !name) {
        dropped++;
        continue;
      }
      let id = str(e.id, 60) || newId();
      if (exIds.has(id)) id = newId();
      exIds.add(id);
      const group = MUSCLE_GROUPS.includes(e.group as MuscleGroup) ? (e.group as MuscleGroup) : 'otro';
      exercises.push({ id, name, group });
    }
  }

  const workouts: Workout[] = [];
  const wIds = new Set<string>();
  let openSeen = false;
  if (Array.isArray(raw.workouts)) {
    for (const w of raw.workouts) {
      if (!isObj(w) || !isValidISO(w.date)) {
        dropped++;
        continue;
      }
      let id = str(w.id, 60) || newId();
      if (wIds.has(id)) id = newId();
      wIds.add(id);
      const exs: WorkoutExercise[] = [];
      for (const x of Array.isArray(w.exercises) ? w.exercises : []) {
        if (!isObj(x)) continue;
        const sets: SetEntry[] = [];
        for (const s of Array.isArray(x.sets) ? x.sets : []) {
          if (!isObj(s)) continue;
          sets.push({ kg: num(s.kg, 0, 1000, 0), reps: Math.floor(num(s.reps, 0, 999, 0)), done: s.done === true });
        }
        const exId = str(x.exerciseId, 60);
        const name = str(x.name, 60) || exercises.find((e) => e.id === exId)?.name || 'Ejercicio';
        exs.push({ exerciseId: exId, name, sets });
      }
      let finished = w.finished !== false;
      if (!finished) {
        if (openSeen) finished = true; // solo un entrenamiento abierto
        openSeen = true;
      }
      const note = str(w.note, 200);
      const wo: Workout = { id, date: w.date, name: str(w.name, 60) || 'Entrenamiento', exercises: exs, finished };
      if (note) wo.note = note;
      workouts.push(wo);
    }
  }

  const routines: Routine[] = [];
  if (Array.isArray(raw.routines)) {
    for (const r of raw.routines) {
      const name = isObj(r) ? str(r.name, 60) : '';
      if (!isObj(r) || !name) {
        dropped++;
        continue;
      }
      const ids = (Array.isArray(r.exerciseIds) ? r.exerciseIds : []).filter((x): x is string => typeof x === 'string' && exIds.has(x));
      routines.push({ id: str(r.id, 60) || newId(), name, exerciseIds: ids });
    }
  }

  const st = isObj(raw.settings) ? raw.settings : {};
  const settings = {
    restSeconds: Math.round(num(st.restSeconds, 10, 600, base.settings.restSeconds)),
    weeklyGoal: Math.round(num(st.weeklyGoal, 1, 14, base.settings.weeklyGoal)),
  };

  // Si la lista de partida se ha ampliado desde que se guardaron los datos, se añaden los ejercicios nuevos
  // (sin tocar los que ya tienes ni recuperar los que borraste de versiones anteriores).
  let finalExercises = exercises;
  if (!Array.isArray(raw.exercises)) finalExercises = base.exercises;
  else if ((Number(raw.seedVersion) || 1) < SEED_VERSION) {
    const have = new Set(exercises.map((e) => e.id));
    finalExercises = [...exercises, ...SEED_V2_EXERCISES.filter((e) => !have.has(e.id)).map((e) => ({ ...e }))];
  }
  return { data: { version: 1, seedVersion: SEED_VERSION, exercises: finalExercises, workouts, routines, settings }, dropped };
}

export function loadData(storage: Store | null = browserStorage()): AppData {
  if (!storage) return emptyData();
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return emptyData();
    return sanitizeData(JSON.parse(text))?.data ?? emptyData();
  } catch {
    return emptyData();
  }
}

/** Devuelve `false` si no se pudo guardar (sin espacio, modo privado…). */
export function saveData(data: AppData, storage: Store | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function serializeBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), data }, null, 2);
}

export const backupFileName = (now: Date = new Date()): string => `entrenamiento-copia-${todayISO(now)}.json`;

export type ParseResult = { ok: true; data: AppData; dropped: number } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es una copia válida (no se puede leer).' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: 'Este archivo no es una copia de la app de entrenamiento.' };
  const res = sanitizeData(raw.data);
  if (!res) return { ok: false, error: 'La copia no contiene datos.' };
  return { ok: true, data: res.data, dropped: res.dropped };
}

// --- Recordatorio de copia ---------------------------------------------------

export const REMIND_EVERY_DAYS = 30;
export const SNOOZE_DAYS = 7;

export interface BackupMeta {
  last: string | null;
  snoozeUntil: string | null;
}

export function readMeta(store: Store | null = browserStorage()): BackupMeta {
  const empty: BackupMeta = { last: null, snoozeUntil: null };
  if (!store) return empty;
  try {
    const raw = JSON.parse(store.getItem(META_KEY) ?? 'null');
    const iso = (v: unknown) => (isValidISO(v) ? v : null);
    return isObj(raw) ? { last: iso(raw.last), snoozeUntil: iso(raw.snoozeUntil) } : empty;
  } catch {
    return empty;
  }
}

function writeMeta(meta: BackupMeta, store: Store | null): void {
  try {
    store?.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* sin almacenamiento */
  }
}

export const markBackupDone = (today: string, store: Store | null = browserStorage()): void => writeMeta({ last: today, snoozeUntil: null }, store);

export const snoozeBackup = (today: string, store: Store | null = browserStorage()): void =>
  writeMeta({ ...readMeta(store), snoozeUntil: addDays(today, SNOOZE_DAYS) }, store);

export function shouldRemindBackup(meta: BackupMeta, today: string, hasOwnData: boolean): boolean {
  if (!hasOwnData) return false;
  if (meta.snoozeUntil && today < meta.snoozeUntil) return false;
  if (!meta.last) return true;
  return diffDays(meta.last, today) >= REMIND_EVERY_DAYS;
}
