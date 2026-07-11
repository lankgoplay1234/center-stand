/// <reference types="vite/client" />

import type Phaser from 'phaser';

declare global {
  interface Window {
    __CENTER_STAND_GAME__?: Phaser.Game;
  }
}

export {};
