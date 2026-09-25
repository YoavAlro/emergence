import * as THREE from 'three';
import { labFor } from '../config/labs';
import { drawCritter } from '../ui/creatures';
import { hexCss } from './labels';
import { Doodle, frames } from './sprites';

export interface CritterOpts {
  crown?: boolean;
  dizzy?: boolean;
  mouthOpen?: boolean;
}

/** The two boil frames for a lab's rival critter. */
export function critterLooks(org: string, o: CritterOpts = {}): THREE.Texture[] {
  const lab = labFor(org);
  return frames(`critter:${lab.id}:${o.crown ? 1 : 0}${o.dizzy ? 1 : 0}${o.mouthOpen ? 1 : 0}`, (ctx, frame) =>
    drawCritter(ctx, { color: hexCss(lab.color), emblem: lab.icon, frame, ...o }),
  );
}

/** A rival lab's model as a flat doodle sprite. */
export function makeCritter(org: string, radius: number, o: CritterOpts = {}): Doodle {
  return new Doodle(critterLooks(org, o), radius);
}

/** Flips a sprite to face its screen-space direction of travel. */
export function faceTravel(d: Doodle, velocity: THREE.Vector3, cameraRight: THREE.Vector3): void {
  const side = velocity.dot(cameraRight);
  if (Math.abs(side) > 0.5) d.flip = side < 0;
}
