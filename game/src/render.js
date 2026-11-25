// Every pixel of Warung Malam is drawn here on one canvas: the night street, the lanterns,
// the crates, the chopping board, the wok with its flame meter, the serving window, the cook,
// the tickets and the HUD. No images, no fonts from the network — shapes and the system font.
import {
  COLORS, DISH_IDS, FLOOR, INGREDIENTS, RECIPES, SHIFT_SECONDS, STATIONS, VIEW,
} from './config.js';
import { stationNear } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** A little pile of one ingredient: a coloured blob with a darker rim and a highlight. */
function ingredientBlob(ctx, x, y, r, id) {
  const info = INGREDIENTS[id];
  ctx.fillStyle = info.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.25, r * 0.7, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

/** A plate with the dish on it, drawn big enough to read at a glance. */
function drawPlate(ctx, x, y, r, dishId) {
  ctx.fillStyle = '#f7f2e7';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9b98f';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = RECIPES[dishId].plate;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  // Garnish flecks so the dish reads as food, not a flat disc.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7dc383';
  ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9381e';
  ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
}

function drawTicket(ctx, ticket, x, y, w, h) {
  const recipe = RECIPES[ticket.dish];
  const ratio = Math.max(0, ticket.patience / ticket.maxPatience);
  const urgent = ticket.patience <= 8;
  ctx.fillStyle = COLORS.ticket;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? COLORS.red : COLORS.ticketEdge;
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.stroke();
  text(ctx, recipe.label, x + 10, y + 14, 13, COLORS.ink, 800);
  text(ctx, 'Rp' + recipe.coins, x + w - 10, y + 14, 12, '#8a6d2f', 700, 'right');
  // Ingredient chips: what the cook still has to fetch for this dish.
  let cx = x + 12;
  for (const need of recipe.needs) {
    ingredientBlob(ctx, cx, y + 34, 7, need);
    cx += 19;
  }
  // Patience bar drains; red and pulsing when the ticket is about to burn.
  ctx.fillStyle = '#e5d9bd';
  roundRect(ctx, x + 10, y + h - 14, w - 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? COLORS.green : ratio > 0.25 ? COLORS.yellow : COLORS.red;
  if (ratio > 0) {
    roundRect(ctx, x + 10, y + h - 14, (w - 20) * ratio, 8, 4);
    ctx.fill();
  }
  if (urgent) text(ctx, 'CEPAT!', x + w - 10, y + 34, 12, COLORS.red, 800, 'right');
}

function drawFlameMeter(ctx, wok, x, y, w) {
  const marker = Math.sin(wok.phase) * 0.85;
  text(ctx, 'API', x, y - 8, 11, COLORS.cream, 700);
  // Red bed, yellow band, green heart — the marker must land in the green.
  ctx.fillStyle = '#7a1f1f';
  roundRect(ctx, x, y, w, 16, 8);
  ctx.fill();
  const toX = (v) => x + ((v + 1) / 2) * w;
  ctx.fillStyle = COLORS.yellow;
  ctx.fillRect(toX(wok.greenCenter - 0.30), y + 2, toX(wok.greenCenter + 0.30) - toX(wok.greenCenter - 0.30), 12);
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(toX(wok.greenCenter - 0.13), y, toX(wok.greenCenter + 0.13) - toX(wok.greenCenter - 0.13), 16);
  const mx = toX(marker);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(mx, y - 6);
  ctx.lineTo(mx - 8, y - 16);
  ctx.lineTo(mx + 8, y - 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2b1c12';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'TOSS ' + Math.max(0, wok.tossesLeft) + 'x', x + w + 10, y + 8, 13, COLORS.cream, 800);
}

function drawCook(ctx, player, carrying, time) {
  const { x, y } = player;
  const bob = Math.sin(time * 10) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 24, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body: white shirt, dark apron.
  ctx.fillStyle = '#f5f0e6';
  roundRect(ctx, -17, -8, 34, 32, 12);
  ctx.fill();
  ctx.fillStyle = '#3f6fb5';
  roundRect(ctx, -13, 2, 26, 22, 8);
  ctx.fill();
  // Head and chef hat.
  ctx.fillStyle = '#f2c19b';
  ctx.beginPath(); ctx.arc(0, -18, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-7, -28, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -32, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -28, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-11, -30, 22, 6);
  // Eyes look where the cook walks.
  ctx.fillStyle = '#2b1c12';
  ctx.beginPath(); ctx.arc(player.facing * 4 - 4, -18, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(player.facing * 4 + 4, -18, 1.8, 0, Math.PI * 2); ctx.fill();
  // Carried items float above the hat, newest on the right.
  const n = carrying.length;
  carrying.forEach((item, i) => {
    const ix = (i - (n - 1) / 2) * 22;
    const iy = -52;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(ix, iy, 12, 0, Math.PI * 2); ctx.fill();
    if (RECIPES[item]) drawPlate(ctx, ix, iy, 11, item);
    else ingredientBlob(ctx, ix, iy, 10, item);
  });
  ctx.restore();
}

function drawRecipesStrip(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, w, 70, 10);
  ctx.fill();
  text(ctx, 'RESEP', x + 12, y + 12, 11, COLORS.lantern, 800);
  DISH_IDS.forEach((id, i) => {
    const recipe = RECIPES[id];
    const rx = x + 12 + i * 118;
    text(ctx, recipe.label, rx, y + 27, 12, COLORS.cream, 800);
    let cx = rx + 6;
    for (const need of recipe.needs) {
      ingredientBlob(ctx, cx, y + 45, 6, need);
      cx += 16;
    }
    text(ctx, recipe.tosses + 'x toss', rx, y + 61, 10, COLORS.muted, 600);
  });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  let time = 0;

  function drawBackground(state) {
    // Night sky and back wall.
    const sky = ctx.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, COLORS.nightTop);
    sky.addColorStop(1, COLORS.night);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, 300);
    // String lights across the wall.
    ctx.strokeStyle = 'rgba(255,220,150,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.quadraticCurveTo(640, 110, 1280, 60);
    ctx.stroke();
    for (let i = 0; i < 14; i += 1) {
      const lx = 40 + i * 90;
      const ly = 60 + Math.sin((lx / 1280) * Math.PI) * 42;
      ctx.fillStyle = i % 2 ? '#ffd94d' : '#ff8a5c';
      ctx.beginPath(); ctx.arc(lx, ly + 8, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Wooden floor.
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 300, VIEW.width, 420);
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 2;
    for (let y = 340; y < 720; y += 46) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
    }
    for (let x = 120; x < 1280; x += 240) {
      ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x - 40, 720); ctx.stroke();
    }
    // Warm lamplight pooling under the stations.
    const glow = ctx.createRadialGradient(640, 280, 60, 640, 280, 560);
    glow.addColorStop(0, 'rgba(255,179,71,0.14)');
    glow.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 280, VIEW.width, 440);
    // Woven mat the cook stands on, and the props at the floor's edges.
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(0, 296, VIEW.width, 8);
    ctx.fillStyle = '#8a6a42';
    for (let x = 20; x < 1280; x += 60) ctx.fillRect(x, 300, 30, 3);
    // Rice sacks and a barrel, bottom-left.
    ctx.fillStyle = '#d9c8a3';
    ctx.beginPath(); ctx.ellipse(80, 668, 34, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8a67f';
    ctx.beginPath(); ctx.ellipse(80, 650, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.beginPath(); ctx.ellipse(150, 678, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#96683d';
    ctx.fillRect(124, 660, 52, 6);
    ctx.fillRect(124, 686, 52, 6);
    // Potted plant, bottom-right.
    ctx.fillStyle = '#a8542f';
    ctx.beginPath(); ctx.moveTo(1196, 668); ctx.lineTo(1244, 668); ctx.lineTo(1236, 700); ctx.lineTo(1204, 700); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4d8a3f';
    ctx.beginPath(); ctx.arc(1220, 648, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1204, 658, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1236, 658, 12, 0, Math.PI * 2); ctx.fill();
  }

  function drawStations(state) {
    const near = stationNear(state);
    const highlight = (kind, id, x, y, w, h) => {
      if (near && near.kind === kind && (!id || near.id === id)) {
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    // Ingredient crates.
    for (const crate of STATIONS.crates) {
      const info = INGREDIENTS[crate.id];
      ctx.fillStyle = COLORS.wood;
      roundRect(ctx, crate.x, crate.y, crate.w, crate.h, 6);
      ctx.fill();
      ctx.fillStyle = COLORS.woodDark;
      ctx.fillRect(crate.x, crate.y + crate.h - 12, crate.w, 12);
      ingredientBlob(ctx, crate.x + crate.w / 2, crate.y + 24, 13, crate.id);
      text(ctx, info.short || info.label, crate.x + crate.w / 2, crate.y + crate.h - 5, 10, COLORS.cream, 700, 'center');
      highlight('crate', crate.id, crate.x, crate.y, crate.w, crate.h);
    }
    // Chopping board with the pile being chopped and its progress ring.
    const b = STATIONS.board;
    ctx.fillStyle = COLORS.woodLight;
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.fillStyle = '#e8d9b0';
    roundRect(ctx, b.x + 14, b.y + 14, b.w - 28, b.h - 28, 6);
    ctx.fill();
    text(ctx, b.label, b.x + b.w / 2, b.y - 12, 12, COLORS.cream, 800, 'center');
    const choppable = state.player.carry.find((c) => INGREDIENTS[c] && INGREDIENTS[c].chopped);
    if (choppable) {
      ingredientBlob(ctx, b.x + 60, b.y + 38, 12, choppable);
      if (state.boardProgress > 0) {
        ctx.fillStyle = '#e5d9bd';
        roundRect(ctx, b.x + 100, b.y + 32, 52, 10, 5);
        ctx.fill();
        ctx.fillStyle = COLORS.green;
        roundRect(ctx, b.x + 100, b.y + 32, 52 * state.boardProgress, 10, 5);
        ctx.fill();
      }
    } else {
      // A resting knife and a few chopped bits show the board is for chopping.
      ctx.strokeStyle = '#c8ccd4';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(b.x + 110, b.y + 22); ctx.lineTo(b.x + 150, b.y + 50); ctx.stroke();
      ingredientBlob(ctx, b.x + 45, b.y + 40, 7, 'bawangCincang');
      ingredientBlob(ctx, b.x + 65, b.y + 48, 7, 'ayamCincang');
    }
    text(ctx, 'tahan E', b.x + b.w / 2, b.y + b.h + 12, 11, COLORS.muted, 600, 'center');
    highlight('board', null, b.x, b.y, b.w, b.h);
    // Wok station: stove, wok bowl, flames, and the flame meter while cooking.
    const w = STATIONS.wok;
    ctx.fillStyle = '#4a4440';
    roundRect(ctx, w.x, w.y, w.w, w.h, 8);
    ctx.fill();
    text(ctx, w.label, w.x + w.w / 2, w.y - 12, 12, COLORS.cream, 800, 'center');
    // Burner flames under the wok.
    const flameH = state.wok.cooking ? 14 + Math.sin(time * 14) * 5 : 4;
    ctx.fillStyle = COLORS.flame;
    ctx.beginPath();
    ctx.moveTo(w.x + 55, w.y + 52);
    ctx.quadraticCurveTo(w.x + 75, w.y + 52 - flameH * 2, w.x + 95, w.y + 52);
    ctx.quadraticCurveTo(w.x + 115, w.y + 52 - flameH * 2, w.x + 135, w.y + 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.wok;
    ctx.beginPath();
    ctx.ellipse(w.x + 95, w.y + 42, 62, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(w.x + 95, w.y + 40, 52, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Whatever is in the wok shows as coloured morsels.
    state.wok.items.forEach((item, i) => {
      ingredientBlob(ctx, w.x + 70 + i * 17, w.y + 38 + (i % 2) * 5, 7, item);
    });
    if (state.wok.cooking) {
      text(ctx, RECIPES[state.wok.dish].label, w.x + w.w / 2, w.y + 66, 12, '#ffd94d', 800, 'center');
      drawFlameMeter(ctx, state.wok, w.x + 8, w.y - 34, w.w - 60);
    } else if (state.wok.doneDish) {
      drawPlate(ctx, w.x + 95, w.y + 40, 20, state.wok.doneDish);
      text(ctx, 'SIAP! ambil (E)', w.x + w.w / 2, w.y + 66, 12, '#58c96b', 800, 'center');
    } else if (state.wok.items.length > 0) {
      text(ctx, state.wok.items.length + ' bahan di wok', w.x + w.w / 2, w.y + 66, 11, COLORS.muted, 600, 'center');
    }
    highlight('wok', null, w.x, w.y, w.w, w.h);
    // Serving window: lit counter, hanging lamp, and any plate waiting there.
    const win = STATIONS.window;
    ctx.fillStyle = '#6b4a2f';
    roundRect(ctx, win.x, win.y, win.w, win.h, 8);
    ctx.fill();
    ctx.fillStyle = '#2b1c12';
    roundRect(ctx, win.x + 8, win.y + 8, win.w - 16, 30, 6);
    ctx.fill();
    text(ctx, 'SAJI', win.x + win.w / 2, win.y + 23, 12, '#ffd94d', 800, 'center');
    text(ctx, win.label, win.x + win.w / 2, win.y - 12, 12, COLORS.cream, 800, 'center');
    ctx.fillStyle = '#f5ecd7';
    ctx.fillRect(win.x + 10, win.y + 46, win.w - 20, 10);
    if (state.windowPlate) {
      drawPlate(ctx, win.x + win.w / 2, win.y + 58, 18, state.windowPlate);
      text(ctx, RECIPES[state.windowPlate].label + ' siap!', win.x + win.w / 2, win.y + 82, 11, '#58c96b', 800, 'center');
    } else {
      text(ctx, 'antar hidangan (E)', win.x + win.w / 2, win.y + 72, 11, COLORS.muted, 600, 'center');
    }
    highlight('window', null, win.x, win.y, win.w, win.h);
  }

  function drawTickets(state) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, 14, 64, 636, 92, 10);
    ctx.fill();
    text(ctx, 'PESANAN', 28, 80, 12, COLORS.lantern, 800);
    if (state.tickets.length === 0) {
      text(ctx, 'Belum ada pesanan…', 28, 116, 14, COLORS.muted, 600);
    }
    state.tickets.forEach((ticket, i) => {
      drawTicket(ctx, ticket, 24 + i * 156, 92, 146, 58);
    });
    drawRecipesStrip(ctx, 662, 64, 604);
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    ctx.fillRect(0, 0, VIEW.width, 58);
    ctx.fillStyle = COLORS.lantern;
    ctx.fillRect(0, 58, VIEW.width, 2);
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const clock = minutes + ':' + String(seconds).padStart(2, '0');
    const urgent = state.timeLeft <= 30;
    text(ctx, '⏱ ' + clock, 640, 30, 30, urgent ? COLORS.red : COLORS.cream, 800, 'center');
    text(ctx, 'SHIFT', 640, 12, 10, COLORS.muted, 700, 'center');
    text(ctx, 'Rp ' + state.coins, 24, 30, 26, '#ffd94d', 800);
    text(ctx, 'KOİN', 24, 12, 10, COLORS.muted, 700);
    const comboText = state.combo > 1 ? 'COMBO x' + (1 + state.combo * 0.1).toFixed(1) + '  (' + state.combo + ')' : 'COMBO —';
    text(ctx, comboText, 1050, 18, 15, state.combo > 1 ? '#58c96b' : COLORS.muted, 800, 'center');
    text(ctx, 'Disaji: ' + state.servedCount + '   Sempurna: ' + state.perfectCount, 1050, 40, 13, COLORS.cream, 600, 'center');
    const rush = 1 - state.timeLeft / SHIFT_SECONDS;
    const rushLabel = rush < 0.33 ? 'Malam tenang' : rush < 0.66 ? 'Mulai ramai' : 'JAM SIBUK!';
    text(ctx, rushLabel, 880, 30, 15, rush >= 0.66 ? COLORS.red : COLORS.muted, 800, 'center');
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      text(ctx, f.text, f.x, f.y, 16, f.color, 800, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawUrgentPulse(state) {
    const urgent = state.tickets.some((t) => t.patience <= 8);
    if (!urgent) return;
    const pulse = 0.25 + 0.15 * Math.sin(time * 6);
    const grad = ctx.createRadialGradient(640, 360, 300, 640, 360, 720);
    grad.addColorStop(0, 'rgba(229,72,77,0)');
    grad.addColorStop(1, `rgba(229,72,77,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(10,6,20,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(ctx, 'WARUNG MALAM', 640, 190, 72, '#ffd94d', 800, 'center');
    text(ctx, 'Warung kaki lima paling sibuk di kota — masak, lempar, saji!', 640, 245, 20, COLORS.cream, 600, 'center');
    const lines = [
      'WASD / panah — jalan   •   E — ambil bahan / cincang (tahan) / masukkan ke wok / saji',
      'SPASI — lempar wok pas penanda di zona HIJAU   •   Q — buang   •   P — jeda',
      'Cincang ayam & bawang di talenan. Racik resepnya benar, atau wok-nya gosong.',
      'Pesanan datang makin cepat — layani sebelum kesabarannya habis!',
    ];
    lines.forEach((line, i) => text(ctx, line, 640, 310 + i * 30, 16, COLORS.muted, 600, 'center'));
    text(ctx, 'Tekan ENTER untuk buka warung', 640, 470, 24, '#58c96b', 800, 'center');
    if (best > 0) text(ctx, 'Rekor koin: Rp ' + best, 640, 510, 16, COLORS.cream, 600, 'center');
    // The five dishes, so the first frame already teaches the recipes.
    DISH_IDS.forEach((id, i) => {
      const recipe = RECIPES[id];
      const x = 640 + (i - 2) * 210;
      drawPlate(ctx, x, 590, 34, id);
      text(ctx, recipe.label, x, 640, 14, COLORS.cream, 800, 'center');
      text(ctx, recipe.needs.map((n) => INGREDIENTS[n].label).join(' + '), x, 662, 11, COLORS.muted, 600, 'center');
    });
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(10,6,20,0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(ctx, 'SHIFT SELESAI!', 640, 150, 52, '#ffd94d', 800, 'center');
    text(ctx, 'Warung tutup — pelanggan pulang kenyang (sebagian).', 640, 195, 18, COLORS.cream, 600, 'center');
    // Stars.
    for (let i = 0; i < 3; i += 1) {
      const sx = 640 + (i - 1) * 90;
      ctx.fillStyle = i < state.stars ? '#ffd94d' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      for (let p = 0; p < 10; p += 1) {
        const r = p % 2 === 0 ? 34 : 15;
        const a = -Math.PI / 2 + (p * Math.PI) / 5;
        const px = sx + Math.cos(a) * r;
        const py = 270 + Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    const rows = [
      ['Koin malam ini', 'Rp ' + state.coins],
      ['Hidangan disajikan', String(state.servedCount)],
      ['Lemparan sempurna', String(state.perfectCount)],
      ['Combo terbaik', String(state.bestCombo)],
      ['Hidangan gosong', String(state.burntCount)],
      ['Order hangus', String(state.expiredCount)],
    ];
    rows.forEach((row, i) => {
      const y = 350 + i * 34;
      text(ctx, row[0], 480, y, 18, COLORS.muted, 600);
      text(ctx, row[1], 800, y, 18, COLORS.cream, 800, 'right');
    });
    if (state.coins > best) text(ctx, 'REKOR BARU!', 640, 580, 22, '#58c96b', 800, 'center');
    text(ctx, 'Tekan ENTER untuk shift berikutnya', 640, 620, 20, COLORS.cream, 700, 'center');
  }

  function draw(state, screen, best) {
    time += 1 / 60;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    drawBackground(state);
    drawStations(state);
    drawCook(ctx, state.player, state.player.carry, time);
    drawParticles(state);
    drawTickets(state);
    drawHud(state);
    drawUrgentPulse(state);
    if (state.hintTimer > 0) {
      ctx.fillStyle = 'rgba(10,6,20,0.8)';
      roundRect(ctx, 340, 668, 600, 36, 18);
      ctx.fill();
      text(ctx, state.hint, 640, 687, 15, COLORS.cream, 600, 'center');
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(10,6,20,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text(ctx, 'JEDA — tekan P untuk lanjut', 640, 360, 30, COLORS.cream, 800, 'center');
    }
  }

  return { draw };
}
