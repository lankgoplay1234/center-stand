import { expect, test, type Page } from '@playwright/test';
import { getStageKillTarget, STAGE_TRANSITION_SPAWN_DELAY_MS } from '../../src/game/data/StageData';
import { calculateAttackRangeAtLevel } from '../../src/game/data/AttackRangeData';
import { UPGRADE_DEFINITIONS, UPGRADE_ORDER, calculateUpgradeEffect } from '../../src/game/data/UpgradeData';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const COLD_START_TIMEOUT_MS = 15_000;

interface CharacterCardPoint {
  id: string;
  x: number;
  y: number;
}

const CHARACTER_CARDS: readonly CharacterCardPoint[] = [
  { id: 'arc-ranger', x: 190, y: 265 },
  { id: 'blade-warden', x: 530, y: 265 },
  { id: 'bastion-gunner', x: 190, y: 475 },
  { id: 'rune-mage', x: 530, y: 475 },
  { id: 'needle-striker', x: 190, y: 685 },
  { id: 'storm-conductor', x: 530, y: 685 },
];

const CHARACTER_MOTION_STYLES = [
  'ARC_SHOT',
  'BLADE_SWEEP',
  'BASTION_VOLLEY',
  'RUNE_CAST',
  'NEEDLE_BURST',
  'STORM_SURGE',
] as const;

async function clickGamePoint(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Game canvas has no visible bounding box');
  await page.mouse.click(
    box.x + gameX / GAME_WIDTH * box.width,
    box.y + gameY / GAME_HEIGHT * box.height,
  );
}

async function activeSceneKey(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__CENTER_STAND_GAME__?.scene.getScenes(true)[0]?.scene.key ?? null);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await expect.poll(
    () => activeSceneKey(page),
    { timeout: COLD_START_TIMEOUT_MS, message: 'Phaser should finish its cold start' },
  ).toBe('CharacterSelectScene');
});

test('selects all six characters and enters combat', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  for (const card of CHARACTER_CARDS) {
    await clickGamePoint(page, card.x, card.y);
    await expect.poll(() => page.evaluate(() => {
      const game = window.__CENTER_STAND_GAME__;
      const scene = game?.scene.getScene('CharacterSelectScene') as unknown as
        { selectedCharacter?: { id: string } } | undefined;
      return scene?.selectedCharacter?.id ?? null;
    })).toBe(card.id);
  }

  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      { enemies?: { activeCount: number } } | undefined;
    return scene?.enemies?.activeCount ?? 0;
  })).toBeGreaterThan(0);
  expect(runtimeErrors).toEqual([]);
});

test('pauses combat, continues the same run, and returns home', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  await clickGamePoint(page, 510, 116);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { isPaused?: boolean; audio?: { state: { paused: boolean; bgmPlaying: boolean } } } | undefined;
    return scene ? { isPaused: scene.isPaused, audio: scene.audio?.state } : null;
  })).toEqual(expect.objectContaining({
    isPaused: true,
    audio: expect.objectContaining({ paused: true, bgmPlaying: false }),
  }));
  const pausedAt = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { run: { elapsedSeconds: number } };
    return scene.run.elapsedSeconds;
  });
  await page.waitForTimeout(300);
  const whilePaused = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { run: { elapsedSeconds: number } };
    return scene.run.elapsedSeconds;
  });
  expect(whilePaused - pausedAt).toBeLessThan(0.02);

  await clickGamePoint(page, 360, 620);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { isPaused?: boolean; audio?: { state: { paused: boolean; bgmPlaying: boolean } } } | undefined;
    return scene ? { isPaused: scene.isPaused, audio: scene.audio?.state } : null;
  })).toEqual(expect.objectContaining({
    isPaused: false,
    audio: expect.objectContaining({ paused: false, bgmPlaying: true }),
  }));
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { run: { elapsedSeconds: number } };
    return scene.run.elapsedSeconds;
  })).toBeGreaterThan(whilePaused + 0.1);

  await clickGamePoint(page, 510, 116);
  await clickGamePoint(page, 360, 735);
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
});

test('toggles double speed and resets to normal for a fresh run', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await clickGamePoint(page, 378, 116);
  const doubled = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      gameSpeed: 1 | 2;
      isPaused: boolean;
      run: { elapsedSeconds: number };
      update: (time: number, delta: number) => void;
      ui: { speedText: { text: string } };
    };
    scene.run.elapsedSeconds = 0;
    scene.update(0, 20);
    scene.isPaused = true;
    return { speed: scene.gameSpeed, elapsedSeconds: scene.run.elapsedSeconds, label: scene.ui.speedText.text };
  });
  expect(doubled).toEqual({ speed: 2, elapsedSeconds: 0.04, label: '속도 ×2' });

  await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as { isPaused: boolean };
    scene.isPaused = false;
  });
  await clickGamePoint(page, 378, 116);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { gameSpeed?: number } | undefined;
    return scene?.gameSpeed ?? 0;
  })).toBe(1);

  await page.evaluate(() => window.__CENTER_STAND_GAME__?.scene.getScene('GameScene')?.scene.start('CharacterSelectScene'));
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { gameSpeed?: number } | undefined;
    return scene?.gameSpeed ?? 0;
  })).toBe(1);
});

