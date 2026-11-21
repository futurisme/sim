// Lightweight Web Audio API Procedural Sound Engine (Zero external assets)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensureCtx() {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  playTone(freq, duration = 0.08, type = 'sine', volume = 0.06, slideTo = null) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  tap() {
    this.playTone(520, 0.045, 'triangle', 0.04, 420);
  }

  messagePing() {
    this.playTone(680, 0.06, 'sine', 0.04, 880);
  }

  radioBeep() {
    this.playTone(1150, 0.05, 'square', 0.025);
    setTimeout(() => this.playTone(920, 0.06, 'square', 0.02), 65);
  }

  sirenBlip() {
    this.playTone(640, 0.14, 'sawtooth', 0.035, 920);
    setTimeout(() => this.playTone(920, 0.14, 'sawtooth', 0.035, 620), 145);
  }

  success() {
    this.playTone(523.25, 0.08, 'triangle', 0.05);
    setTimeout(() => this.playTone(659.25, 0.09, 'triangle', 0.05), 80);
    setTimeout(() => this.playTone(783.99, 0.14, 'triangle', 0.055), 160);
  }

  promoteFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.13, 'triangle', 0.06), idx * 90);
    });
  }
}

export const soundFX = new SoundEngine();
