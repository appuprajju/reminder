import type { AmbientSoundId } from '../types';

export interface AmbientSoundOption {
  id: AmbientSoundId;
  label: string;
  subtitle: string;
}

export const AMBIENT_SOUNDS: AmbientSoundOption[] = [
  { id: 'off', label: 'Silence', subtitle: 'No background audio' },
  { id: 'rain', label: 'Soft Rain', subtitle: 'Gentle filtered rainfall' },
  { id: 'brown-noise', label: 'Deep Focus', subtitle: 'Warm brown noise mask' },
  { id: 'ocean', label: 'Ocean Waves', subtitle: 'Slow rolling surf' },
  { id: 'warm-pad', label: 'Warm Drone', subtitle: 'Harmonic ambient chord' },
];

class AmbientSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: AudioScheduledSourceNode[] = [];
  private currentId: AmbientSoundId = 'off';
  private volume = 0.45;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown'): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.2;
        }
      } else {
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        }
      }
    }
    return buffer;
  }

  public start(soundId: AmbientSoundId, volume = this.volume): void {
    this.volume = Math.max(0.05, Math.min(1, volume));
    this.stop();
    this.currentId = soundId;
    if (soundId === 'off') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(this.volume * 0.32, ctx.currentTime + 0.25);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.activeNodes.push(master);

    if (soundId === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink');
      src.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 0.65;

      src.connect(bandpass);
      bandpass.connect(master);
      src.start();
      this.activeSources.push(src);
      this.activeNodes.push(bandpass);
    } else if (soundId === 'brown-noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown');
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 420;

      src.connect(lowpass);
      lowpass.connect(master);
      src.start();
      this.activeSources.push(src);
      this.activeNodes.push(lowpass);
    } else if (soundId === 'ocean') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown');
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 360;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.14;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      src.connect(filter);
      filter.connect(master);

      src.start();
      lfo.start();
      this.activeSources.push(src, lfo);
      this.activeNodes.push(filter, lfoGain);
    } else if (soundId === 'warm-pad') {
      const freqs = [174.61, 220.0, 261.63, 329.63]; // Fmaj7 warm chord
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      filter.connect(master);
      this.activeNodes.push(filter);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.14;

        osc.connect(voiceGain);
        voiceGain.connect(filter);
        osc.start();
        this.activeSources.push(osc);
        this.activeNodes.push(voiceGain);
      });
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0.05, Math.min(1, volume));
    if (this.ctx && this.masterGain && this.currentId !== 'off') {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.32, this.ctx.currentTime, 0.06);
    }
  }

  public stop(): void {
    const ctx = this.ctx;
    const gain = this.masterGain;
    const sources = this.activeSources;
    const nodes = this.activeNodes;

    this.masterGain = null;
    this.activeSources = [];
    this.activeNodes = [];
    this.currentId = 'off';

    if (ctx && gain) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
      } catch {
        // ignore
      }
    }

    window.setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          // already stopped
        }
      });
      nodes.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          // ignore
        }
      });
    }, 120);
  }
}

export const ambientSoundscape = new AmbientSoundscapeEngine();
