import { expect, test, type Page } from '@playwright/test';
import { getStageDurationMs, STAGE_TRANSITION_SPAWN_DELAY_MS } from '../../src/game/data/StageData';
import { UPGRADE_DEFINITIONS, calculateUpgradeEffect } from '../../src/game/data/UpgradeData';

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
    attackDamage: initialStats.attackDamage + calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackDamage, 1),
    attackSpeed: initialStats.attackSpeed + calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackSpeed, 1),
    bonusTargetCount: initialStats.bonusTargetCount + calculateUpgradeEffect(UPGRADE_DEFINITIONS.targetCount, 1),
    defense: initialStats.defense + calculateUpgradeEffect(UPGRADE_DEFINITIONS.defense, 1),
    maxHealth: initialStats.maxHealth + calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, 1),
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
  expect(deathState.attackDamage).toBe(initialStats.attackDamage + 6);
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
      gold: scene.run.gold,
      health: scene.player.health,
      invulnerable: (scene.invulnerableUntil ?? 0) > 0,
      maxHealth: scene.player.maxHealth,
      specialAbilityLevel: scene.player.specialAbilityLevel,
    };
  })).toEqual({
    attackDamage: deathState.attackDamage,
    awaitingRevive: false,
    deaths: 1,
    gold: deathState.gold,
    health: initialStats.maxHealth + 16,
    invulnerable: true,
    maxHealth: initialStats.maxHealth + 16,
    specialAbilityLevel: 1,
  });

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
