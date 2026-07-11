import type Phaser from 'phaser';
import { UPGRADE_ORDER, canUpgrade } from '../data/UpgradeData';
import { MOB_CLEAR_NAME } from '../data/MobClearData';
import type { Player } from '../entities/Player';
import type { GameSpeed } from '../systems/GameSpeedSystem';
import type { UpgradeSystem } from '../systems/UpgradeSystem';
import type { MobClearState } from '../systems/MobClearSystem';
import type { RunStats, UpgradeId } from '../types/GameTypes';

interface UpgradeButton {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  id: UpgradeId;
}

export interface DeathSummary {
  deaths: number;
  stageDeaths: number;
  gold: number;
  stage: number;
  recommendation: {
    name: string;
    level: number;
    cost: number;
    affordable: boolean;
    reason: string;
  } | null;
}

export class UIManager {
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly stageText: Phaser.GameObjects.Text;
  private readonly killsText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly debugText: Phaser.GameObjects.Text;
  private readonly soundText: Phaser.GameObjects.Text;
  private readonly speedText: Phaser.GameObjects.Text;
  private readonly buttons = new Map<UpgradeId, UpgradeButton>();
  private readonly mobClearButton: Omit<UpgradeButton, 'id'>;
  private deathOverlay: Phaser.GameObjects.Container | null = null;
  private restartConfirmation: Phaser.GameObjects.Container | null = null;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onUpgrade: (id: UpgradeId) => void,
    onStressTest: () => void,
    onToggleMute: () => boolean,
    onPauseRequested: () => void,
    onToggleSpeed: () => GameSpeed,
    onMobClear: () => void,
  ) {
    scene.add.rectangle(360, 54, 680, 78, 0x090d1a, 0.78).setStrokeStyle(2, 0x33446c).setDepth(30);
    this.healthText = this.label(42, 34, '', 21).setOrigin(0, 0);
    this.goldText = this.label(350, 34, '', 21).setOrigin(0.5, 0);
    this.stageText = this.label(678, 34, '', 21).setOrigin(1, 0);
    this.killsText = this.label(42, 70, '', 17).setOrigin(0, 0);
    this.timeText = this.label(678, 70, '', 17).setOrigin(1, 0);

    scene.add.rectangle(360, 1138, 700, 268, 0x080b16, 0.94).setStrokeStyle(2, 0x283958).setDepth(29);
    const positions = [
      { x: 132, y: 1065 }, { x: 360, y: 1065 }, { x: 588, y: 1065 },
      { x: 132, y: 1182 }, { x: 360, y: 1182 }, { x: 588, y: 1182 },
    ];
    UPGRADE_ORDER.forEach((id, index) => {
      const positionIndex = index < 2 ? index : index + 1;
      const point = positions[positionIndex]!;
      this.createUpgradeButton(point.x, point.y, id);
    });
    this.mobClearButton = this.createMobClearButton(positions[2]!.x, positions[2]!.y, onMobClear);

    const soundBg = scene.add.rectangle(642, 116, 116, 36, 0x17263a, 0.92).setStrokeStyle(2, 0x4d7890)
      .setDepth(40).setInteractive({ useHandCursor: true });
    this.soundText = this.label(642, 116, '♪ BGM ON', 14).setOrigin(0.5).setDepth(41);
    soundBg.on('pointerup', () => this.setMuted(onToggleMute()));

    const pauseBg = scene.add.rectangle(510, 116, 116, 36, 0x17263a, 0.92).setStrokeStyle(2, 0x4d7890)
      .setDepth(40).setInteractive({ useHandCursor: true });
    this.label(510, 116, 'Ⅱ 일시정지', 14).setOrigin(0.5).setDepth(41);
    pauseBg.on('pointerup', onPauseRequested);

    const speedBg = scene.add.rectangle(378, 116, 116, 36, 0x17263a, 0.92).setStrokeStyle(2, 0x4d7890)
      .setDepth(40).setInteractive({ useHandCursor: true });
    this.speedText = this.label(378, 116, '속도 ×1', 14).setOrigin(0.5).setDepth(41);
    speedBg.on('pointerup', () => this.setGameSpeed(onToggleSpeed()));

    this.debugText = this.label(18, 112, '', 14).setOrigin(0).setColor('#83a1c8').setVisible(import.meta.env.DEV);
    if (import.meta.env.DEV) {
      const stress = scene.add.text(690, 148, '100 적 테스트', {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffcf5a', backgroundColor: '#222b40', padding: { x: 10, y: 7 },
      }).setOrigin(1, 0).setDepth(40).setInteractive({ useHandCursor: true });
      stress.on('pointerup', onStressTest);
    }
  }

  update(
    player: Player,
    run: RunStats,
    stage: number,
    upgrades: UpgradeSystem,
    mobClear: MobClearState,
    activeEnemies: number,
    activeProjectiles: number,
    stageKills = 0,
    stageTarget = 0,
    mobClearEnabled = true,
  ): void {
    this.healthText.setText(`HP  ${Math.ceil(player.health)} / ${Math.ceil(player.maxHealth)}`);
    this.healthText.setColor(player.health / player.maxHealth < 0.3 ? '#ff6b83' : '#bff7ff');
    this.goldText.setText(`GOLD  ${run.gold}`);
    this.stageText.setText(stageTarget > 0 ? `STAGE ${stage} · ${stageKills}/${stageTarget}` : `STAGE  ${stage}`);
    this.killsText.setText(`처치  ${run.kills}  ·  사망  ${run.deaths}`);
    this.timeText.setText(this.formatTime(run.elapsedSeconds));
    this.debugText.setText(
      `FPS ${Math.round(this.scene.game.loop.actualFps)}  |  적 ${activeEnemies}  |  투사체 ${activeProjectiles}\n스테이지 ${stage} · ${stageKills}/${stageTarget}  |  ${this.formatTime(run.elapsedSeconds)}`,
    );

    for (const [id, button] of this.buttons) {
      const state = upgrades.getState(id);
      const available = canUpgrade(state.definition, state.level);
      const affordable = available && run.gold >= state.currentCost;
      const focusPrefix = id === player.character.upgradeFocus.primary
        ? '★ '
        : id === player.character.upgradeFocus.secondary ? '◇ ' : '';
      button.text.setText(
        `${focusPrefix}${state.definition.name}  Lv.${state.level}\n${upgrades.getEffectLabel(id)}\n${available ? `비용 ${state.currentCost} G` : 'MAX LEVEL'}`,
      );
      button.background.setFillStyle(affordable ? 0x173d4b : 0x1a2030, 1)
        .setStrokeStyle(2, affordable ? 0x5be6e6 : 0x3a4358, affordable ? 0.95 : 0.65);
      button.container.setAlpha(affordable ? 1 : 0.62);
      if (affordable) button.background.setInteractive({ useHandCursor: true });
      else button.background.disableInteractive();
    }
    const canClear = mobClearEnabled && !mobClear.isMaxed && activeEnemies > 0 && run.gold >= mobClear.currentCost;
    this.mobClearButton.text.setText(
      `${MOB_CLEAR_NAME}\n현재 ${activeEnemies}마리 · 사용 ${mobClear.usageCount}/${mobClear.maxUses}회\n${mobClear.isMaxed ? '사용 완료' : `비용 ${mobClear.currentCost} G`}`,
    );
    this.mobClearButton.background.setFillStyle(canClear ? 0x5a2130 : 0x1a2030, 1)
      .setStrokeStyle(2, canClear ? 0xff6b83 : 0x3a4358, canClear ? 0.95 : 0.65);
    this.mobClearButton.container.setAlpha(canClear ? 1 : 0.62);
    if (canClear) this.mobClearButton.background.setInteractive({ useHandCursor: true });
    else this.mobClearButton.background.disableInteractive();
  }

  pulseUpgrade(id: UpgradeId): void {
    const button = this.buttons.get(id);
    if (!button) return;
    this.scene.tweens.killTweensOf(button.container);
    button.container.setScale(1);
    this.scene.tweens.add({ targets: button.container, scale: 1.08, duration: 90, yoyo: true, ease: 'Back.easeOut' });
    const ring = this.scene.add.circle(button.container.x, button.container.y, 28, 0xffe66d, 0.12)
      .setStrokeStyle(5, 0xfff3a3, 0.95).setDepth(45);
    const notice = this.scene.add.text(button.container.x, button.container.y - 24, 'LEVEL UP!', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#fff3a3', stroke: '#513c08', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46);
    this.scene.tweens.add({
      targets: ring, scale: 3.2, alpha: 0, duration: 280, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.scene.tweens.add({
      targets: notice, y: notice.y - 42, alpha: 0, duration: 420, ease: 'Quad.easeOut',
      onComplete: () => notice.destroy(),
    });
  }

  setMuted(muted: boolean): void {
    this.soundText.setText(muted ? '♪ BGM OFF' : '♪ BGM ON').setColor(muted ? '#8592a3' : '#bff7ff');
  }

  setGameSpeed(speed: GameSpeed): void {
    this.speedText.setText(`속도 ×${speed}`).setColor(speed === 2 ? '#fff0a3' : '#bff7ff');
  }

  showStageTransition(stage: number): void {
    const notice = this.scene.add.text(360, 440, `STAGE ${stage}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '54px', color: '#fff2a8', stroke: '#3c203a', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(60).setAlpha(0).setScale(0.65);
    this.scene.tweens.add({
      targets: notice, alpha: 1, scale: 1, duration: 240, hold: 600, yoyo: true,
      onComplete: () => notice.destroy(),
    });
    this.scene.cameras.main.flash(100, 60, 100, 160, false);
  }

  showDeathOptions(summary: DeathSummary, onRevive: () => void, onRestart: () => void): void {
    this.hideDeathOptions();
    const blocker = this.scene.add.rectangle(360, 500, 720, 1000, 0x03050b, 0.82).setInteractive();
    const panel = this.scene.add.rectangle(360, 590, 590, 570, 0x111a2b, 0.98).setStrokeStyle(4, 0xff6688, 0.85);
    const title = this.scene.add.text(360, 390, '쓰러졌습니다', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#ff7892', stroke: '#3a1020', strokeThickness: 8,
    }).setOrigin(0.5);
    const info = this.scene.add.text(360, 495,
      `총 사망 ${summary.deaths}회   ·   STAGE ${summary.stage} 사망 ${summary.stageDeaths}회\n보유 골드 ${summary.gold} G와 업그레이드는 유지됩니다`,
      { fontFamily: 'Arial, sans-serif', fontSize: '21px', color: '#d4e3f2', align: 'center', lineSpacing: 12 },
    ).setOrigin(0.5);
    const recommendation = summary.recommendation;
    const recommendationText = this.scene.add.text(360, 565, recommendation
      ? `추천 강화: ${recommendation.name} Lv.${recommendation.level + 1} · ${recommendation.cost} G\n${recommendation.affordable ? '지금 바로 구매 가능' : `${recommendation.cost - summary.gold} G 부족`} · ${recommendation.reason}`
      : '', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffe58a', align: 'center',
      wordWrap: { width: 520 }, lineSpacing: 5,
    }).setOrigin(0.5);
    const reviveBg = this.scene.add.rectangle(360, 650, 430, 86, 0x26b8c5).setStrokeStyle(3, 0xa6fbff)
      .setInteractive({ useHandCursor: true });
    const reviveText = this.scene.add.text(360, 650, '부활하기', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#07131d',
    }).setOrigin(0.5);
    const restartBg = this.scene.add.rectangle(360, 760, 430, 76, 0x252f43).setStrokeStyle(2, 0x72819c)
      .setInteractive({ useHandCursor: true });
    const restartText = this.scene.add.text(360, 760, '캐릭터 다시 선택', {
      fontFamily: 'Arial, sans-serif', fontSize: '23px', color: '#dce7f3', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hint = this.scene.add.text(360, 835, '사망 중에도 아래 강화 버튼을 사용할 수 있습니다\n부활 횟수에는 제한이 없습니다', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#8190a7', align: 'center', lineSpacing: 5,
    }).setOrigin(0.5);
    this.deathOverlay = this.scene.add.container(0, 0, [
      blocker, panel, title, info, recommendationText, reviveBg, reviveText, restartBg, restartText, hint,
    ]).setDepth(100);
    reviveBg.on('pointerup', () => {
      reviveBg.disableInteractive();
      onRevive();
    });
    restartBg.on('pointerup', () => {
      this.showRestartConfirmation(onRestart);
    });
  }

  hideDeathOptions(): void {
    this.hideRestartConfirmation();
    this.deathOverlay?.destroy(true);
    this.deathOverlay = null;
  }

  private showRestartConfirmation(onConfirm: () => void): void {
    this.hideRestartConfirmation();
    const blocker = this.scene.add.rectangle(360, 640, 720, 1280, 0x02040a, 0.88).setInteractive();
    const panel = this.scene.add.rectangle(360, 590, 590, 360, 0x151b2a, 0.99)
      .setStrokeStyle(4, 0xffad66, 0.9);
    const title = this.scene.add.text(360, 485, '정말 다시 시작하시겠습니까?', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#fff0cf',
      stroke: '#4a2114', strokeThickness: 6,
    }).setOrigin(0.5);
    const warning = this.scene.add.text(360, 555, '현재 스테이지, 골드와 업그레이드 기록이 모두 초기화됩니다.', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#ffbd9b', align: 'center',
      wordWrap: { width: 510 },
    }).setOrigin(0.5);
    const cancelBg = this.scene.add.rectangle(235, 670, 220, 72, 0x27344a)
      .setStrokeStyle(2, 0x8092ad).setInteractive({ useHandCursor: true });
    const cancelText = this.scene.add.text(235, 670, '취소', {
      fontFamily: 'Arial, sans-serif', fontSize: '23px', color: '#e2edf7', fontStyle: 'bold',
    }).setOrigin(0.5);
    const confirmBg = this.scene.add.rectangle(485, 670, 220, 72, 0xa83c4f)
      .setStrokeStyle(2, 0xff9aac).setInteractive({ useHandCursor: true });
    const confirmText = this.scene.add.text(485, 670, '기록 삭제 후 재시작', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#fff0f3', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.restartConfirmation = this.scene.add.container(0, 0, [
      blocker, panel, title, warning, cancelBg, cancelText, confirmBg, confirmText,
    ]).setDepth(120);
    cancelBg.on('pointerup', () => this.hideRestartConfirmation());
    confirmBg.on('pointerup', () => {
      confirmBg.disableInteractive();
      onConfirm();
    });
  }

  private hideRestartConfirmation(): void {
    this.restartConfirmation?.destroy(true);
    this.restartConfirmation = null;
  }

  showPauseOptions(onContinue: () => void, onHome: () => void): void {
    this.hidePauseOptions();
    const blocker = this.scene.add.rectangle(360, 640, 720, 1280, 0x03050b, 0.78).setInteractive();
    const panel = this.scene.add.rectangle(360, 620, 580, 510, 0x101a2b, 0.98)
      .setStrokeStyle(4, 0x63dce8, 0.85);
    const title = this.scene.add.text(360, 430, '일시정지', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '50px', color: '#d9fbff',
      stroke: '#12364c', strokeThickness: 8,
    }).setOrigin(0.5);
    const hint = this.scene.add.text(360, 510, '현재 전투 진행이 멈췄습니다', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#9cb6ca',
    }).setOrigin(0.5);
    const continueBg = this.scene.add.rectangle(360, 620, 430, 86, 0x26b8c5)
      .setStrokeStyle(3, 0xa6fbff).setInteractive({ useHandCursor: true });
    const continueText = this.scene.add.text(360, 620, '계속 진행', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#07131d',
    }).setOrigin(0.5);
    const homeBg = this.scene.add.rectangle(360, 735, 430, 76, 0x252f43)
      .setStrokeStyle(2, 0x72819c).setInteractive({ useHandCursor: true });
    const homeText = this.scene.add.text(360, 735, '홈 · 캐릭터 선택', {
      fontFamily: 'Arial, sans-serif', fontSize: '23px', color: '#dce7f3', fontStyle: 'bold',
    }).setOrigin(0.5);
    const warning = this.scene.add.text(360, 815, '홈으로 이동하면 현재 런의 진행과 업그레이드가 초기화됩니다', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#8393aa',
    }).setOrigin(0.5);
    this.pauseOverlay = this.scene.add.container(0, 0, [
      blocker, panel, title, hint, continueBg, continueText, homeBg, homeText, warning,
    ]).setDepth(100);
    continueBg.on('pointerup', () => {
      continueBg.disableInteractive();
      onContinue();
    });
    homeBg.on('pointerup', () => {
      homeBg.disableInteractive();
      onHome();
    });
  }

  hidePauseOptions(): void {
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
  }

  private createUpgradeButton(x: number, y: number, id: UpgradeId): void {
    const background = this.scene.add.rectangle(0, 0, 210, 94, 0x173d4b).setStrokeStyle(2, 0x5be6e6).setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#ecffff', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [background, text]).setDepth(32);
    background.on('pointerup', () => this.onUpgrade(id));
    this.buttons.set(id, { container, background, text, id });
  }

  private createMobClearButton(
    x: number,
    y: number,
    onMobClear: () => void,
  ): Omit<UpgradeButton, 'id'> {
    const background = this.scene.add.rectangle(0, 0, 210, 94, 0x1a2030)
      .setStrokeStyle(2, 0x3a4358);
    const text = this.scene.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#fff1f3', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [background, text]).setDepth(32);
    background.on('pointerup', onMobClear);
    return { container, background, text };
  }

  private label(x: number, y: number, value: string, size: number): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, value, {
      fontFamily: 'Arial, sans-serif', fontSize: `${size}px`, color: '#e8f4ff', fontStyle: 'bold',
    }).setDepth(35);
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
