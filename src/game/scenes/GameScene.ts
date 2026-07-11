import Phaser from 'phaser';
import { getCharacterById } from '../data/CharacterData';
import { STAGE_TRANSITION_SPAWN_DELAY_MS } from '../data/StageData';
import { getStageTheme } from '../data/VisualAssetData';
import type { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { EffectsManager } from '../managers/EffectsManager';
import { AudioManager } from '../managers/AudioManager';
import { EnemyManager } from '../managers/EnemyManager';
import { ProjectileManager } from '../managers/ProjectileManager';
import { StageManager } from '../managers/StageManager';
import { UIManager } from '../managers/UIManager';
import { SaveManager } from '../services/SaveManager';
import { CombatSystem } from '../systems/CombatSystem';
import { PLAYER_CRITICAL_CHANCE, resolveCriticalHit } from '../systems/CriticalHitSystem';
import { canPlayerTakeDamage, revivePlayer } from '../systems/ReviveSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { MobClearSystem } from '../systems/MobClearSystem';
import { scaleGameDelta, toggleGameSpeed, type GameSpeed } from '../systems/GameSpeedSystem';
import type { RunStats, UpgradeId } from '../types/GameTypes';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: EnemyManager;
  private projectiles!: ProjectileManager;
  private stages!: StageManager;
  private effects!: EffectsManager;
  private audio!: AudioManager;
  private upgrades!: UpgradeSystem;
  private mobClear!: MobClearSystem;
  private combat!: CombatSystem;
  private ui!: UIManager;
  private gameEnded = false;
  private arenaBackground!: Phaser.GameObjects.Image;
  private attackRangeIndicator!: Phaser.GameObjects.Arc;
  private currentThemeKey = '';
  private criticalChance = PLAYER_CRITICAL_CHANCE;
  private isPaused = false;
  private awaitingRevive = false;
  private invulnerableUntil = 0;
  private gameSpeed: GameSpeed = 1;
  private simulationTime = 0;
  private run: RunStats = { gold: 0, earnedGold: 0, kills: 0, deaths: 0, elapsedSeconds: 0 };

  constructor() {
    super('GameScene');
  }

  create(data: { characterId?: string }): void {
    this.gameEnded = false;
    this.awaitingRevive = false;
    this.isPaused = false;
    this.invulnerableUntil = 0;
    this.gameSpeed = 1;
    this.simulationTime = 0;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.run = { gold: 0, earnedGold: 0, kills: 0, deaths: 0, elapsedSeconds: 0 };
    this.cameras.main.setBackgroundColor('#090d1a');
    this.createArena();
    this.player = new Player(this, 360, 595, getCharacterById(data.characterId ?? 'arc-ranger')).setDepth(10);
    this.createAttackRangeIndicator();
    this.effects = new EffectsManager(this);
    this.audio = new AudioManager();
    this.stages = new StageManager(
      (stage) => this.beginNextStage(stage),
      () => this.completeRun(),
    );
    this.enemies = new EnemyManager(this, this.player, {
      onPlayerHit: (damage, x, y) => this.handlePlayerHit(damage, x, y),
    });
    this.projectiles = new ProjectileManager(this, (enemy, damage) => this.handleEnemyHit(enemy, damage));
    this.upgrades = new UpgradeSystem(this.player);
    this.mobClear = new MobClearSystem();
    this.combat = new CombatSystem(this.player, this.enemies, this.projectiles, {
      applyInstantDamage: (enemy, damage) => this.handleEnemyHit(enemy, damage),
      emitEffect: (effect) => this.effects.showAttackEffect(effect),
      playAttackSound: (style) => { this.audio.playAttack(style); },
    });
    this.ui = new UIManager(
      this,
      (id) => this.purchaseUpgrade(id),
      () => this.runStressTest(),
      () => this.audio.toggleMuted(),
      () => this.pauseGame(),
      () => this.toggleGameSpeed(),
      () => this.purchaseMobClear(),
    );
    this.ui.showStageTransition(1);
    void this.audio.unlock();
    this.input.once('pointerdown', () => void this.audio.unlock());
    this.input.keyboard?.once('keydown', () => void this.audio.unlock());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded || this.awaitingRevive || this.isPaused) return;
    const scaledDelta = scaleGameDelta(delta, this.gameSpeed);
    this.simulationTime += scaledDelta;
    this.run.elapsedSeconds += scaledDelta / 1000;
    this.stages.update(scaledDelta);
    if (this.gameEnded) return;
    this.enemies.update(this.simulationTime, scaledDelta, this.stages.stats);
    this.combat.update(this.simulationTime);
    this.projectiles.update(scaledDelta);
    this.ui.update(
      this.player,
      this.run,
      this.stages.currentStage,
      this.upgrades,
      this.mobClear.state,
      this.enemies.activeCount,
      this.projectiles.activeCount,
    );
  }

  private createArena(): void {
    const initialTheme = getStageTheme(1);
    this.currentThemeKey = initialTheme.textureKey;
    this.arenaBackground = this.add.image(360, 500, initialTheme.textureKey)
      .setDisplaySize(720, 1000).setDepth(-3);
    this.add.rectangle(360, 500, 720, 1000, 0x050914, 0.3).setDepth(-2);
    const graphics = this.add.graphics().setDepth(-1);
    graphics.fillStyle(0x07101b, 0.12).fillRect(0, 0, 720, 1000);
    graphics.lineStyle(1, 0x29415a, 0.24);
    for (let x = 0; x <= 720; x += 60) graphics.lineBetween(x, 100, x, 1000);
    for (let y = 100; y <= 1000; y += 60) graphics.lineBetween(0, y, 720, y);
  }

  private createAttackRangeIndicator(): void {
    const { primaryColor, accentColor } = this.player.character.attackMotion;
    this.attackRangeIndicator = this.add.circle(
      this.player.x,
      this.player.y,
      this.player.attackRange,
      primaryColor,
      0.025,
    ).setStrokeStyle(2, accentColor, 0.18).setDepth(1);
  }

  private updateAttackRangeIndicator(): void {
    this.attackRangeIndicator.setPosition(this.player.x, this.player.y).setRadius(this.player.attackRange);
  }

  private handleEnemyHit(enemy: Enemy, damage: number): void {
    if (!enemy.isAlive) return;
    const x = enemy.x;
    const y = enemy.y;
    const critical = resolveCriticalHit(damage, Math.random(), this.criticalChance);
    const result = enemy.takeDamage(critical.damage);
    if (result.appliedDamage <= 0) return;
    this.effects.showDamage(x, y - 20, result.appliedDamage, undefined, critical.isCritical);
    this.effects.showHit(x, y);
    if (!result.died) {
      enemy.applyKnockback(this.player.x, this.player.y, this.player.knockbackForce);
      return;
    }

    this.run.gold += enemy.goldReward;
    this.run.earnedGold += enemy.goldReward;
    this.run.kills += 1;
    this.effects.showExplosion(x, y);
    this.enemies.release(enemy);
    this.cameras.main.shake(55, 0.0014);
  }

  private handlePlayerHit(rawDamage: number, x: number, y: number): void {
    if (!canPlayerTakeDamage(this.simulationTime, this.invulnerableUntil)) return;
    const applied = this.player.takeDamage(rawDamage);
    this.effects.showDamage(this.player.x, this.player.y - 42, applied, '#ff6b83');
    this.effects.showHit(x, y);
    this.cameras.main.shake(75, 0.0035);
    if (this.player.health <= 0) this.handlePlayerDeath();
  }

  private handlePlayerDeath(): void {
    if (this.awaitingRevive || this.gameEnded) return;
    this.awaitingRevive = true;
    this.run.deaths += 1;
    this.player.setAlpha(0.45);
    this.ui.showDeathOptions(
      { deaths: this.run.deaths, gold: this.run.gold, stage: this.stages.currentStage },
      () => this.revive(),
      () => this.restartFromCharacterSelect(),
    );
  }

  private togglePause(): void {
    if (this.gameEnded || this.awaitingRevive) return;
    if (this.isPaused) this.continueGame();
    else this.pauseGame();
  }

  private pauseGame(): void {
    if (this.gameEnded || this.awaitingRevive || this.isPaused) return;
    this.isPaused = true;
    this.audio.setPaused(true);
    this.ui.showPauseOptions(
      () => this.continueGame(),
      () => this.restartFromCharacterSelect(),
    );
  }

  private continueGame(): void {
    if (!this.isPaused || this.gameEnded) return;
    this.isPaused = false;
    this.audio.setPaused(false);
    this.ui.hidePauseOptions();
  }

  private toggleGameSpeed(): GameSpeed {
    if (this.gameEnded || this.awaitingRevive || this.isPaused) return this.gameSpeed;
    this.gameSpeed = toggleGameSpeed(this.gameSpeed);
    this.time.timeScale = this.gameSpeed;
    this.tweens.timeScale = this.gameSpeed;
    return this.gameSpeed;
  }

  private revive(): void {
    this.invulnerableUntil = revivePlayer(this.player, this.simulationTime);
    this.awaitingRevive = false;
    this.ui.hideDeathOptions();
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: 7,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  private restartFromCharacterSelect(): void {
    this.awaitingRevive = false;
    this.isPaused = false;
    this.ui.hideDeathOptions();
    this.ui.hidePauseOptions();
    this.enemies.destroyAll();
    this.projectiles.destroyAll();
    this.scene.start('CharacterSelectScene');
  }

  private purchaseUpgrade(id: UpgradeId): void {
    const result = this.upgrades.purchase(id, this.run.gold);
    if (!result.success) return;
    this.run.gold = result.gold;
    this.audio.playUpgradeSuccess();
    this.ui.pulseUpgrade(id);
    if (id === 'attackRange') this.updateAttackRangeIndicator();
    this.cameras.main.flash(65, 30, 150, 170, false);
  }

  private purchaseMobClear(): void {
    if (this.gameEnded || this.awaitingRevive || this.isPaused) return;
    const result = this.mobClear.purchase(
      this.run.gold,
      this.enemies.activeCount,
      () => this.enemies.clearWithRewards(),
    );
    if (!result.success) return;
    this.run.gold = result.gold;
    this.run.earnedGold += result.rewardGold;
    this.run.kills += result.clearedEnemies;
    this.projectiles.destroyAll();
    this.effects.showStageClear(this.player.x, this.player.y);
    this.cameras.main.flash(180, 255, 75, 105, false);
    this.cameras.main.shake(180, 0.006);
  }

  private runStressTest(): void {
    const missing = Math.max(0, 100 - this.enemies.activeCount);
    this.enemies.spawnBurst(missing, this.stages.stats);
  }

  private beginNextStage(stage: number): void {
    const clearedEnemies = this.enemies.clearForStageTransition(STAGE_TRANSITION_SPAWN_DELAY_MS);
    this.projectiles.destroyAll();
    if (clearedEnemies > 0) this.effects.showStageClear(this.player.x, this.player.y);
    this.updateStageTheme(stage);
    this.ui.showStageTransition(stage);
  }

  private updateStageTheme(stage: number): void {
    const theme = getStageTheme(stage);
    if (theme.textureKey === this.currentThemeKey) return;
    const previous = this.arenaBackground;
    const next = this.add.image(360, 500, theme.textureKey).setDisplaySize(720, 1000)
      .setDepth(-3).setAlpha(0);
    this.arenaBackground = next;
    this.currentThemeKey = theme.textureKey;
    this.tweens.add({ targets: next, alpha: 1, duration: 650, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: previous, alpha: 0, duration: 650, ease: 'Sine.easeOut',
      onComplete: () => previous.destroy(),
    });
    this.cameras.main.flash(120, (theme.accentColor >> 16) & 0xff, (theme.accentColor >> 8) & 0xff, theme.accentColor & 0xff, false);
  }

  private completeRun(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.enemies.destroyAll();
    this.projectiles.destroyAll();
    const bestSeconds = SaveManager.saveBestSeconds(this.run.elapsedSeconds);
    this.time.delayedCall(400, () => this.scene.start('GameOverScene', {
      characterId: this.player.character.id,
      characterName: this.player.character.name,
      completed: true,
      deaths: this.run.deaths,
      survivalSeconds: this.run.elapsedSeconds,
      stage: this.stages.currentStage,
      kills: this.run.kills,
      earnedGold: this.run.earnedGold,
      bestSeconds,
    }));
  }
}
