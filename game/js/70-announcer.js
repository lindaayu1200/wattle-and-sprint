// 70-announcer.js — timed arcade callouts and lightweight pickup feedback.
import { state } from './05-const.js';

const bannerQueue = [];
const popups = [];
let current = null;
let elapsed = 0;
let lastBiome = -1;
let lastGateCall = false;
let lastCombo = 0;
let lastLives = state.lives;

const BANNER_IN = 0.42;
const BANNER_HOLD = 1.65;
const BANNER_OUT = 0.62;

function banner(text, tone = '#ffe7a3') {
  bannerQueue.push({ text, tone });
}

export function emitAnnouncement(text, tone) { banner(text, tone); }

export function emitScore(x, y, amount) {
  popups.push({ x, y, text: `+${amount}`, age: 0, life: 0.9 });
}

export function emitHurt() {
  banner(state.lives > 0 ? 'KEEP YOUR FEATHERS ON' : 'THE FARMER HAS YOU', '#ffb08c');
}

export function initAnnouncer() {
  bannerQueue.length = 0;
  popups.length = 0;
  current = null;
  elapsed = 0;
  lastBiome = -1;
  lastGateCall = false;
  lastCombo = 0;
  lastLives = state.lives;
}

function observeRun() {
  const biome = state.distance < 560 ? 0 : state.distance < 1200 ? 1 : 2;
  const names = ['FARMYARD YARD', 'GOLDEN CORNFIELDS', 'KITCHEN GAUNTLET'];
  if (biome !== lastBiome) {
    banner(names[biome], '#ffe7a3');
    lastBiome = biome;
  }
  if (!lastGateCall && state.goal - state.distance < 200) {
    banner('THE GATE IS IN SIGHT', '#fff2be');
    lastGateCall = true;
  }
  const milestone = Math.floor(state.combo / 10) * 10;
  if (milestone >= 10 && milestone > lastCombo) {
    banner(`${milestone} CORN COMBO!`, '#ffd15c');
    lastCombo = milestone;
  }
  lastLives = state.lives;
}

export function updateAnnouncer(dt) {
  if (state.scene === 'play') observeRun();
  if (!current && bannerQueue.length) {
    current = bannerQueue.shift();
    elapsed = 0;
  }
  if (current) {
    elapsed += dt;
    if (elapsed > BANNER_IN + BANNER_HOLD + BANNER_OUT) {
      current = null;
      elapsed = 0;
    }
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    const item = popups[i];
    item.age += dt;
    item.y -= 34 * dt;
    if (item.age >= item.life) popups.splice(i, 1);
  }
}

function bannerMotion() {
  if (elapsed < BANNER_IN) return { x: -520 + 520 * (elapsed / BANNER_IN) ** 2, alpha: 1 };
  if (elapsed < BANNER_IN + BANNER_HOLD) return { x: 0, alpha: 1 };
  const fade = (elapsed - BANNER_IN - BANNER_HOLD) / BANNER_OUT;
  return { x: 0, alpha: 1 - fade * fade };
}

export function drawAnnouncer(ctx) {
  if (current) {
    const motion = bannerMotion();
    ctx.save();
    ctx.translate(motion.x, 116);
    ctx.globalAlpha = motion.alpha;
    ctx.fillStyle = 'rgba(33,19,14,0.78)';
    ctx.fillRect(0, -46, 1280, 72);
    ctx.font = 'italic 42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = current.tone;
    ctx.shadowColor = '#180d08';
    ctx.shadowBlur = 8;
    ctx.fillText(current.text, 640, -10);
    ctx.restore();
  }
  for (const item of popups) {
    const fade = 1 - item.age / item.life;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = 'bold italic 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0a8';
    ctx.strokeStyle = 'rgba(75,35,12,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  }
}

export function announceEscape() { banner('FLY FREE, TURKEY!', '#fff0a8'); }
export function announceCaught() { banner('DINNER IS SERVED', '#ffb08c'); }
