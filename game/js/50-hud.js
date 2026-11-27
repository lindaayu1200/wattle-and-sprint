// 50-hud.js — HUD (score, distance-to-gate, lives, biome progress), title & end screens.
import { W, H, GROUND_Y, state, ease } from './05-const.js';
import { drawTurkey, player as player0 } from './30-turkey.js';
import { BIOMES } from './20-world.js';
import { drawRunStats } from './80-runstats.js';

const SERIF = 'Georgia, "Times New Roman", serif';

export function drawHUD(ctx) {
  // top bar
  const g = ctx.createLinearGradient(0, 0, 0, 86);
  g.addColorStop(0, 'rgba(30,16,8,0.82)'); g.addColorStop(1, 'rgba(30,16,8,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 86);

  // score (animated tape)
  ctx.font = 'bold 30px ' + SERIF;
  ctx.fillStyle = '#f5e2b0';
  ctx.textAlign = 'left';
  const shown = Math.floor(state.score * 1); // could animate
  ctx.fillText('SCORE ' + shown.toLocaleString(), 30, 44);

  // distance to gate
  const toGo = Math.max(0, Math.ceil(state.goal - state.distance));
  ctx.font = 'bold 22px ' + SERIF;
  ctx.fillStyle = '#f0c060';
  ctx.fillText(`${toGo} m to the GATE`, 30, 74);

  // lives (hearts)
  for (let i = 0; i < 3; i++) {
    heart(ctx, W - 46 - i * 42, 36, 15, i < state.lives, i === state.lives - 1 ? state.time : 0);
  }

  // biome progress bar
  const bw = 420, bx = W / 2 - bw / 2, by = 52;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 14, 7); ctx.fill();
  const prog = Math.min(1, state.distance / state.goal);
  const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bg.addColorStop(0, '#8fc7e8'); bg.addColorStop(0.35, '#f4b25a'); bg.addColorStop(1, '#b8542a');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, (bw - 4) * prog, 10, 5); ctx.fill();
  // gate flag at the end
  ctx.fillStyle = '#f5e2b0'; ctx.fillRect(bx + bw - 2, by - 8, 2, 22);
  // turkey marker
  const mx = bx + 2 + (bw - 4) * prog;
  ctx.fillStyle = '#f0d060';
  ctx.beginPath(); ctx.arc(mx, by + 7, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#d23c2a';
  ctx.beginPath(); ctx.arc(mx + 6, by + 5, 2.5, 0, 7); ctx.fill();

  // biome name plate (fades in at each biome change)
  const b = state.distance < 560 ? 0 : state.distance < 1200 ? 1 : 2;
  const since = state.distance % 560;
  ctx.font = '600 16px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,226,176,0.85)';
  ctx.fillText(BIOMES[b].name, W / 2, 36);
  ctx.textAlign = 'left';

  // combo popups
  if (state.combo >= 8) {
    ctx.font = 'bold 20px ' + SERIF;
    ctx.fillStyle = `rgba(255,220,110,${0.6 + 0.3 * Math.sin(state.time * 8)})`;
    ctx.fillText(`CORN COMBO x${state.combo}!`, W - 300, 74);
  }
}

function heart(ctx, x, y, s, alive, t) {
  ctx.save(); ctx.translate(x, y);
  const beat = alive && t ? 1 + Math.sin(t * 10) * 0.12 : 1;
  ctx.scale(beat, beat);
  ctx.fillStyle = alive ? '#e8443a' : 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.4, 0, s * 0.4);
  ctx.fill();
  ctx.restore();
}

