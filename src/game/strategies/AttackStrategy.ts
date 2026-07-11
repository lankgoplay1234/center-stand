import type { TargetCandidate } from '../systems/TargetingSystem';
import type { AttackMotionData, AttackType } from '../types/GameTypes';

export interface AttackSource {
  x: number;
  y: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  attackAreaRadius: number;
  totalTargetCount: number;
  projectileSpeed: number;
}

export interface AttackEffectPoint {
  x: number;
  y: number;
}

export interface CharacterMotionEffect {
  type: 'CHARACTER_MOTION';
  motion: AttackMotionData;
  from: AttackEffectPoint;
  targets: readonly AttackEffectPoint[];
  radius: number;
}

export type AttackEffect =
  | CharacterMotionEffect
  | { type: 'ARC_OVERCHARGE'; x: number; y: number; radius: number }
  | { type: 'AREA_MELEE'; x: number; y: number; radius: number }
  | { type: 'AREA_MAGIC'; x: number; y: number; radius: number }
  | { type: 'PIERCING'; from: AttackEffectPoint; to: AttackEffectPoint }
  | { type: 'CHAIN'; points: readonly AttackEffectPoint[] };

export interface AttackContext<T extends TargetCandidate> {
  attacker: AttackSource;
  candidates: readonly T[];
  fireProjectile: (target: T, damage: number, speed: number) => void;
  applyInstantDamage: (target: T, damage: number) => void;
  emitEffect: (effect: AttackEffect) => void;
}

export interface AttackStrategy<T extends TargetCandidate> {
  readonly type: AttackType;
  execute(context: AttackContext<T>): number;
}