test('buys every-mob clear repeatedly with rewards and an increased next price', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const before = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      enemies: {
        activeCount: number;
        activeEnemies: Array<{ goldReward: number }>;
        spawnBurst: (count: number, stats: unknown) => void;
      };
      projectiles: { activeCount: number };
      run: { gold: number; earnedGold: number; kills: number };
      stages: { stats: unknown };
      ui: { update: (...args: unknown[]) => void };
      player: unknown;
      upgrades: unknown;
      mobClear: { state: { currentCost: number; usageCount: number } };
    };
    scene.enemies.spawnBurst(Math.max(0, 100 - scene.enemies.activeCount), scene.stages.stats);
    scene.run.gold = 1_000;
    const reward = scene.enemies.activeEnemies.reduce((sum, enemy) => sum + enemy.goldReward, 0);
    scene.ui.update(
      scene.player,
      scene.run,
      1,
      scene.upgrades,
      scene.mobClear.state,
      scene.enemies.activeCount,
      scene.projectiles.activeCount,
    );
    return {
      enemies: scene.enemies.activeCount,
      reward,
      kills: scene.run.kills,
      earnedGold: scene.run.earnedGold,
    };
  });
  expect(before.enemies).toBeGreaterThanOrEqual(100);

  await clickGamePoint(page, 588, 1065);
  const after = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      enemies: { activeCount: number };
      projectiles: { activeCount: number };
      run: { gold: number; earnedGold: number; kills: number };
      mobClear: { state: { currentCost: number; usageCount: number } };
    };
    return {
      enemies: scene.enemies.activeCount,
      projectiles: scene.projectiles.activeCount,
      gold: scene.run.gold,
      earnedGold: scene.run.earnedGold,
      kills: scene.run.kills,
      mobClear: scene.mobClear.state,
    };
  });
  expect(after).toEqual({
    enemies: 0,
    projectiles: 0,
    gold: 700 + before.reward,
    earnedGold: before.earnedGold + before.reward,
    kills: before.kills + before.enemies,
    mobClear: { currentCost: 600, usageCount: 1, maxUses: 10, isMaxed: false },
  });
});

test('shows integer health and locks every-mob clear after ten uses', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const result = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      player: { health: number; maxHealth: number };
      run: { gold: number };
      stages: { stage: number; defeatedKills: number; targetKills: number };
      upgrades: unknown;
      enemies: { activeCount: number };
      projectiles: { activeCount: number };
      mobClear: {
        state: { currentCost: number; usageCount: number; maxUses: number; isMaxed: boolean };
        purchase: (
          gold: number,
          activeEnemies: number,
          clear: () => { clearedEnemies: number; rewardGold: number; stageKills: number },
        ) => { success: boolean };
      };
      ui: {
        healthText: { text: string };
        mobClearButton: { text: { text: string }; background: { input?: { enabled: boolean } } };
        update: (...args: unknown[]) => void;
      };
    };
    scene.player.health = 123.45;
    scene.player.maxHealth = 456.78;
    for (let usage = 0; usage < 10; usage += 1) {
      scene.mobClear.purchase(1_000_000, 1, () => ({ clearedEnemies: 1, rewardGold: 0, stageKills: 1 }));
    }
    scene.run.gold = 1_000_000;
    scene.ui.update(
      scene.player,
      scene.run,
      scene.stages.stage,
      scene.upgrades,
      scene.mobClear.state,
      Math.max(1, scene.enemies.activeCount),
      scene.projectiles.activeCount,
      scene.stages.defeatedKills,
      scene.stages.targetKills,
    );
    let callbackCalls = 0;
    const blocked = scene.mobClear.purchase(1_000_000, 1, () => {
      callbackCalls += 1;
      return { clearedEnemies: 1, rewardGold: 0, stageKills: 1 };
    });
    return {
      blocked: blocked.success,
      callbackCalls,
      healthText: scene.ui.healthText.text,
      mobClearText: scene.ui.mobClearButton.text.text,
      mobClearInteractive: scene.ui.mobClearButton.background.input?.enabled ?? false,
      state: scene.mobClear.state,
    };
  });

  expect(result.healthText).toBe('HP  124 / 457');
  expect(result.state).toEqual({ currentCost: 307_200, usageCount: 10, maxUses: 10, isMaxed: true });
  expect(result.mobClearText).toContain('사용 10/10회');
  expect(result.mobClearText).toContain('사용 완료');
  expect(result.mobClearInteractive).toBe(false);
  expect(result.blocked).toBe(false);
  expect(result.callbackCalls).toBe(0);
});

