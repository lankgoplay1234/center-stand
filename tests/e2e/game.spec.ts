import { expect, test, type Page } from '@playwright/test';
import { getStageDurationMs, STAGE_TRANSITION_SPAWN_DELAY_MS } from '../../src/game/data/StageData';
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
      { isPaused?: boolean } | undefined;
    return scene?.isPaused ?? false;
  })).toBe(true);
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
      { isPaused?: boolean } | undefined;
    return scene?.isPaused ?? true;
  })).toBe(false);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__CENTER_STAND_GAME__?.scene.getScene('GameScene') as unknown as
      { run: { elapsedSeconds: number } };
    return scene.run.elapsedSeconds;
  })).toBeGreaterThan(whilePaused + 0.1);

  await clickGamePoint(page, 510, 116);
  await clickGamePoint(page, 360, 735);
  await expect.poll(() => activeSceneKey(page)).toBe('CharacterSelectScene');
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
      player: { x: number; y: number; attackDamage: number; knockbackForce: number };
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
      target.setPosition(scene.player.x + 45 + index * 20, scene.player.y);
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

  const transition = await page.evaluate(({ stageDuration, transitionDelay }) => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { x: number; y: number };
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
      stages: { currentStage: number; stats: { spawnInterval: number }; update: (delta: number) => void };
    };
    scene.run.gold = 321;
    scene.run.kills = 9;
    scene.runStressTest();
    const target = scene.enemies.activeEnemies[0];
    if (!target) throw new Error('Expected an enemy for stage transition test');
    scene.projectiles.fire(scene.player.x, scene.player.y, target, 1, 1);
    const before = { enemies: scene.enemies.activeCount, projectiles: scene.projectiles.activeCount };

    scene.stages.update(stageDuration);
    const afterClear = {
      enemies: scene.enemies.activeCount,
      projectiles: scene.projectiles.activeCount,
      gold: scene.run.gold,
      kills: scene.run.kills,
      stage: scene.stages.currentStage,
    };

    scene.enemies.update(transitionDelay - 1, transitionDelay - 1, scene.stages.stats);
    const beforeDelayEnds = scene.enemies.activeCount;
    scene.enemies.update(
      transitionDelay + scene.stages.stats.spawnInterval,
      scene.stages.stats.spawnInterval + 1,
      scene.stages.stats,
    );
    return { before, afterClear, beforeDelayEnds, afterRespawn: scene.enemies.activeCount };
  }, { stageDuration: getStageDurationMs(1), transitionDelay: STAGE_TRANSITION_SPAWN_DELAY_MS });

  expect(transition.before.enemies).toBeGreaterThanOrEqual(100);
  expect(transition.before.projectiles).toBe(1);
  expect(transition.afterClear).toEqual({ enemies: 0, projectiles: 0, gold: 321, kills: 9, stage: 2 });
  expect(transition.beforeDelayEnds).toBe(0);
  expect(transition.afterRespawn).toBeGreaterThan(0);
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
          attackAreaRadius: number;
          specialAbilityLevel: number;
          upgradeEfficiency: {
            attackDamage: number; attackSpeed: number; targetCount: number;
            defense: number; maxHealth: number;
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
    bonusTargetCount: initialStats.bonusTargetCount
      + Math.round(calculateUpgradeEffect(UPGRADE_DEFINITIONS.targetCount, 1, initialStats.efficiency.targetCount)),
    defense: initialStats.defense
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.defense, 1, initialStats.efficiency.defense),
    maxHealth: initialStats.maxHealth
      + calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, 1, initialStats.efficiency.maxHealth),
    attackRange: initialStats.attackRange,
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
      player?: { attackDamage: number; health: number; maxHealth: number; specialAbilityLevel: number };
      run?: { deaths: number; gold: number };
    } | undefined;
    if (!scene?.player || !scene.run) return null;
    return {
      attackDamage: scene.player.attackDamage,
      awaitingRevive: scene.awaitingRevive,
      deaths: scene.run.deaths,
      health: scene.player.health,
      invulnerable: (scene.invulnerableUntil ?? 0) > 0,
      maxHealth: scene.player.maxHealth,
      specialAbilityLevel: scene.player.specialAbilityLevel,
    };
  })).toEqual({
    attackDamage: deathState.attackDamage,
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
    const upgradeIds = ['attackDamage', 'attackSpeed', 'targetCount', 'defense', 'maxHealth', 'specialAbility'];
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
    upgradeLevels: [0, 0, 0, 0, 0, 0],
  });
  expect(runtimeErrors).toEqual([]);
});

test('completes stage 100 once and reports the selected character death count', async ({ page }) => {
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => activeSceneKey(page)).toBe('GameScene');
  await page.evaluate((finalStageDuration) => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      run: { deaths: number };
      stages: { currentStage: number; update: (delta: number) => void };
    };
    scene.run.deaths = 3;
    scene.stages.currentStage = 100;
    scene.stages.update(finalStageDuration);
  }, getStageDurationMs(100));
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
  await expect(nicknameInput).toBeDisabled();
  await expect(nicknameInput).toHaveAttribute('maxlength', '5');
  await expect(leaderboardSubmit).toBeDisabled();

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
