import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  new App(root);
}

registerSW({ immediate: true });
