import { describe, expect, it, vi } from 'vitest';
import type { GameResult } from '../types/GameTypes';
import {
  createResultShareCard,
  deliverResultImage,
  isKakaoTalkBrowser,
  RESULT_IMAGE_HEIGHT,
  RESULT_IMAGE_WIDTH,
  type ResultShareAdapter,
} from './ResultShareService';

const result: GameResult = {
  characterId: 'rune-mage', characterName: '룬 메이지', completed: true, deaths: 4,
  survivalSeconds: 3723, stage: 100, kills: 1234, earnedGold: 5678, bestSeconds: 3723,
};

function createAdapter(canShare: boolean): ResultShareAdapter {
  return {
    prefersImagePreview: vi.fn(() => false),
    canShare: vi.fn(() => canShare),
    share: vi.fn(async () => undefined),
    download: vi.fn(),
    preview: vi.fn(),
  };
}

describe('ResultShareService', () => {
  it('creates a complete, portrait result card model', () => {
    const card = createResultShareCard(result);
    expect(card).toEqual(expect.objectContaining({
      width: RESULT_IMAGE_WIDTH,
      height: RESULT_IMAGE_HEIGHT,
      title: 'STAGE 100 CLEAR',
      characterName: '룬 메이지',
    }));
    expect(card.height).toBeGreaterThan(card.width);
    expect(card.fileName).toContain('룬-메이지-4deaths');
    expect(card.stats).toEqual(expect.arrayContaining([
      { label: '총 사망 횟수', value: '4회' },
      { label: '도달 스테이지', value: '100' },
      { label: '완주 시간', value: '62:03' },
    ]));
  });

  it('uses the Web Share path when file sharing is supported', async () => {
    const adapter = createAdapter(true);
    const file = { name: 'result.png' } as File;
    await expect(deliverResultImage(file, adapter)).resolves.toBe('shared');
    expect(adapter.share).toHaveBeenCalledOnce();
    expect(adapter.download).not.toHaveBeenCalled();
  });

  it('opens an image-save preview before Web Share in KakaoTalk', async () => {
    const adapter = createAdapter(true);
    vi.mocked(adapter.prefersImagePreview).mockReturnValue(true);
    const file = { name: 'result.png' } as File;
    await expect(deliverResultImage(file, adapter)).resolves.toBe('previewed');
    expect(adapter.preview).toHaveBeenCalledWith(file);
    expect(adapter.share).not.toHaveBeenCalled();
    expect(adapter.download).not.toHaveBeenCalled();
    expect(isKakaoTalkBrowser('Mozilla/5.0 KAKAOTALK 11.4.2')).toBe(true);
    expect(isKakaoTalkBrowser('Mozilla/5.0 Mobile Safari')).toBe(false);
  });

  it('downloads the image when file sharing is unavailable', async () => {
    const adapter = createAdapter(false);
    const file = { name: 'result.png' } as File;
    await expect(deliverResultImage(file, adapter)).resolves.toBe('downloaded');
    expect(adapter.share).not.toHaveBeenCalled();
    expect(adapter.download).toHaveBeenCalledWith(file);
  });
});
