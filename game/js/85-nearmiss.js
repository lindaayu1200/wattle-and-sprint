// 85-nearmiss.js — close-call scoring and a quiet flock in the high sky.
//
// This module owns two effects that share the run clock but not the collision
// system. Hazards tell us when they have cleared Tup; the patrol only decorates
// the sky and never enters the entity list.
import { GROUND_Y, W, state, onReset } from './05-const.js';
import { player } from './30-turkey.js';
import { audio } from './10-audio.js';

const HAZARDS = new Set(['knife', 'oven', 'pot', 'hay', 'forkpit', 'saw']);
const NEAR_MARGIN = 34;
const CHAIN_WINDOW = 2;
const MAX_CHAIN = 8;
const BUZZARD_MIN = 340;
const BUZZARD_MAX = 760;

const closeCalls = [];
const buzzards = [];
const feathers = [];

let chain = 0;
let chainAge = Infinity;
let patrolDistance = 0;
let nextPatrol = 420;
let lastBonus = 0;
let bannerFlash = 0;

function resetState() {
  closeCalls.length = 0;
  buzzards.length = 0;
  feathers.length = 0;
  chain = 0;
  chainAge = Infinity;
  patrolDistance = 0;
  nextPatrol = 420;
  lastBonus = 0;
  bannerFlash = 0;
}

export function resetNearMiss() {
  resetState();
}

export function initNearMiss() {
  resetState();
}

onReset(resetNearMiss);

function isHazard(entity) {
  return entity && HAZARDS.has(entity.type);
}

function turkeyPoint() {
  return { x: player.x, y: player.y - (player.sliding ? 16 : 44) };
}

function hazardPoint(entity) {
  // The visual centre is a better close-call reference than the ground line.
  // Hanging knives and saws therefore get judged at their actual height.
  return { x: entity.x, y: entity.y - (entity.type === 'hay' || entity.type === 'oven' || entity.type === 'pot' ? entity.r * 0.8 : 0) };
}

function missDistance(entity) {
  const a = turkeyPoint();
  const b = hazardPoint(entity);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function closeEnough(entity) {
  const distance = missDistance(entity);
  const collisionRadius = (entity.r ?? 24) + 26;
  return distance > collisionRadius && distance <= collisionRadius + NEAR_MARGIN;
}

function chainMultiplier() {
  if (chainAge > CHAIN_WINDOW) chain = 0;
  chain = Math.min(MAX_CHAIN, chain + 1);
  chainAge = 0;
  return chain;
}

function addCloseCall(entity) {
  if (entity.nearMissed || state.scene !== 'play') return;
  entity.nearMissed = true;
  if (!closeEnough(entity)) return;

  const multiplier = chainMultiplier();
  const bonus = 25 * multiplier;
  state.score += bonus;
  lastBonus = bonus;
  bannerFlash = 0.8;
  closeCalls.push({
    x: player.x + 20,
    y: player.y - 104,
    age: 0,
    life: 1.05,
    multiplier,
    bonus,
    tilt: (Math.random() - 0.5) * 0.08,
  });
  audio.nearMiss(multiplier);
}

// Called by 40-entities.js at the same point it marks a hazard as passed.
export function inspectHazardPass(entity) {
  if (!isHazard(entity)) return;
  addCloseCall(entity);
}

function spawnPatrol() {
  const count = 2 + (Math.random() * 2 | 0);
  const start = W + 80;
  const altitude = 110 + Math.random() * 120;
  const speed = 90 + Math.random() * 65;
  for (let i = 0; i < count; i++) {
    buzzards.push({
      x: start + i * 58,
      y: altitude + (Math.random() - 0.5) * 34,
      speed,
      phase: Math.random() * Math.PI * 2,
      wing: 0.8 + Math.random() * 0.35,
      scale: 0.72 + Math.random() * 0.22,
    });
  }
}

function schedulePatrol() {
  nextPatrol = BUZZARD_MIN + Math.random() * (BUZZARD_MAX - BUZZARD_MIN);
}

function updatePatrol(dt) {
  patrolDistance += Math.max(0, state.distance - (updatePatrol.lastDistance ?? state.distance));
  updatePatrol.lastDistance = state.distance;
  if (patrolDistance >= nextPatrol) {
    patrolDistance = 0;
    spawnPatrol();
    schedulePatrol();
  }
  for (let i = buzzards.length - 1; i >= 0; i--) {
    const bird = buzzards[i];
    bird.phase += dt * 2.4;
    bird.x -= bird.speed * dt;
    bird.y += Math.sin(bird.phase * 0.8) * dt * 9;
    if (bird.x < -100) buzzards.splice(i, 1);
  }
}

function updateCloseCalls(dt) {
  chainAge += dt;
  if (chainAge > CHAIN_WINDOW) chain = 0;
  bannerFlash = Math.max(0, bannerFlash - dt);
  for (let i = closeCalls.length - 1; i >= 0; i--) {
    const call = closeCalls[i];
    call.age += dt;
    call.y -= 20 * dt;
    if (call.age >= call.life) closeCalls.splice(i, 1);
  }
  for (let i = feathers.length - 1; i >= 0; i--) {
    const mote = feathers[i];
    mote.age += dt;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    mote.vy += 22 * dt;
    if (mote.age > mote.life) feathers.splice(i, 1);
  }
}

export function updateNearMiss(dt) {
  if (state.scene === 'play') updatePatrol(dt);
  updateCloseCalls(dt);
}

function easeOut(t) {
  const n = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - n, 3);
}

