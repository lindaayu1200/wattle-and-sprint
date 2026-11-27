import { W, GROUND_Y, state, onReset } from './05-const.js';

const ribbons = [];
const leaves = [];
let untilNext = 10;
let gustAge = -1;
let gustLength = 1.5;
let lean = 0;
let windPower = 0;

const randomDelay = () => 8 + Math.random() * 8;

function clear() {
  ribbons.length = 0;
  leaves.length = 0;
  untilNext = randomDelay();
  gustAge = -1;
  gustLength = 1.5;
  lean = 0;
  windPower = 0;
}

export const resetGusts = clear;
export const initGusts = clear;
export const getGustLean = () => lean;

onReset(resetGusts);

function beginGust() {
  gustAge = 0;
  gustLength = 1.35 + Math.random() * 0.3;
  windPower = 1;
  ribbons.length = 0;
  for (let i = 0; i < 3; i++) {
    ribbons.push({
      y: 170 + i * 82 + Math.random() * 20,
      width: 260 + Math.random() * 160,
      speed: 580 + Math.random() * 120,
      bend: -18 + Math.random() * 36,
      phase: Math.random() * 6,
      opacity: 0.07 + Math.random() * 0.06,
    });
  }
  for (let i = 0; i < 13; i++) {
    leaves.push({
      x: -20 - Math.random() * 180,
      y: 220 + Math.random() * 310,
      vx: 420 + Math.random() * 230,
      vy: -35 + Math.random() * 70,
      spin: -5 + Math.random() * 10,
      angle: Math.random() * 6,
      size: 3 + Math.random() * 4,
      age: 0,
    });
  }
}

function updateWind(dt) {
  if (gustAge < 0) {
    untilNext -= dt;
    if (untilNext <= 0) beginGust();
    lean = 0;
    windPower = 0;
    return;
  }
  gustAge += dt;
  const progress = gustAge / gustLength;
  const envelope = Math.sin(Math.min(1, progress) * Math.PI);
  windPower = envelope;
  lean = envelope * 0.12;
  for (let i = ribbons.length - 1; i >= 0; i--) {
    const ribbon = ribbons[i];
    ribbon.x = (ribbon.x ?? -ribbon.width) + ribbon.speed * dt;
    ribbon.phase += dt * 3;
    if (ribbon.x > W + ribbon.width) ribbons.splice(i, 1);
  }
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    leaf.age += dt;
    leaf.x += leaf.vx * dt;
    leaf.y += (leaf.vy + Math.sin(leaf.age * 9) * 20) * dt;
    leaf.angle += leaf.spin * dt;
    if (leaf.x > W + 30 || leaf.y > GROUND_Y + 20) leaves.splice(i, 1);
  }
  if (gustAge >= gustLength && !ribbons.length && !leaves.length) {
    gustAge = -1;
    untilNext = randomDelay();
    lean = 0;
    windPower = 0;
  }
}

export function updateGusts(dt) {
  if (state.scene === 'play') updateWind(dt);
  else {
    lean = 0;
    windPower = 0;
  }
}

function ribbonPath(ctx, ribbon) {
  const x = ribbon.x ?? -ribbon.width;
  const wave = Math.sin(ribbon.phase) * 9;
  ctx.beginPath();
  ctx.moveTo(x - ribbon.width, ribbon.y);
  ctx.bezierCurveTo(x - ribbon.width * 0.55, ribbon.y + ribbon.bend + wave, x - ribbon.width * 0.2, ribbon.y - ribbon.bend, x, ribbon.y);
  ctx.bezierCurveTo(x + ribbon.width * 0.25, ribbon.y + ribbon.bend, x + ribbon.width * 0.7, ribbon.y - ribbon.bend + wave, x + ribbon.width, ribbon.y);
}

function drawRibbons(ctx) {
  if (gustAge < 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const ribbon of ribbons) {
    ribbonPath(ctx, ribbon);
    ctx.strokeStyle = `rgba(255,247,215,${ribbon.opacity * windPower})`;
    ctx.lineWidth = 18;
    ctx.stroke();
    ribbonPath(ctx, ribbon);
    ctx.strokeStyle = `rgba(255,255,240,${ribbon.opacity * windPower * 0.55})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLeaves(ctx) {
  ctx.save();
  for (const leaf of leaves) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.angle);
    ctx.globalAlpha = Math.min(1, leaf.age * 5) * (1 - Math.max(0, leaf.x - W) / 80);
    ctx.fillStyle = '#d49b3b';
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size * 1.8, leaf.size, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(93,58,25,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-leaf.size, 0); ctx.lineTo(leaf.size, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawIndicator(ctx) {
  const active = windPower > 0;
  ctx.save();
  ctx.translate(W - 48, 82);
  ctx.globalAlpha = active ? 0.95 : 0.42;
  ctx.rotate(active ? -0.35 + Math.sin(state.time * 12) * 0.12 : 0);
  ctx.strokeStyle = '#f0c060';
  ctx.fillStyle = '#f0c060';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -6); ctx.lineTo(14, 0); ctx.lineTo(5, 6); ctx.stroke();
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(active ? 'WIND' : 'CALM', 0, 18);
  ctx.restore();
}

export function drawGusts(ctx) {
  drawRibbons(ctx);
  drawLeaves(ctx);
  drawIndicator(ctx);
}
