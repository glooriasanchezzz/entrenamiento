import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const DAY = 86_400_000;

export const makeISO = (y: number, m: number, d: number): ISODate => `${y}-${pad(m)}-${pad(d)}`;

export function isValidISO(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const toUTC = (iso: ISODate): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(iso: ISODate, n: number): ISODate {
  const t = new Date(toUTC(iso) + n * DAY);
  return makeISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const diffDays = (a: ISODate, b: ISODate): number => Math.round((toUTC(b) - toUTC(a)) / DAY);

/** Día de la semana con lunes = 0 … domingo = 6. */
export const weekdayMon0 = (iso: ISODate): number => (new Date(toUTC(iso)).getUTCDay() + 6) % 7;

export const weekStart = (iso: ISODate): ISODate => addDays(iso, -weekdayMon0(iso));

export function todayISO(now: Date = new Date()): ISODate {
  return makeISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function formatDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function formatShort(iso: ISODate): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${DAYS[weekdayMon0(iso)]} ${d} ${MONTHS[m - 1]}`;
}
