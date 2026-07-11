import type Phaser from 'phaser';
import { UPGRADE_ORDER, canUpgrade } from '../data/UpgradeData';
import type { Player } from '../entities/Player';
import type { UpgradeSystem } from '../systems/UpgradeSystem';
import type { RunStats, UpgradeId } from '../types/GameTypes';

interface UpgradeButton {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  id: UpgradeId;
}

export interface DeathSummary {
  deaths: number;
  gold: number;
  stage: number;
}

export class UIManager {
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly stageText: Phaser.GameObjects.Text;
  private readonly killsText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly debugText: Phaser.GameObjects.Text;
  private readonly soundText: Phaser.GameObjects.Text;
  private readonly buttons = new Map<UpgradeId, UpgradeButton>();
  private deathOverlay: Phaser.GameObjects.Container | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onUpgrade: (id: UpgradeId) => void,
    onStressTest: () => void,
    onToggleMute: () => boolean,
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
      const point = positions[index]!;
      this.createUpgradeButton(point.x, point.y, id);
    });

    const soundBg = scene.add.rectangle(642, 116, 116, 36, 0x17263a, 0.92).setStrokeStyle(2, 0x4d7890)
      .setDepth(40).setInteractive({ useHandCursor: true });
    this.soundText = this.label(642, 116, '♪ BGM ON', 14).setOrigin(0.5).setDepth(41);
    soundBg.on('pointerup', () => this.setMuted(onToggleMute()));

    this.debugText = this.label(18, 112, '', 14).setOrigin(0).setColor('#83a1c8').setVisible(import.meta.env.DEV);
    if (import.meta.env.DEV) {
      const stress = scene.add.text(690, 148, '100 적 테스트', {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffcf5a', backgroundColor: '#222b40', padding: { x: 10, y: 7 },
      }).setOrigin(1, 0).setDepth(40).setInteractive({ useHandCursor: true });
      stress.on('pointerup', onStressTest);
    }
  }

  update(player: Player, run: RunStats, stage: number, upgrades: UpgradeSystem, activeEnemies: number, activeProjectiles: number): void {
    this.healthText.setText(`HP  ${Math.ceil(player.health)} / ${player.maxHealth}`);
    this.healthText.setColor(player.health / player.maxHealth < 0.3 ? '#ff6b83' : '#bff7ff');
    this.goldText.setText(`GOLD  ${run.gold}`);
    this.stageText.setText(`STAGE  ${stage}`);
    this.killsText.setText(`처치  ${run.kills}  ·  사망  ${run.deaths}`);
    this.timeText.setText(this.formatTime(run.elapsedSeconds));
    this.debugText.setText(
      `FPS ${Math.round(this.scene.game.loop.actualFps)}  |  적 ${activeEnemies}  |  투사체 ${activeProjectiles}\n스테이지 ${stage}  |  ${this.formatTime(run.elapsedSeconds)}`,
    );

    for (const [id, button] of this.buttons) {
      const state = upgrades.getState(id);
      const available = canUpgrade(state.definition, state.level);
      const affordable = available && run.gold >= state.currentCost;
      button.text.setText(
        `${state.definition.name}  Lv.${state.level}\n${upgrades.getEffectLabel(id)}\n${available ? `비용 ${state.currentCost} G` : 'MAX LEVEL'}`,
      );
      button.background.setFillStyle(affordable ? 0x173d4b : 0x1a2030, 1)
        .setStrokeStyle(2, affordable ? 0x5be6e6 : 0x3a4358, affordable ? 0.95 : 0.65);
      button.container.setAlpha(affordable ? 1 : 0.62);
      if (affordable) button.background.setInteractive({ useHandCursor: true });
      else button.background.disableInteractive();
    }
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
    const blocker = this.scene.add.rectangle(360, 640, 720, 1280, 0x03050b, 0.82).setInteractive();
    const panel = this.scene.add.rectangle(360, 590, 590, 570, 0x111a2b, 0.98).setStrokeStyle(4, 0xff6688, 0.85);
    const title = this.scene.add.text(360, 390, '쓰러졌습니다', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#ff7892', stroke: '#3a1020', strokeThickness: 8,
    }).setOrigin(0.5);
    const info = this.scene.add.text(360, 495,
      `사망 ${summary.deaths}회   ·   STAGE ${summary.stage}\n보유 골드 ${summary.gold} G와 업그레이드는 유지됩니다`,
      { fontFamily: 'Arial, sans-serif', fontSize: '21px', color: '#d4e3f2', align: 'center', lineSpacing: 12 },
    ).setOrigin(0.5);
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
    const hint = this.scene.add.text(360, 835, '부활 횟수에는 제한이 없습니다', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#8190a7',
    }).setOrigin(0.5);
    this.deathOverlay = this.scene.add.container(0, 0, [
      blocker, panel, title, info, reviveBg, reviveText, restartBg, restartText, hint,
    ]).setDepth(100);
    reviveBg.on('pointerup', () => {
      reviveBg.disableInteractive();
      onRevive();
    });
    restartBg.on('pointerup', () => {
      restartBg.disableInteractive();
      onRestart();
    });
  }

  hideDeathOptions(): void {
    this.deathOverlay?.destroy(true);
    this.deathOverlay = null;
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
