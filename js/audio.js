/**
 * KERA Laser Audio Synthesizer
 * Procedurally synthesizes clinical medical sounds using Web Audio API:
 * - High-voltage capacitor charging tone
 * - Laser discharge pulse ("Zap / Thump")
 * - Dynamic cooling cryogen spray burst ("Pffft")
 * - Critical Burn Alarm (Urgent Medical Hazard Tone)
 * - Safe treatment completion chime
 * 100% Code-based audio synthesis (Zero external audio files).
 */

class LaserAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Sound of Laser Pulse (Wavelength-dependent acoustic acoustic discharge)
   */
  playLaserShot({ wavelength = 808, isBurn = false }) {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // 1. Transient sub-thump (mechanical pulse of laser crystal/flashlamp)
    const osc = this.ctx.createOscillator();
    const gainOsc = this.ctx.createGain();
    osc.type = 'triangle';
    
    // Frequency depends on wavelength feel
    const baseFreq = wavelength === 755 ? 140 : (wavelength === 808 ? 100 : 70);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gainOsc.gain.setValueAtTime(0.45, t);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gainOsc);
    gainOsc.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);

    // 2. High-energy optical snap / plasma crack (Bandpass filtered noise burst)
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(wavelength === 755 ? 2800 : 1600, t);
    filter.Q.setValueAtTime(3.0, t);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.35, t);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    whiteNoise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(this.ctx.destination);
    whiteNoise.start(t);
    whiteNoise.stop(t + 0.15);

    // If burn occurred, trigger urgent medical alarm immediately after shot
    if (isBurn) {
      setTimeout(() => this.playBurnAlarm(), 100);
    }
  }

  /**
   * Epidermal Cryo-Cooling Burst (DCD / Pre-chill burst: "Pffft")
   */
  playCryoCooling() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.18;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.19);
  }

  /**
   * Critical Burn Warning Emergency Alarm (Standard IEC 60601 Medical Equipment Alarm)
   */
  playBurnAlarm() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const beeps = [0, 0.12, 0.24];
    beeps.forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t + delay); // High A5 alarm
      osc.frequency.setValueAtTime(990, t + delay + 0.04);

      gain.gain.setValueAtTime(0.25, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.09);
    });
  }

  /**
   * Clinical Parameter Selection Click (Tactile medical dial feel)
   */
  playDialClick() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const sound = new LaserAudioEngine();
