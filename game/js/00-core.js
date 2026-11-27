// 00-core.js — starts the game loop, owns scene state and input, and prepares
// staged review shots for Wattle & Sprint: Outrun the Harvest.
import { W, H, state, input, rand, ease, resetHooks, stageHooks } from './05-const.js';
import { updateWorld, drawWorld } from './20-world.js';
import { updateActors, drawActors } from './30-turkey.js';
import { updateEntities, drawEntities } from './40-entities.js';
import { drawHUD, drawTitle, drawEnd } from './50-hud.js';
import { updatePlay } from './60-game.js';
import { audio } from './10-audio.js';
import { resetNearMiss, updateNearMiss, drawNearMiss } from './85-nearmiss.js';
import { initGusts, updateGusts, drawGusts, resetGusts } from './88-gusts.js';

export { W, H, GROUND_Y, state, input, rand, clamp, lerp, ease, onReset, onStage } from './05-const.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

initGusts();


// ---------- input ----------
function press(kind) {
  if (state.scene === 'title') { startRun(); return; }
  if (state.scene === 'caught' || state.scene === 'escaped') {
    if (state.time - state.sceneAt > 1.0) startRun();
    return;
  }
  if (kind === 'jump') { input.jumpQueued = 2; input.pressed = true; }
  if (kind === 'slide') input.slide = true;
}
function release(kind) { if (kind === 'slide') input.slide = false; }

addEventListener('keydown', e => {
  if (e.repeat) return;
  if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) { e.preventDefault(); press('jump'); }
  if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); press('slide'); }
});
addEventListener('keyup', e => {
  if (['ArrowDown', 'KeyS'].includes(e.code)) release('slide');
});
canvas.addEventListener('mousedown', e => {
  const r = canvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height;
  press(y > 0.72 ? 'slide' : 'jump');
});
canvas.addEventListener('mouseup', () => release('slide'));
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const y = (e.touches[0].clientY - r.top) / r.height;
  press(y > 0.72 ? 'slide' : 'jump');
}, { passive: false });
canvas.addEventListener('touchend', () => release('slide'));

export function startRun() {
  state.scene = 'play'; state.sceneAt = state.time;
  state.score = 0; state.distance = 0; state.lives = 3;
  state.biome = 0; state.combo = 0; state.farmerGap = 420;
  state.shake = 0; state.flash = 0; state.slowmo = 0;
  for (const fn of resetHooks) fn();
  resetNearMiss();
  resetGusts();
}


// ---------- staged screenshots (?shot=title|play|escape|caught) ----------
const params = new URLSearchParams(location.search);
export const shotName = params.get('shot');

function stageShot() {
  if (!shotName) return;
  if (shotName === 'title') { state.scene = 'title'; }
  else {
    startRun();
    if (shotName === 'play') {
      state.distance = 860; state.score = 2140;
      for (const fn of stageHooks) fn('play');
    } else if (shotName === 'escape') {
      state.distance = state.goal; state.score = 5230;
      state.scene = 'escaped'; state.sceneAt = state.time;
      for (const fn of stageHooks) fn('escape');
    } else if (shotName === 'caught') {
      state.distance = 1180; state.score = 3010; state.lives = 0;
      state.scene = 'caught'; state.sceneAt = state.time;
      for (const fn of stageHooks) fn('caught');
    }
  }
  let frames = 0;
  const tick = () => {
    frames++;
    if (frames > 45) window.__shotReady = true;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}


// ---------- main loop ----------
document.getElementById('boot').remove();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000) * (state.slowmo > 0 ? 0.35 : 1);
  last = now;
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2);

  updateWorld(dt);
  const sceneBeforePlay = state.scene;
  if (state.scene === 'play') {
    updateGusts(dt);
    updatePlay(dt);
    updateActors(dt);
    updateEntities(dt);
  }
  if (sceneBeforePlay === 'play' && state.scene === 'escaped') announceEscape();
  if (sceneBeforePlay === 'play' && state.scene === 'caught') announceCaught();
  updateNearMiss(dt);
  ctx.save();
  if (state.shake > 0) ctx.translate(rand(-1, 1) * state.shake * 14, rand(-1, 1) * state.shake * 10);
  drawWorld(ctx);
  if (state.scene !== 'title') {
    drawEntities(ctx);
    drawActors(ctx);
    drawHUD(ctx);
  }
  if (state.scene === 'title') drawTitle(ctx);
  if (state.scene === 'caught' || state.scene === 'escaped') drawEnd(ctx);
  drawNearMiss(ctx);
  drawGusts(ctx);
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,235,200,${state.flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// unpause audio on first interaction
addEventListener('pointerdown', () => audio.ensure(), { once: true });
addEventListener('keydown', () => audio.ensure(), { once: true });

if (shotName) setTimeout(stageShot, 300);
