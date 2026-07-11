import type Phaser from 'phaser';

export class DamageTextPool {
  private readonly items: Phaser.GameObjects.Text[] = [];
  private reuseIndex = 0;
  private shownCount = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    initialSize = 48,
    private readonly maxSize = 120,
  ) {
    const safeInitialSize = Math.min(Math.max(1, initialSize), maxSize);
    for (let i = 0; i < safeInitialSize; i += 1) this.items.push(this.createItem());
  }

  show(x: number, y: number, amount: number, color = '#ffffff'): void {
    const item = this.acquire();
    this.scene.tweens.killTweensOf(item);
    this.shownCount += 1;
    item.setText(`${Math.round(amount)}`).setColor(color).setPosition(x, y).setAlpha(1).setScale(1).setActive(true).setVisible(true);
    this.scene.tweens.add({
      targets: item,
      y: y - 50,
      alpha: 0,
      scale: 1.18,
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => item.setActive(false).setVisible(false),
    });
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) if (item.active) count += 1;
    return count;
  }

  get size(): number {
    return this.items.length;
  }

  get totalShown(): number {
    return this.shownCount;
  }

  private acquire(): Phaser.GameObjects.Text {
    const inactive = this.items.find((text) => !text.active);
    if (inactive) return inactive;
    if (this.items.length < this.maxSize) return this.createAndStore();
    const reused = this.items[this.reuseIndex]!;
    this.reuseIndex = (this.reuseIndex + 1) % this.items.length;
    return reused;
  }

  private createAndStore(): Phaser.GameObjects.Text {
    const item = this.createItem();
    this.items.push(item);
    return item;
  }

  private createItem(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '21px', color: '#ffffff', stroke: '#38101c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setActive(false).setVisible(false);
  }
}
