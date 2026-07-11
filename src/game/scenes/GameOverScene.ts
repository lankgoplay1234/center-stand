import Phaser from 'phaser';
import { getCharacterById } from '../data/CharacterData';
import { LeaderboardService, LeaderboardServiceError, validateLeaderboardNickname } from '../services/LeaderboardService';
import { shareGameResult } from '../services/ResultShareService';
import type { GameResult } from '../types/GameTypes';

export class GameOverScene extends Phaser.Scene {
  private result: GameResult = {
    characterId: 'unknown', characterName: '알 수 없음', completed: false, deaths: 0,
    survivalSeconds: 0, stage: 1, kills: 0, earnedGold: 0, bestSeconds: 0,
  };
  private leaderboard!: LeaderboardService;
  private leaderboardStatus!: Phaser.GameObjects.Text;
  private leaderboardEntries!: Phaser.GameObjects.Text;

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
    this.createLeaderboardPanel();
  }

  private createLeaderboardPanel(): void {
    this.leaderboard = new LeaderboardService(import.meta.env.VITE_LEADERBOARD_API_URL ?? '');
    this.add.text(360, 910, '완주 랭킹 · 사망 횟수 TOP 10', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '21px', color: '#fff08a',
    }).setOrigin(0.5);

    const form = document.createElement('div');
    form.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;width:410px;';
    const input = document.createElement('input');
    input.maxLength = 5;
    input.placeholder = '닉네임 1~5자';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', '랭킹 닉네임');
    input.dataset.testid = 'leaderboard-nickname';
    input.style.cssText = 'width:230px;height:48px;padding:0 14px;border:2px solid #49708b;border-radius:8px;background:#10192b;color:#fff;font:700 17px Arial;outline:none;';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = '업로드';
    submit.dataset.testid = 'leaderboard-submit';
    submit.style.cssText = 'width:120px;height:48px;border:0;border-radius:8px;background:#26b8c5;color:#07131d;font:900 17px Arial;cursor:pointer;';
    form.append(input, submit);
    this.add.dom(360, 958, form).setDepth(30);

    this.leaderboardStatus = this.add.text(360, 997, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#9bc8dc',
    }).setOrigin(0.5);
    this.leaderboardEntries = this.add.text(360, 1032, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c5d7e7', align: 'left', lineSpacing: 4,
    }).setOrigin(0.5, 0);

    const canUpload = this.leaderboard.isConfigured
      && Boolean(this.result.leaderboardRunId && this.result.leaderboardVerificationToken);
    input.disabled = !canUpload;
    submit.disabled = !canUpload;
    if (!this.leaderboard.isConfigured) {
      this.leaderboardStatus.setText('랭킹 서버 준비 중 · 로컬 완주 기록은 안전하게 유지됩니다');
      submit.style.opacity = '0.45';
      return;
    }
    if (!canUpload) {
      this.leaderboardStatus.setText('서버 발급 완주 인증 정보가 없어 업로드할 수 없습니다');
      submit.style.opacity = '0.45';
    } else {
      this.leaderboardStatus.setText('닉네임을 입력해 내 기록을 등록하세요');
      submit.addEventListener('click', () => void this.submitLeaderboard(input, submit));
    }
    void this.refreshLeaderboard();
  }

  private async submitLeaderboard(input: HTMLInputElement, submit: HTMLButtonElement): Promise<void> {
    const nicknameError = validateLeaderboardNickname(input.value);
    if (nicknameError) {
      this.leaderboardStatus.setText(nicknameError);
      return;
    }
    submit.disabled = true;
    this.leaderboardStatus.setText('완주 기록 업로드 중...');
    try {
      await this.leaderboard.submit(this.result, input.value);
      this.leaderboardStatus.setText('내 기록이 등록되었습니다');
      await this.refreshLeaderboard();
    } catch (error) {
      const message = error instanceof LeaderboardServiceError ? error.message : '업로드에 실패했습니다';
      this.leaderboardStatus.setText(`${message} · 다시 시도할 수 있습니다`);
      submit.disabled = false;
    }
  }

  private async refreshLeaderboard(): Promise<void> {
    try {
      const entries = await this.leaderboard.list();
      this.leaderboardEntries.setText(entries.length === 0 ? '아직 등록된 완주 기록이 없습니다' : entries.map((entry) => {
        const characterName = getCharacterById(entry.characterId).name;
        return `${entry.rank}. ${entry.nickname} · ${characterName} · ${entry.deaths}회`;
      }).join('\n'));
    } catch (error) {
      const message = error instanceof LeaderboardServiceError ? error.message : '랭킹을 불러오지 못했습니다';
      this.leaderboardEntries.setText(`${message} · 게임 결과에는 영향이 없습니다`);
    }
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
