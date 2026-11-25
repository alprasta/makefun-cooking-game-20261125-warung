// Keyboard and mouse for the warung. The game reads one small input snapshot per step:
// which way the cook walks, whether E was just pressed, whether E is held (chopping), whether
// Space was just pressed (a wok toss), and a click target to walk to. Edge presses are consumed
// by whoever reads them, so one key press is never counted twice.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'interact', Space: 'toss',
  Enter: 'confirm', KeyP: 'pause', Escape: 'pause',
  KeyQ: 'discard',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let clickTarget = null;

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    held.delete(action);
  }
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    clickTarget = {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }
  function onBlur() { held.clear(); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onClick);

  return {
    /** The snapshot the world steps on; edge presses are cleared after this read. */
    read() {
      const move = { x: 0, y: 0 };
      if (held.has('left')) move.x -= 1;
      if (held.has('right')) move.x += 1;
      if (held.has('up')) move.y -= 1;
      if (held.has('down')) move.y += 1;
      const snapshot = {
        move,
        interactPressed: pressed.has('interact'),
        interactHeld: held.has('interact'),
        tossPressed: pressed.has('toss'),
        discardPressed: pressed.has('discard'),
        confirmPressed: pressed.has('confirm'),
        pausePressed: pressed.has('pause'),
        clickTarget,
      };
      pressed.clear();
      clickTarget = null;
      return snapshot;
    },
    /** Test and autopilot hooks: pretend a key was just pressed. */
    press(action) { pressed.add(action); held.add(action); },
    release(action) { held.delete(action); },
    hold(action) { held.add(action); },
    click(x, y) { clickTarget = { x, y }; },
  };
}
