/** Fecha `AAAA-MM-DD` (sin hora ni zona). */
export type ISODate = string;

export type MuscleGroup = 'pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'core' | 'otro';

export const MUSCLE_GROUPS: readonly MuscleGroup[] = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'otro'];

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
}

export interface SetEntry {
  /** Peso en kg (0 si es peso corporal). */
  kg: number;
  reps: number;
  /** Serie hecha. Las no marcadas no cuentan en el progreso. */
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  /** Nombre en el momento de entrenar: el historial no cambia si luego se renombra o borra el ejercicio. */
  name: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  date: ISODate;
  name: string;
  exercises: WorkoutExercise[];
  /** `false` mientras se está entrenando. Solo puede haber uno abierto. */
  finished: boolean;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface Settings {
  /** Descanso por defecto entre series, en segundos. */
  restSeconds: number;
  /** Entrenamientos que quieres hacer por semana. */
  weeklyGoal: number;
}

export interface AppData {
  version: 1;
  exercises: Exercise[];
  workouts: Workout[];
  routines: Routine[];
  settings: Settings;
}
