export const STAT_DECIMAL_PLACES = 3;

const STAT_PRECISION_SCALE = 10 ** STAT_DECIMAL_PLACES;

export function roundStat(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * STAT_PRECISION_SCALE) / STAT_PRECISION_SCALE;
}

export function formatWholeStat(value: number): string {
  return Math.round(roundStat(value)).toString();
}

export function formatSingleDecimalStat(value: number): string {
  const rounded = Math.round((roundStat(value) + Number.EPSILON) * 10) / 10;
  return rounded.toFixed(1);
}
