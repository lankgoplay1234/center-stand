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

  show(x: number, y: number, amount: number, color = '#fff1b8', isCritical = false): void {
    const item = this.acquire();
    this.scene.tweens.killTweensOf(item);
    this.shownCount += 1;
    const horizontalKick = isCritical ? (Math.random() < 0.5 ? -18 : 18) : (Math.random() - 0.5) * 10;
    item.setText(isCritical ? `CRIT! ${Math.round(amount)}` : `${Math.round(amount)}`)
      .setFontSize(isCritical ? 30 : 22)
      .setStroke(isCritical ? '#7d1700' : '#38101c', isCritical ? 7 : 4)
      .setColor(isCritical ? '#ffe45e' : color)
      .setPosition(x, y).setAngle(isCritical ? (Math.random() - 0.5) * 12 : 0)
      .setAlpha(1).setScale(isCritical ? 0.45 : 0.62).setActive(true).setVisible(true);
    this.scene.tweens.add({
      targets: item,
      x: x + horizontalKick,
      y: y - (isCritical ? 78 : 54),
      alpha: 0,
      scale: isCritical ? 1.55 : 1.2,
      duration: isCritical ? 680 : 500,
      ease: isCritical ? 'Back.easeOut' : 'Cubic.easeOut',
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
