import './style.css';
import { startVersionCheck } from './ui/updateBanner';
import { GameView } from './render/game';

const app = document.getElementById('app')!;
app.innerHTML = '';

const game = new GameView(app);

startVersionCheck(() => game.save());
