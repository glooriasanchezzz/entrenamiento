import { ALL_SEED_EXERCISES } from './seed';

/**
 * Fotos de todos los ejercicios de partida (carpeta public/ejercicios, 2 por ejercicio: posición
 * inicial y final). Proceden de «Free Exercise DB» (dominio público, licencia Unlicense):
 * https://github.com/yuhonas/free-exercise-db. Los ejercicios que crees tú no llevan foto.
 */
const WITH_IMAGES = new Set(ALL_SEED_EXERCISES.map((e) => e.id));

/** Rutas (relativas a la página) de las fotos del ejercicio, o `null` si no tiene. */
export function exerciseImages(exerciseId: string): [string, string] | null {
  return WITH_IMAGES.has(exerciseId) ? [`./ejercicios/${exerciseId}-0.jpg`, `./ejercicios/${exerciseId}-1.jpg`] : null;
}
