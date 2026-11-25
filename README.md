# makefun-cooking-game-20261125-warung

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/alprasta/makefun-cooking-game-20261125-warung/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/alprasta/makefun-cooking-game-20261125-warung/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Warung Malam** — a complete, original 2D cooking game set in a bustling Indonesian night food stall.
You are the cook on a 180-second shift: fetch ingredients from the crates, chop the
raw ones at the board, build each dish in the wok, and serve it at the window before
the ticket's patience runs out.

## The twist: flame timing

Once a dish's ingredients are in the wok, a flame meter swings back and forth. Toss
with **Space** while the marker sits in the **green zone** for a perfect cook — yellow
is okay, red burns the dish and the wok has to be scraped clean. Every dish needs
1–3 good tosses, and each perfect toss builds your combo.

## Dine-in + Es Teh

Half of the dishes you serve are eaten at the warung's two dining tables instead
of taken away. A seated customer eats for 10–14 seconds while his **PUAS**
(satisfaction) meter drains — pour him an **Es Teh** at the drink cart (hold **E**,
let go while the marker is in the green, same timing game as the wok) and carry
it to his table to top his satisfaction back up. Finish happy and he pays a
**TIP** on top of the dish price; let the meter empty and he storms off angry —
you lose the tip and a few coins. Keep the tables happy and the night pays more
than the window alone.

## Recipes (each its own combination)

- **Nasi Goreng** — nasi + telur + bawang cincang + kecap (3 tosses)
- **Mie Goreng** — mie + telur + sayur + sambal (3 tosses)
- **Sate Ayam** — ayam cincang + bawang cincang + kecap (2 tosses)
- **Gado-Gado** — sayur + telur + bawang goreng + sambal (1 toss)
- **Soto Ayam** — ayam cincang + sayur + bawang goreng (2 tosses)

Ayam and bawang must be chopped first — hold **E** at the talenan (chopping board).

## Rush hour

Tickets arrive faster and patience shrinks as the shift runs on. Serve fast and
perfect for combo multipliers; a ticket about to burn makes the screen edge pulse
red. At the end of the shift you get stars, coins, dishes served, perfect tosses
and your best combo.

## Controls

- **WASD / arrow keys** — walk (or click a spot to walk there)
- **E** — pick up / chop (hold) / add to wok / serve / pour Es Teh (hold) / serve tea to a table
- **Space** — toss the wok
- **Q** — discard what you carry (or clean the wok)
- **P** — pause, **Enter** — start / next shift

## Tech

Pure static files, no network requests, no external assets: all art is drawn on
canvas, all sound is synthesized with WebAudio. Seeded RNG (`?seed=N`) makes every
night reproducible; `?shot=cover|prep|rush|end&seed=N` stages deterministic
screenshot scenes by playing the real rules forward with a scripted autopilot.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

---

<sub>Entered on [make.fun](https://make.fun/?ref=58yp00jq&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
