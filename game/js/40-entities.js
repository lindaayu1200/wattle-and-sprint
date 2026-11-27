// 40-entities.js — hazards (knives, ovens, hay, pits), corn pickups, feather boost, particles.
import { W, GROUND_Y, state, rand } from './05-const.js';
import { onReset, onStage } from './00-core.js';
import { player, farmer } from './30-turkey.js';
import { audio } from './10-audio.js';
import { emitScore, emitHurt } from './70-announcer.js';

export const entities = [];   // {type,x,y,vx,vy,r,ph}
export const particles = [];
let spawnAt = 200;

function reset() {
  entities.length = 0; particles.length = 0; spawnAt = 200;
}
onReset(reset);

function spawn() {
  const d = state.distance;
  const b = d < 560 ? 0 : d < 1200 ? 1 : 2;
  const roll = Math.random();
  const x = W + 80;
  if (b === 0) {
    if (roll < 0.45) entities.push({ type: 'hay', x, y: GROUND_Y, r: 34 });
    else if (roll < 0.8) entities.push({ type: 'knife', x, y: GROUND_Y - rand(60, 190), vx: -rand(240, 320), r: 22, ph: 0 });
    else entities.push({ type: 'oven', x, y: GROUND_Y, r: 44, vx: -60 });
  } else if (b === 1) {
    if (roll < 0.35) entities.push({ type: 'hay', x, y: GROUND_Y, r: 34 });
    else if (roll < 0.65) entities.push({ type: 'forkpit', x, y: GROUND_Y, r: 30 });
    else if (roll < 0.85) entities.push({ type: 'knife', x, y: GROUND_Y - rand(70, 210), vx: -rand(260, 360), r: 22, ph: 0 });
    else entities.push({ type: 'oven', x, y: GROUND_Y, r: 44, vx: -90 });
  } else {
    if (roll < 0.3) entities.push({ type: 'knife', x, y: GROUND_Y - rand(50, 220), vx: -rand(280, 400), r: 22, ph: 0 });
    else if (roll < 0.6) entities.push({ type: 'oven', x, y: GROUND_Y, r: 46, vx: -rand(80, 140) });
    else if (roll < 0.8) entities.push({ type: 'pot', x, y: GROUND_Y, r: 36 });
    else entities.push({ type: 'saw', x, y: GROUND_Y - rand(80, 160), ph: rand(0, 6), r: 26 });
  }
  // corn arcs sprinkled in safe air
  if (Math.random() < 0.75) {
    const cy = GROUND_Y - rand(70, 200);
    const n = 3 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) entities.push({ type: 'corn', x: x + 60 + i * 46, y: cy + Math.sin(i * 0.9) * 26, ph: rand(0, 6), r: 16 });
  }
  // rare feather boost
  if (Math.random() < 0.14) entities.push({ type: 'feather', x: x + 240, y: GROUND_Y - rand(120, 200), ph: rand(0, 6), r: 18 });
}

function burst(x, y, color, n = 14, spread = 220) {
  for (let i = 0; i < n; i++) particles.push({
    x, y, vx: rand(-spread * 0.4, spread * 0.6), vy: rand(-260, -40),
    life: rand(0.5, 1.1), color, s: rand(3, 7), rot: rand(0, 6), vr: rand(-8, 8),
  });
}

export function hurtTurkey(cause) {
  if (player.invuln > 0) return;
  state.lives--;
  state.combo = 0;
  player.invuln = 1.6;
  state.shake = 1;
  state.flash = 0.8;
  state.farmerGap = 260;
  farmer.x = player.x - 120;
  burst(player.x, player.y - 50, '#e8b858', 20, 300);
  audio.hit();
  emitHurt();
  if (state.lives <= 0) {
    state.scene = 'caught'; state.sceneAt = state.time;
    state.slowmo = 1; audio.caught();
  }
}

