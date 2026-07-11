import type { AttackMotionData, AttackMotionStyle } from '../types/GameTypes';

export const ATTACK_MOTIONS: Readonly<Record<AttackMotionStyle, AttackMotionData>> = {
  ARC_SHOT: {
    style: 'ARC_SHOT',
    primaryColor: 0x35d9ff,
    accentColor: 0xf2fdff,
    durationMs: 120,
    pulseScale: 1.22,
  },
  BLADE_SWEEP: {
    style: 'BLADE_SWEEP',
    primaryColor: 0xffcc5c,
    accentColor: 0xffffff,
    durationMs: 170,
    pulseScale: 1.3,
  },
  BASTION_VOLLEY: {
    style: 'BASTION_VOLLEY',
    primaryColor: 0xff734f,
    accentColor: 0xffe0a8,
    durationMs: 145,
    pulseScale: 1.18,
  },
  RUNE_CAST: {
    style: 'RUNE_CAST',
    primaryColor: 0xa86cff,
    accentColor: 0xf0d7ff,
    durationMs: 210,
    pulseScale: 1.28,
  },
  NEEDLE_BURST: {
    style: 'NEEDLE_BURST',
    primaryColor: 0x56f7c1,
    accentColor: 0xe4fff6,
    durationMs: 105,
    pulseScale: 1.16,
  },
  STORM_SURGE: {
    style: 'STORM_SURGE',
    primaryColor: 0x727cff,
    accentColor: 0xf4f1ff,
    durationMs: 180,
    pulseScale: 1.26,
  },
};

export function validateAttackMotionData(motion: AttackMotionData): string[] {
  const errors: string[] = [];
  if (!ATTACK_MOTIONS[motion.style]) errors.push('attackMotion.style is invalid');
  if (!Number.isInteger(motion.primaryColor) || motion.primaryColor < 0) {
    errors.push('attackMotion.primaryColor must be a non-negative integer');
  }
  if (!Number.isInteger(motion.accentColor) || motion.accentColor < 0) {
    errors.push('attackMotion.accentColor must be a non-negative integer');
  }
  if (motion.durationMs <= 0) errors.push('attackMotion.durationMs must be positive');
  if (motion.pulseScale <= 1) errors.push('attackMotion.pulseScale must be greater than 1');
  return errors;
}
