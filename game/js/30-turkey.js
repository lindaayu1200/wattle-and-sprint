// 30-turkey.js — the turkey hero (Tup) and Farmer Bram on his tail.
import { W, GROUND_Y, state, input, lerp } from './05-const.js';
import { ctx } from './00-core.js';

export const player = {
  x: 260, y: GROUND_Y, vy: 0, onGround: true, jumps: 0,
  sliding: false, run: 0, invuln: 0, wing: 0, dead: false,
};
export const farmer = { x: -300, phase: 0 };

export function updateActors(dt) {
  player.run += dt * 11;
  player.wing += dt * (player.onGround ? 4 : 14);
  if (player.invuln > 0) player.invuln -= dt;

  // gravity & jumping
  const targetY = GROUND_Y - (player.sliding ? 26 : 44);
  player.vy += 2200 * dt;
  player.y += player.vy * dt;
  if (player.y >= targetY) {
    if (!player.onGround && player.vy > 200) puffDust();
    player.y = targetY; player.vy = 0;
    player.onGround = true; player.jumps = 0;
  } else player.onGround = false;
  if (input.jumpQueued > 0) {
    input.jumpQueued--;
    if (player.onGround || player.jumps < 2) {
      player.jumps = player.onGround ? 1 : player.jumps + 1;
      player.vy = -player.jumps === 1 ? -760 : -680;
      player.onGround = false;
    }
  }
  player.sliding = input.slide && player.onGround;

  // farmer keeps chasing — gap breathes, closes over time, snaps closer after hits
  farmer.phase += dt * 6;
  const drift = Math.sin(farmer.phase * 0.5) * 30;
  const wanted = player.invuln > 0 ? 300 : 180 + drift;
  farmer.x = lerp(farmer.x, player.x - wanted, dt * 1.2);
}

const dust = [];
function puffDust() {
  for (let i = 0; i < 6; i++) dust.push({ x: player.x + (Math.random() - 0.5) * 30, y: GROUND_Y - Math.random() * 8, vx: -60 - Math.random() * 80, vy: -30 - Math.random() * 60, life: 0.5 });
}

export function drawActors(ctx) {
  // landing dust
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i]; d.life -= 1 / 60;
    if (d.life <= 0) { dust.splice(i, 1); continue; }
    d.x += d.vx / 60; d.y += d.vy / 60;
    ctx.fillStyle = `rgba(220,190,140,${d.life})`;
    ctx.beginPath(); ctx.arc(d.x, d.y, 5 * d.life + 2, 0, 7); ctx.fill();
  }
  drawFarmer(ctx);
  drawTurkey(ctx);
}

