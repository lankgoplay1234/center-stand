import { expect, test, type Page } from '@playwright/test';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const DURATION_MS = 10 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 5_000;

interface PerformanceSample {
  elapsedMs: number;
  fps: number;
  activeEnemies: number;
  activeProjectiles: number;
  activeDamageTexts: number;
  damageTextPoolSize: number;
  stage: number;
  usedHeapBytes: number | null;
}

async function clickGamePoint(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Game canvas has no visible bounding box');
  await page.mouse.click(box.x + gameX / GAME_WIDTH * box.width, box.y + gameY / GAME_HEIGHT * box.height);
}

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
}

test('sustains a 100-enemy mobile battle for ten minutes', async ({ page }, testInfo) => {
  test.skip(process.env.RUN_ENDURANCE !== '1', 'Run explicitly with npm run test:e2e:endurance');
  test.setTimeout(DURATION_MS + 90_000);

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  await clickGamePoint(page, 360, 900);
  await expect.poll(() => page.evaluate(() => (
    window.__CENTER_STAND_GAME__?.scene.getScenes(true)[0]?.scene.key ?? null
  ))).toBe('GameScene');

  await page.evaluate(() => {
    const game = window.__CENTER_STAND_GAME__;
    const scene = game?.scene.getScene('GameScene') as unknown as {
      player: { health: number; maxHealth: number };
      runStressTest: () => void;
    };
    scene.player.maxHealth = 1_000_000_000;
    scene.player.health = scene.player.maxHealth;
    scene.runStressTest();
  });

  const samples: PerformanceSample[] = [];
  const startedAt = Date.now();
  const targetSampleCount = DURATION_MS / SAMPLE_INTERVAL_MS;
  for (let sampleIndex = 1; sampleIndex <= targetSampleCount; sampleIndex += 1) {
    const waitMs = Math.max(0, startedAt + sampleIndex * SAMPLE_INTERVAL_MS - Date.now());
    await page.waitForTimeout(waitMs);
    const elapsedMs = Date.now() - startedAt;
    const sample = await page.evaluate((sampleElapsedMs) => {
      const game = window.__CENTER_STAND_GAME__!;
      const scene = game.scene.getScene('GameScene') as unknown as {
        enemies: { activeCount: number };
        projectiles: { activeCount: number };
        effects: { damageTextStats: { active: number; poolSize: number } };
        stages: { currentStage: number };
        runStressTest: () => void;
      };
      scene.runStressTest();
      const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory;
      return {
        elapsedMs: sampleElapsedMs,
        fps: game.loop.actualFps,
        activeEnemies: scene.enemies.activeCount,
        activeProjectiles: scene.projectiles.activeCount,
        activeDamageTexts: scene.effects.damageTextStats.active,
        damageTextPoolSize: scene.effects.damageTextStats.poolSize,
        stage: scene.stages.currentStage,
        usedHeapBytes: memory?.usedJSHeapSize ?? null,
      };
    }, elapsedMs);
    samples.push(sample);
  }

  const fpsValues = samples.map((sample) => sample.fps);
  const heapValues = samples.flatMap((sample) => sample.usedHeapBytes === null ? [] : [sample.usedHeapBytes]);
  const summary = {
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    sampleCount: samples.length,
    averageFps: Number((fpsValues.reduce((sum, value) => sum + value, 0) / fpsValues.length).toFixed(2)),
    p10Fps: Number(percentile(fpsValues, 0.1).toFixed(2)),
    minFps: Number(Math.min(...fpsValues).toFixed(2)),
    maxActiveEnemies: Math.max(...samples.map((sample) => sample.activeEnemies)),
    maxActiveProjectiles: Math.max(...samples.map((sample) => sample.activeProjectiles)),
    maxActiveDamageTexts: Math.max(...samples.map((sample) => sample.activeDamageTexts)),
    maxDamageTextPoolSize: Math.max(...samples.map((sample) => sample.damageTextPoolSize)),
    finalStage: samples.at(-1)?.stage ?? 0,
    heapGrowthMb: heapValues.length > 1
      ? Number(((heapValues.at(-1)! - heapValues[0]!) / 1024 / 1024).toFixed(2))
      : null,
  };

  await testInfo.attach('mobile-endurance-metrics', {
    body: JSON.stringify({ summary, samples }, null, 2),
    contentType: 'application/json',
  });
  console.info(`[mobile endurance] ${JSON.stringify(summary)}`);

  expect(summary.durationSeconds).toBeGreaterThanOrEqual(600);
  expect(summary.sampleCount).toBe(targetSampleCount);
  expect(summary.maxActiveEnemies).toBeGreaterThanOrEqual(100);
  expect(summary.p10Fps).toBeGreaterThanOrEqual(24);
  expect(summary.maxDamageTextPoolSize).toBeLessThanOrEqual(120);
  if (summary.heapGrowthMb !== null) expect(summary.heapGrowthMb).toBeLessThan(160);
});
