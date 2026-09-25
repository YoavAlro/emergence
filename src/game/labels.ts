import * as THREE from 'three';
import { INK } from '../ui/doodle';

export const hexCss = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** A sticker-style name tag: a wobbly pill in `color` with ink text. Keep text short. */
export function makeLabel(text: string, color = '#ffb3cc'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '700 44px "Baloo 2", "Comic Sans MS", system-ui, sans-serif';
  const w = Math.min(496, ctx.measureText(text).width + 48);
  const x = 256 - w / 2;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, 22, w, 84, 42);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText(text, 256, 66, w - 36);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
}
