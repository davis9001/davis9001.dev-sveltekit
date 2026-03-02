/**
 * Crow Animation Logic
 *
 * Pure functions and state machine for the animated crow
 * that flies between elements on the home page.
 */

/** A landing target the crow can fly to */
export interface CrowTarget {
  id: string;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
  /** CSS z-index when the crow is perched on this target */
  zIndex?: number;
  /** CSS selector for the DOM element this target is anchored to.
   *  When set, the crow re-queries this element's position each frame
   *  so it follows the element on scroll. */
  anchorSelector?: string;
  /** Where on the anchored element to land (0–1 fractions).
   *  Defaults to { x: 0.5, y: 0 } (top-center). */
  anchorAlign?: { x: number; y: number; };
}

/** Crow behavioral states */
export type CrowState = 'perched' | 'taking-off' | 'flying' | 'landing';

/** Position + transform data for rendering */
export interface CrowPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX: boolean;
}

/**
 * Pick a random target that isn't the current one.
 * If only one target exists, returns it regardless.
 */
export function pickNextTarget(currentTargetId: string | null, targets: CrowTarget[]): CrowTarget {
  if (targets.length <= 1) {
    return targets[0];
  }
  const candidates = targets.filter((t) => t.id !== currentTargetId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Compute the quadratic Bézier control point for a flight arc.
 * The crow always arcs upward (lower y value = higher on screen).
 */
export function computeArcControlPoint(
  from: { x: number; y: number; },
  to: { x: number; y: number; }
): { x: number; y: number; } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Arc height proportional to distance, minimum 60px
  const arcHeight = Math.max(60, distance * 0.35);
  return { x: midX, y: midY - arcHeight };
}

/**
 * Compute the crow's position along a quadratic Bézier flight path.
 * t is clamped to [0, 1].
 */
export function computeFlightPosition(
  from: { x: number; y: number; scale: number; },
  to: CrowTarget,
  t: number
): CrowPosition {
  const tc = Math.max(0, Math.min(1, t));

  const cp = computeArcControlPoint(from, to);

  // Quadratic Bézier: B(t) = (1-t)²·P0 + 2(1-t)t·CP + t²·P1
  const oneMinusT = 1 - tc;
  const x = oneMinusT * oneMinusT * from.x + 2 * oneMinusT * tc * cp.x + tc * tc * to.x;
  const y = oneMinusT * oneMinusT * from.y + 2 * oneMinusT * tc * cp.y + tc * tc * to.y;

  // Interpolate scale linearly
  const scale = from.scale + (to.scale - from.scale) * tc;

  // Compute tangent for rotation (derivative of Bézier)
  const tangentX = 2 * oneMinusT * (cp.x - from.x) + 2 * tc * (to.x - cp.x);
  const tangentY = 2 * oneMinusT * (cp.y - from.y) + 2 * tc * (to.y - cp.y);
  const rotation = Math.atan2(tangentY, tangentX) * (180 / Math.PI);

  // Flip horizontally when flying left
  const flipX = to.x < from.x;

  return { x, y, scale, rotation, flipX };
}

/**
 * Get the wing flap angle in degrees based on state and elapsed time.
 * Returns 0 for perched, oscillating for flying/takeoff/landing.
 */
export function getWingFlapAngle(state: CrowState, timeMs: number): number {
  switch (state) {
    case 'perched':
      return 0;
    case 'flying': {
      // Full sinusoidal flap cycle ~200ms, amplitude ±40°
      const flapFreq = 200;
      return Math.sin((timeMs / flapFreq) * Math.PI * 2) * 40;
    }
    case 'taking-off': {
      // Fast flaps with strong upstroke
      const flapFreq = 150;
      return Math.sin((timeMs / flapFreq) * Math.PI * 2) * 35;
    }
    case 'landing': {
      // Slow, wide wing spread
      const flapFreq = 400;
      return Math.sin((timeMs / flapFreq) * Math.PI * 2) * 25;
    }
    default:
      return 0;
  }
}

/** Cubic ease-in-out for smooth flight animation */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Check if the mouse cursor is too close to the crow.
 * Returns true when the distance is strictly less than scareRadius.
 */
export function isMouseTooClose(
  crowPos: { x: number; y: number; },
  mousePos: { x: number; y: number; },
  scareRadius: number
): boolean {
  const dx = mousePos.x - crowPos.x;
  const dy = mousePos.y - crowPos.y;
  return Math.sqrt(dx * dx + dy * dy) < scareRadius;
}

/** Idle sitting animation offsets — super subtle micro-movements */
export interface IdleAnimation {
  headTilt: number;
  bodyShiftX: number;
  bodyShiftY: number;
  tailWag: number;
  lookDirection: number;
}

/**
 * Compute subtle idle animation values for a perched crow.
 * Uses layered sine waves at different frequencies for organic feel.
 */
export function getIdleAnimation(timeMs: number): IdleAnimation {
  // Very slow head tilt (period ~4s), amplitude ±5°
  const headTilt = Math.sin(timeMs / 4000 * Math.PI * 2) * 3
    + Math.sin(timeMs / 7000 * Math.PI * 2) * 2;

  // Tiny body sway (period ~6s), amplitude ±1.5px
  const bodyShiftX = Math.sin(timeMs / 6000 * Math.PI * 2) * 1.0
    + Math.sin(timeMs / 9500 * Math.PI * 2) * 0.5;

  // Very subtle breathing-like up/down (period ~3s), amplitude ±1px
  const bodyShiftY = Math.sin(timeMs / 3000 * Math.PI * 2) * 0.8
    + Math.sin(timeMs / 5000 * Math.PI * 2) * 0.4;

  // Tail feather micro-wag (period ~5s), amplitude ±3°
  const tailWag = Math.sin(timeMs / 5000 * Math.PI * 2) * 2
    + Math.sin(timeMs / 8000 * Math.PI * 2) * 1;

  // Eye look direction (period ~8s), amplitude ±2 (pixel offset)
  const lookDirection = Math.sin(timeMs / 8000 * Math.PI * 2) * 1.5
    + Math.sin(timeMs / 12000 * Math.PI * 2) * 0.5;

  return { headTilt, bodyShiftX, bodyShiftY, tailWag, lookDirection };
}

/** Items the crow can carry in its beak */
const CARRIED_ITEMS = ['letter', 'flower', 'key', 'coin', 'twig'] as const;
export type CarriedItem = (typeof CARRIED_ITEMS)[number];

/**
 * State machine managing the crow's behavior.
 */
export class CrowStateMachine {
  private state: CrowState = 'perched';
  private targets: CrowTarget[];
  private currentTarget: CrowTarget;
  private flightTarget: CrowTarget | null = null;
  private flightStartTime = 0;
  private flightDuration = 2000; // ms
  private carriedItem: CarriedItem | null = null;

  constructor(targets: CrowTarget[]) {
    this.targets = targets;
    this.currentTarget = targets[0];
  }

  getState(): CrowState {
    return this.state;
  }

  getCurrentTarget(): CrowTarget {
    return this.currentTarget;
  }

  getFlightTarget(): CrowTarget | null {
    return this.flightTarget;
  }

  getFlightStartTime(): number {
    return this.flightStartTime;
  }

  getFlightDuration(): number {
    return this.flightDuration;
  }

  setFlightDuration(ms: number): void {
    this.flightDuration = ms;
  }

  getFlightProgress(): number {
    if (this.state !== 'flying') return 0;
    const elapsed = Date.now() - this.flightStartTime;
    return Math.min(1, elapsed / this.flightDuration);
  }

  /** Start a flight to a random new target */
  startFlight(): void {
    if (this.state === 'flying') return;
    this.flightTarget = pickNextTarget(this.currentTarget.id, this.targets);
    this.flightStartTime = Date.now();
    this.state = 'flying';
  }

  /**
   * Start a panicked flight away from the mouse position.
   * Picks the target farthest from the mouse and uses a shorter flight duration.
   */
  startFleeingFlight(mouseX: number, mouseY: number): void {
    if (this.state === 'flying') return;

    // Pick target farthest from mouse (excluding current perch)
    const candidates = this.targets.filter((t) => t.id !== this.currentTarget.id);
    if (candidates.length === 0) return;

    let farthest = candidates[0];
    let maxDist = 0;
    for (const t of candidates) {
      const dx = t.x - mouseX;
      const dy = t.y - mouseY;
      const dist = dx * dx + dy * dy;
      if (dist > maxDist) {
        maxDist = dist;
        farthest = t;
      }
    }

    this.flightTarget = farthest;
    this.flightStartTime = Date.now();
    // Fleeing is faster — 60% of normal duration
    this.flightDuration = Math.round(this.flightDuration * 0.6);
    this.state = 'flying';
  }

  /** Mark the flight as complete, update current target */
  completeFlight(): void {
    if (this.state !== 'flying') return;
    if (this.flightTarget) {
      this.currentTarget = this.flightTarget;
    }
    this.flightTarget = null;
    this.state = 'perched';
  }

  /** Get the crow's current interpolated position */
  getCurrentPosition(): CrowPosition {
    if (this.state !== 'flying' || !this.flightTarget) {
      return {
        x: this.currentTarget.x,
        y: this.currentTarget.y,
        scale: this.currentTarget.scale,
        rotation: 0,
        flipX: this.currentTarget.flipX ?? false
      };
    }

    const elapsed = Date.now() - this.flightStartTime;
    const rawT = Math.min(1, elapsed / this.flightDuration);
    const t = easeInOutCubic(rawT);

    return computeFlightPosition(
      { x: this.currentTarget.x, y: this.currentTarget.y, scale: this.currentTarget.scale },
      this.flightTarget,
      t
    );
  }

  /** Set or clear the item the crow is carrying */
  setCarriedItem(item: CarriedItem | null): void {
    this.carriedItem = item;
  }

  getCarriedItem(): CarriedItem | null {
    return this.carriedItem;
  }

  /** Update available targets (e.g., after layout changes) */
  updateTargets(newTargets: CrowTarget[]): void {
    this.targets = newTargets;
    // Keep current target if it still exists, else reset to first
    if (!newTargets.some((t) => t.id === this.currentTarget.id)) {
      this.currentTarget = newTargets[0];
    }
  }

  /**
   * Get the z-index the crow should use right now.
   * When flying, always returns the flying z-index (default 45) so it appears above content.
   * When perched, returns the current target's zIndex or the defaultZ fallback.
   */
  getCurrentZIndex(defaultZ = 45): number {
    if (this.state === 'flying') return 45;
    return this.currentTarget.zIndex ?? defaultZ;
  }

  /** List all items the crow can carry */
  static availableItems(): readonly string[] {
    return CARRIED_ITEMS;
  }
}
