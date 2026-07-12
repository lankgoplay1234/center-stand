import Phaser from 'phaser';
import { GROWTH_PROFILE_LABELS } from '../data/BalanceData';
import { CHARACTERS, getCharacterById } from '../data/CharacterData';
import { getCharacterVisualAsset } from '../data/VisualAssetData';
import type { AttackType, CharacterData } from '../types/GameTypes';
import { formatCriticalChance } from '../data/CriticalHitData';
import { LeaderboardService, LeaderboardServiceError } from '../services/LeaderboardService';
import { formatLeaderboardEntry } from '../services/LeaderboardPresentation';
import { formatSingleDecimalStat, formatWholeStat } from '../data/StatPrecisionData';

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
  private leaderboard!: LeaderboardService;
  private leaderboardEntries!: Phaser.GameObjects.Text;
  private leaderboardStatus!: Phaser.GameObjects.Text;

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
    this.createLeaderboardPanel();
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
    const stats = this.add.text(-132, 45,
      `HP ${formatWholeStat(character.maxHealth)}  ATK ${formatWholeStat(character.attackDamage)}  SPD ${formatSingleDecimalStat(character.attackSpeed)}\nRNG ${formatWholeStat(character.attackRange)}  CRIT ${formatCriticalChance(character.baseCriticalChance)}`,
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#d6e5f2', lineSpacing: 2 },
    ).setOrigin(0, 0);
    const card = this.add.container(x, y, [background, portraitAura, portrait, name, role, description, stats]);
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

  private createLeaderboardPanel(): void {
    this.leaderboard = new LeaderboardService(import.meta.env.VITE_LEADERBOARD_API_URL ?? '');
    this.add.rectangle(360, 1135, 680, 250, 0x080b16, 0.9)
      .setStrokeStyle(2, 0x33446c, 0.9);
    this.add.text(360, 1020, '완주 랭킹 TOP 10 · 사망 횟수 우선', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '19px', color: '#fff08a',
    }).setOrigin(0.5);

    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = '새로고침';
    refresh.dataset.testid = 'character-select-leaderboard-refresh';
    refresh.style.cssText = 'width:92px;height:34px;border:2px solid #49708b;border-radius:7px;background:#17263a;color:#d9f5ff;font:800 13px Arial;cursor:pointer;';
    this.add.dom(625, 1020, refresh).setDepth(30);
    refresh.addEventListener('click', () => void this.reloadLeaderboard(refresh));

    this.leaderboardEntries = this.add.text(360, 1050, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#c5d7e7', align: 'left', lineSpacing: 2,
    }).setOrigin(0.5, 0);
    this.leaderboardStatus = this.add.text(360, 1250,
      this.leaderboard.isConfigured ? '전체 사용자 완주 기록' : '이 브라우저의 로컬 완주 기록', {
        fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#7897aa',
      }).setOrigin(0.5);
    void this.refreshLeaderboard();
  }

  private async reloadLeaderboard(refresh: HTMLButtonElement): Promise<void> {
    refresh.disabled = true;
    this.leaderboardStatus.setText('최신 완주 기록을 불러오는 중...');
    const loaded = await this.refreshLeaderboard();
    if (loaded) {
      this.leaderboardStatus.setText(
        this.leaderboard.isConfigured ? '전체 사용자 최신 기록' : '이 브라우저의 최신 로컬 기록',
      );
    }
    refresh.disabled = false;
  }

  private async refreshLeaderboard(): Promise<boolean> {
    try {
      const entries = await this.leaderboard.list();
      this.leaderboardEntries.setText(entries.length === 0 ? '아직 등록된 완주 기록이 없습니다' : entries.map((entry) =>
        formatLeaderboardEntry(entry, getCharacterById(entry.characterId).name)).join('\n'));
      return true;
    } catch (error) {
      const message = error instanceof LeaderboardServiceError ? error.message : '랭킹을 불러오지 못했습니다';
      this.leaderboardEntries.setText(`${message} · 캐릭터 선택에는 영향이 없습니다`);
      return false;
    }
  }
}
