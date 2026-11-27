// 20-world.js — dynamic sky, parallax scenery, three biomes, ground.
import { W, H, GROUND_Y, state, lerp, clamp } from './05-const.js';
import { ctx } from './00-core.js';

const BIOMES = [
  { // 0 farmyard — warm morning
    skyTop: '#8fc7e8', skyMid: '#f5dfae', skyLow: '#f0b46a',
    sun: { x: 0.78, y: 0.24, r: 60, color: 'rgba(255,214,120,0.9)' },
    far: '#a8bd7a', mid: '#7d9c55', ground: '#8a6a3f', groundTop: '#9c7a48',
    name: 'FARMYARD YARD',
  },
  { // 1 cornfield — golden dusk
    skyTop: '#e88a4a', skyMid: '#f4b25a', skyLow: '#f7d488',
    sun: { x: 0.62, y: 0.42, r: 82, color: 'rgba(255,236,170,0.95)' },
    far: '#b98a4a', mid: '#8f6a30', ground: '#6e4f28', groundTop: '#82602f',
    name: 'GOLDEN CORNFIELDS',
  },
  { // 2 kitchen gauntlet — copper interior
    skyTop: '#4a1f18', skyMid: '#7a2d1e', skyLow: '#b8542a',
    sun: { x: 0.5, y: 0.2, r: 70, color: 'rgba(255,160,90,0.55)' },
    far: '#5a2620', mid: '#6e3026', ground: '#4e241a', groundTop: '#5e2c20',
    name: 'KITCHEN GAUNTLET',
  },
];

export const clouds = [], birds = [], embers = [];
for (let i = 0; i < 7; i++) clouds.push({ x: Math.random() * W * 1.4, y: 40 + Math.random() * 160, s: 0.6 + Math.random() * 0.9, v: 8 + Math.random() * 14 });
for (let i = 0; i < 5; i++) birds.push({ x: Math.random() * W, y: 90 + Math.random() * 130, v: 26 + Math.random() * 20, ph: Math.random() * 6 });
for (let i = 0; i < 26; i++) embers.push({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 40, ph: Math.random() * 6, s: 1 + Math.random() * 2 });

// scenery props along the track (world-space x in metres)
const props = [];
{
  let x = 120;
  const kinds = ['barn', 'silo', 'tree', 'fence', 'stalk', 'pumpkin', 'oven', 'shelf', 'pot', 'table'];
  while (x < 1500) {
    props.push({ x, kind: pick(x), s: 0.55 + Math.random() * 0.35, h: Math.random() });
    x += 55 + Math.random() * 90;
  }
  function pick(mx) {
    const b = mx < 600 ? 0 : mx < 1150 ? 1 : 2;
    const set = [['barn', 'silo', 'tree', 'fence', 'pumpkin'], ['stalk', 'stalk', 'tree', 'pumpkin', 'fence'], ['oven', 'shelf', 'pot', 'table', 'shelf']][b];
    return set[Math.floor(Math.random() * set.length)];
  }
}

export function biomeOf(dist) {
  if (dist < 560) return 0;
  if (dist < 1200) return 1;
  return 2;
}
export function blendOf(dist) {
  // 0..1 transition strength near biome borders
  const b = biomeOf(dist);
  const t = b === 0 ? clamp((dist - 480) / 100, 0, 1)
    : b === 1 ? clamp((dist - 1120) / 100, 0, 1) : 0;
  return { b, t };
}

export function updateWorld(dt) {
  for (const c of clouds) { c.x -= c.v * dt; if (c.x < -220) { c.x = W + 200; c.y = 40 + Math.random() * 160; } }
  for (const b of birds) { b.x -= b.v * dt; b.ph += dt * 9; if (b.x < -40) { b.x = W + 40; b.y = 90 + Math.random() * 130; } }
  if (state.biome === 2) for (const e of embers) { e.y -= e.v * dt; e.ph += dt * 3; if (e.y < -10) { e.y = H + 10; e.x = Math.random() * W; } }
}

