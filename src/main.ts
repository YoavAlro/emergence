import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './style.css';
import { Game } from './game/Game';
import { loadSettings } from './save';
import { showTitleScreen } from './ui/TitleScreen';

const root = document.getElementById('app')!;
const debug = new URLSearchParams(location.search).has('debug');
const settings = loadSettings();
showTitleScreen(root, (save) => void new Game(root, save, settings, debug).start());
