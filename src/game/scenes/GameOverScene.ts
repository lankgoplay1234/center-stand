import Phaser from 'phaser';
import { shareGameResult } from '../services/ResultShareService';
import type { GameResult } from '../types/GameTypes';

export class GameOverScene extends Phaser.Scene {
  private result: GameResult = {
    characterId: 'unknown', characterName: '알 수 없음', completed: false, deaths: 0,
    survivalSeconds: 0, stage: 1, kills: 0, earnedGold: 0, bestSeconds: 0,
  };

  constructor() {
    super('GameOverScene');
  }

  init(data: GameResult): void {
    this.result = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#080b16');
    this.add.circle(360, 370, 290, 0x5a1732, 0.14);
    this.add.text(360, 180, this.result.completed ? 'STAGE 100 CLEAR' : 'RUN COMPLETE', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '54px', color: '#fff08a', stroke: '#3a2b10', strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(360, 275, this.result.characterName, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(360, 365,
      `총 사망 횟수       ${this.result.deaths}\n완주 시간           ${this.formatTime(this.result.survivalSeconds)}\n총 처치 수          ${this.result.kills}\n획득 골드           ${this.result.earnedGold}\n최고 기록           ${this.formatTime(this.result.bestSeconds)}`,
      { fontFamily: 'Arial, sans-serif', fontSize: '25px', color: '#b9cce0', lineSpacing: 22, align: 'left' },
    ).setOrigin(0.5, 0);

    const shareBg = this.add.rectangle(360, 660, 430, 82, 0xf0b429).setStrokeStyle(4, 0xfff08a).setInteractive({ useHandCursor: true });
    const shareText = this.add.text(360, 660, '완주 기록 공유하기', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '27px', color: '#251b05',
    }).setOrigin(0.5);
    const shareStatus = this.add.text(360, 712, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#a7c7d9',
    }).setOrigin(0.5);
    shareBg.on('pointerup', async () => {
      shareBg.disableInteractive();
      shareStatus.setText('결과 이미지 생성 중...');
      this.tweens.add({ targets: [shareBg, shareText], scale: 0.96, duration: 80, yoyo: true });
      try {
        const outcome = await shareGameResult(this.result);
        shareStatus.setText(outcome === 'shared' ? '공유를 완료했습니다'
          : outcome === 'downloaded' ? '결과 이미지를 저장했습니다' : '공유를 취소했습니다');
      } catch {
        shareStatus.setText('이미지를 만들지 못했습니다. 다시 시도해 주세요');
      } finally {
        shareBg.setInteractive({ useHandCursor: true });
      }
    });

    const retryBg = this.add.rectangle(360, 790, 430, 88, 0x26b8c5).setStrokeStyle(4, 0xa6fbff).setInteractive({ useHandCursor: true });
    const retryText = this.add.text(360, 790, '캐릭터 선택', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '31px', color: '#07131d',
    }).setOrigin(0.5);
    const restart = (): void => {
      retryBg.disableInteractive();
      this.tweens.add({ targets: [retryBg, retryText], scale: 0.94, duration: 80, yoyo: true, onComplete: () => this.scene.start('CharacterSelectScene') });
    };
    retryBg.on('pointerup', restart);
    this.input.keyboard?.once('keydown-SPACE', restart);
    this.add.text(360, 860, '새 캐릭터를 선택하면 모든 성장이 초기화됩니다', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#64748b',
    }).setOrigin(0.5);
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
