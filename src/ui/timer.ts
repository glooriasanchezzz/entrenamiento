/** Temporizador de descanso. Vive en la cabecera de la app, fuera de las vistas. */
import { button } from './components';
import { h } from '../dom';

export class RestTimer {
  private endsAt: number | null = null;
  private total = 0;
  private tick: ReturnType<typeof setInterval> | null = null;
  readonly el: HTMLElement;
  private readonly label = h('span', { class: 'timer__time', role: 'timer' });
  private readonly bar = h('div', { class: 'timer__bar' });

  constructor(private readonly now: () => number = () => Date.now()) {
    this.el = h(
      'div',
      { class: 'timer', hidden: true },
      h('span', { class: 'timer__title' }, 'Descanso'),
      this.label,
      h('div', { class: 'timer__track' }, this.bar),
      button('−15', { small: true, variant: 'ghost', onClick: () => this.adjust(-15) }),
      button('+15', { small: true, variant: 'ghost', onClick: () => this.adjust(15) }),
      button(null, { small: true, variant: 'ghost', icon: 'x', title: 'Parar descanso', onClick: () => this.stop() }),
    );
  }

  get running(): boolean {
    return this.endsAt !== null;
  }

  start(seconds: number): void {
    this.total = seconds;
    this.endsAt = this.now() + seconds * 1000;
    this.el.hidden = false;
    this.el.classList.remove('timer--done');
    if (!this.tick) this.tick = setInterval(() => this.render(), 250);
    this.render();
  }

  adjust(delta: number): void {
    if (this.endsAt === null) return;
    this.endsAt += delta * 1000;
    this.total = Math.max(this.total + delta, 1);
    this.render();
  }

  stop(): void {
    this.endsAt = null;
    this.el.hidden = true;
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
  }

  /** Segundos que faltan (0 si ya acabó o no hay descanso en marcha). */
  remaining(): number {
    return this.endsAt === null ? 0 : Math.max(0, Math.ceil((this.endsAt - this.now()) / 1000));
  }

  private render(): void {
    if (this.endsAt === null) return;
    const left = this.remaining();
    const m = Math.floor(left / 60);
    this.label.textContent = left === 0 ? '¡Ya!' : `${m}:${String(left % 60).padStart(2, '0')}`;
    this.bar.style.width = `${Math.min(100, Math.max(0, (left / Math.max(this.total, 1)) * 100))}%`;
    if (left === 0) {
      this.el.classList.add('timer--done');
      if (this.tick) clearInterval(this.tick);
      this.tick = null;
      try {
        navigator.vibrate?.(200);
      } catch {
        /* no disponible en iPhone */
      }
    }
  }
}
