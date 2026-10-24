import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { loadData } from './storage';
import { DataStore } from './store';
import { mountApp } from './ui/app';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  root.replaceChildren();
  mountApp(root, new DataStore(loadData()));
}

// Pide a iOS/Android que no borre los datos si falta espacio (no está garantizado en iPhone).
try {
  void navigator.storage?.persist?.();
} catch {
  /* sin soporte */
}
