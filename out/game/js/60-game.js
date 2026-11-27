// 60-game.js — play-state rules: run speed, scoring, win gate.
import { state, input } from './05-const.js';
import { onReset } from './00-core.js';
import { player } from './30-turkey.js';
import { audio } from './10-audio.js';

let gateArmed = false;
onReset(() => { gateArmed = false; updateEntities.lastD = undefined; });
import { updateEntities } from './40-entities.js';

export function updatePlay(dt) {
  // speed ramps with distance; feather invuln keeps base pace
  const speed = 13 + Math.min(9, state.distance / 220);
  state.distance += speed * dt;
  state.score += Math.round(speed * dt * 2);

  if (player.onGround && Math.sin(state.time * 9) > 0.985) {
    // subtle screen bob synced to gait — feels alive
    state.shake = Math.max(state.shake, 0.05);
  }

  // reach the gate
  if (state.distance >= state.goal && !gateArmed) {
    gateArmed = true;
    state.scene = 'escaped'; state.sceneAt = state.time;
    state.score += Math.max(0, state.lives) * 500;
    audio.gate();
  }
}