function callAlpha(age, life) {
  const fadeIn = Math.min(1, age / 0.12);
  const fadeOut = Math.min(1, (life - age) / 0.28);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function drawBuzzard(ctx, bird) {
  const flap = Math.sin(bird.phase * bird.wing) * 0.22;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.scale(bird.scale, bird.scale);
  ctx.strokeStyle = 'rgba(32,25,26,0.78)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 2);
  ctx.quadraticCurveTo(-20, -8 - flap * 22, -38, 4);
  ctx.moveTo(3, 2);
  ctx.quadraticCurveTo(20, -8 + flap * 22, 38, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(32,25,26,0.88)';
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(196,137,74,0.8)';
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(16, 2); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawCloseCall(ctx, call) {
  const alpha = callAlpha(call.age, call.life);
  const intro = easeOut(Math.min(1, call.age / 0.2));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(call.x - 24 + 24 * intro, call.y);
  ctx.rotate(call.tilt);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic bold 23px Georgia, serif';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(48,21,10,0.78)';
  ctx.fillStyle = '#ffe29a';
  ctx.strokeText(`CLOSE! x${call.multiplier}`, 0, 0);
  ctx.fillText(`CLOSE! x${call.multiplier}`, 0, 0);
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillStyle = '#f5c765';
  ctx.fillText(`+${call.bonus}`, 0, 22);
  ctx.restore();
}

function drawChainGlow(ctx) {
  if (bannerFlash <= 0) return;
  const alpha = bannerFlash * 0.12;
  const gradient = ctx.createRadialGradient(player.x, player.y - 45, 8, player.x, player.y - 45, 100);
  gradient.addColorStop(0, `rgba(255,219,103,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,219,103,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(player.x, player.y - 45, 100, 0, Math.PI * 2); ctx.fill();
}

function drawFlightHint(ctx) {
  if (!buzzards.length) return;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#f5e2b0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 10]);
  ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(W, 220); ctx.stroke();
  ctx.restore();
}

export function drawNearMiss(ctx) {
  drawFlightHint(ctx);
  for (const bird of buzzards) drawBuzzard(ctx, bird);
  drawChainGlow(ctx);
  for (const call of closeCalls) drawCloseCall(ctx, call);
}

// Keep the module's state inspectable during development without exposing
// mutable arrays to the rest of the game.
export function nearMissStatus() {
  return {
    chain,
    chainAge,
    lastBonus,
    buzzards: buzzards.length,
    closeCalls: closeCalls.length,
  };
}