test('renders the real attack range and grows the same indicator with the range upgrade', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const before = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      attackRangeIndicator: { radius: number };
      player: { attackRange: number; character: { maxAttackRange: number } };
      run: { gold: number };
      ui: {
        buttons: Map<string, { text: { text: string } }>;
        update: (...args: unknown[]) => void;
      };
      upgrades: unknown;
      mobClear: { state: unknown };
      enemies: { activeCount: number };
      projectiles: { activeCount: number };
    };
    scene.run.gold = 10_000;
    scene.ui.update(
      scene.player,
      scene.run,
      1,
      scene.upgrades,
      scene.mobClear.state,
      scene.enemies.activeCount,
      scene.projectiles.activeCount,
    );
    (window as unknown as { __ATTACK_RANGE_INDICATOR__?: unknown }).__ATTACK_RANGE_INDICATOR__ = scene.attackRangeIndicator;
    return {
      indicatorRadius: scene.attackRangeIndicator.radius,
      playerRange: scene.player.attackRange,
      maxRange: scene.player.character.maxAttackRange,
      label: scene.ui.buttons.get('attackRange')?.text.text ?? '',
    };
  });
  expect(before.indicatorRadius).toBe(before.playerRange);
  expect(before.label).toContain('공격가능범위');
  expect(before.label).toContain(`최대 ${before.maxRange}`);

  await clickGamePoint(page, 588, 1182);
  const after = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      attackRangeIndicator: { radius: number };
      player: { attackRange: number };
      upgrades: { getState: (id: string) => { level: number } };
    };
    return {
      indicatorRadius: scene.attackRangeIndicator.radius,
      playerRange: scene.player.attackRange,
      level: scene.upgrades.getState('attackRange').level,
      reused: scene.attackRangeIndicator
        === (window as unknown as { __ATTACK_RANGE_INDICATOR__?: unknown }).__ATTACK_RANGE_INDICATOR__,
    };
  });
  expect(after.level).toBe(1);
  expect(after.reused).toBe(true);
  expect(after.indicatorRadius).toBe(after.playerRange);
  expect(after.playerRange).toBeGreaterThan(before.playerRange);
});

test('renders a distinct pooled attack motion for every character', async ({ page }) => {
  for (let index = 0; index < CHARACTER_CARDS.length; index += 1) {
    const card = CHARACTER_CARDS[index]!;
    await clickGamePoint(page, card.x, card.y);
    await clickGamePoint(page, 360, 900);
    await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
    await expect.poll(() => page.evaluate(() => {
      const game = window.__CENTER_STAND_GAME__;
      const scene = game?.scene.getScene('GameScene') as unknown as
        { enemies?: { activeCount: number } } | undefined;
      return scene?.enemies?.activeCount ?? 0;
    })).toBeGreaterThan(0);

    const motion = await page.evaluate(() => {
      const game = window.__CENTER_STAND_GAME__;
      const scene = game?.scene.getScene('GameScene') as unknown as {
        player: { x: number; y: number };
        enemies: { activeEnemies: Array<{ setPosition: (x: number, y: number) => void }> };
        combat: { update: (time: number) => void };
        effects: {
          attackMotionStats: { active: number; poolSize: number; totalShown: number; lastStyle: string | null };
        };
      };
      const enemy = scene.enemies.activeEnemies[0];
      if (!enemy) throw new Error('Expected an enemy for attack motion test');
      enemy.setPosition(scene.player.x + 40, scene.player.y);
      scene.combat.update(1_000_000);
      return scene.effects.attackMotionStats;
    });

    expect(motion.lastStyle).toBe(CHARACTER_MOTION_STYLES[index]);
    expect(motion.totalShown).toBeGreaterThan(0);
    expect(motion.poolSize).toBe(12);
    expect(motion.active).toBeLessThanOrEqual(motion.poolSize);

    if (index < CHARACTER_CARDS.length - 1) {
      await page.evaluate(() => {
        const game = window.__CENTER_STAND_GAME__;
        const scene = game?.scene.getScene('GameScene');
        scene?.scene.start('CharacterSelectScene');
      });
      await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
    }
  }
});

test('keeps the character sprite bounded during overlapping rapid attacks', async ({ page }) => {
  await clickGamePoint(page, 530, 475);
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const scales = await page.evaluate(async () => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      isPaused: boolean;
      player: {
        x: number;
        y: number;
        visualTier: number;
        sprite: { scaleX: number; scaleY: number };
        applyUpgradeVisual: (levels: number) => void;
        playAttackMotion: (target: { x: number; y: number }) => void;
      };
    };
    scene.isPaused = true;
    scene.player.applyUpgradeVisual(400);
    const baseScale = 0.76 + scene.player.visualTier * 0.025;
    let maximumScale = baseScale;
    for (let attack = 0; attack < 50; attack += 1) {
      scene.player.playAttackMotion({ x: scene.player.x + 100, y: scene.player.y });
      await new Promise((resolve) => window.setTimeout(resolve, 8));
      maximumScale = Math.max(maximumScale, scene.player.sprite.scaleX, scene.player.sprite.scaleY);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return {
      baseScale,
      finalScaleX: scene.player.sprite.scaleX,
      finalScaleY: scene.player.sprite.scaleY,
      maximumScale,
    };
  });

  expect(scales.maximumScale).toBeLessThanOrEqual(scales.baseScale * 1.15);
  expect(scales.finalScaleX).toBeCloseTo(scales.baseScale, 4);
  expect(scales.finalScaleY).toBeCloseTo(scales.baseScale, 4);
});