export function drawWorld(ctx) {
  const { b, t } = blendOf(state.distance);
  const A = BIOMES[b], B = BIOMES[Math.min(2, b + 1)];
  const mix = (c1, c2) => t > 0 ? mixColor(c1, c2, t) : c1;

  // sky
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y + 40);
  g.addColorStop(0, mix(A.skyTop, B.skyTop));
  g.addColorStop(0.55, mix(A.skyMid, B.skyMid));
  g.addColorStop(1, mix(A.skyLow, B.skyLow));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // sun with halo
  const sun = A.sun;
  const halo = ctx.createRadialGradient(sun.x * W, sun.y * H, 6, sun.x * W, sun.y * H, sun.r * 3);
  halo.addColorStop(0, sun.color);
  halo.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath();
  ctx.arc(sun.x * W, sun.y * H, sun.r, 0, 7);
  ctx.fillStyle = 'rgba(255,244,200,0.95)';
  ctx.fill();

  // clouds (soft puffs)
  for (const c of clouds) {
    ctx.fillStyle = 'rgba(255,250,240,0.75)';
    puff(ctx, c.x, c.y, 46 * c.s);
    ctx.fillStyle = 'rgba(255,250,240,0.55)';
    puff(ctx, c.x + 40 * c.s, c.y + 8, 30 * c.s);
    puff(ctx, c.x - 38 * c.s, c.y + 10, 26 * c.s);
  }
  // birds
  ctx.strokeStyle = 'rgba(60,40,30,0.7)'; ctx.lineWidth = 2;
  for (const bd of birds) {
    const f = Math.sin(bd.ph) * 6;
    ctx.beginPath();
    ctx.moveTo(bd.x - 8, bd.y - f); ctx.quadraticCurveTo(bd.x, bd.y + 3, bd.x, bd.y);
    ctx.quadraticCurveTo(bd.x, bd.y + 3, bd.x + 8, bd.y - f);
    ctx.stroke();
  }
  // kitchen embers / dust motes
  if (state.biome === 2 || blendOf(state.distance).t > 0) {
    for (const e of embers) {
      ctx.fillStyle = `rgba(255,${150 + Math.sin(e.ph) * 40 | 0},80,${0.25 + 0.2 * Math.sin(e.ph)})`;
      ctx.fillRect(e.x, e.y, e.s, e.s);
    }
  }

  // parallax hills (2 layers) — horizon scroll tied to distance
  const px = state.distance * 6;
  drawHills(ctx, mix(A.far, B.far), px * 0.12, GROUND_Y - 110, 90, 4);
  drawHills(ctx, mix(A.mid, B.mid), px * 0.3, GROUND_Y - 60, 62, 7);

  // scenery props
  const scroll = px * 0.85;
  for (const p of props) {
    const sx = mod(p.x * 8 - scroll, 6800) - 500;
    if (sx > W + 260 || sx < -260) continue;
    drawProp(ctx, p, sx, mix(A.groundTop, B.groundTop));
  }

  // ground
  const gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  gg.addColorStop(0, mix(A.groundTop, B.groundTop));
  gg.addColorStop(0.25, mix(A.ground, B.ground));
  gg.addColorStop(1, '#2c1c10');
  ctx.fillStyle = gg;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  // ground speckles scrolling at full speed
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 40; i++) {
    const x = mod(i * 137 - px, W + 40) - 20;
    const y = GROUND_Y + 14 + ((i * 53) % (H - GROUND_Y - 20));
    ctx.fillRect(x, y, 10 + (i % 3) * 8, 3);
  }
  // top edge line
  ctx.fillStyle = 'rgba(255,240,200,0.25)';
  ctx.fillRect(0, GROUND_Y, W, 2);
}

