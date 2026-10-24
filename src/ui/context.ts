import type { DataStore } from '../store';
import type { ISODate } from '../types';
import type { RestTimer } from './timer';

export type Tab = 'entrenar' | 'historial' | 'progreso' | 'ejercicios' | 'ajustes';

export interface Ctx {
  store: DataStore;
  timer: RestTimer;
  today(): ISODate;
  rerender(): void;
  go(tab: Tab): void;
}