test('triggers Blade Fury on the fourth valid melee attack without duplicate damage', async ({ page }) => {
  await clickGamePoint(page, 530, 265);
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      { enemies?: { activeCount: number } } | undefined;
    return scene?.enemies?.activeCount ?? 0;
  })).toBeGreaterThanOrEqual(3);

  const result = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { x: number; y: number; attackDamage: number; attackRange: number; knockbackForce: number };
      criticalChance: number;
      enemies: {
        activeEnemies: Array<{
          health: number;
          maxHealth: number;
          setPosition: (x: number, y: number) => void;
        }>;
      };
      combat: { update: (time: number) => void };
    };
    scene.criticalChance = 0;
    scene.player.knockbackForce = 0;
    const targets = scene.enemies.activeEnemies.slice(0, 3);
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!;
      target.health = 1_000;
      target.maxHealth = 1_000;
      target.setPosition(
        scene.player.x + scene.player.attackRange / (targets.length + 1) * (index + 1),
        scene.player.y,
      );
    }
    for (let attack = 0; attack < 4; attack += 1) scene.combat.update(1_000_000 + attack * 1_000);
    return {
      attackDamage: scene.player.attackDamage,
      remainingHealth: targets.map((target) => target.health),
    };
  });

  const expectedDamage = result.attackDamage * (3 + 1.35);
  for (const health of result.remainingHealth) expect(health).toBeCloseTo(1_000 - expectedDamage);
});

test('pushes a standard enemy away from the player when hit', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      { enemies?: { activeCount: number } } | undefined;
    return scene?.enemies?.activeCount ?? 0;
  })).toBeGreaterThan(0);

  const movement = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { x: number; y: number; knockbackForce: number };
      enemies: { activeEnemies: Array<{ x: number; y: number; setPosition: (x: number, y: number) => void }> };
      handleEnemyHit: (enemy: { x: number; y: number }, damage: number) => void;
    };
    const enemy = scene.enemies.activeEnemies[0];
    if (!enemy) throw new Error('Expected an active enemy for knockback test');
    enemy.setPosition(scene.player.x + 100, scene.player.y);
    const beforeX = enemy.x;
    scene.handleEnemyHit(enemy, 1);
    return { movedBy: enemy.x - beforeX, force: scene.player.knockbackForce };
  });
  expect(movement.movedBy).toBeCloseTo(movement.force);

  const damageTextStats = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      enemies: { activeEnemies: Array<{ x: number; y: number }> };
      effects: { damageTextStats: { active: number; poolSize: number; totalShown: number } };
      handleEnemyHit: (enemy: { x: number; y: number }, damage: number) => void;
      runStressTest: () => void;
    };
    scene.runStressTest();
    for (const enemy of scene.enemies.activeEnemies) scene.handleEnemyHit(enemy, 1);
    return scene.effects.damageTextStats;
  });
  expect(damageTextStats.totalShown).toBeGreaterThanOrEqual(100);
  expect(damageTextStats.active).toBeLessThanOrEqual(120);
  expect(damageTextStats.poolSize).toBeLessThanOrEqual(120);
});

test('spawns stronger stage-100 captains with distinct visuals from the existing pool', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const result = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      enemies: {
        activeCount: number;
        activeCaptainCount: number;
        activeEnemies: Array<{
          rank: 'NORMAL' | 'CAPTAIN';
          visualTier: number;
          radius: number;
          maxHealth: number;
          attackDamage: number;
          goldReward: number;
        }>;
        destroyAll: () => void;
      };
      stages: { currentStage: number };
      runStressTest: () => void;
    };

    scene.enemies.destroyAll();
    scene.stages.currentStage = 1;
    scene.runStressTest();
    const stageOneCaptains = scene.enemies.activeCaptainCount;

    scene.enemies.destroyAll();
    scene.stages.currentStage = 100;
    scene.runStressTest();
    const normal = scene.enemies.activeEnemies.find((enemy) => enemy.rank === 'NORMAL');
    const captain = scene.enemies.activeEnemies.find((enemy) => enemy.rank === 'CAPTAIN');
    if (!normal || !captain) throw new Error('Expected normal and captain enemies at stage 100');
    return {
      stageOneCaptains,
      activeCount: scene.enemies.activeCount,
      captainCount: scene.enemies.activeCaptainCount,
      normal: {
        tier: normal.visualTier,
        radius: normal.radius,
        maxHealth: normal.maxHealth,
        attackDamage: normal.attackDamage,
        goldReward: normal.goldReward,
      },
      captain: {
        tier: captain.visualTier,
        radius: captain.radius,
        maxHealth: captain.maxHealth,
        attackDamage: captain.attackDamage,
        goldReward: captain.goldReward,
      },
    };
  });

  expect(result.stageOneCaptains).toBe(0);
  expect(result.activeCount).toBe(100);
  expect(result.captainCount).toBe(2);
  expect(result.normal.tier).toBe(5);
  expect(result.captain.tier).toBe(5);
  expect(result.captain.radius).toBeGreaterThan(result.normal.radius);
  expect(result.captain.maxHealth).toBeGreaterThanOrEqual(result.normal.maxHealth * 11.9);
  expect(result.captain.attackDamage).toBeGreaterThanOrEqual(result.normal.attackDamage * 9.9);
  expect(result.captain.goldReward).toBe(result.normal.goldReward * 18);
});

