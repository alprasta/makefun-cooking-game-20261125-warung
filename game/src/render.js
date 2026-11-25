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

/** One wavy noodle strand, drawn across the icon. */
function noodleStrand(ctx, r, y0, phase, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let px = -r * 0.85; px <= r * 0.85; px += 2) {
    const py = y0 + Math.sin((px / r) * Math.PI * 2 + phase) * r * 0.22;
    if (px === -r * 0.85) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/** A leaf, drawn upright; the caller rotates it. */
function leaf(ctx, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.25, r * 0.34, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(0, r * 0.35);
  ctx.stroke();
}

/**
 * One ingredient, drawn as the food itself — a bowl of white rice, a nest of
 * noodles, a fried egg — never a plain coloured ball. Each icon is a small
 * picture: bowl, yolk, leaves, drumstick, onion rings, sauce bottle, chilli
 * bowl, crispy flakes. Every place an ingredient shows (crates, tickets,
 * recipe strip, wok, board, carried stack) calls this one function, so the
 * pictures stay consistent. All shapes are sized from r, the icon's radius,
 * so they still read at the tiny r=6 of the recipe strip.
 */
function drawIngredient(ctx, x, y, r, id) {
  ctx.save();
  ctx.translate(x, y);
  const lw = Math.max(1, r * 0.09);
  switch (id) {
    case 'nasi': {
      // Bowl of white rice: blue bowl, white mound, a few grain marks.
      ctx.fillStyle = '#3f6fb5';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.8, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff8ea';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.68, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#d8cbb0';
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.35); ctx.lineTo(-r * 0.2, -r * 0.55);
      ctx.moveTo(0, -r * 0.3); ctx.lineTo(r * 0.12, -r * 0.55);
      ctx.moveTo(r * 0.3, -r * 0.35); ctx.lineTo(r * 0.42, -r * 0.5);
      ctx.stroke();
      break;
    }
    case 'mie': {
      // Noodle nest: three wavy golden strands.
      noodleStrand(ctx, r, -r * 0.38, 0, '#f2c14e', r * 0.3);
      noodleStrand(ctx, r, 0, 2.1, '#e8a13c', r * 0.3);
      noodleStrand(ctx, r, r * 0.38, 4.2, '#ffd97a', r * 0.3);
      break;
    }
    case 'telur': {
      // Fried egg: white oval, yolk in the middle.
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8dfc8';
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.fillStyle = '#ffb61e';
      ctx.beginPath();
      ctx.arc(r * 0.08, -r * 0.05, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd97a';
      ctx.beginPath();
      ctx.arc(-r * 0.05, -r * 0.18, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sayur': {
      // Leafy greens: three leaves with veins.
      ctx.save(); ctx.rotate(-0.5); leaf(ctx, r, '#58a34d'); ctx.restore();
      ctx.save(); ctx.rotate(0.45); leaf(ctx, r, '#7dc383'); ctx.restore();
      leaf(ctx, r, '#6db35f');
      break;
    }
    case 'ayam': {
      // Chicken drumstick: pink meat, white bone with knobs.
      ctx.save();
      ctx.rotate(-0.6);
      ctx.fillStyle = '#e8a08a';
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, r * 0.2, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97f66';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, r * 0.38, r * 0.35, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5f0e6';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.15);
      ctx.lineTo(r * 0.68, -r * 0.52);
      ctx.stroke();
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath(); ctx.arc(r * 0.66, -r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.48, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'bawang': {
      // Onion: pale bulb with layer rings and a green sprout.
      ctx.fillStyle = '#d9a7c7';
      ctx.beginPath();
      ctx.arc(0, r * 0.05, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b57e9e';
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#58a34d';
      ctx.beginPath();
      ctx.moveTo(-r * 0.18, -r * 0.72);
      ctx.lineTo(0, -r * 1.0);
      ctx.lineTo(r * 0.18, -r * 0.72);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'kecap': {
      // Soy-sauce bottle: dark body, red cap, cream label. Light outline so it
      // still reads on the dark wok and recipe strip.
      ctx.fillStyle = '#3a2418';
      roundRect(ctx, -r * 0.42, -r * 0.15, r * 0.84, r * 0.95, r * 0.18);
      ctx.fill();
      ctx.strokeStyle = '#d8cbb0';
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(-r * 0.2, -r * 0.62, r * 0.4, r * 0.5);
      ctx.fillStyle = '#d9381e';
      roundRect(ctx, -r * 0.28, -r * 0.95, r * 0.56, r * 0.36, r * 0.08);
      ctx.fill();
      ctx.fillStyle = '#f5ecd7';
      ctx.fillRect(-r * 0.28, r * 0.18, r * 0.56, r * 0.34);
      break;
    }
    case 'sambal': {
      // Bowl of red sambal: dark bowl, red mound, chilli flecks.
      ctx.fillStyle = '#4a2c1c';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.78, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#d9381e';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.66, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#a01e10';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.05, -r * 0.42, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.22, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58c96b';
      ctx.beginPath(); ctx.arc(r * 0.18, -r * 0.28, r * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bwgGoreng': {
      // Fried shallots: a pile of golden crispy flakes.
      const flakes = [
        [-0.45, 0.3, -0.4, 0.3, 0.13, '#c98a3d'],
        [0, 0.45, 0.2, 0.34, 0.14, '#e0a44f'],
        [0.45, 0.25, 0.7, 0.3, 0.13, '#a86428'],
        [-0.2, -0.15, 0.1, 0.3, 0.12, '#f2c14e'],
        [0.3, -0.25, -0.5, 0.28, 0.12, '#c98a3d'],
        [0, -0.5, 0.9, 0.26, 0.11, '#e0a44f'],
      ];
      for (const [fx, fy, rot, frx, fry, color] of flakes) {
        ctx.save();
        ctx.translate(fx * r, fy * r);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, frx * r, fry * r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'ayamCincang': {
      // Diced chicken: three pink cubes with darker edges.
      const cubes = [
        [-0.35, 0.3, 0.15, '#eda58f'],
        [0.3, 0.35, -0.2, '#e8a08a'],
        [0, -0.35, 0.4, '#f2b09a'],
      ];
      for (const [cx, cy, rot, color] of cubes) {
        ctx.save();
        ctx.translate(cx * r, cy * r);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
        ctx.strokeStyle = '#d97f66';
        ctx.lineWidth = lw;
        ctx.strokeRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
        ctx.restore();
      }
      ctx.fillStyle = '#fff8ea';
      ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.42, r * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bawangCincang': {
      // Chopped onion: small pale rings and bits.
      ctx.strokeStyle = '#e3b3d2';
      ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.25, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.3, r * 0.3, r * 0.26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#b57e9e';
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.25, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.3, r * 0.3, r * 0.26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    default: {
      // Unknown id: fall back to the ingredient's swatch colour.
      const info = INGREDIENTS[id];
      ctx.fillStyle = info ? info.color : '#cccccc';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/**
 * The dish itself, drawn as the food its name promises — fried rice is a golden
 * mound, mie goreng a noodle nest, sate skewers with peanut sauce, gado-gado a
 * veg pile under peanut sauce, soto a bowl of yellow soup. Flat style, sized
 * from r so it still reads at the tiny r=8 of a carried plate. `inWok` drops
 * the soup bowl: in the wok the soto is a yellow mound being tossed.
 */
function drawDishFood(ctx, x, y, r, dishId, inWok) {
  ctx.save();
  ctx.translate(x, y);
  const lw = Math.max(1, r * 0.09);
  switch (dishId) {
    case 'nasiGoreng': {
      // Golden fried-rice mound with egg, greens and a chilli fleck.
      ctx.fillStyle = '#e8a13c';
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.78, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(-r * 0.1, r * 0.22, r * 0.55, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fff8ea';
      const grains = [[-0.4, -0.05], [-0.15, -0.35], [0.1, -0.1], [0.35, -0.3], [0.45, 0.05], [0, -0.5]];
      for (const [gx, gy] of grains) {
        ctx.beginPath(); ctx.arc(gx * r, gy * r, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb61e';
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58a34d';
      ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.05, r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9381e';
      ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.05, r * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'mieGoreng': {
      // Noodle nest with egg and greens.
      noodleStrand(ctx, r, -r * 0.35, 0, '#f2c14e', r * 0.3);
      noodleStrand(ctx, r, 0, 2.1, '#e8a13c', r * 0.3);
      noodleStrand(ctx, r, r * 0.35, 4.2, '#ffd97a', r * 0.3);
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb61e';
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58a34d';
      ctx.beginPath(); ctx.arc(-r * 0.4, r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.1, r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sateAyam': {
      // Two skewers of chicken with a peanut-sauce drizzle.
      const stick = (x0, y0, x1, y1) => {
        ctx.strokeStyle = '#8a6a42';
        ctx.lineWidth = r * 0.12;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      stick(-r * 0.75, r * 0.45, r * 0.75, -r * 0.45);
      stick(-r * 0.75, -r * 0.45, r * 0.75, r * 0.45);
      const meat = (mx, my) => {
        ctx.fillStyle = '#c96f3f';
        roundRect(ctx, mx - r * 0.2, my - r * 0.2, r * 0.4, r * 0.4, r * 0.08);
        ctx.fill();
        ctx.strokeStyle = '#a8542f';
        ctx.lineWidth = lw;
        ctx.stroke();
      };
      meat(-r * 0.4, r * 0.24); meat(0, 0); meat(r * 0.4, -r * 0.24);
      meat(-r * 0.4, -r * 0.24); meat(r * 0.4, r * 0.24);
      ctx.strokeStyle = '#e8c07a';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.1);
      ctx.quadraticCurveTo(0, -r * 0.15, r * 0.6, r * 0.05);
      ctx.stroke();
      ctx.fillStyle = '#58a34d';
      ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gadoGado': {
      // Mixed veg under peanut sauce, with egg and crispy shallots.
      ctx.save(); ctx.rotate(-0.5); leaf(ctx, r * 0.8, '#58a34d'); ctx.restore();
      ctx.save(); ctx.rotate(0.5); leaf(ctx, r * 0.8, '#7dc383'); ctx.restore();
      leaf(ctx, r * 0.8, '#6db35f');
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb61e';
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.35, r * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d9a05b';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.25);
      ctx.quadraticCurveTo(0, r * 0.05, r * 0.6, r * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.15, r * 0.4, r * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9381e';
      ctx.beginPath(); ctx.arc(r * 0.55, r * 0.3, r * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sotoAyam': {
      if (inWok) {
        // In the wok the soup is a yellow mound being tossed, no bowl.
        ctx.fillStyle = '#e8c85a';
        ctx.beginPath();
        ctx.arc(0, r * 0.3, r * 0.78, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f2d878';
        ctx.beginPath();
        ctx.arc(-r * 0.1, r * 0.22, r * 0.55, Math.PI, 0);
        ctx.fill();
      } else {
        // Bowl of yellow chicken soup.
        ctx.fillStyle = '#3f6fb5';
        ctx.beginPath();
        ctx.arc(0, r * 0.1, r * 0.82, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e8c85a';
        ctx.beginPath();
        ctx.arc(0, r * 0.1, r * 0.7, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f2d878';
        ctx.beginPath();
        ctx.arc(0, -r * 0.05, r * 0.45, Math.PI, 0);
        ctx.fill();
      }
      // Chicken shreds, greens and shallots on top.
      ctx.strokeStyle = '#f5ecd7';
      ctx.lineWidth = r * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.25); ctx.lineTo(-r * 0.1, -r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.15); ctx.lineTo(r * 0.35, -r * 0.35); ctx.stroke();
      ctx.fillStyle = '#58a34d';
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.05, r * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98a3d';
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = RECIPES[dishId] ? RECIPES[dishId].plate : '#cccccc';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
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
  drawDishFood(ctx, x, y, r * 0.72, dishId, false);
}

/** A small wooden stool, sized from r; legLen reaches the floor or the table it tucks under. */
function drawStool(ctx, x, y, r, legLen) {
  ctx.fillStyle = '#5d3c22';
  ctx.fillRect(x - r * 0.5, y + 4, r * 0.14, legLen);
  ctx.fillRect(x + r * 0.36, y + 4, r * 0.14, legLen);
  ctx.fillStyle = '#96683d';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a87f52';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, r * 0.85, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A customer dining table (meja makan): far stool, wooden top, a plate of food
 *  and two glasses of teh on it, near stool. The stools match the table's wood. */
function drawDiningTable(ctx, tx, ty, dishId) {
  drawStool(ctx, tx, ty - 46, 20, 32);
  ctx.fillStyle = '#5d3c22';
  ctx.fillRect(tx - 54, ty + 10, 8, 30);
  ctx.fillRect(tx + 46, ty + 10, 8, 30);
  ctx.fillStyle = '#8a6a42';
  roundRect(ctx, tx - 66, ty - 14, 132, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#a87f52';
  roundRect(ctx, tx - 66, ty - 14, 132, 8, 6);
  ctx.fill();
  drawPlate(ctx, tx - 28, ty - 26, 13, dishId);
  ctx.fillStyle = '#f5ecd7';
  ctx.fillRect(tx + 18, ty - 32, 10, 18);
  ctx.fillStyle = '#c96f3f';
  ctx.fillRect(tx + 19, ty - 24, 8, 9);
  ctx.fillStyle = '#f5ecd7';
  ctx.fillRect(tx + 34, ty - 32, 10, 18);
  ctx.fillStyle = '#c96f3f';
  ctx.fillRect(tx + 35, ty - 24, 8, 9);
  drawStool(ctx, tx, ty + 54, 22, 22);
}

/** The night-warung busker (pengamen): cap, striped shirt, guitar, a tip hat
 *  at his feet and a music note drifting above the strings. */
function drawBusker(ctx, x, y, time) {
  const bob = Math.sin(time * 2) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 40, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1e';
  ctx.beginPath(); ctx.ellipse(30, 42, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath(); ctx.arc(27, 40, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(33, 41, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b3d';
  ctx.fillRect(-10, 14, 8, 24);
  ctx.fillRect(2, 14, 8, 24);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-12, 36, 12, 5);
  ctx.fillRect(0, 36, 12, 5);
  ctx.fillStyle = '#c96f3f';
  roundRect(ctx, -14, -16, 28, 32, 10);
  ctx.fill();
  ctx.fillStyle = '#f5ecd7';
  ctx.fillRect(-14, -6, 28, 5);
  ctx.fillRect(-14, 4, 28, 5);
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath(); ctx.arc(0, -24, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1e';
  ctx.beginPath(); ctx.arc(0, -26, 10, Math.PI, 0); ctx.fill();
  ctx.fillRect(-10, -28, 22, 4);
  ctx.save();
  ctx.translate(10, 2);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#8a5a2e';
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.arc(2, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6b4a2f';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(26, -14); ctx.stroke();
  ctx.fillStyle = '#5d3c22';
  ctx.fillRect(24, -18, 6, 8);
  ctx.restore();
  ctx.strokeStyle = '#e8b48a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(16, 2); ctx.stroke();
  text(ctx, '♪', 34, -34 + Math.sin(time * 2 + 1) * 3, 16, '#ffb347', 700, 'center');
  ctx.restore();
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
    drawIngredient(ctx, cx, y + 34, 7, need);
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
  // The label sits left of the bar, never under the marker triangle — a marker
  // at the bar's left end used to cover the "P" and read as "AY!".
  text(ctx, 'API', x - 8, y + 8, 11, COLORS.cream, 700, 'right');
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
    else drawIngredient(ctx, ix, iy, 10, item);
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
      drawIngredient(ctx, cx, y + 45, 6, need);
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
    // The kitchen counter (meja dapur): a long wooden counter the crates, the
    // board, the wok and the serving window all sit on.
    ctx.fillStyle = '#5d3c22';
    ctx.fillRect(20, 198, 1240, 98);
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(16, 180, 1248, 18);
    ctx.fillStyle = '#a87f52';
    ctx.fillRect(16, 180, 1248, 4);
    ctx.strokeStyle = '#4a2e18';
    ctx.lineWidth = 2;
    for (let x = 140; x < 1260; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 202); ctx.lineTo(x, 290); ctx.stroke();
    }
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(20, 288, 1240, 8);
    // Customer dining tables with matching stools, and the busker by the wall.
    drawDiningTable(ctx, 330, 630, 'nasiGoreng');
    drawDiningTable(ctx, 950, 630, 'sotoAyam');
    drawBusker(ctx, 1150, 625, time);
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
      drawIngredient(ctx, crate.x + crate.w / 2, crate.y + 24, 13, crate.id);
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
    const choppables = state.player.carry.filter((c) => INGREDIENTS[c] && INGREDIENTS[c].chopped);
    if (choppables.length > 0) {
      // Every choppable ingredient in hand lies on the board as the real food.
      choppables.forEach((item, i) => {
        drawIngredient(ctx, b.x + 42 + i * 46, b.y + 36, 12, item);
      });
      // The chopped result appears beside the raw pile once the board is half done.
      if (state.boardProgress > 0.5) {
        drawIngredient(ctx, b.x + 42 + choppables.length * 46, b.y + 36, 10, INGREDIENTS[choppables[0]].chopped);
      }
      if (state.boardProgress > 0) {
        ctx.fillStyle = '#e5d9bd';
        roundRect(ctx, b.x + 24, b.y + 52, b.w - 48, 9, 4);
        ctx.fill();
        ctx.fillStyle = COLORS.green;
        roundRect(ctx, b.x + 24, b.y + 52, (b.w - 48) * state.boardProgress, 9, 4);
        ctx.fill();
      }
    } else {
      // A resting knife and a few chopped bits show the board is for chopping.
      ctx.strokeStyle = '#c8ccd4';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(b.x + 110, b.y + 22); ctx.lineTo(b.x + 150, b.y + 50); ctx.stroke();
      drawIngredient(ctx, b.x + 45, b.y + 40, 7, 'bawangCincang');
      drawIngredient(ctx, b.x + 65, b.y + 48, 7, 'ayamCincang');
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
      drawIngredient(ctx, w.x + 70 + i * 17, w.y + 38 + (i % 2) * 5, 7, item);
    });
    if (state.wok.cooking) {
      // The dish itself heaps in the wok while it is tossed — the name on the
      // label and the food in the bowl are the same dish.
      const bounce = -Math.abs(Math.sin(time * 9)) * 4;
      drawDishFood(ctx, w.x + 95, w.y + 32 + bounce, 26, state.wok.dish, true);
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
      // Short forms keep the five ingredient lists from running into each other.
      const short = { 'Ayam Cincang': 'Ayam Cinc.', 'Bawang Cincang': 'Bwg Cinc.', 'Bawang Goreng': 'Bwg Goreng' };
      const needsText = recipe.needs.map((n) => short[INGREDIENTS[n].label] || INGREDIENTS[n].label).join(' + ');
      text(ctx, needsText, x, 662, 11, COLORS.muted, 600, 'center');
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
