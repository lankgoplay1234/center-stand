import Phaser from 'phaser';
import { getCharacterById } from '../data/CharacterData';
import { LeaderboardService, LeaderboardServiceError, validateLeaderboardNickname } from '../services/LeaderboardService';
import { formatLeaderboardEntry, formatLeaderboardTime } from '../services/LeaderboardPresentation';
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

  private captureCompletionScreen(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      this.game.renderer.snapshot((snapshot) => {
        if (snapshot instanceof HTMLImageElement) resolve(snapshot);
        else reject(new Error('완주 화면 이미지 캡처에 실패했습니다.'));
      }, 'image/png', 1);
    });
  }

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
      `총 사망 횟수       ${this.result.deaths}\n완주 시간           ${formatLeaderboardTime(this.result.survivalSeconds)}\n총 처치 수          ${this.result.kills}\n획득 골드           ${this.result.earnedGold}\n최고 기록           ${formatLeaderboardTime(this.result.bestSeconds)}`,
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
        const snapshot = await this.captureCompletionScreen();
        const outcome = await shareGameResult(this.result, snapshot);
        shareStatus.setText(outcome === 'shared' ? '공유를 완료했습니다'
          : outcome === 'downloaded' ? '완주 화면 PNG를 저장했습니다'
            : outcome === 'previewed' ? '이미지를 길게 눌러 사진에 저장하세요' : '공유를 취소했습니다');
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
    this.add.text(360, 910, '완주 랭킹 · 사망 횟수 TOP 10 · 동률 시 시간', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '21px', color: '#fff08a',
    }).setOrigin(0.5);

    const form = document.createElement('div');
    form.style.cssText = 'display:flex;gap:7px;align-items:center;justify-content:center;width:520px;';
    const input = document.createElement('input');
    input.maxLength = 5;
    input.placeholder = '닉네임 1~5자';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', '랭킹 닉네임');
    input.dataset.testid = 'leaderboard-nickname';
    input.style.cssText = 'width:200px;height:48px;padding:0 14px;border:2px solid #49708b;border-radius:8px;background:#10192b;color:#fff;font:700 17px Arial;outline:none;';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = '업로드';
    submit.dataset.testid = 'leaderboard-submit';
    submit.style.cssText = 'width:105px;height:48px;border:0;border-radius:8px;background:#26b8c5;color:#07131d;font:900 17px Arial;cursor:pointer;';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = '새로고침';
    refresh.dataset.testid = 'leaderboard-refresh';
    refresh.style.cssText = 'width:105px;height:48px;border:2px solid #49708b;border-radius:8px;background:#17263a;color:#d9f5ff;font:800 15px Arial;cursor:pointer;';
    form.append(input, submit, refresh);
    this.add.dom(360, 958, form).setDepth(30);

    this.leaderboardStatus = this.add.text(360, 997, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#9bc8dc',
    }).setOrigin(0.5);
    this.leaderboardEntries = this.add.text(360, 1032, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c5d7e7', align: 'left', lineSpacing: 4,
    }).setOrigin(0.5, 0);

    const hasProof = Boolean(this.result.leaderboardRunId && this.result.leaderboardVerificationToken);
    input.disabled = false;
    submit.disabled = false;
    submit.addEventListener('click', () => void this.submitLeaderboard(input, submit));
    refresh.addEventListener('click', () => void this.reloadLeaderboard(refresh));
    if (!this.leaderboard.isConfigured) {
      this.leaderboardStatus.setText('닉네임을 입력하면 이 브라우저의 로컬 랭킹에 저장됩니다');
    } else if (!hasProof) {
      this.leaderboardStatus.setText('닉네임 입력 가능 · 업로드 시 완주 인증 상태를 확인합니다');
    } else {
      this.leaderboardStatus.setText('닉네임을 입력해 내 기록을 등록하세요');
    }
    void this.refreshLeaderboard();
  }

  private async reloadLeaderboard(refresh: HTMLButtonElement): Promise<void> {
    refresh.disabled = true;
    this.leaderboardStatus.setText('최신 완주 기록을 불러오는 중...');
    const loaded = await this.refreshLeaderboard();
    if (loaded) this.leaderboardStatus.setText('최신 완주 기록을 불러왔습니다');
    refresh.disabled = false;
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
    } finally {
      submit.disabled = false;
    }
  }

  private async refreshLeaderboard(): Promise<boolean> {
    try {
      const entries = await this.leaderboard.list();
      this.leaderboardEntries.setText(entries.length === 0 ? '아직 등록된 완주 기록이 없습니다' : entries.map((entry) => {
        const characterName = getCharacterById(entry.characterId).name;
        return formatLeaderboardEntry(entry, characterName);
      }).join('\n'));
      return true;
    } catch (error) {
      const message = error instanceof LeaderboardServiceError ? error.message : '랭킹을 불러오지 못했습니다';
      this.leaderboardEntries.setText(`${message} · 게임 결과에는 영향이 없습니다`);
      return false;
    }
  }

}
