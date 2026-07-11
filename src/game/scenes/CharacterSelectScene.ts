import Phaser from 'phaser';
import { GROWTH_PROFILE_LABELS } from '../data/BalanceData';
import { CHARACTERS } from '../data/CharacterData';
import { UPGRADE_DEFINITIONS } from '../data/UpgradeData';
import { getCharacterVisualAsset } from '../data/VisualAssetData';
import type { AttackType, CharacterData } from '../types/GameTypes';
import { formatCriticalChance } from '../data/CriticalHitData';

const ATTACK_LABELS: Readonly<Record<AttackType, string>> = {
  SINGLE_TARGET: '원거리 · 정밀 사격',
  MULTI_TARGET: '탱커 · 다중 포화',
  AREA_MELEE: '근접 · 범위 검격',
  AREA_MAGIC: '마법사 · 원형 폭발',
  PIERCING: '연사 · 관통 광선',
  CHAIN: '범위 · 연쇄 번개',
};

const ATTACK_COLORS: Readonly<Record<AttackType, number>> = {
  SINGLE_TARGET: 0x35d9ff,
  MULTI_TARGET: 0xffb84d,
  AREA_MELEE: 0x64f2a6,
  AREA_MAGIC: 0xb875ff,
  PIERCING: 0x58efff,
  CHAIN: 0x8f7cff,
};

export class CharacterSelectScene extends Phaser.Scene {
  private selectedCharacter!: CharacterData;
  private readonly cardBackgrounds = new Map<string, Phaser.GameObjects.Rectangle>();
  private selectedText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const firstCharacter = CHARACTERS[0];
    if (!firstCharacter) throw new Error('At least one character is required');
    this.selectedCharacter = firstCharacter;
    this.cardBackgrounds.clear();
    this.cameras.main.setBackgroundColor('#090d1a');
    this.add.image(360, 560, 'stage-theme-01').setDisplaySize(720, 1000).setAlpha(0.28);
    this.add.rectangle(360, 640, 720, 1280, 0x070b16, 0.63);
    this.add.circle(360, 310, 290, 0x12304b, 0.12);
    this.add.text(360, 66, 'CENTER STAND', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#e9fdff', stroke: '#163a5c', strokeThickness: 9,
    }).setOrigin(0.5);
    this.add.text(360, 125, '전투 스타일을 선택하세요', {
      fontFamily: 'Arial, sans-serif', fontSize: '21px', color: '#85a9c4',
    }).setOrigin(0.5);

    const columns = [190, 530];
    const rows = [265, 475, 685];
    CHARACTERS.forEach((character, index) => {
      const x = columns[index % 2]!;
      const y = rows[Math.floor(index / 2)]!;
      this.createCharacterCard(character, x, y);
    });

    this.selectedText = this.add.text(360, 820, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#bffaff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const startBg = this.add.rectangle(360, 900, 430, 88, 0x26b8c5).setStrokeStyle(4, 0xa6fbff)
      .setInteractive({ useHandCursor: true });
    const startText = this.add.text(360, 900, '전투 시작', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#07131d',
    }).setOrigin(0.5);
    const start = (): void => {
      startBg.disableInteractive();
      this.tweens.add({
        targets: [startBg, startText],
        scale: 0.94,
        duration: 90,
        yoyo: true,
        onComplete: () => this.scene.start('GameScene', { characterId: this.selectedCharacter.id }),
      });
    };
    startBg.on('pointerup', start);
    this.input.keyboard?.once('keydown-SPACE', start);
    this.add.text(360, 970, '캐릭터를 선택한 뒤 버튼 또는 SPACE를 누르세요', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#64748b',
    }).setOrigin(0.5);
    this.updateSelection();
  }

  private createCharacterCard(character: CharacterData, x: number, y: number): void {
    const color = ATTACK_COLORS[character.attackType];
    const background = this.add.rectangle(0, 0, 306, 184, 0x10192b, 0.97)
      .setStrokeStyle(2, 0x33445e, 0.8)
      .setInteractive({ useHandCursor: true });
    const portraitAura = this.add.circle(-108, -43, 45, color, 0.13).setStrokeStyle(2, color, 0.5);
    const portrait = this.add.image(-108, -43, getCharacterVisualAsset(character.id).textureKey)
      .setDisplaySize(92, 92);
    const name = this.add.text(-62, -72, character.name, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0, 0);
    const role = this.add.text(-62, -40, `${ATTACK_LABELS[character.attackType]} · ${GROWTH_PROFILE_LABELS[character.growthProfile]}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setOrigin(0, 0);
    const description = this.add.text(-132, 2, character.description, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#aabbd0', wordWrap: { width: 264 }, lineSpacing: 2,
    }).setOrigin(0, 0);
    const focus = this.add.text(-132, 41,
      `추천: ${UPGRADE_DEFINITIONS[character.upgradeFocus.primary].name} → ${UPGRADE_DEFINITIONS[character.upgradeFocus.secondary].name}`,
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#fff0a3', fontStyle: 'bold' },
    ).setOrigin(0, 0);
    const stats = this.add.text(-132, 57,
      `HP ${character.maxHealth}  ATK ${character.attackDamage}  SPD ${character.attackSpeed}\nRNG ${character.attackRange}  CRIT ${formatCriticalChance(character.baseCriticalChance)}`,
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#d6e5f2', lineSpacing: 2 },
    ).setOrigin(0, 0);
    const card = this.add.container(x, y, [background, portraitAura, portrait, name, role, description, focus, stats]);
    this.cardBackgrounds.set(character.id, background);
    background.on('pointerup', () => {
      this.selectedCharacter = character;
      this.updateSelection();
      this.tweens.killTweensOf(card);
      card.setScale(1);
      this.tweens.add({ targets: card, scale: 1.035, duration: 75, yoyo: true });
    });
  }

  private updateSelection(): void {
    for (const character of CHARACTERS) {
      const background = this.cardBackgrounds.get(character.id);
      if (!background) continue;
      const selected = character.id === this.selectedCharacter.id;
      background.setFillStyle(selected ? 0x173548 : 0x10192b, 0.97)
        .setStrokeStyle(selected ? 4 : 2, selected ? ATTACK_COLORS[character.attackType] : 0x33445e, selected ? 1 : 0.8);
    }
    this.selectedText.setText(
      `선택: ${this.selectedCharacter.name} · ${GROWTH_PROFILE_LABELS[this.selectedCharacter.growthProfile]}`,
    );
  }
}
