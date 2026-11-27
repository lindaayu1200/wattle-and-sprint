// 10-audio.js — tiny WebAudio synth: jump, collect, hit, gate, ambient wind.

class Audio {
  constructor() { this.ok = false; }
  ensure() {
    if (this.ok) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ac.destination);
      this.ok = true;
      this.wind();
    } catch { /* no audio */ }
  }
  tone(freq, dur, type = 'sine', vol = 1, slide = 0) {
    if (!this.ok) return;
    const t = this.ac.currentTime;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  jump() { this.tone(340, 0.18, 'square', 0.7, 260); }
  double() { this.tone(520, 0.16, 'square', 0.6, 320); }
  collect(n = 0) { this.tone(660 + n * 60, 0.12, 'triangle', 0.8, 180); }
  hit() { this.tone(180, 0.3, 'sawtooth', 0.9, -120); }
  gate() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.9), i * 140)); }
  caught() { [400, 320, 240, 160].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.7), i * 130)); }
  wind() {
    if (!this.ok) return;
    const t = this.ac.currentTime;
    const buf = this.ac.createBuffer(1, this.ac.sampleRate * 2, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const src = this.ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ac.createGain(); g.gain.value = 0.06;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
}
export const audio = new Audio();
