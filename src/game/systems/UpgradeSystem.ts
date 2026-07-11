import {
  UPGRADE_DEFINITIONS,
  calculateUpgradeCost,
  calculateUpgradeEffect,
  canUpgrade,
} from '../data/UpgradeData';
import { calculateAttackRangeAtLevel } from '../data/AttackRangeData';
import type { Player } from '../entities/Player';
import type { UpgradeId, UpgradeState } from '../types/GameTypes';

export class UpgradeSystem {
  private readonly states: Record<UpgradeId, UpgradeState> = {
    attackDamage: this.createState('attackDamage'),
    attackSpeed: this.createState('attackSpeed'),
    defense: this.createState('defense'),
    maxHealth: this.createState('maxHealth'),
    attackRange: this.createState('attackRange'),
  };

  constructor(private readonly player: Player) {}

  getState(id: UpgradeId): UpgradeState {
    return this.states[id];
  }

  getEfficiency(id: UpgradeId): number {
    return this.player.upgradeEfficiency[id];
  }

  getEffectLabel(id: UpgradeId): string {
    const state = this.states[id];
    const efficiency = this.getEfficiency(id);
    if (id === 'attackRange') {
      return `반경 ${Math.round(this.player.attackRange)} / 최대 ${Math.round(this.player.character.maxAttackRange)}`;
    }
    return state.definition.effectLabel(state.level, efficiency);
  }

  isMaxLevel(id: UpgradeId): boolean {
    const state = this.states[id];
    return !canUpgrade(state.definition, state.level);
  }

  get totalLevels(): number {
    return Object.values(this.states).reduce((sum, state) => sum + state.level, 0);
  }

  purchase(id: UpgradeId, gold: number): { success: boolean; gold: number } {
    const state = this.states[id];
    if (gold < state.currentCost || !canUpgrade(state.definition, state.level)) return { success: false, gold };
    const nextGold = gold - state.currentCost;
    const efficiency = this.getEfficiency(id);
    const currentEffect = calculateUpgradeEffect(state.definition, state.level, efficiency);
    state.level += 1;
    const effect = calculateUpgradeEffect(state.definition, state.level, efficiency) - currentEffect;
    state.currentCost = calculateUpgradeCost(state.definition, state.level);

    switch (id) {
      case 'attackDamage':
        this.player.attackDamage += effect;
        break;
      case 'attackSpeed':
        this.player.attackSpeed += effect;
        break;
      case 'defense':
        this.player.defense += effect;
        break;
      case 'maxHealth':
        this.player.maxHealth += effect;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + effect);
        break;
      case 'attackRange':
        this.player.attackRange = calculateAttackRangeAtLevel(
          this.player.character.attackRange,
          this.player.character.maxAttackRange,
          state.level,
        );
        if (this.player.character.specialAbility?.type === 'ARC_OVERCHARGE'
          || this.player.character.specialAbility?.type === 'BLADE_FURY') {
          this.player.specialAbilityLevel = state.level;
        }
        break;
    }
    this.player.applyUpgradeVisual(this.totalLevels);
    return { success: true, gold: nextGold };
  }

  private createState(id: UpgradeId): UpgradeState {
    const definition = UPGRADE_DEFINITIONS[id];
    return { definition, level: 0, currentCost: calculateUpgradeCost(definition, 0) };
  }
}
