import { calculateStageStats, getStageKillTarget } from '../data/StageData';
import type { StageStats } from '../types/GameTypes';

export const FINAL_STAGE = 100;

export class StageManager {
  currentStage = 1;
  defeatedKills = 0;
  elapsedInStageMs = 0;
  private completed = false;

  constructor(
    private readonly onStageChanged: (stage: number) => void,
    private readonly onCompleted: () => void,
  ) {}

  get stats(): StageStats {
    return calculateStageStats(this.currentStage);
  }

  get targetKills(): number {
    return getStageKillTarget(this.currentStage);
  }

  get remainingKills(): number {
    return Math.max(0, this.targetKills - this.defeatedKills);
  }

  get isComplete(): boolean {
    return this.completed;
  }

  update(delta: number): void {
    if (this.completed) return;
    this.elapsedInStageMs += Math.max(0, delta);
  }

  remainingSpawnCount(activeEnemyCount: number): number {
    return Math.max(0, this.targetKills - this.defeatedKills - Math.max(0, Math.floor(activeEnemyCount)));
  }

  recordKills(count = 1): void {
    if (this.completed || !Number.isFinite(count) || count <= 0) return;
    this.defeatedKills = Math.min(this.targetKills, this.defeatedKills + Math.floor(count));
    if (this.defeatedKills < this.targetKills) return;
    if (this.currentStage >= FINAL_STAGE) {
      this.completed = true;
      this.onCompleted();
      return;
    }
    this.currentStage += 1;
    this.defeatedKills = 0;
    this.elapsedInStageMs = 0;
    this.onStageChanged(this.currentStage);
  }
}
