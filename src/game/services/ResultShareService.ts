import type { GameResult } from '../types/GameTypes';

export const RESULT_IMAGE_WIDTH = 1080;
export const RESULT_IMAGE_HEIGHT = 1350;

export interface ResultShareCard {
  width: number;
  height: number;
  fileName: string;
  title: string;
  characterName: string;
  stats: readonly { label: string; value: string }[];
}

export type ShareResultOutcome = 'shared' | 'downloaded' | 'previewed' | 'cancelled';

export interface ResultShareAdapter {
  prefersImagePreview(): boolean;
  canShare(file: File): boolean;
  share(file: File, title: string, text: string): Promise<void>;
  download(file: File): void;
  preview(file: File): void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '') || 'character';
}

export function createResultShareCard(result: GameResult): ResultShareCard {
  return {
    width: RESULT_IMAGE_WIDTH,
    height: RESULT_IMAGE_HEIGHT,
    fileName: `center-stand-${safeFilePart(result.characterName)}-${result.deaths}deaths.png`,
    title: result.completed ? 'STAGE 100 CLEAR' : 'RUN COMPLETE',
    characterName: result.characterName,
    stats: [
      { label: '총 사망 횟수', value: `${result.deaths}회` },
      { label: '도달 스테이지', value: `${result.stage}` },
      { label: '완주 시간', value: formatTime(result.survivalSeconds) },
      { label: '총 처치 수', value: `${result.kills}` },
      { label: '획득 골드', value: `${result.earnedGold}` },
    ],
  };
}

function drawResultCard(context: CanvasRenderingContext2D, card: ResultShareCard): void {
  const gradient = context.createLinearGradient(0, 0, card.width, card.height);
  gradient.addColorStop(0, '#080b16');
  gradient.addColorStop(0.52, '#35132d');
  gradient.addColorStop(1, '#071926');
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.width, card.height);

  context.strokeStyle = '#f8d96b';
  context.lineWidth = 8;
  context.strokeRect(56, 56, card.width - 112, card.height - 112);

  context.textAlign = 'center';
  context.fillStyle = '#8deeff';
  context.font = '700 34px Arial, sans-serif';
  context.fillText('CENTER STAND', card.width / 2, 150);

  context.fillStyle = '#fff08a';
  context.font = '900 74px Arial Black, Arial, sans-serif';
  context.fillText(card.title, card.width / 2, 270);

  context.fillStyle = '#ffffff';
  context.font = '900 58px Arial Black, Arial, sans-serif';
  context.fillText(card.characterName, card.width / 2, 385);

  context.fillStyle = 'rgba(3, 10, 22, 0.62)';
  context.fillRect(130, 460, card.width - 260, 610);

  context.textAlign = 'left';
  card.stats.forEach((stat, index) => {
    const y = 565 + index * 106;
    context.fillStyle = '#9fb7cc';
    context.font = '600 38px Arial, sans-serif';
    context.fillText(stat.label, 210, y);
    context.textAlign = 'right';
    context.fillStyle = stat.label === '총 사망 횟수' ? '#fff08a' : '#ffffff';
    context.font = '800 44px Arial Black, Arial, sans-serif';
    context.fillText(stat.value, 870, y);
    context.textAlign = 'left';
  });

  context.textAlign = 'center';
  context.fillStyle = '#7fd9e6';
  context.font = '700 32px Arial, sans-serif';
  context.fillText('100 STAGES · ONE STAND · KEEP GROWING', card.width / 2, 1190);
  context.fillStyle = '#6f8294';
  context.font = '500 26px Arial, sans-serif';
  context.fillText('로그인 없이 바로 즐기는 중앙 방어 전투', card.width / 2, 1245);
}

export async function createResultImage(result: GameResult): Promise<File> {
  const card = createResultShareCard(result);
  const canvas = document.createElement('canvas');
  canvas.width = card.width;
  canvas.height = card.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('결과 이미지 캔버스를 생성할 수 없습니다.');
  drawResultCard(context, card);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('결과 이미지 생성에 실패했습니다.')), 'image/png');
  });
  return new File([blob], card.fileName, { type: 'image/png' });
}

export async function createCompletionScreenshot(result: GameResult, snapshot: HTMLImageElement): Promise<File> {
  const card = createResultShareCard(result);
  const width = snapshot.naturalWidth || snapshot.width;
  const height = snapshot.naturalHeight || snapshot.height;
  if (width <= 0 || height <= 0) throw new Error('완주 화면 스냅샷 크기가 올바르지 않습니다.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('완주 화면 캔버스를 생성할 수 없습니다.');
  context.drawImage(snapshot, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('완주 화면 PNG 생성에 실패했습니다.')), 'image/png');
  });
  return new File([blob], card.fileName, { type: 'image/png' });
}

export function isKakaoTalkBrowser(userAgent: string): boolean {
  return /KAKAOTALK/i.test(userAgent);
}

export async function deliverResultImage(
  file: File,
  adapter: ResultShareAdapter,
  title = 'CENTER STAND 완주 기록',
): Promise<ShareResultOutcome> {
  if (adapter.prefersImagePreview()) {
    adapter.preview(file);
    return 'previewed';
  }
  if (adapter.canShare(file)) {
    try {
      await adapter.share(file, title, '나의 100스테이지 완주 기록을 확인해 보세요!');
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  adapter.download(file);
  return 'downloaded';
}

function createBrowserAdapter(): ResultShareAdapter {
  return {
    prefersImagePreview: () => isKakaoTalkBrowser(navigator.userAgent),
    canShare: (file) => typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [file] }),
    share: (file, title, text) => navigator.share({ files: [file], title, text }),
    download: (file) => {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    preview: (file) => {
      const previous = document.querySelector('[data-testid="completion-image-preview"]');
      previous?.remove();
      const url = URL.createObjectURL(file);
      const overlay = document.createElement('div');
      overlay.dataset.testid = 'completion-image-preview';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(3,6,14,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;';
      const guide = document.createElement('div');
      guide.textContent = '완주 화면을 길게 눌러 이미지로 저장하세요';
      guide.style.cssText = 'color:#fff3a3;font:700 16px Arial,sans-serif;margin-bottom:12px;text-align:center;';
      const image = document.createElement('img');
      image.src = url;
      image.alt = 'CENTER STAND 완주 화면';
      image.dataset.testid = 'completion-image';
      image.style.cssText = 'display:block;max-width:100%;max-height:calc(100% - 92px);object-fit:contain;border:2px solid #f8d96b;border-radius:8px;-webkit-touch-callout:default;user-select:auto;';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '게임으로 돌아가기';
      close.dataset.testid = 'completion-image-close';
      close.style.cssText = 'margin-top:12px;padding:11px 24px;border:0;border-radius:8px;background:#26b8c5;color:#07131d;font:800 16px Arial,sans-serif;';
      close.addEventListener('click', () => {
        overlay.remove();
        URL.revokeObjectURL(url);
      });
      overlay.append(guide, image, close);
      document.body.appendChild(overlay);
    },
  };
}

export async function shareGameResult(result: GameResult, snapshot?: HTMLImageElement): Promise<ShareResultOutcome> {
  const file = snapshot
    ? await createCompletionScreenshot(result, snapshot)
    : await createResultImage(result);
  return deliverResultImage(file, createBrowserAdapter());
}
