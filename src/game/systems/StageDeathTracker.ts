import { STAGE_DEATH_RECOMMENDATION_THRESHOLD } from './UpgradeRecommendationSystem';

export class StageDeathTracker {
  private stage = 1;
  private deaths = 0;

  get currentStage(): number {
    return this.stage;
  }

  get deathCount(): number {
    return this.deaths;
  }

  get shouldRecommend(): boolean {
    return this.deaths >= STAGE_DEATH_RECOMMENDATION_THRESHOLD;
  }

  recordDeath(stage: number): number {
    if (stage !== this.stage) this.enterStage(stage);
    this.deaths += 1;
    return this.deaths;
  }

  enterStage(stage: number): void {
    this.stage = Math.max(1, Math.floor(stage));
    this.deaths = 0;
  }
}