test('locks a level 99 upgrade without spending gold', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number } };
    };
    scene.run.gold = 1_000_000;
    scene.upgrades.getState('attackDamage').level = 99;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

  const maxState = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number } };
      ui: { buttons: Map<string, { text: { text: string }; background: { input?: { enabled: boolean } } }> };
      purchaseUpgrade: (id: string) => void;
    };
    const beforeGold = scene.run.gold;
    scene.purchaseUpgrade('attackDamage');
    const button = scene.ui.buttons.get('attackDamage');
    return {
      beforeGold,
      afterGold: scene.run.gold,
      level: scene.upgrades.getState('attackDamage').level,
      label: button?.text.text ?? '',
      enabled: button?.background.input?.enabled ?? false,
    };
  });
  expect(maxState).toEqual({
    beforeGold: 1_000_000,
    afterGold: 1_000_000,
    level: 99,
    label: expect.stringContaining('MAX LEVEL'),
    enabled: false,
  });
});

test('evolves the player appearance through 400 upgrades and preserves it only within the run', async ({ page }, testInfo) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const progression = await page.evaluate((upgradeOrder) => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: {
        health: number;
        visualStats: {
          tier: number;
          totalUpgradeLevels: number;
          ornamentCount: number;
          coreRadius: number;
          auraRadius: number;
        };
      };
      upgrades: { purchase: (id: string, gold: number) => { success: boolean; gold: number } };
      handlePlayerDeath: () => void;
      revive: () => void;
    };
    const snapshots = [{ ...scene.player.visualStats }];
    let gold = 1_000_000_000;
    for (let total = 1; total <= 400; total += 1) {
      const result = scene.upgrades.purchase(upgradeOrder[(total - 1) % upgradeOrder.length]!, gold);
      if (!result.success) throw new Error(`Upgrade purchase failed at total level ${total}`);
      gold = result.gold;
      if (total % 80 === 0) snapshots.push({ ...scene.player.visualStats });
    }
    scene.player.health = 0;
    scene.handlePlayerDeath();
    scene.revive();
    return { snapshots, afterRevive: { ...scene.player.visualStats } };
  }, UPGRADE_ORDER);

  expect(progression.snapshots.map((snapshot) => snapshot.tier)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(progression.snapshots.map((snapshot) => snapshot.ornamentCount)).toEqual([0, 2, 3, 4, 5, 6]);
  expect(progression.snapshots.map((snapshot) => snapshot.totalUpgradeLevels)).toEqual([0, 80, 160, 240, 320, 400]);
  expect(progression.snapshots.map((snapshot) => snapshot.coreRadius)).toEqual([25, 27, 29, 31, 33, 35]);
  expect(progression.snapshots.map((snapshot) => snapshot.auraRadius)).toEqual([43, 47, 51, 56, 61, 67]);
  expect(progression.afterRevive).toEqual(progression.snapshots.at(-1));
  await testInfo.attach('tier-5-player-visual', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as { restartFromCharacterSelect: () => void };
    scene.restartFromCharacterSelect();
  });
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  const freshVisual = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { visualStats: { tier: number; totalUpgradeLevels: number; ornamentCount: number } };
    };
    return scene.player.visualStats;
  });
  expect(freshVisual).toEqual(expect.objectContaining({ tier: 0, totalUpgradeLevels: 0, ornamentCount: 0 }));
});

test('plays upgrade feedback only for successful unmuted purchases', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      { audio?: { state: { unlocked: boolean } } } | undefined;
    return scene?.audio?.state.unlocked ?? false;
  })).toBe(true);

  const successState = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      audio: { state: { upgradeEffectCount: number } };
      children: { list: Array<{ text?: string }> };
      purchaseUpgrade: (id: string) => void;
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number } };
    };
    scene.run.gold = 10_000;
    scene.purchaseUpgrade('attackDamage');
    const countAfterSuccess = scene.audio.state.upgradeEffectCount;
    const hasVisualNotice = scene.children.list.some((child) => child.text === 'LEVEL UP!');
    scene.upgrades.getState('attackDamage').level = 99;
    scene.purchaseUpgrade('attackDamage');
    return {
      countAfterSuccess,
      countAfterFailedPurchase: scene.audio.state.upgradeEffectCount,
      hasVisualNotice,
    };
  });
  expect(successState).toEqual({
    countAfterSuccess: 1,
    countAfterFailedPurchase: 1,
    hasVisualNotice: true,
  });

  await clickGamePoint(page, 642, 116);
  const mutedState = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      audio: { state: { muted: boolean; upgradeEffectCount: number } };
      purchaseUpgrade: (id: string) => void;
    };
    scene.purchaseUpgrade('defense');
    return scene.audio.state;
  });
  expect(mutedState.muted).toBe(true);
  expect(mutedState.upgradeEffectCount).toBe(1);
});