export function drawTurkey(ctx) {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  const squash = p.sliding ? 0.55 : 1;
  const runBob = p.onGround && !p.sliding ? Math.sin(p.run * 2) * 3 : 0;
  ctx.translate(0, runBob);
  if (p.invuln > 0 && Math.sin(state.time * 30) > 0) ctx.globalAlpha = 0.45;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, GROUND_Y - p.y + 4, 34, 7, 0, 0, 7); ctx.fill();

  // legs
  const legSwing = p.onGround ? Math.sin(p.run * 2.2) * 0.7 : 0.4;
  ctx.strokeStyle = '#e8a23a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 8, -22);
    ctx.rotate(legSwing * s);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.stroke();
    ctx.fillStyle = '#e8a23a';
    ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(-10, 20); ctx.lineTo(8, 20); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.scale(1, squash);
  // body
  const bg = ctx.createLinearGradient(0, -70, 0, 0);
  bg.addColorStop(0, '#c98430'); bg.addColorStop(1, '#9c5e1e');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, -42, 30, 30, 0, 0, 7); ctx.fill();
  // tail fan
  const fan = p.onGround ? 0 : Math.sin(state.time * 10) * 0.15;
  ctx.save(); ctx.translate(-22, -52); ctx.rotate(fan);
  const tail = ctx.createLinearGradient(-30, -30, 10, 10);
  tail.addColorStop(0, '#f0d060'); tail.addColorStop(1, '#c98a30');
  ctx.fillStyle = tail;
  for (let i = -3; i <= 3; i++) {
    ctx.save(); ctx.rotate(i * 0.28);
    ctx.beginPath(); ctx.ellipse(-22, 0, 24, 8, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // wing (flaps in the air)
  const wingAng = p.onGround ? Math.sin(player.wing) * 0.25 : -0.9 + Math.sin(player.wing * 2) * 0.5;
  ctx.save(); ctx.translate(2, -48); ctx.rotate(wingAng);
  ctx.fillStyle = '#e8b858';
  ctx.beginPath(); ctx.ellipse(-6, 6, 20, 11, 0.4, 0, 7); ctx.fill();
  ctx.restore();
  // head & neck
  ctx.strokeStyle = '#d9942e'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(18, -58); ctx.quadraticCurveTo(32, -66, 34, -80); ctx.stroke();
  ctx.fillStyle = '#e8a23a';
  ctx.beginPath(); ctx.arc(36, -84, 12, 0, 7); ctx.fill();
  // beak
  ctx.fillStyle = '#f0c030';
  ctx.beginPath(); ctx.moveTo(46, -84); ctx.lineTo(62, -80); ctx.lineTo(46, -76); ctx.closePath(); ctx.fill();
  // wattle (red) — bounces with run
  ctx.fillStyle = '#d23c2a';
  ctx.beginPath(); ctx.ellipse(44, -72 + Math.sin(player.run * 3) * 2, 5, 8, 0.3, 0, 7); ctx.fill();
  // eye
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(40, -88, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(41, -89, 1.2, 0, 7); ctx.fill();
  // snood flopping over beak
  ctx.strokeStyle = '#d23c2a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(46, -92); ctx.quadraticCurveTo(56, -96 + Math.sin(player.run * 2.5) * 3, 60, -90); ctx.stroke();

  ctx.restore();
}

function drawFarmer(ctx) {
  const f = farmer;
  if (f.x < -260) return;
  ctx.save();
  ctx.translate(f.x, GROUND_Y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 4, 36, 8, 0, 0, 7); ctx.fill();
  const lunge = Math.sin(f.phase) * 0.15;
  ctx.rotate(lunge * 0.3);
  // overalls
  ctx.fillStyle = '#4a6aa8';
  rounded(-16, -70, 32, 66, 6);
  // shirt
  ctx.fillStyle = '#c23c2a';
  rounded(-18, -104, 36, 38, 8);
  // arms — pitchfork thrusting
  ctx.strokeStyle = '#c23c2a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, -96); ctx.lineTo(40, -86 + Math.sin(f.phase) * 8); ctx.stroke();
  ctx.save();
  ctx.translate(40, -86 + Math.sin(f.phase) * 8);
  ctx.rotate(-0.35 + Math.sin(f.phase) * 0.2);
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -34); ctx.stroke();
  ctx.strokeStyle = '#b0b8c0'; ctx.lineWidth = 5;
  for (const o of [-9, 0, 9]) {
    ctx.beginPath(); ctx.moveTo(o, -34); ctx.quadraticCurveTo(o * 1.4, -50, o, -56); ctx.stroke();
  }
  ctx.restore();
  // head
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath(); ctx.arc(0, -118, 15, 0, 7); ctx.fill();
  // straw hat
  ctx.fillStyle = '#d9b45a';
  ctx.beginPath(); ctx.ellipse(0, -128, 30, 8, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -128, 16, Math.PI, 0); ctx.fill();
  // angry brow + beard
  ctx.strokeStyle = '#6e4a20'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-9, -122); ctx.lineTo(-2, -119); ctx.moveTo(9, -122); ctx.lineTo(2, -119); ctx.stroke();
  ctx.fillStyle = '#d8d2c8';
  ctx.beginPath(); ctx.ellipse(0, -106, 11, 7, 0, 0, Math.PI); ctx.fill();
  // legs pumping
  ctx.strokeStyle = '#4a6aa8'; ctx.lineWidth = 8;
  const ls = Math.sin(f.phase * 1.3) * 10;
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6 + ls, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(6 - ls, 4); ctx.stroke();
  ctx.restore();
}

function rounded(x, y, w, h, r) {
  const c = ctx; c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
}
