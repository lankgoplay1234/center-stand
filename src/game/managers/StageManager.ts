import { calculateStageStats, getStageDurationMs } from '../data/StageData';
import type { StageStats } from '../types/GameTypes';

export const FINAL_STAGE = 100;

export class StageManager {
  currentStage = 1;
  private elapsedInStage = 0;
  private completed = false;

  constructor(
    private readonly onStageChanged: (stage: number) => void,
    private readonly onCompleted: () => void,
  ) {}

  get stats(): StageStats {
    return calculateStageStats(this.currentStage);
  }

  get isComplete(): boolean {
    return this.completed;
  }

  update(delta: number): void {
    if (this.completed) return;
    this.elapsedInStage += delta;
    let currentDuration = getStageDurationMs(this.currentStage);
    while (this.elapsedInStage >= currentDuration) {
      this.elapsedInStage -= currentDuration;
      if (this.currentStage >= FINAL_STAGE) {
        this.completed = true;
        this.onCompleted();
        return;
      }
      this.currentStage += 1;
      this.onStageChanged(this.currentStage);
      currentDuration = getStageDurationMs(this.currentStage);
    }
  }
}
