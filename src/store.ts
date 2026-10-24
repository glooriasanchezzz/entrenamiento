import { saveData } from './storage';
import type { AppData } from './types';

/** Datos de la app con suscripción a cambios y guardado automático. */
export class DataStore {
  private listeners = new Set<() => void>();
  saveFailed = false;

  constructor(
    private data: AppData,
    private readonly persist: (d: AppData) => boolean = saveData,
  ) {}

  get(): AppData {
    return this.data;
  }

  /**
   * Cambia los datos y guarda. Con `silent` no avisa a las vistas (para no perder
   * el foco al teclear en un campo).
   */
  update(fn: (d: AppData) => void, silent = false): void {
    fn(this.data);
    this.saveFailed = !this.persist(this.data);
    if (!silent) this.emit();
  }

  replace(next: AppData): void {
    this.data = next;
    this.saveFailed = !this.persist(this.data);
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of [...this.listeners]) fn();
  }
}
