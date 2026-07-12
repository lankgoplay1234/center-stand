export const REVIVE_ENEMY_SEPARATION_RADIUS = 280;

export interface ReviveSeparationEnemy {
  readonly poolId: number;
  x: number;
  y: number;
  contactRange: number;
  isAlive: boolean;
}

export interface ReviveSeparationBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function separateEnemiesForRevive(
  enemies: readonly ReviveSeparationEnemy[],
  playerX: number,
  playerY: number,
  bounds: ReviveSeparationBounds,
  radius = REVIVE_ENEMY_SEPARATION_RADIUS,
): number {
  const overlapping = enemies.filter((enemy) => {
    if (!enemy.isAlive) return false;
    const dx = enemy.x - playerX;
    const dy = enemy.y - playerY;
    const contactRange = Math.max(0, enemy.contactRange);
    return dx * dx + dy * dy <= contactRange * contactRange;
  }).sort((left, right) => {
    const leftAngle = Math.atan2(left.y - playerY, left.x - playerX);
    const rightAngle = Math.atan2(right.y - playerY, right.x - playerX);
    return leftAngle - rightAngle || left.poolId - right.poolId;
  });
  if (overlapping.length === 0) return 0;

  const firstDirectional = overlapping.find((enemy) => enemy.x !== playerX || enemy.y !== playerY);
  const startAngle = firstDirectional
    ? Math.atan2(firstDirectional.y - playerY, firstDirectional.x - playerX)
    : -Math.PI / 2;
  const safeRadius = Math.max(0, radius);
  for (let index = 0; index < overlapping.length; index += 1) {
    const enemy = overlapping[index]!;
    const angle = startAngle + index / overlapping.length * Math.PI * 2;
    const targetRadius = Math.max(safeRadius, enemy.contactRange + 1);
    const position = findBoundedRingPosition(playerX, playerY, angle, targetRadius, bounds);
    enemy.x = position.x;
    enemy.y = position.y;
  }
  return overlapping.length;
}

function findBoundedRingPosition(
  originX: number,
  originY: number,
  preferredAngle: number,
  radius: number,
  bounds: ReviveSeparationBounds,
): { x: number; y: number } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let best = { x: originX, y: originY, distanceSquared: -1 };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const angle = preferredAngle + attempt * goldenAngle;
    const x = clamp(originX + Math.cos(angle) * radius, bounds.minX, bounds.maxX);
    const y = clamp(originY + Math.sin(angle) * radius, bounds.minY, bounds.maxY);
    const dx = x - originX;
    const dy = y - originY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > best.distanceSquared) best = { x, y, distanceSquared };
    if (distanceSquared >= radius * radius - Number.EPSILON) break;
  }
  return { x: best.x, y: best.y };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
