import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import './style.css';

export const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) window.__CENTER_STAND_GAME__ = game;
