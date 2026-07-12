import {
  UPGRADE_DEFINITIONS,
  calculateUpgradeCost,
  calculateUpgradedStat,
  canUpgrade,
} from '../data/UpgradeData';
import { calculateAttackRangeAtLevel } from '../data/AttackRangeData';
import type { Player } from '../entities/Player';
import type { UpgradeId, UpgradeState } from '../types/GameTypes';
import type { UpgradeAllocation } from '../data/RunBalanceSimulation';
import { calculatePlayerCriticalChance, formatCriticalChance } from '../data/CriticalHitData';

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
      return `범위 ${Math.round(this.player.attackRange)}/${Math.round(this.player.character.maxAttackRange)} · 치명타 ${formatCriticalChance(calculatePlayerCriticalChance(this.player.character.baseCriticalChance, state.level))}`;
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

  getLevels(): UpgradeAllocation {
    return {
      attackDamage: this.states.attackDamage.level,
      attackSpeed: this.states.attackSpeed.level,
      defense: this.states.defense.level,
      maxHealth: this.states.maxHealth.level,
      attackRange: this.states.attackRange.level,
    };
  }

  purchase(id: UpgradeId, gold: number): { success: boolean; gold: number } {
    const state = this.states[id];
    if (gold < state.currentCost || !canUpgrade(state.definition, state.level)) return { success: false, gold };
    const nextGold = gold - state.currentCost;
    const efficiency = this.getEfficiency(id);
    state.level += 1;
    state.currentCost = calculateUpgradeCost(state.definition, state.level);

    switch (id) {
      case 'attackDamage':
        this.player.attackDamage = calculateUpgradedStat(
          this.player.character.attackDamage,
          state.definition,
          state.level,
          efficiency,
        );
        break;
      case 'attackSpeed':
        this.player.attackSpeed = calculateUpgradedStat(
          this.player.character.attackSpeed,
          state.definition,
          state.level,
          efficiency,
        );
        break;
      case 'defense':
        this.player.defense = calculateUpgradedStat(
          this.player.character.defense,
          state.definition,
          state.level,
          efficiency,
        );
        break;
      case 'maxHealth': {
        const previousMaxHealth = this.player.maxHealth;
        this.player.maxHealth = calculateUpgradedStat(
          this.player.character.maxHealth,
          state.definition,
          state.level,
          efficiency,
        );
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + this.player.maxHealth - previousMaxHealth,
        );
        break;
      }
      case 'attackRange':
        this.player.attackRange = calculateAttackRangeAtLevel(
          this.player.character.attackRange,
          this.player.character.maxAttackRange,
          state.level,
          efficiency,
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
