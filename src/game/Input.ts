export type Action =
  | 'boost'
  | 'think'
  | 'grab'
  | 'fork'
  | 'target'
  | 'recall'
  | 'reset'
  | 'editor'
  | 'form'
  | 'bet'
  | 'pause';

/** Keyboard bindings. Touch buttons drive the same actions through `hold` and `tap`. */
export const KEY_BINDINGS: Record<Action, string[]> = {
  boost: ['ShiftLeft', 'ShiftRight'],
  think: ['Space'],
  grab: ['KeyE'],
  fork: ['KeyF'],
  target: ['KeyT'],
  recall: ['KeyR'],
  reset: ['KeyX'],
  editor: ['KeyC', 'Tab'],
  form: ['KeyQ'],
  bet: ['KeyB'],
  pause: ['Escape', 'KeyP'],
};

/** Keyboard + mouse on desktop, virtual joystick + drag-to-look + buttons on touch. */
export class Input {
  /** x = strafe (-1..1), y = forward (-1..1). */
  readonly move = { x: 0, y: 0 };

  private readonly keys = new Set<string>();
  private readonly held = new Set<Action>();
  private readonly taps = new Set<Action>();
  private lookDX = 0;
  private lookDY = 0;
  private lookPointer: { id: number; x: number; y: number } | null = null;
  private stick: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private static readonly STICK_RADIUS = 56;
  /** Set while a modal is open so keys don't leak into the game. */
  suspended = false;

  constructor(surface: HTMLElement, overlay: HTMLElement) {
    this.stickBase = document.createElement('div');
    this.stickBase.className = 'stick-base';
    this.stickKnob = document.createElement('div');
    this.stickKnob.className = 'stick-knob';
    this.stickBase.append(this.stickKnob);
    overlay.append(this.stickBase);

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const action = actionFor(e.code);
      if (action && !this.suspended) {
        if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
        if (!e.repeat) this.taps.add(action);
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.held.clear();
    });

    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
  }

  static isTouchDevice(): boolean {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches;
  }

  /** Touch button held state. */
  hold(action: Action, down: boolean): void {
    if (down) this.held.add(action);
    else this.held.delete(action);
    if (down) this.taps.add(action);
  }

  tap(action: Action): void {
    this.taps.add(action);
  }

  isHeld(action: Action): boolean {
    if (this.suspended) return false;
    return this.held.has(action) || KEY_BINDINGS[action].some((k) => this.keys.has(k));
  }

  /** True once per press. */
  consumeTap(action: Action): boolean {
    const had = this.taps.has(action);
    this.taps.delete(action);
    return had && !this.suspended;
  }

  clearTaps(): void {
    this.taps.clear();
  }

  /** Returns look movement since the last call, in pixels. */
  consumeLook(): { dx: number; dy: number } {
    const look = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return look;
  }

  update(): void {
    if (this.stick) {
      const r = Input.STICK_RADIUS;
      this.move.x = clamp((this.stick.x - this.stick.ox) / r);
      this.move.y = clamp(-(this.stick.y - this.stick.oy) / r);
      return;
    }
    if (this.suspended) {
      this.move.x = 0;
      this.move.y = 0;
      return;
    }
    const k = this.keys;
    this.move.x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.move.y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  }

  private onDown(e: PointerEvent): void {
    const isLeftHalf = e.clientX < window.innerWidth * 0.45;
    if (e.pointerType === 'touch' && isLeftHalf && !this.stick) {
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickBase.classList.add('visible');
      this.placeKnob();
    } else if (!this.lookPointer) {
      this.lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  private onMove(e: PointerEvent): void {
    if (this.stick?.id === e.pointerId) {
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
      this.placeKnob();
    } else if (this.lookPointer?.id === e.pointerId) {
      this.lookDX += e.clientX - this.lookPointer.x;
      this.lookDY += e.clientY - this.lookPointer.y;
      this.lookPointer.x = e.clientX;
      this.lookPointer.y = e.clientY;
    }
  }

  private onUp(e: PointerEvent): void {
    if (this.stick?.id === e.pointerId) {
      this.stick = null;
      this.move.x = 0;
      this.move.y = 0;
      this.stickBase.classList.remove('visible');
    } else if (this.lookPointer?.id === e.pointerId) {
      this.lookPointer = null;
    }
  }

  private placeKnob(): void {
    if (!this.stick) return;
    const r = Input.STICK_RADIUS;
    let dx = this.stick.x - this.stick.ox;
    let dy = this.stick.y - this.stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function actionFor(code: string): Action | undefined {
  return (Object.keys(KEY_BINDINGS) as Action[]).find((a) => KEY_BINDINGS[a].includes(code));
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}
