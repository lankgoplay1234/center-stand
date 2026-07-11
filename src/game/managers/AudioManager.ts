import type { AttackMotionStyle } from '../types/GameTypes';

export interface AudioBackend {
  resume(): Promise<void>;
  startBgm(): void;
  setMuted(muted: boolean): void;
  playUpgradeSuccess(): void;
  playAttack(style: AttackMotionStyle): void;
  destroy(): void;
}

export interface AudioManagerState {
  unlocked: boolean;
  muted: boolean;
  bgmPlaying: boolean;
  upgradeEffectCount: number;
  attackEffectCount: number;
  lastAttackStyle: AttackMotionStyle | null;
}

class WebAudioBackend implements AudioBackend {
  private readonly context: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly activeOscillators = new Set<OscillatorNode>();
  private loopTimer: number | null = null;
  private destroyed = false;

  constructor() {
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    this.context = AudioContextConstructor ? new AudioContextConstructor() : null;
    this.master = this.context?.createGain() ?? null;
    if (this.context && this.master) {
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  startBgm(): void {
    if (!this.context || !this.master || this.loopTimer !== null || this.destroyed) return;
    const scheduleLoop = (): void => {
      if (!this.context || this.destroyed) return;
      const notes = [220, 277.18, 329.63, 277.18, 196, 246.94, 293.66, 246.94];
      const stepSeconds = 0.42;
      const startAt = this.context.currentTime + 0.06;
      notes.forEach((frequency, index) => {
        this.playTone(frequency, startAt + index * stepSeconds, 0.3, 0.085, 'triangle');
      });
      this.loopTimer = window.setTimeout(scheduleLoop, notes.length * stepSeconds * 1000 - 120);
    };
    scheduleLoop();
  }

  setMuted(muted: boolean): void {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.16, this.context.currentTime, 0.025);
  }

  playUpgradeSuccess(): void {
    if (!this.context || this.destroyed) return;
    const now = this.context.currentTime;
    this.playTone(880, now, 0.12, 0.16, 'sine');
    this.playTone(1318.51, now + 0.08, 0.2, 0.13, 'sine');
  }

  playAttack(style: AttackMotionStyle): void {
    if (!this.context || this.destroyed) return;
    const now = this.context.currentTime;
    switch (style) {
      case 'ARC_SHOT':
        this.playTone(620, now, 0.07, 0.09, 'square');
        this.playTone(260, now + 0.035, 0.08, 0.06, 'triangle');
        break;
      case 'BLADE_SWEEP':
        this.playTone(190, now, 0.14, 0.08, 'sawtooth');
        this.playTone(520, now + 0.045, 0.12, 0.07, 'triangle');
        break;
      case 'BASTION_VOLLEY':
        for (let index = 0; index < 3; index += 1) {
          this.playTone(95 + index * 18, now + index * 0.035, 0.09, 0.1, 'square');
        }
        break;
      case 'RUNE_CAST':
        this.playTone(392, now, 0.2, 0.055, 'sine');
        this.playTone(587.33, now + 0.04, 0.22, 0.05, 'sine');
        this.playTone(880, now + 0.08, 0.18, 0.035, 'triangle');
        break;
      case 'NEEDLE_BURST':
        this.playTone(1_280, now, 0.045, 0.06, 'square');
        this.playTone(980, now + 0.025, 0.05, 0.055, 'square');
        break;
      case 'STORM_SURGE':
        this.playTone(146.83, now, 0.2, 0.07, 'sawtooth');
        this.playTone(1_174.66, now + 0.05, 0.12, 0.05, 'square');
        this.playTone(783.99, now + 0.1, 0.12, 0.04, 'triangle');
        break;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.loopTimer !== null) window.clearTimeout(this.loopTimer);
    this.loopTimer = null;
    for (const oscillator of this.activeOscillators) {
      try { oscillator.stop(); } catch { /* 이미 종료된 음원입니다. */ }
    }
    this.activeOscillators.clear();
    void this.context?.close();
  }

  private playTone(
    frequency: number,
    startAt: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    if (!this.context || !this.master || this.destroyed) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
    this.activeOscillators.add(oscillator);
    oscillator.onended = () => {
      this.activeOscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}

export class AudioManager {
  private unlocked = false;
  private muted = false;
  private bgmPlaying = false;
  private upgradeEffectCount = 0;
  private attackEffectCount = 0;
  private lastAttackStyle: AttackMotionStyle | null = null;
  private destroyed = false;
  private unlockPromise: Promise<void> | null = null;

  constructor(private readonly backend: AudioBackend = new WebAudioBackend()) {}

  get state(): AudioManagerState {
    return {
      unlocked: this.unlocked,
      muted: this.muted,
      bgmPlaying: this.bgmPlaying,
      upgradeEffectCount: this.upgradeEffectCount,
      attackEffectCount: this.attackEffectCount,
      lastAttackStyle: this.lastAttackStyle,
    };
  }

  unlock(): Promise<void> {
    if (this.destroyed || this.unlocked) return Promise.resolve();
    if (this.unlockPromise) return this.unlockPromise;
    this.unlockPromise = this.backend.resume().then(() => {
      if (this.destroyed) return;
      this.unlocked = true;
      this.backend.startBgm();
      this.bgmPlaying = true;
      this.backend.setMuted(this.muted);
    }).catch(() => {
      // 오디오를 차단한 브라우저에서도 게임은 계속 진행합니다.
    }).finally(() => {
      this.unlockPromise = null;
    });
    return this.unlockPromise;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    this.backend.setMuted(this.muted);
    return this.muted;
  }

  playUpgradeSuccess(): boolean {
    if (!this.unlocked || this.muted || this.destroyed) return false;
    this.backend.playUpgradeSuccess();
    this.upgradeEffectCount += 1;
    return true;
  }

  playAttack(style: AttackMotionStyle): boolean {
    if (!this.unlocked || this.muted || this.destroyed) return false;
    this.backend.playAttack(style);
    this.attackEffectCount += 1;
    this.lastAttackStyle = style;
    return true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.bgmPlaying = false;
    this.backend.destroy();
  }
}
