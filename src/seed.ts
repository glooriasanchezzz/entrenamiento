import type { AppData, Exercise, MuscleGroup } from './types';

const E = (id: string, name: string, group: MuscleGroup): Exercise => ({ id, name, group });

export const SEED_EXERCISES: Exercise[] = [
  E('press-banca', 'Press banca', 'pecho'),
  E('press-inclinado', 'Press inclinado con mancuernas', 'pecho'),
  E('aperturas', 'Aperturas', 'pecho'),
  E('fondos', 'Fondos', 'pecho'),
  E('dominadas', 'Dominadas', 'espalda'),
  E('remo-barra', 'Remo con barra', 'espalda'),
  E('jalon', 'Jalón al pecho', 'espalda'),
  E('remo-polea', 'Remo en polea', 'espalda'),
  E('peso-muerto', 'Peso muerto', 'espalda'),
  E('sentadilla', 'Sentadilla', 'piernas'),
  E('prensa', 'Prensa de piernas', 'piernas'),
  E('peso-muerto-rumano', 'Peso muerto rumano', 'piernas'),
  E('zancadas', 'Zancadas', 'piernas'),
  E('curl-femoral', 'Curl femoral', 'piernas'),
  E('extension-cuadriceps', 'Extensión de cuádriceps', 'piernas'),
  E('gemelos', 'Gemelos de pie', 'piernas'),
  E('hip-thrust', 'Hip thrust', 'piernas'),
  E('press-militar', 'Press militar', 'hombros'),
  E('elevaciones-laterales', 'Elevaciones laterales', 'hombros'),
  E('pajaros', 'Pájaros', 'hombros'),
  E('curl-biceps', 'Curl de bíceps', 'brazos'),
  E('curl-martillo', 'Curl martillo', 'brazos'),
  E('triceps-polea', 'Tríceps en polea', 'brazos'),
  E('press-frances', 'Press francés', 'brazos'),
  E('plancha', 'Plancha (repeticiones = segundos)', 'core'),
  E('crunch', 'Abdominales', 'core'),
];

export function emptyData(): AppData {
  return {
    version: 1,
    exercises: SEED_EXERCISES.map((e) => ({ ...e })),
    workouts: [],
    routines: [],
    settings: { restSeconds: 90, weeklyGoal: 3 },
  };
}