function drawHills(ctx, color, off, baseY, amp, n) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 20) {
    const y = baseY - (Math.sin((x + off) * 0.004) * 0.5 + 0.5) * amp - Math.sin((x + off) * 0.011) * amp * 0.25;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function drawProp(ctx, p, x, base) {
  const s = p.s;
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  const dark = 'rgba(40,24,14,0.85)';
  switch (p.kind) {
    case 'barn':
      ctx.fillStyle = '#7a3a2a'; ctx.fillRect(-60, -95, 120, 95);
      ctx.fillStyle = '#5e2c20';
      ctx.beginPath(); ctx.moveTo(-70, -95); ctx.lineTo(0, -140); ctx.lineTo(70, -95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8d5a8'; ctx.fillRect(-14, -60, 28, 44);
      break;
    case 'silo':
      ctx.fillStyle = '#9aa3a8'; rounded(-24, -150, 48, 150, 10);
      ctx.fillStyle = '#7e868b'; ctx.beginPath(); ctx.arc(0, -150, 24, Math.PI, 0); ctx.fill();
      break;
    case 'tree':
      ctx.fillStyle = '#4e3520'; ctx.fillRect(-9, -70, 18, 70);
      ctx.fillStyle = p.h > 0.5 ? '#6f8f3e' : '#8fae4a';
      ctx.beginPath(); ctx.arc(0, -95, 46, 0, 7); ctx.arc(-34, -70, 30, 0, 7); ctx.arc(34, -72, 32, 0, 7); ctx.fill();
      break;
    case 'fence':
      ctx.fillStyle = dark;
      for (let i = -3; i <= 3; i++) ctx.fillRect(i * 24 - 3, -46, 6, 46);
      ctx.fillRect(-78, -38, 156, 6); ctx.fillRect(-78, -20, 156, 6);
      break;
    case 'stalk':
      ctx.fillStyle = '#c9a83a';
      for (let i = -2; i <= 2; i++) {
        const sw = Math.sin(state.time * 1.4 + i) * 6;
        ctx.save(); ctx.translate(i * 16, 0); ctx.rotate(sw * 0.02);
        ctx.fillRect(-3, -95 - p.h * 30, 6, 95 + p.h * 30);
        ctx.beginPath(); ctx.ellipse(6, -100 - p.h * 30, 14, 5, -0.5, 0, 7); ctx.fill();
        ctx.restore();
      }
      break;
    case 'pumpkin':
      ctx.fillStyle = '#d97a2a';
      ctx.beginPath(); ctx.ellipse(0, -20, 26, 20, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#a85a18'; ctx.lineWidth = 3;
      for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(0, -20, 26 * Math.abs(Math.cos(o)), 20, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#4e6a2a'; ctx.fillRect(-3, -46, 7, 12);
      break;
    case 'oven':
      ctx.fillStyle = '#3a3028'; rounded(-50, -85, 100, 85, 8);
      ctx.fillStyle = '#1f1a14'; rounded(-32, -68, 64, 44, 6);
      const glow = 0.5 + 0.3 * Math.sin(state.time * 3 + p.h * 9);
      ctx.fillStyle = `rgba(255,${120 + glow * 60 | 0},40,${glow})`; ctx.fillRect(-26, -44, 52, 14);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-50, -92, 100, 8);
      break;
    case 'shelf':
      ctx.fillStyle = '#5e3a22'; ctx.fillRect(-70, -100, 140, 10);
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(-66, -90, 132, 6);
      ctx.fillStyle = '#b8452a'; ctx.fillRect(-56, -122, 22, 22);
      ctx.fillStyle = '#c9a83a'; ctx.fillRect(-20, -128, 18, 28);
      ctx.fillStyle = '#7a9ac2'; ctx.fillRect(18, -120, 24, 20);
      break;
    case 'pot':
      ctx.fillStyle = '#3d3630';
      ctx.beginPath(); ctx.ellipse(0, -26, 34, 26, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(-34, -26, 68, 14);
      const sg = 0.4 + 0.3 * Math.sin(state.time * 2 + p.h * 5);
      ctx.fillStyle = `rgba(255,200,120,${0.25 + sg * 0.2})`;
      ctx.beginPath(); ctx.ellipse(0, -30, 26, 8, 0, 0, 7); ctx.fill();
      break;
    case 'table':
      ctx.fillStyle = '#6e452a'; ctx.fillRect(-60, -60, 120, 10);
      ctx.fillStyle = '#54331e'; ctx.fillRect(-52, -50, 12, 50); ctx.fillRect(40, -50, 12, 50);
      ctx.fillStyle = '#d9cfc0'; ctx.beginPath(); ctx.ellipse(-20, -68, 16, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c0c8d0'; rounded(6, -84, 26, 12, 4);
      break;
  }
  ctx.restore();
}

function puff(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function rounded(x, y, w, h, r) {
  const c = ctx; c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
}
const mod = (a, n) => ((a % n) + n) % n;
function mixColor(c1, c2, t) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(c1), b = p(c2);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}
export { BIOMES };
