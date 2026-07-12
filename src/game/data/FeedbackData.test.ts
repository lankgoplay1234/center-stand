import { describe, expect, it } from 'vitest';
import {
  AUDIO_VOLUME_MULTIPLIER,
  BASE_MASTER_AUDIO_GAIN,
  MASTER_AUDIO_GAIN,
  UPGRADE_FLASH_ALPHA,
} from './FeedbackData';

describe('feedback tuning', () => {
  it('raises every sound through the shared master gain by 50 percent', () => {
    expect(AUDIO_VOLUME_MULTIPLIER).toBe(1.5);
    expect(MASTER_AUDIO_GAIN).toBeCloseTo(BASE_MASTER_AUDIO_GAIN * 1.5);
    expect(MASTER_AUDIO_GAIN).toBeCloseTo(0.24);
  });

  it('limits the upgrade screen flash to 20 percent opacity', () => {
    expect(UPGRADE_FLASH_ALPHA).toBe(0.2);
  });
});
