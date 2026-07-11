import { STAGE_DURATION_MS, calculateStageStats } from '../data/StageData';
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
    while (this.elapsedInStage >= STAGE_DURATION_MS) {
      this.elapsedInStage -= STAGE_DURATION_MS;
      if (this.currentStage >= FINAL_STAGE) {
        this.completed = true;
        this.onCompleted();
        return;
      }
      this.currentStage += 1;
      this.onStageChanged(this.currentStage);
    }
  }
}
