import { h, icon, type Attrs, type Child, type IconName } from '../dom';

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  onClick?: (e: MouseEvent) => void;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}

export function button(label: string | null, o: ButtonOptions = {}): HTMLButtonElement {
  const attrs: Attrs = {
    type: 'button',
    class: `btn btn--${o.variant ?? 'secondary'}${o.small ? ' btn--small' : ''}${label === null ? ' btn--icon' : ''}`,
    title: o.title,
    'aria-label': o.ariaLabel ?? (label === null ? o.title : undefined),
    disabled: o.disabled,
    onClick: o.onClick,
  };
  return h('button', attrs, o.icon ? icon(o.icon, 18) : null, label === null ? null : h('span', null, label));
}

export function callout(tone: Tone, ...children: Child[]): HTMLElement {
  const name: IconName = tone === 'bad' || tone === 'warn' ? 'alert' : 'info';
  return h('div', { class: `callout callout--${tone}`, role: tone === 'bad' ? 'alert' : undefined }, icon(name, 18), h('div', { class: 'callout__body' }, children));
}

export interface DialogHandle {
  el: HTMLDialogElement;
  close(): void;
}

let dialogCounter = 0;

export function openDialog(title: string, content: Node, opts: { onClose?: () => void } = {}): DialogHandle {
  const titleId = `dlg-title-${++dialogCounter}`;
  const dlg = h('dialog', { class: 'dlg', 'aria-labelledby': titleId });
  const handle: DialogHandle = {
    el: dlg,
    close() {
      if (typeof dlg.close === 'function' && dlg.open) dlg.close();
      else finish();
    },
  };
  dlg.append(
    h('div', { class: 'dlg__head' }, h('h2', { id: titleId }, title), button(null, { variant: 'ghost', icon: 'x', title: 'Cerrar', onClick: () => handle.close() })),
    h('div', { class: 'dlg__body' }, content),
  );
  document.body.append(dlg);
  let closed = false;
  function finish(): void {
    if (closed) return;
    closed = true;
    dlg.remove();
    opts.onClose?.();
  }
  dlg.addEventListener('close', finish);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) handle.close();
  });
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
  return handle;
}

export function confirmDialog(o: { title: string; message: Child; confirmLabel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let answer = false;
    const body = h('div', { class: 'stack' }, h('p', null, o.message));
    const dlg = openDialog(o.title, body, { onClose: () => resolve(answer) });
    body.append(
      h(
        'div',
        { class: 'dlg__actions' },
        button('Cancelar', { variant: 'ghost', onClick: () => dlg.close() }),
        button(o.confirmLabel, {
          variant: o.danger ? 'danger' : 'primary',
          onClick: () => {
            answer = true;
            dlg.close();
          },
        }),
      ),
    );
  });
}

/** Pide un texto corto en un diálogo. Devuelve `null` si se cancela. */
export function promptDialog(o: { title: string; label: string; value?: string; confirmLabel: string }): Promise<string | null> {
  return new Promise((resolve) => {
    let answer: string | null = null;
    const input = h('input', { type: 'text', maxlength: 60, value: o.value ?? '', autocomplete: 'off', 'aria-label': o.label });
    const ok = (): void => {
      const v = input.value.trim();
      if (!v) return;
      answer = v;
      dlg.close();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ok();
      }
    });
    const body = h(
      'div',
      { class: 'stack' },
      h('label', { class: 'field' }, h('span', null, o.label), input),
      h('div', { class: 'dlg__actions' }, button('Cancelar', { variant: 'ghost', onClick: () => dlg.close() }), button(o.confirmLabel, { variant: 'primary', onClick: ok })),
    );
    const dlg = openDialog(o.title, body, { onClose: () => resolve(answer) });
    input.focus();
  });
}

let toastHost: HTMLElement | null = null;

export function toast(message: string, tone: Tone = 'neutral', ms = 3500): void {
  if (!toastHost || !toastHost.isConnected) {
    toastHost = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const el = h('div', { class: `toast toast--${tone}`, role: 'status' }, message);
  toastHost.append(el);
  setTimeout(() => el.remove(), ms);
}