test('clears remaining enemies and projectiles at a stage boundary without rewards', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const transition = await page.evaluate(({ stageTarget, transitionDelay }) => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { x: number; y: number; health: number; maxHealth: number };
      run: { gold: number; kills: number };
      runStressTest: () => void;
      enemies: {
        activeCount: number;
        activeEnemies: Array<object>;
        update: (time: number, delta: number, stats: object) => void;
      };
      projectiles: {
        activeCount: number;
        fire: (x: number, y: number, target: object, damage: number, speed: number) => void;
      };
      stages: {
        currentStage: number;
        stats: { spawnInterval: number };
        recordKills: (count: number) => void;
      };
    };
    scene.run.gold = 321;
    scene.run.kills = 9;
    scene.runStressTest();
    const target = scene.enemies.activeEnemies[0];
    if (!target) throw new Error('Expected an enemy for stage transition test');
    scene.projectiles.fire(scene.player.x, scene.player.y, target, 1, 1);
    const before = { enemies: scene.enemies.activeCount, projectiles: scene.projectiles.activeCount };

    scene.player.health = 1;
    scene.stages.recordKills(stageTarget);
    const afterClear = {
      enemies: scene.enemies.activeCount,
      projectiles: scene.projectiles.activeCount,
      gold: scene.run.gold,
      kills: scene.run.kills,
      stage: scene.stages.currentStage,
      health: scene.player.health,
      maxHealth: scene.player.maxHealth,
    };

    scene.enemies.update(transitionDelay - 1, transitionDelay - 1, scene.stages.stats);
    const beforeDelayEnds = scene.enemies.activeCount;
    scene.enemies.update(
      transitionDelay + scene.stages.stats.spawnInterval,
      scene.stages.stats.spawnInterval + 1,
      scene.stages.stats,
    );
    return { before, afterClear, beforeDelayEnds, afterRespawn: scene.enemies.activeCount };
  }, { stageTarget: getStageKillTarget(1), transitionDelay: STAGE_TRANSITION_SPAWN_DELAY_MS });

  expect(transition.before.enemies).toBeGreaterThanOrEqual(100);
  expect(transition.before.projectiles).toBe(1);
  expect(transition.afterClear).toEqual({
    enemies: 0, projectiles: 0, gold: 321, kills: 9, stage: 2,
    health: transition.afterClear.maxHealth,
    maxHealth: transition.afterClear.maxHealth,
  });
  expect(transition.beforeDelayEnds).toBe(0);
  expect(transition.afterRespawn).toBeGreaterThan(0);
});

test('allows upgrades while dead and confirms before resetting the run', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const before = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      handlePlayerDeath: () => void;
      player: { health: number; attackDamage: number };
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number; currentCost: number } };
      ui: { mobClearButton: { background: { input?: { enabled: boolean } } } };
    };
    scene.run.gold = 10_000;
    scene.player.health = 0;
    scene.handlePlayerDeath();
    const state = scene.upgrades.getState('attackDamage');
    return {
      attackDamage: scene.player.attackDamage,
      cost: state.currentCost,
      mobClearInteractive: scene.ui.mobClearButton.background.input?.enabled ?? false,
    };
  });
  expect(before.mobClearInteractive).toBe(false);

  await clickGamePoint(page, 132, 1065);
  const upgraded = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      awaitingRevive: boolean;
      player: { attackDamage: number };
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number } };
      ui: { deathOverlay: unknown };
    };
    return {
      attackDamage: scene.player.attackDamage,
      awaitingRevive: scene.awaitingRevive,
      deathOverlayVisible: scene.ui.deathOverlay !== null,
      gold: scene.run.gold,
      level: scene.upgrades.getState('attackDamage').level,
    };
  });
  expect(upgraded).toEqual({
    attackDamage: expect.any(Number),
    awaitingRevive: true,
    deathOverlayVisible: true,
    gold: 10_000 - before.cost,
    level: 1,
  });
  expect(upgraded.attackDamage).toBeGreaterThan(before.attackDamage);

  await clickGamePoint(page, 360, 760);
  const confirmation = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      awaitingRevive: boolean;
      ui: { restartConfirmation: { list: Array<{ text?: string }> } | null };
    };
    return {
      awaitingRevive: scene.awaitingRevive,
      text: scene.ui.restartConfirmation?.list.flatMap((entry) => entry.text ? [entry.text] : []).join('\n') ?? '',
    };
  });
  expect(await activeSceneKey(page)).toBe('GameScene');
  expect(confirmation.awaitingRevive).toBe(true);
  expect(confirmation.text).toContain('정말 다시 시작하시겠습니까?');
  expect(confirmation.text).toContain('기록이 모두 초기화됩니다');

  await clickGamePoint(page, 235, 670);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      awaitingRevive: boolean;
      run: { gold: number };
      upgrades: { getState: (id: string) => { level: number } };
      ui: { restartConfirmation: unknown };
    };
    return {
      awaitingRevive: scene.awaitingRevive,
      confirmationClosed: scene.ui.restartConfirmation === null,
      gold: scene.run.gold,
      level: scene.upgrades.getState('attackDamage').level,
    };
  })).toEqual({ awaitingRevive: true, confirmationClosed: true, gold: 10_000 - before.cost, level: 1 });

  await clickGamePoint(page, 360, 760);
  await clickGamePoint(page, 485, 670);
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
});

