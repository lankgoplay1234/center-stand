export type GameSpeed = 1 | 2;

export function toggleGameSpeed(current: GameSpeed): GameSpeed {
  return current === 1 ? 2 : 1;
}

export function scaleGameDelta(delta: number, speed: GameSpeed, maxFrameDelta = 50): number {
  const safeDelta = Math.min(Math.max(0, delta), Math.max(0, maxFrameDelta));
  return safeDelta * speed;
}
