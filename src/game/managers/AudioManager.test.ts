import { describe, expect, it, vi } from 'vitest';
import { AudioManager, type AudioBackend } from './AudioManager';

function createBackend(): AudioBackend {
  return {
    resume: vi.fn(async () => undefined),
    startBgm: vi.fn(),
    setMuted: vi.fn(),
    playUpgradeSuccess: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('AudioManager', () => {
  it('starts the looping BGM only once after unlock', async () => {
    const backend = createBackend();
    const audio = new AudioManager(backend);
    await Promise.all([audio.unlock(), audio.unlock()]);
    await audio.unlock();
    expect(backend.resume).toHaveBeenCalledOnce();
    expect(backend.startBgm).toHaveBeenCalledOnce();
    expect(audio.state).toEqual(expect.objectContaining({ unlocked: true, bgmPlaying: true }));
  });

  it('plays the upgrade chime only while unlocked and unmuted', async () => {
    const backend = createBackend();
    const audio = new AudioManager(backend);
    expect(audio.playUpgradeSuccess()).toBe(false);
    await audio.unlock();
    expect(audio.playUpgradeSuccess()).toBe(true);
    expect(audio.toggleMuted()).toBe(true);
    expect(audio.playUpgradeSuccess()).toBe(false);
    expect(audio.toggleMuted()).toBe(false);
    expect(audio.playUpgradeSuccess()).toBe(true);
    expect(backend.playUpgradeSuccess).toHaveBeenCalledTimes(2);
    expect(audio.state.upgradeEffectCount).toBe(2);
  });

  it('stops BGM state and disposes its backend once', async () => {
    const backend = createBackend();
    const audio = new AudioManager(backend);
    await audio.unlock();
    audio.destroy();
    audio.destroy();
    expect(audio.state.bgmPlaying).toBe(false);
    expect(backend.destroy).toHaveBeenCalledOnce();
  });
});
