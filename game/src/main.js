// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the night's tickets and flame swings. ?shot=cover|prep|rush|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, stationNear } from './world.js';
import { createInput } from './input.js';
import { unlockAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
// Play-test hook (read-only from the outside): lets a headless driver inspect the live
// world and drive it with synthetic keys without touching the game's own code paths.
let currentScreen = SCREEN_TITLE;
window.__warung = { world, screen: () => currentScreen, stationNear: () => stationNear(world.state) };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  currentScreen = SCREEN_TITLE;

  function announce(message) {
    status.textContent = message;
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const snapshot = input.read();
    if (snapshot.confirmPressed) unlockAudio();

    if (currentScreen === SCREEN_TITLE) {
      if (snapshot.confirmPressed) {
        world.reset();
        currentScreen = SCREEN_PLAY;
        announce('Warung buka! Layani pesanan sebelum kesabarannya habis.');
      }
    } else if (currentScreen === SCREEN_PLAY) {
      if (snapshot.pausePressed) {
        currentScreen = SCREEN_PAUSED;
        announce('Jeda.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = world.step(STEP, snapshot);
          if (events & EVENT_OVER) {
            currentScreen = SCREEN_OVER;
            if (world.state.coins > best) {
              best = world.state.coins;
              saveBest(best);
            }
            announce('Shift selesai. Koin: ' + world.state.coins + '.');
            break;
          }
        }
      }
    } else if (currentScreen === SCREEN_PAUSED) {
      if (snapshot.pausePressed) currentScreen = SCREEN_PLAY;
    } else if (currentScreen === SCREEN_OVER) {
      if (snapshot.confirmPressed) {
        world.reset();
        currentScreen = SCREEN_PLAY;
        announce('Shift baru dimulai.');
      }
    }

    renderer.draw(world.state, currentScreen, best);
    requestAnimationFrame(frame);
  }

  announce('Warung Malam. Tekan Enter untuk buka warung.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
