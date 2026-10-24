import { describe, expect, it } from 'vitest';
import { activeWorkout, estimate1RM, exerciseHistory, exerciseRecords, fmtKg, goalStreak, isNewRecord, lastSessionSets, weeklySummary, workoutVolume } from './calc';
import type { Workout } from './types';

const w = (id: string, date: string, sets: [number, number, boolean?][], finished = true): Workout => ({
  id,
  date,
  name: 'x',
  finished,
  exercises: [{ exerciseId: 'banca', name: 'Press banca', sets: sets.map(([kg, reps, done = true]) => ({ kg, reps, done })) }],
});

describe('1RM estimado', () => {
  it('Epley: 100 kg × 5 ≈ 116,7', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.667, 2);
  });
  it('1 repetición es el propio peso', () => {
    expect(estimate1RM(120, 1)).toBe(120);
  });
  it('no estima sin peso o con demasiadas repeticiones', () => {
    expect(estimate1RM(0, 8)).toBeNull();
    expect(estimate1RM(40, 20)).toBeNull();
    expect(estimate1RM(40, 0)).toBeNull();
  });
});

describe('volumen e historial', () => {
  const data = {
    workouts: [
      w('1', '2026-10-05', [[60, 8], [60, 8], [60, 6, false]]),
      w('2', '2026-10-12', [[62.5, 8], [65, 5]]),
      w('3', '2026-10-19', [[70, 3]], false),
    ],
  };
  it('solo cuentan las series hechas', () => {
    expect(workoutVolume(data.workouts[0])).toBe(60 * 8 * 2);
  });
  it('el historial ignora entrenamientos abiertos', () => {
    const h = exerciseHistory(data, 'banca');
    expect(h.map((p) => p.date)).toEqual(['2026-10-05', '2026-10-12']);
    expect(h[1].maxKg).toBe(65);
  });
  it('la última sesión y los récords salen del historial', () => {
    expect(lastSessionSets(data, 'banca')?.date).toBe('2026-10-12');
    expect(lastSessionSets(data, 'banca', '2026-10-12')?.date).toBe('2026-10-05');
    const r = exerciseRecords(data, 'banca');
    expect(r.maxKg).toEqual({ value: 65, date: '2026-10-12' });
    expect(r.sessions).toBe(2);
  });
  it('detecta récords de peso frente a sesiones anteriores', () => {
    expect(isNewRecord(data, 'banca', '2026-10-12', 65)).toBe(true);
    expect(isNewRecord(data, 'banca', '2026-10-12', 60)).toBe(false);
    expect(isNewRecord(data, 'banca', '2026-10-05', 60)).toBe(false); // primera vez: no es "récord"
  });
  it('encuentra el entrenamiento abierto', () => {
    expect(activeWorkout(data)?.id).toBe('3');
  });
});

describe('semanas', () => {
  const data = {
    workouts: [
      w('a', '2026-10-05', [[50, 10]]), // lunes semana 1
      w('b', '2026-10-07', [[50, 10]]),
      w('c', '2026-10-12', [[50, 10]]), // semana 2
      w('d', '2026-10-14', [[50, 10]]),
      w('e', '2026-10-16', [[50, 10]]),
      w('f', '2026-10-20', [[50, 10]]), // semana 3 (en curso, jueves 22)
    ],
  };
  it('agrupa de lunes a domingo', () => {
    const rows = weeklySummary(data, '2026-10-22', 3);
    expect(rows.map((r) => r.sessions)).toEqual([2, 3, 1]);
    expect(rows[2].start).toBe('2026-10-19');
  });
  it('la racha no se rompe por la semana en curso', () => {
    expect(goalStreak(data, '2026-10-22', 3)).toBe(1); // semana 2 cumple; la actual aún puede
    expect(goalStreak(data, '2026-10-22', 2)).toBe(2);
  });
});

describe('formato', () => {
  it('quita decimales sobrantes', () => {
    expect(fmtKg(60)).toBe('60');
    expect(fmtKg(62.5)).toBe('62,5');
  });
});
