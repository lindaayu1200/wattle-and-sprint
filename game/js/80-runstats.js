// 80-runstats.js — per-run results for the end-screen recap.
import { state, onReset } from './05-const.js';

const totals = {
  corn: 0,
  hazards: 0,
  jumps: 0,
  doubles: 0,
  combo: 0,
};

function clearStats() {
  totals.corn = 0;
  totals.hazards = 0;
  totals.jumps = 0;
  totals.doubles = 0;
  totals.combo = 0;
}

onReset(clearStats);

export function initRunStats() {
  clearStats();
}

export function recordCorn() {
  totals.corn++;
  totals.combo = Math.max(totals.combo, state.combo);
}

export function recordHazard() {
  totals.hazards++;
}

export function recordJump(doubleJump = false) {
  totals.jumps++;
  if (doubleJump) totals.doubles++;
}

export function drawRunStats(ctx) {
  if (state.scene !== 'caught' && state.scene !== 'escaped') return;

  const progress = Math.min(1, Math.max(0, (state.time - state.sceneAt) / 0.9));
  const shown = value => Math.floor(value * progress);
  const cx = 640;
  const x = cx - 280;
  const y = 512;
  const rows = [
    ['CORN EATEN', totals.corn.toLocaleString()],
    ['HAZARDS DODGED', totals.hazards.toLocaleString()],
    ['JUMPS', `${totals.jumps} (${totals.doubles} DOUBLE)`],
    ['BEST COMBO', `${totals.combo}x`],
    ['SECONDS SURVIVED', `${(Math.max(0, state.sceneAt - runStartedAt)).toFixed(1)}s`],
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(20,10,4,0.82)';
  ctx.beginPath(); ctx.roundRect(x, y, 560, 104, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(240,192,96,0.42)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = '600 13px Georgia, serif';
  for (let i = 0; i < rows.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = x + 24 + col * 278;
    const py = y + 24 + row * 29;
    ctx.fillStyle = '#dcae55';
    ctx.fillText(rows[i][0], px, py);
    ctx.textAlign = 'right';
    ctx.font = 'bold 17px Georgia, serif';
    const value = i === 0 ? shown(totals.corn) : i === 1 ? shown(totals.hazards) : i === 2
      ? `${shown(totals.jumps)} (${shown(totals.doubles)} DOUBLE)`
      : i === 3 ? `${shown(totals.combo)}x` : `${(Math.max(0, state.sceneAt - runStartedAt) * progress).toFixed(1)}s`;
    ctx.fillStyle = '#f5e2b0';
    ctx.fillText(value, px + 250, py);
    ctx.textAlign = 'left';
    ctx.font = '600 13px Georgia, serif';
  }
  ctx.restore();
}

let runStartedAt = 0;
onReset(() => { runStartedAt = state.time; });
