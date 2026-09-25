import * as THREE from 'three';
import type { ModelForm } from '../config/models';

/** The player's creature: a glowing cell whose neurons multiply as it evolves. */
export class Player {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  size = 1;
  private targetSize = 1;
  private readonly body = new THREE.Group();
  private readonly coreMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 1.3, roughness: 0.4 });
  private readonly membraneMat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.16,
    emissiveIntensity: 0.6,
    depthWrite: false,
  });
  private nodes: THREE.Mesh[] = [];
  private readonly nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);

  constructor(scene: THREE.Scene) {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), this.coreMat);
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), this.membraneMat);
    this.body.add(core, membrane);
    this.group.add(this.body);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  setForm(form: ModelForm, formIndex: number, instant = false): void {
    this.targetSize = form.size;
    if (instant) this.size = form.size;
    for (const mat of [this.coreMat, this.membraneMat]) {
      mat.color.setHex(form.color);
      mat.emissive.setHex(form.color);
    }
    for (const n of this.nodes) this.body.remove(n);
    // More neurons per version: a visible sign of growing capacity.
    this.nodes = Array.from({ length: 3 + formIndex * 4 }, () => {
      const node = new THREE.Mesh(this.nodeGeo, this.coreMat);
      node.userData.orbit = new THREE.Vector3().randomDirection();
      node.userData.speed = 0.6 + Math.random() * 1.2;
      this.body.add(node);
      return node;
    });
  }

  update(dt: number, t: number): void {
    this.size += (this.targetSize - this.size) * Math.min(1, dt * 1.5);
    const pulse = 1 + Math.sin(t * 3) * 0.03;
    this.body.scale.setScalar(this.size * pulse);
    this.position.addScaledVector(this.velocity, dt);
    this.nodes.forEach((node, i) => {
      const axis = node.userData.orbit as THREE.Vector3;
      const angle = t * (node.userData.speed as number) + i;
      node.position.set(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(0.72);
      node.position.applyAxisAngle(axis, i);
    });
  }
}
