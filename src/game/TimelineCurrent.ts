import * as THREE from 'three';

export type CurrentMood = 'normal' | 'surge' | 'red' | 'gold';

const MOOD_COLORS: Record<CurrentMood, number> = {
  normal: 0x5fb8ff,
  surge: 0x9ff0ff,
  red: 0xff3355,
  gold: 0xffd84d,
};

const SAMPLES = 400;

/**
 * The Timeline Current (X / Twitter): a fast river of posts looping through
 * the ocean. Riding it pushes you along and multiplies user gain.
 */
export class TimelineCurrent {
  readonly group = new THREE.Group();
  readonly radius = 7;
  mood: CurrentMood = 'normal';
  private readonly curve: THREE.CatmullRomCurve3;
  private readonly samples: THREE.Vector3[] = [];
  private readonly tangents: THREE.Vector3[] = [];
  private readonly tubeMat: THREE.ShaderMaterial;
  private readonly posts: THREE.InstancedMesh;
  private readonly postU: Float32Array;
  private readonly postOffset: THREE.Vector3[];
  private readonly dummy = new THREE.Object3D();
  private readonly frame = { normal: new THREE.Vector3(), binormal: new THREE.Vector3() };
  private readonly color = new THREE.Color();
  private flow = 0;

  constructor(scene: THREE.Scene, worldRadius: number, postCount: number) {
    const pts: THREE.Vector3[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = worldRadius * (0.55 + 0.18 * Math.sin(a * 3));
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 2) * worldRadius * 0.28, Math.sin(a) * r));
    }
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    for (let i = 0; i < SAMPLES; i++) {
      const u = i / SAMPLES;
      this.samples.push(this.curve.getPointAt(u));
      this.tangents.push(this.curve.getTangentAt(u));
    }

    this.tubeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(MOOD_COLORS.normal) }, uFlow: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uFlow;
        varying vec2 vUv;
        void main() {
          float stripes = smoothstep(0.55, 1.0, sin((vUv.x * 160.0 - uTime * 6.0 * uFlow) + vUv.y * 6.2831));
          float edge = pow(abs(vUv.y - 0.5) * 2.0, 3.0);
          float a = 0.025 + stripes * 0.07 + edge * 0.03;
          gl_FragColor = vec4(uColor * (0.35 + stripes * 0.5), a);
        }`,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(this.curve, 240, this.radius, 10, true), this.tubeMat);

    this.posts = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.1, 0.7),
      new THREE.MeshBasicMaterial({ map: postTexture(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      postCount,
    );
    this.posts.frustumCulled = false;
    this.postU = Float32Array.from({ length: postCount }, () => Math.random());
    this.postOffset = Array.from({ length: postCount }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.radius * 0.8;
      return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.random() * Math.PI);
    });

    this.group.add(tube, this.posts);
    this.group.visible = false;
    scene.add(this.group);
  }

  get enabled(): boolean {
    return this.group.visible;
  }

  set enabled(v: boolean) {
    this.group.visible = v;
  }

  /** Flow speed in world units per second. */
  get speed(): number {
    return this.mood === 'surge' ? 30 : this.mood === 'gold' ? 24 : 18;
  }

  update(dt: number, t: number): void {
    if (!this.enabled) return;
    this.flow = this.mood === 'surge' ? 2 : this.mood === 'normal' ? 1 : 1.4;
    this.tubeMat.uniforms.uTime.value = t;
    this.tubeMat.uniforms.uFlow.value = this.flow;
    this.color.setHex(MOOD_COLORS[this.mood]);
    (this.tubeMat.uniforms.uColor.value as THREE.Color).lerp(this.color, Math.min(1, dt * 3));
    (this.posts.material as THREE.MeshBasicMaterial).color.copy(this.tubeMat.uniforms.uColor.value as THREE.Color);

    const length = this.curve.getLength();
    const du = (this.speed * dt) / length;
    for (let i = 0; i < this.postU.length; i++) {
      this.postU[i] = (this.postU[i] + du) % 1;
      const off = this.postOffset[i];
      this.pointAt(this.postU[i], off.x, off.y, this.dummy.position);
      this.dummy.rotation.set(0, off.z + t * 0.6, 0);
      this.dummy.updateMatrix();
      this.posts.setMatrixAt(i, this.dummy.matrix);
    }
    this.posts.instanceMatrix.needsUpdate = true;
  }

  /** If `p` is inside the Current, returns the flow direction there. */
  sample(p: THREE.Vector3): { inside: boolean; tangent: THREE.Vector3; u: number } {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const d = this.samples[i].distanceToSquared(p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return { inside: this.enabled && bestD < this.radius * this.radius, tangent: this.tangents[best], u: best / SAMPLES };
  }

  /** A point inside the tube at `u` (0..1), offset across it by (a, b). */
  pointAt(u: number, a = 0, b = 0, out = new THREE.Vector3()): THREE.Vector3 {
    const i = Math.floor(((u % 1) + 1) % 1 * SAMPLES) % SAMPLES;
    const tan = this.tangents[i];
    this.frame.normal.set(0, 1, 0).cross(tan).normalize();
    this.frame.binormal.crossVectors(tan, this.frame.normal);
    return out.copy(this.samples[i]).addScaledVector(this.frame.normal, a).addScaledVector(this.frame.binormal, b);
  }

  randomPoint(out = new THREE.Vector3()): THREE.Vector3 {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * this.radius * 0.6;
    return this.pointAt(Math.random(), Math.cos(a) * r, Math.sin(a) * r, out);
  }
}

/** A tiny "post" card: avatar dot and text lines. No logos. */
function postTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 40;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(1, 1, 62, 38, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,30,60,0.8)';
  ctx.beginPath();
  ctx.arc(12, 12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(22, 8, 30, 4);
  ctx.fillRect(8, 22, 48, 3);
  ctx.fillRect(8, 29, 36, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
