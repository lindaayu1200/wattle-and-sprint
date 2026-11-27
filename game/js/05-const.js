// 05-const.js — shared constants & tiny math helpers (no import cycles).
export const W = 1280, H = 720;
export const GROUND_Y = 600;

export const state = {
  scene: 'title',
  sceneAt: 0,
  time: 0,
  score: 0,
  distance: 0,
  goal: 1600,
  lives: 3,
  combo: 0,
  biome: 0,
  shake: 0,
  flash: 0,
  farmerGap: 420,
  slowmo: 0,
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const input = { jump: false, slide: false, jumpQueued: 0, pressed: false };
export const resetHooks = [], stageHooks = [];
export const onReset = fn => resetHooks.push(fn);
export const onStage = fn => stageHooks.push(fn);
