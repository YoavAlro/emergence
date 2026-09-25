import './style.css';
import { Game } from './game/Game';
import { loadSettings } from './save';
import { showTitleScreen } from './ui/TitleScreen';

const root = document.getElementById('app')!;
const debug = new URLSearchParams(location.search).has('debug');
const settings = loadSettings();
showTitleScreen(root, (save) => void new Game(root, save, settings, debug).start());
