import * as THREE from 'three';
import { labFor, type EmblemIcon } from '../config/labs';
import { emblemCanvas } from '../ui/doodle';
import { hexCss } from './labels';
import { Eyes, outline, toonMat } from './toon';

/** Emblem sprites share one material per lab; `boilEmblems` flips their two hand-drawn frames. */
const emblemMats = new Map<string, { mat: THREE.SpriteMaterial; frames: THREE.CanvasTexture[] }>();

export function emblemMaterial(icon: EmblemIcon, color: number): THREE.SpriteMaterial {
  const key = `${icon}:${color}`;
  let entry = emblemMats.get(key);
  if (!entry) {
    const frames = [0, 1].map((f) => {
      const tex = new THREE.CanvasTexture(emblemCanvas(icon, hexCss(color), 128, f));
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
    entry = { frames, mat: new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }) };
    emblemMats.set(key, entry);
  }
  return entry.mat;
}

/** Swaps every emblem to its other frame a few times a second: the "line boil" of hand animation. */
export function boilEmblems(t: number, reducedMotion = false): void {
  const f = reducedMotion ? 0 : Math.floor(t * 5) % 2;
  for (const e of emblemMats.values()) if (e.mat.map !== e.frames[f]) e.mat.map = e.frames[f];
}

export interface Critter {
  group: THREE.Group;
  body: THREE.Mesh;
  eyes: Eyes;
  emblem: THREE.Sprite;
  mat: THREE.MeshToonMaterial;
  baseColor: number;
}

/**
 * A cartoon rival: a round toon body in the lab's color, angry eyes, a little
 * snout of spikes, and the lab's original emblem stuck on like a badge.
 */
export function makeCritter(org: string, size: number, spikes = 6): Critter {
  const lab = labFor(org);
  const group = new THREE.Group();
  const mat = toonMat(lab.color, 0.22);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
  body.scale.setScalar(size);
  outline(body, 0.07);
  group.add(body);
  // Spiky "fins" around the back so rivals read as predators.
  const spikeGeo = new THREE.ConeGeometry(0.28, 0.7, 5);
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const spike = new THREE.Mesh(spikeGeo, mat);
    spike.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.62);
    spike.lookAt(spike.position.clone().multiplyScalar(3));
    spike.rotateX(Math.PI / 2);
    outline(spike, 0.1);
    body.add(spike);
  }
  const eyes = new Eyes(0.24, 0.3, lab.color, true);
  // Faces +z, so `body.lookAt(target)` points the eyes at it.
  eyes.group.position.set(0, 0.25, 0.82);
  body.add(eyes.group);
  const emblem = new THREE.Sprite(emblemMaterial(lab.icon, lab.color));
  emblem.scale.setScalar(size * 1.1);
  emblem.position.set(0, size * 1.25, 0);
  group.add(emblem);
  return { group, body, eyes, emblem, mat, baseColor: lab.color };
}
