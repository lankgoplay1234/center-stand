import { describe, expect, it, vi } from 'vitest';
import { CHARACTERS } from '../data/CharacterData';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from '../managers/EnemyManager';
import type { ProjectileManager } from '../managers/ProjectileManager';
import type { AttackEffect } from '../strategies/AttackStrategy';
import { CombatSystem } from './CombatSystem';

function createEnemy(poolId: number, x: number, y: number): Enemy {
  return { poolId, x, y, isAlive: true } as Enemy;
}

describe('CombatSystem character attack motions', () => {
  it('emits the selected character motion once after every successful attack', () => {
    for (const character of CHARACTERS) {
      const player = {
        character,
        x: 0,
        y: 0,
        attackDamage: character.attackDamage,
        attackSpeed: character.attackSpeed,
        attackRange: character.attackRange,
        attackArcDegrees: character.attackArcDegrees,
        attackAreaRadius: character.attackAreaRadius,
        totalTargetCount: character.baseTargetCount,
        projectileSpeed: character.projectileSpeed,
        specialAbilityLevel: 0,
        upgradeEfficiency: character.upgradeEfficiency,
        playAttackMotion: vi.fn(),
      } as unknown as Player;
      const enemies = {
        activeEnemies: [createEnemy(1, 40, 0), createEnemy(2, 70, 0), createEnemy(3, 95, 0)],
      } as EnemyManager;
      const projectiles = { fire: vi.fn() } as unknown as ProjectileManager;
      const effects: AttackEffect[] = [];
      const playAttackSound = vi.fn();
      const combat = new CombatSystem(player, enemies, projectiles, {
        applyInstantDamage: vi.fn(),
        emitEffect: (effect) => effects.push(effect),
        playAttackSound,
      });

      combat.update(0);

      const motion = effects.find((effect) => effect.type === 'CHARACTER_MOTION');
      expect(motion, character.name).toEqual(expect.objectContaining({
        type: 'CHARACTER_MOTION',
        motion: character.attackMotion,
      }));
      expect(effects.filter((effect) => effect.type === 'CHARACTER_MOTION'), character.name).toHaveLength(1);
      expect(player.playAttackMotion, character.name).toHaveBeenCalledOnce();
      expect(playAttackSound, character.name).toHaveBeenCalledWith(character.attackMotion.style);
    }
  });

  it('does not animate or emit a motion when there is no valid target', () => {
    const character = CHARACTERS[0]!;
    const player = {
      character,
      x: 0,
      y: 0,
      attackDamage: character.attackDamage,
      attackSpeed: character.attackSpeed,
      attackRange: character.attackRange,
      attackArcDegrees: character.attackArcDegrees,
      attackAreaRadius: character.attackAreaRadius,
      totalTargetCount: character.baseTargetCount,
      projectileSpeed: character.projectileSpeed,
      specialAbilityLevel: 0,
      upgradeEfficiency: character.upgradeEfficiency,
      playAttackMotion: vi.fn(),
    } as unknown as Player;
    const effects: AttackEffect[] = [];
    const playAttackSound = vi.fn();
    const combat = new CombatSystem(
      player,
      { activeEnemies: [] } as unknown as EnemyManager,
      { fire: vi.fn() } as unknown as ProjectileManager,
      { applyInstantDamage: vi.fn(), emitEffect: (effect) => effects.push(effect), playAttackSound },
    );

    combat.update(0);

    expect(effects).toEqual([]);
    expect(player.playAttackMotion).not.toHaveBeenCalled();
    expect(playAttackSound).not.toHaveBeenCalled();
  });
});
