/** Tiny WebAudio synth: an ambient pad plus blips and stings. No audio files. */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private pad: GainNode | null = null;
  private lastBlip = 0;
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    const unlock = () => {
      this.init();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v ? 0.5 : 0, this.ctx.currentTime, 0.1);
  }

  private init(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(this.ctx.destination);

    // Ambient pad: detuned sines through a slow low-pass sweep.
    this.pad = this.ctx.createGain();
    this.pad.gain.value = 0.05;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    for (const f of [110, 164.8, 220.5]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
    }
    filter.connect(this.pad).connect(this.master);
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Eating: a soft blip whose pitch depends on the data type. */
  eat(seed: number): void {
    const now = performance.now();
    if (now - this.lastBlip < 45) return;
    this.lastBlip = now;
    const scale = [0, 2, 4, 7, 9, 12, 14];
    this.tone(440 * 2 ** (scale[seed % scale.length] / 12), 0.12, 'triangle', 0.06);
  }

  bad(): void {
    this.tone(160, 0.35, 'sawtooth', 0.08);
    this.tone(120, 0.4, 'sawtooth', 0.06, 0.08);
  }

  good(): void {
    this.tone(660, 0.15, 'triangle', 0.1);
    this.tone(990, 0.2, 'triangle', 0.08, 0.08);
  }

  sting(kind: 'hype' | 'storm' | 'moment' | 'boss'): void {
    if (kind === 'boss') [98, 98, 131, 123].forEach((f, i) => this.tone(f, 0.35, 'square', 0.07, i * 0.18));
    else if (kind === 'storm') [196, 185, 174].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.07, i * 0.15));
    else if (kind === 'hype') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.08, i * 0.08));
    else [440, 554, 659].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.1, i * 0.1));
  }

  /** Combo milestone: a rising arpeggio. */
  combo(level: number): void {
    const base = 392 * 2 ** (Math.min(level, 6) / 12);
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.14, 'square', 0.05, i * 0.05));
  }

  /** A boss takes a hit: a cartoon bonk. */
  bonk(): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** Achievement unlocked: a little fanfare. */
  fanfare(): void {
    [523.3, 659.3, 784, 1046.5, 784, 1046.5].forEach((f, i) => this.tone(f, i > 3 ? 0.35 : 0.12, 'square', 0.05, i * 0.09));
  }

  evolve(): void {
    [261.6, 329.6, 392, 523.3, 659.3].forEach((f, i) => this.tone(f, 1.2, 'sine', 0.09, i * 0.09));
  }

  /** Think mode hum. */
  think(on: boolean): void {
    if (!this.pad || !this.ctx) return;
    this.pad.gain.setTargetAtTime(on ? 0.11 : 0.05, this.ctx.currentTime, 0.2);
  }
}
