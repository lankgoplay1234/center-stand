const BEST_TIME_KEY = 'center-stand.best-survival-seconds';

export class SaveManager {
  static loadBestSeconds(): number {
    try {
      const value = Number.parseFloat(localStorage.getItem(BEST_TIME_KEY) ?? '0');
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  static saveBestSeconds(seconds: number): number {
    const best = Math.max(this.loadBestSeconds(), seconds);
    try {
      localStorage.setItem(BEST_TIME_KEY, best.toFixed(2));
    } catch {
      // 저장소가 차단된 환경에서도 게임은 계속 진행합니다.
    }
    return best;
  }
}
