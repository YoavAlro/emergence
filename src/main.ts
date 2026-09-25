import './style.css';
import { Game } from './game/Game';
import { showTitleScreen } from './ui/TitleScreen';

const root = document.getElementById('app')!;
showTitleScreen(root, (save) => void new Game(root, save).start());
