import type { TargetCandidate } from '../systems/TargetingSystem';
import type { AttackType } from '../types/GameTypes';
import { AreaMeleeStrategy } from './AreaMeleeStrategy';
import { AreaMagicStrategy } from './AreaMagicStrategy';
import type { AttackStrategy } from './AttackStrategy';
import { ChainStrategy } from './ChainStrategy';
import { MultiTargetStrategy } from './MultiTargetStrategy';
import { PiercingStrategy } from './PiercingStrategy';
import { SingleTargetStrategy } from './SingleTargetStrategy';

export function createAttackStrategy<T extends TargetCandidate>(attackType: AttackType): AttackStrategy<T> {
  switch (attackType) {
    case 'SINGLE_TARGET':
      return new SingleTargetStrategy<T>();
    case 'MULTI_TARGET':
      return new MultiTargetStrategy<T>();
    case 'AREA_MELEE':
      return new AreaMeleeStrategy<T>();
    case 'AREA_MAGIC':
      return new AreaMagicStrategy<T>();
    case 'PIERCING':
      return new PiercingStrategy<T>();
    case 'CHAIN':
      return new ChainStrategy<T>();
  }
}