export function updateEntities(dt) {
  spawnAt -= state.distance - (updateEntities.lastD ?? 0);
  updateEntities.lastD = state.distance;
  if (spawnAt <= 0) { spawn(); spawnAt = rand(34, 60); }

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    e.x -= (e.vx ?? 0) * dt;
    e.ph = (e.ph ?? 0) + dt * 5;
    // world-relative: entities are spawned at screen-space and drift with world speed
    e.x -= 480 * dt * (e.type === 'corn' || e.type === 'feather' ? 1 : 0);
    if (e.x < -120) { entities.splice(i, 1); continue; }

    // collisions
    const px = player.x, py = player.y - (player.sliding ? 16 : 44);
    const dx = e.x - px, dy = e.y - py;
    const hitR = (e.r + 26) * (player.sliding ? 0.85 : 1);
    if (dx * dx + dy * dy < hitR * hitR) {
      if (e.type === 'corn') {
        state.combo++; state.score += 10 * Math.min(5, 1 + (state.combo / 8 | 0));
        burst(e.x, e.y, '#f0c030', 10, 160);
        audio.collect(state.combo % 6);
        emitScore(e.x, e.y - 24, 10 * Math.min(5, 1 + (state.combo / 8 | 0)));
        entities.splice(i, 1); continue;
      }
      if (e.type === 'feather') {
        state.score += 150; player.invuln = Math.max(player.invuln, 1.2);
        state.farmerGap = 420; farmer.x = player.x - 420;
        burst(e.x, e.y, '#fff0d0', 18, 220);
        audio.double();
        emitScore(e.x, e.y - 26, 150);
        entities.splice(i, 1); continue;
      }
      // hazards
      if (e.type === 'knife' || e.type === 'hay' || e.type === 'oven' || e.type === 'pot' || e.type === 'forkpit' || e.type === 'saw') {
        if (e.type === 'hay' && player.y > GROUND_Y - 20 && player.jumps === 0) {
          // landing on top of hay is fine — still a bump
        }
        entities.splice(i, 1);
        hurtTurkey(e.type);
        continue;
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
}

export function drawEntities(ctx) {
  // pass 1: behind-actor hazards
  for (const e of entities) {
    ctx.save(); ctx.translate(e.x, e.y);
    switch (e.type) {
      case 'knife': {
        ctx.rotate(Math.sin(e.ph) * 0.3);
        const g = ctx.createLinearGradient(-20, -6, 26, 6);
        g.addColorStop(0, '#dfe6ee'); g.addColorStop(1, '#9aa8b8');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-22, -5); ctx.lineTo(16, -6); ctx.lineTo(24, 0); ctx.lineTo(16, 6); ctx.lineTo(-22, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-34, -6, 14, 12);
        ctx.fillStyle = '#c8d2dc'; ctx.fillRect(-20, -1.5, 40, 3);
        break;
      }
      case 'saw': {
        ctx.rotate(e.ph * 0.6);
        ctx.fillStyle = '#b8c2cc';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
          const a2 = (i + 0.5) / 10 * Math.PI * 2;
          ctx.lineTo(Math.cos(a2) * 19, Math.sin(a2) * 19);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  // pickups on top of hazards
  for (const e of entities) {
    ctx.save(); ctx.translate(e.x, e.y + (e.type === 'corn' ? Math.sin(e.ph) * 6 : 0));
    switch (e.type) {
      case 'corn': {
        ctx.rotate(Math.sin(e.ph * 0.5) * 0.2);
        const g = ctx.createLinearGradient(-8, -18, 8, 18);
        g.addColorStop(0, '#ffd85a'); g.addColorStop(1, '#e8a020');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 18, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(180,120,20,0.5)'; ctx.lineWidth = 1.5;
        for (let r = -12; r <= 12; r += 6) { ctx.beginPath(); ctx.moveTo(-8, r); ctx.lineTo(8, r - 2); ctx.stroke(); }
        ctx.fillStyle = '#9aa83a'; ctx.beginPath(); ctx.ellipse(-3, -17, 3, 7, -0.5, 0, 7); ctx.ellipse(3, -17, 3, 7, 0.5, 0, 7); ctx.fill();
        break;
      }
      case 'feather': {
        ctx.rotate(Math.sin(e.ph * 0.7) * 0.5);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
        g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(1, 'rgba(255,220,140,0.25)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 20, 0.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#e8c870'; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(4, -16); ctx.stroke();
        break;
      }
      case 'hay': {
        ctx.fillStyle = '#d9b45a';
        ctx.beginPath(); ctx.ellipse(0, -e.r * 0.9, e.r, e.r * 0.85, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(150,110,40,0.6)'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-e.r + i * 14, -e.r * 1.5); ctx.lineTo(-e.r + i * 14 + 8, -10); ctx.stroke(); }
        ctx.strokeStyle = '#a8842e'; ctx.beginPath(); ctx.moveTo(-e.r, -e.r * 0.9); ctx.lineTo(e.r, -e.r * 0.9); ctx.stroke();
        break;
      }
      case 'oven': {
        const glow = 0.6 + 0.3 * Math.sin(state.time * 4 + e.ph);
        ctx.fillStyle = '#38302a';
        ctx.beginPath(); ctx.roundRect(-e.r, -e.r * 2, e.r * 2, e.r * 2, 8); ctx.fill();
        ctx.fillStyle = '#221c16';
        ctx.beginPath(); ctx.roundRect(-e.r * 0.6, -e.r * 1.6, e.r * 1.2, e.r, 6); ctx.fill();
        ctx.fillStyle = `rgba(255,${130 + glow * 50 | 0},50,${glow})`;
        ctx.fillRect(-e.r * 0.5, -e.r * 1.2, e.r, e.r * 0.4);
        ctx.fillStyle = '#55483c'; ctx.fillRect(-e.r, -e.r * 2 - 8, e.r * 2, 8);
        // little legs
        ctx.fillStyle = '#221c16'; ctx.fillRect(-e.r + 6, 0, 8, 8); ctx.fillRect(e.r - 14, 0, 8, 8);
        break;
      }
      case 'pot': {
        ctx.fillStyle = '#46403a';
        ctx.beginPath(); ctx.ellipse(0, -e.r, e.r, e.r * 0.9, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 0.5);
        const st = 0.5 + 0.3 * Math.sin(state.time * 3 + e.ph);
        ctx.fillStyle = `rgba(255,190,110,${st * 0.5})`;
        ctx.beginPath(); ctx.ellipse(0, -e.r * 1.05, e.r * 0.7, 7, 0, 0, 7); ctx.fill();
        break;
      }
      case 'forkpit': {
        ctx.fillStyle = 'rgba(60,40,26,0.9)';
        ctx.beginPath(); ctx.ellipse(0, -4, e.r, 12, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#b8c2cc'; ctx.lineWidth = 5;
        for (const o of [-12, 0, 12]) {
          ctx.beginPath(); ctx.moveTo(o, -6); ctx.lineTo(o, -34); ctx.stroke();
          ctx.fillStyle = '#b8c2cc';
          ctx.beginPath(); ctx.moveTo(o - 5, -34); ctx.lineTo(o, -44); ctx.lineTo(o + 5, -34); ctx.closePath(); ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }
  // particles (feathers + sparks)
  for (const p of particles) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// staged dense scenes for screenshots
onStage(name => {
  if (name !== 'play') return;
  entities.length = 0;
  const px = player.x;
  farmer.x = px - 170; player.invuln = 0;
  const put = (type, dx, dy, extra = {}) => entities.push({ type, x: px + dx, y: GROUND_Y - dy, ph: Math.random() * 6, r: 22, ...extra });
  put('corn', 60, 90); put('corn', 110, 130); put('corn', 160, 90);
  put('corn', 420, 150); put('corn', 470, 190); put('corn', 520, 150);
  put('knife', 260, 140, { vx: -260 });
  put('knife', 640, 90, { vx: -300 });
  put('hay', 330, 0, { r: 34 });
  put('feather', 720, 170);
  put('oven', 900, 0, { r: 44, vx: -80 });
  put('corn', 900, 120); put('corn', 950, 160); put('corn', 860, 160);
  burst(px + 60, GROUND_Y - 120, '#f0c030', 12, 180);
  burst(px - 30, GROUND_Y - 60, '#e8b858', 14, 220);
});
