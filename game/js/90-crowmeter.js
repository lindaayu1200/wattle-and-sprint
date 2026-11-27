// 90-crowmeter.js — a rising barnyard chorus for corn and close calls.
import { W, H, state, onReset } from './05-const.js';

const TIERS = [
  { at: 0.85, text: 'FULL BARNYARD ROAR' },
  { at: 0.6, text: 'hens cheering' },
  { at: 0.25, text: 'a few clucks' },
];
const HECKLES = ['the crows are watching...', 'cluck louder!', 'is that all you have?', 'the hens expected more'];
const particles = [];
let level = 0;
let lastTier = 0;
let tierFlash = 0;
let heckleIndex = 0;
let heckleAge = 0;
const HECKLE_INTERVAL = 3.2;

function resetState() {
  level = 0;
  lastTier = 0;
  tierFlash = 0;
  heckleIndex = 0;
  heckleAge = 0;
  particles.length = 0;
}

export function resetCrowMeter() {
  resetState();
}

export function initCrowMeter() {
  resetState();
}

onReset(resetCrowMeter);

function tierFor(value) {
  if (value >= 0.85) return 3;
  if (value >= 0.6) return 2;
  if (value >= 0.25) return 1;
  return 0;
}

function cheerParticles() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const edgeX = side < 0 ? 18 : W - 18;
  for (let i = 0; i < 7; i++) {
    particles.push({
      x: edgeX + (Math.random() - 0.5) * 18,
      y: 100 + Math.random() * (H - 220),
      vx: -side * (8 + Math.random() * 18),
      vy: -12 - Math.random() * 26,
      age: 0,
      life: 0.55 + Math.random() * 0.55,
      size: 2 + Math.random() * 3,
      spin: Math.random() * Math.PI,
    });
  }
}

function setLevel(next) {
  const before = tierFor(level);
  level = Math.max(0, Math.min(1, next));
  const after = tierFor(level);
  if (after > before) {
    lastTier = after;
    tierFlash = 0.9;
    cheerParticles();
  } else if (after === 0) {
    lastTier = 0;
  }
}

export function recordCrowEvent(type) {
  if (type === 'corn') setLevel(level + 0.04);
  else if (type === 'nearMiss') setLevel(level + 0.10);
  else if (type === 'hurt') setLevel(level - 0.5);
}

export function crowLevel() {
  return level;
}

export function updateCrowMeter(dt, evt) {
  if (!state) return;
  if (evt && evt.type) recordCrowEvent(evt.type);
  if (state.scene === 'play') {
    const speed = Number(state.speed) || 0;
    const decay = speed > 18 ? 0.026 : 0.02;
    setLevel(level - decay * dt);
  }
  if (level < 0.25) {
    heckleAge += dt;
    if (heckleAge >= HECKLE_INTERVAL) {
      heckleAge = 0;
      heckleIndex = (heckleIndex + 1) % HECKLES.length;
    }
  } else {
    heckleAge = 0;
  }
  tierFlash = Math.max(0, tierFlash - dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const mote = particles[i];
    mote.age += dt;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    mote.vy += 24 * dt;
    mote.spin += dt * 5;
    if (mote.age >= mote.life) particles.splice(i, 1);
  }
}

function currentTier() {
  return TIERS.find(tier => level >= tier.at) || null;
}

function drawFrame(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = 'rgba(38,20,9,0.86)';
  ctx.strokeStyle = '#8c5428';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(225,157,76,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 7); ctx.lineTo(x + width - 8, y + 7);
  ctx.moveTo(x + 8, y + height - 7); ctx.lineTo(x + width - 8, y + height - 7);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx) {
  for (const mote of particles) {
    const alpha = Math.max(0, 1 - mote.age / mote.life);
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.translate(mote.x, mote.y);
    ctx.rotate(mote.spin);
    ctx.fillStyle = '#ffe29a';
    ctx.fillRect(-mote.size, -1, mote.size * 2, 2);
    ctx.fillRect(-1, -mote.size, 2, mote.size * 2);
    ctx.restore();
  }
}

export function drawCrowMeter(ctx) {
  if (!state || !ctx || state.scene === 'title') return;
  const x = 28, y = H - 70, width = 270, height = 34;
  const tier = currentTier();
  drawParticles(ctx);
  ctx.save();
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = tierFlash > 0 ? '#fff0a8' : 'rgba(245,226,176,0.9)';
  ctx.fillText(tier ? tier.text : 'quiet barnyard', x, y - 9);
  drawFrame(ctx, x, y, width, height);
  ctx.fillStyle = 'rgba(12,7,3,0.8)';
  ctx.fillRect(x + 12, y + 10, width - 24, 14);
  ctx.fillStyle = tier ? '#d77b32' : '#9b6335';
  ctx.fillRect(x + 12, y + 10, (width - 24) * level, 14);
  ctx.strokeStyle = 'rgba(255,232,166,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 12, y + 10, width - 24, 14);
  if (level < 0.25) {
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = 'rgba(245,226,176,0.72)';
    ctx.fillText(HECKLES[heckleIndex], x, y + height + 16);
  }
  ctx.restore();
}