test('preserves gold and upgrades across revival, then returns to character select', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const initialStats = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      {
        player: {
          attackDamage: number;
          attackSpeed: number;
          bonusTargetCount: number;
          defense: number;
          maxHealth: number;
          attackRange: number;
          character: { maxAttackRange: number };
          attackAreaRadius: number;
          specialAbilityLevel: number;
          upgradeEfficiency: {
            attackDamage: number; attackSpeed: number;
            defense: number; maxHealth: number; attackRange: number;
          };
        };
        run: { gold: number };
    };
    scene.run.gold = 10_000;
    return {
      attackDamage: scene.player.attackDamage,
      attackSpeed: scene.player.attackSpeed,
      bonusTargetCount: scene.player.bonusTargetCount,
      defense: scene.player.defense,
      maxHealth: scene.player.maxHealth,
      attackRange: scene.player.attackRange,
      maxAttackRange: scene.player.character.maxAttackRange,
      attackAreaRadius: scene.player.attackAreaRadius,
      specialAbilityLevel: scene.player.specialAbilityLevel,
      efficiency: scene.player.upgradeEfficiency,
    };
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const upgradePoints = [
    { x: 132, y: 1065 }, { x: 360, y: 1065 }, { x: 588, y: 1065 },
    { x: 132, y: 1182 }, { x: 360, y: 1182 }, { x: 588, y: 1182 },
  ] as const;
  for (const point of upgradePoints) await clickGamePoint(page, point.x, point.y);

  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as
      {
        player?: {
          attackDamage: number;
          attackSpeed: number;
          bonusTargetCount: number;
          defense: number;
          maxHealth: number;
          attackRange: number;
          attackAreaRadius: number;
          specialAbilityLevel: number;
        };
      } | undefined;
    const player = scene?.player;
    if (!player) return null;
    return {
      attackDamage: player.attackDamage,
      attackSpeed: player.attackSpeed,
      bonusTargetCount: player.bonusTargetCount,
      defense: player.defense,
      maxHealth: player.maxHealth,
      attackRange: player.attackRange,
      attackAreaRadius: player.attackAreaRadius,
      specialAbilityLevel: player.specialAbilityLevel,
    };
  })).toEqual({
    attackDamage: initialStats.attackDamage
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackDamage, 1, initialStats.efficiency.attackDamage),
    attackSpeed: initialStats.attackSpeed
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackSpeed, 1, initialStats.efficiency.attackSpeed),
    bonusTargetCount: initialStats.bonusTargetCount,
    defense: initialStats.defense
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.defense, 1, initialStats.efficiency.defense),
    maxHealth: initialStats.maxHealth
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, 1, initialStats.efficiency.maxHealth),
    attackRange: calculateAttackRangeAtLevel(
      initialStats.attackRange,
      initialStats.maxAttackRange,
      1,
      initialStats.efficiency.attackRange,
    ),
    attackAreaRadius: initialStats.attackAreaRadius,
    specialAbilityLevel: initialStats.specialAbilityLevel + 1,
  });

  const deathState = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      awaitingRevive: boolean;
      handlePlayerDeath: () => void;
      player: { attackDamage: number; health: number; specialAbilityLevel: number };
      run: { deaths: number; gold: number };
    };
    scene.player.health = 0;
    scene.handlePlayerDeath();
    return {
      awaitingRevive: scene.awaitingRevive,
      attackDamage: scene.player.attackDamage,
      deaths: scene.run.deaths,
      gold: scene.run.gold,
      specialAbilityLevel: scene.player.specialAbilityLevel,
    };
  });
  expect(deathState.awaitingRevive).toBe(true);
  expect(deathState.attackDamage).toBe(
    initialStats.attackDamage
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackDamage, 1, initialStats.efficiency.attackDamage),
  );
  expect(deathState.deaths).toBe(1);
  expect(deathState.gold).toBeGreaterThan(0);
  expect(deathState.specialAbilityLevel).toBe(1);

  await clickGamePoint(page, 360, 650);
  await expect.poll(() => page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      awaitingRevive?: boolean;
      invulnerableUntil?: number;
      player?: {
        attackDamage: number;
        attackRange: number;
        health: number;
        maxHealth: number;
        specialAbilityLevel: number;
      };
      run?: { deaths: number; gold: number };
    } | undefined;
    if (!scene?.player || !scene.run) return null;
    return {
      attackDamage: scene.player.attackDamage,
      attackRange: scene.player.attackRange,
      awaitingRevive: scene.awaitingRevive,
      deaths: scene.run.deaths,
      health: scene.player.health,
      invulnerable: (scene.invulnerableUntil ?? 0) > 0,
      maxHealth: scene.player.maxHealth,
      specialAbilityLevel: scene.player.specialAbilityLevel,
    };
  })).toEqual({
    attackDamage: deathState.attackDamage,
    attackRange: calculateAttackRangeAtLevel(
      initialStats.attackRange,
      initialStats.maxAttackRange,
      1,
      initialStats.efficiency.attackRange,
    ),
    awaitingRevive: false,
    deaths: 1,
    health: initialStats.maxHealth
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, 1, initialStats.efficiency.maxHealth),
    invulnerable: true,
    maxHealth: initialStats.maxHealth
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, 1, initialStats.efficiency.maxHealth),
    specialAbilityLevel: 1,
  });
  const revivedGold = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { run: { gold: number } };
    return scene.run.gold;
  });
  expect(revivedGold).toBeGreaterThanOrEqual(deathState.gold);

  await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      handlePlayerDeath: () => void;
      player: { health: number };
    };
    scene.player.health = 0;
    scene.handlePlayerDeath();
  });
  await clickGamePoint(page, 360, 760);
  await clickGamePoint(page, 485, 670);
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  const freshRun = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { attackDamage: number };
      run: { deaths: number; gold: number };
      stages: { currentStage: number };
      upgrades: { getState: (id: string) => { level: number } };
    };
    const upgradeIds = ['attackDamage', 'attackSpeed', 'defense', 'maxHealth', 'attackRange'];
    return {
      attackDamage: scene.player.attackDamage,
      deaths: scene.run.deaths,
      gold: scene.run.gold,
      stage: scene.stages.currentStage,
      upgradeLevels: upgradeIds.map((id) => scene.upgrades.getState(id).level),
    };
  });
  expect(freshRun).toEqual({
    attackDamage: initialStats.attackDamage,
    deaths: 0,
    gold: 0,
    stage: 1,
    upgradeLevels: [0, 0, 0, 0, 0],
  });
  expect(runtimeErrors).toEqual([]);
});

