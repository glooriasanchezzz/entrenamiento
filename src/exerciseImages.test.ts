import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exerciseImages } from './exerciseImages';
import { ALL_SEED_EXERCISES as SEED_EXERCISES } from './seed';

describe('fotos de ejercicios', () => {
  it('cada ejercicio de partida tiene sus dos fotos en public/', () => {
    for (const e of SEED_EXERCISES) {
      const imgs = exerciseImages(e.id);
      expect(imgs, e.id).not.toBeNull();
      for (const src of imgs!) expect(existsSync(`public/${src.replace('./', '')}`), src).toBe(true);
    }
  });
  it('los ejercicios propios no tienen foto', () => {
    expect(exerciseImages('abc123')).toBeNull();
  });
});