export function drawTitle(ctx) {
  // vignette panel
  ctx.fillStyle = 'rgba(24,12,6,0.35)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  ctx.textAlign = 'center';

  // eyebrow
  ctx.font = '600 22px ' + SERIF;
  ctx.fillStyle = '#f0c060';
  ctx.fillText('THANKSGIVING IS COMING. TUP IS NOT ON THE MENU.', cx, 150);

  // big title with layered shadow
  ctx.font = '900 96px ' + SERIF;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('WATTLE & SPRINT', cx + 5, 265);
  const tg = ctx.createLinearGradient(0, 180, 0, 290);
  tg.addColorStop(0, '#ffe9a8'); tg.addColorStop(0.5, '#f5b840'); tg.addColorStop(1, '#d98a20');
  ctx.fillStyle = tg;
  ctx.fillText('WATTLE & SPRINT', cx, 260);

  ctx.font = 'italic 34px ' + SERIF;
  ctx.fillStyle = '#f5e2b0';
  ctx.fillText('Outrun the Harvest', cx, 310);

  // feature line (metric statement)
  ctx.font = '600 20px ' + SERIF;
  ctx.fillStyle = 'rgba(245,226,176,0.9)';
  ctx.fillText('1600 m to freedom · 3 biomes · carving knives, ovens & Farmer Bram · corn combos & feather boosts', cx, 368);

  // controls card
  const cw = 560, ch = 108, cxx = cx - cw / 2, cyy = 400;
  ctx.fillStyle = 'rgba(20,10,4,0.72)';
  ctx.beginPath(); ctx.roundRect(cxx, cyy, cw, ch, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(240,192,96,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '18px ' + SERIF;
  ctx.fillStyle = '#f5e2b0';
  const rows = [
    ['SPACE / ↑ / CLICK', 'flap & double-jump'],
    ['↓ / lower click', 'slide under the carving knives'],
    ['goal', 'reach the GATE — corn scores, feathers shield'],
  ];
  rows.forEach((r, i) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0c060';
    ctx.fillText(r[0], cxx + 30, cyy + 30 + i * 27);
    ctx.fillStyle = 'rgba(245,226,176,0.85)';
    ctx.fillText('— ' + r[1], cxx + 240, cyy + 30 + i * 27);
  });
  ctx.textAlign = 'center';

  // CTA pulse
  const pulse = 1 + Math.sin(state.time * 3) * 0.04;
  ctx.save(); ctx.translate(cx, 578); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#c23c2a';
  ctx.beginPath(); ctx.roundRect(-260, -34, 520, 68, 34); ctx.fill();
  ctx.strokeStyle = 'rgba(255,233,168,0.7)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 28px ' + SERIF;
  ctx.fillText('PRESS SPACE OR CLICK TO RUN', 0, 10);
  ctx.restore();
  // Tup idling on the ground, right of centre
    ctx.save(); ctx.translate(cx + 380, GROUND_Y); ctx.scale(1.25, 1.25);
  const sx = player0.x, sy = player0.y;
  player0.x = 0; player0.y = 0;
  drawTurkey(ctx);
  player0.x = sx; player0.y = sy;
  ctx.restore();

  ctx.font = 'italic 15px ' + SERIF;
  ctx.fillStyle = 'rgba(245,226,176,0.6)';
  ctx.fillText('Built by an AI agent for make.fun', cx, H - 24);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx) {
  const caught = state.scene === 'caught';
  const t = Math.min(1, (state.time - state.sceneAt) / 0.6);
  const e = ease(t);
  ctx.fillStyle = `rgba(12,6,2,${0.55 * e})`;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(0, (1 - e) * 60);

  ctx.font = '900 84px ' + SERIF;
  const title = caught ? 'CAUGHT!' : 'ESCAPED!';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(title, cx + 4, 284);
  const tg = ctx.createLinearGradient(0, 200, 0, 300);
  if (caught) { tg.addColorStop(0, '#ff9a80'); tg.addColorStop(1, '#c22a1a'); }
  else { tg.addColorStop(0, '#fff3c0'); tg.addColorStop(1, '#e8a020'); }
  ctx.fillStyle = tg;
  ctx.fillText(title, cx, 280);

  const sub = caught
    ? 'Farmer Bram got his turkey. The oven is preheating…'
    : 'Tup cleared the gate — no turkey on the table tonight!';
  ctx.font = 'italic 26px ' + SERIF;
  ctx.fillStyle = '#f5e2b0';
  ctx.fillText(sub, cx, 330);

  // stat card
  const stats = [
    ['DISTANCE', Math.floor(state.distance) + ' m'],
    ['SCORE', state.score.toLocaleString()],
    ['PROGRESS', Math.round(100 * state.distance / state.goal) + '%'],
  ];
  const cw = 560, cxx = cx - cw / 2, cyy = 380;
  ctx.fillStyle = 'rgba(20,10,4,0.78)';
  ctx.beginPath(); ctx.roundRect(cxx, cyy, cw, 120, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(240,192,96,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  stats.forEach((s, i) => {
    const x = cx + (i - 1) * 180;
    ctx.font = '600 15px ' + SERIF;
    ctx.fillStyle = '#f0c060';
    ctx.fillText(s[0], x, cyy + 42);
    ctx.font = 'bold 34px ' + SERIF;
    ctx.fillStyle = '#f5e2b0';
    ctx.fillText(s[1], x, cyy + 84);
  });

  drawRunStats(ctx);

  // CTA
  if (state.time - state.sceneAt > 1.0) {
    const pulse = 1 + Math.sin(state.time * 3) * 0.04;
    ctx.save(); ctx.translate(cx, 650); ctx.scale(pulse, pulse);
    ctx.fillStyle = caught ? '#c23c2a' : '#2a7a3c';
    ctx.beginPath(); ctx.roundRect(-230, -30, 460, 60, 30); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 24px ' + SERIF;
    ctx.fillText(caught ? 'RUN AGAIN — SPACE / CLICK' : 'ESCAPE AGAIN — SPACE / CLICK', 0, 8);
    ctx.restore();
  }
  ctx.restore();
  ctx.textAlign = 'left';
}