test('recommends an efficient upgrade after five deaths in one stage and resets next stage', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');

  const recommendation = await page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      handlePlayerDeath: () => void;
      revive: () => void;
      player: { health: number };
      run: { gold: number };
      ui: { deathOverlay: { list: Array<{ text?: string }> } | null };
    };
    scene.run.gold = 100_000;
    const deathTexts: string[][] = [];
    for (let death = 1; death <= 5; death += 1) {
      scene.player.health = 0;
      scene.handlePlayerDeath();
      deathTexts.push(scene.ui.deathOverlay?.list.flatMap((entry) => entry.text ? [entry.text] : []) ?? []);
      if (death < 5) scene.revive();
    }
    return deathTexts;
  });
  for (let index = 0; index < 4; index += 1) {
    expect(recommendation[index]!.join('\n')).not.toContain('추천 강화:');
  }
  expect(recommendation[4]!.join('\n')).toContain('추천 강화:');
  expect(recommendation[4]!.join('\n')).toContain('지금 바로 구매 가능');

  const nextStageDeath = await page.evaluate((stageTarget) => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as {
      handlePlayerDeath: () => void;
      revive: () => void;
      player: { health: number };
      stages: { recordKills: (count: number) => void };
      ui: { deathOverlay: { list: Array<{ text?: string }> } | null };
    };
    scene.revive();
    scene.stages.recordKills(stageTarget);
    scene.player.health = 0;
    scene.handlePlayerDeath();
    return scene.ui.deathOverlay?.list.flatMap((entry) => entry.text ? [entry.text] : []) ?? [];
  }, getStageKillTarget(1));
  expect(nextStageDeath.join('\n')).toContain('STAGE 2 사망 1회');
  expect(nextStageDeath.join('\n')).not.toContain('추천 강화:');
});

test('completes stage 100 once and reports the selected character death count', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await page.evaluate((finalStageTarget) => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      run: { deaths: number };
      stages: { currentStage: number; recordKills: (count: number) => void };
    };
    scene.run.deaths = 3;
    scene.stages.currentStage = 100;
    scene.stages.recordKills(finalStageTarget);
  }, getStageKillTarget(100));
  await expect.poll(() => activeSceneKey(page)).toBe('GameOverScene');
  const result = await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameOverScene') as unknown as {
      result: { characterId: string; completed: boolean; deaths: number; stage: number };
    };
    return scene.result;
  });
  expect(result).toEqual(expect.objectContaining({
    characterId: 'arc-ranger',
    completed: true,
    deaths: 3,
    stage: 100,
  }));
  const nicknameInput = page.getByTestId('leaderboard-nickname');
  const leaderboardSubmit = page.getByTestId('leaderboard-submit');
  await expect(nicknameInput).toBeVisible();
  await expect(nicknameInput).toBeEnabled();
  await expect(nicknameInput).toHaveAttribute('maxlength', '5');
  await expect(leaderboardSubmit).toBeEnabled();
  await nicknameInput.fill('용사');
  await leaderboardSubmit.click();
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameOverScene') as unknown as {
      leaderboardStatus: { text: string };
      leaderboardEntries: { text: string };
    };
    return { status: scene.leaderboardStatus.text, entries: scene.leaderboardEntries.text };
  })).toEqual({
    status: '내 기록이 등록되었습니다',
    entries: expect.stringContaining('1. 용사 · 아크 레인저 · 3회'),
  });
  await expect(leaderboardSubmit).toBeEnabled();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
  const downloadPromise = page.waitForEvent('download');
  await clickGamePoint(page, 360, 660);
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('아크-레인저-3deaths.png');

  await clickGamePoint(page, 360, 790);
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
});
