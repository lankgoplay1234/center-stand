export interface KnockbackPoint {
  x: number;
  y: number;
}

export interface KnockbackBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function calculateKnockbackPosition(
  target: KnockbackPoint,
  origin: KnockbackPoint,
  force: number,
  bounds?: KnockbackBounds,
): KnockbackPoint {
  const safeForce = Math.max(0, force);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (safeForce === 0 || distance === 0) return { x: target.x, y: target.y };

  const nextX = target.x + dx / distance * safeForce;
  const nextY = target.y + dy / distance * safeForce;
  if (!bounds) return { x: nextX, y: nextY };
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, nextX)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, nextY)),
  };
}
