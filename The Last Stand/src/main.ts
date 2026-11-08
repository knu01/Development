import { mountGame } from './ui/game';
import './ui/style.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root.');
mountGame(root);
