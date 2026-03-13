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
  /** When true, the crow picks a random character in the element's text
   *  and lands on top of that character instead of the bounding box. */
  textAware?: boolean;
}

/** Crow behavioral states */
export type CrowState = 'perched' | 'taking-off' | 'flying' | 'gliding' | 'soaring' | 'diving' | 'landing';

/** Whether the crow is actively flapping, gliding, or soaring with flat wings */
export type WingMode = 'flapping' | 'gliding' | 'soaring' | 'diving';

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

// ── Flap / Glide / Soar / Dive cycle constants ───────────────────────────
const FLAP_PHASE_MS = 600;   // Duration of active flapping
const GLIDE_PHASE_MS = 400;  // Duration of gliding (wings raised)
const SOAR_PHASE_MS = 500;   // Duration of soaring (wings flat, S/C curves)
const DIVE_PHASE_MS = 300;   // Duration of fast dive (wings swept back)
const WING_CYCLE_MS = FLAP_PHASE_MS + GLIDE_PHASE_MS + SOAR_PHASE_MS + DIVE_PHASE_MS;

/**
 * Determine whether the crow should be flapping, gliding, soaring, or diving
 * based on elapsed flight time.
 *
 * Cycle: 600 ms flapping → 400 ms gliding (raised) → 500 ms soaring (flat)
 *        → 300 ms diving (swept back) → repeat.
 */
export function computeWingMode(timeMs: number): WingMode {
  const phase = timeMs % WING_CYCLE_MS;
  if (phase < FLAP_PHASE_MS) return 'flapping';
  if (phase < FLAP_PHASE_MS + GLIDE_PHASE_MS) return 'gliding';
  if (phase < FLAP_PHASE_MS + GLIDE_PHASE_MS + SOAR_PHASE_MS) return 'soaring';
  return 'diving';
}

/**
 * Compute a lateral (S/C-shaped) drift offset for the soaring phase.
 *
 * During soaring, the crow banks into gentle curves instead of flying
 * straight. The primary displacement is lateral (dx, perpendicular to
 * forward direction) using a slow sine wave that creates S-curves,
 * with a secondary vertical undulation (dy) at half frequency for
 * gentle rising and falling.
 *
 * @param timeMs  Elapsed time in ms (global, not phase-local)
 * @param amplitude  Maximum lateral displacement in pixels
 * @returns { dx, dy } offset to add to the crow's position
 */
export function computeSoaringOffset(
  timeMs: number,
  amplitude: number,
): { dx: number; dy: number; } {
  // Primary S-curve: lateral sway with ~1.6s period
  const lateralFreq = 1600;
  const dx = Math.sin((timeMs / lateralFreq) * Math.PI * 2) * amplitude;

  // Secondary undulation: gentle vertical bobbing at half frequency
  const verticalFreq = 3200;
  const dy = Math.sin((timeMs / verticalFreq) * Math.PI * 2) * (amplitude * 0.35);

  return { dx, dy };
}

/**
 * Compute a downward dive offset for the diving phase.
 *
 * During diving, the crow plunges steeply downward with a slight
 * lateral wobble simulating air resistance / corrections.
 *
 * @param timeMs  Elapsed time in ms (global, not phase-local)
 * @param amplitude  Maximum displacement in pixels
 * @returns { dx, dy } offset to add to the crow's position
 */
export function computeDivingOffset(
  timeMs: number,
  amplitude: number,
): { dx: number; dy: number; } {
  // Strong downward pull — sine-based acceleration curve
  const diveFreq = 900;
  const dy = Math.abs(Math.sin((timeMs / diveFreq) * Math.PI * 2)) * amplitude;

  // Slight lateral wobble — fast, small oscillation
  const wobbleFreq = 400;
  const dx = Math.sin((timeMs / wobbleFreq) * Math.PI * 2) * (amplitude * 0.25);

  return { dx, dy };
}

/** A horizontal surface the murder of crows can perch on together */
export interface PerchLine {
  /** Left edge x coordinate in viewport pixels */
  x: number;
  /** Y coordinate (top of the perch surface) in viewport pixels */
  y: number;
  /** Width of the perchable surface in pixels */
  width: number;
}

/**
 * Distribute N crows evenly along a horizontal perch line.
 *
 * Returns an array of {x, y} positions spaced across the line width.
 * A single crow is centered; zero crows returns an empty array.
 */
export function computePerchLinePositions(
  count: number,
  perchLine: PerchLine,
): Array<{ x: number; y: number; }> {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ x: perchLine.x + perchLine.width / 2, y: perchLine.y }];
  }
  const positions: Array<{ x: number; y: number; }> = [];
  const spacing = perchLine.width / (count - 1);
  for (let i = 0; i < count; i++) {
    positions.push({
      x: perchLine.x + i * spacing,
      y: perchLine.y,
    });
  }
  return positions;
}

/**
 * Count the number of opaque (ink) pixels in each row of RGBA pixel data.
 *
 * Takes the flat RGBA array from canvas ImageData and returns an array
 * where each element is the count of pixels exceeding the alpha threshold
 * in that row. Used as input to {@link findGlyphLedges}.
 *
 * @param pixelData      - Flat RGBA pixel data (4 bytes per pixel)
 * @param width          - Width of the image in pixels
 * @param height         - Height of the image in pixels
 * @param alphaThreshold - Minimum alpha value to consider a pixel opaque (default 128)
 * @returns Array of length `height` with ink pixel counts per row
 */
export function computeRowInkCounts(
  pixelData: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold: number = 128,
): number[] {
  const counts: number[] = [];
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      const alphaIndex = (y * width + x) * 4 + 3;
      if (pixelData[alphaIndex] >= alphaThreshold) count++;
    }
    counts.push(count);
  }
  return counts;
}

/**
 * Find horizontal ledge positions in a glyph's row-ink-count profile.
 *
 * A "ledge" is the top edge of a horizontal stroke — a row with significant
 * ink where the row above has significantly less ink. These are surfaces
 * where a crow can perch. Nearby ledges are merged.
 *
 * @param rowInkCounts   - Ink pixels per row (from {@link computeRowInkCounts})
 * @param glyphWidth     - Total width of the glyph in pixels
 * @param minInkFraction - Minimum ink pixels as fraction of glyphWidth (default 0.15)
 * @param mergeDistance  - Merge ledges within this many rows (default 3)
 * @returns Array of row indices (0-based from top) where ledges are found
 */
export function findGlyphLedges(
  rowInkCounts: number[],
  glyphWidth: number,
  minInkFraction: number = 0.15,
  mergeDistance: number = 3,
): number[] {
  const minInk = glyphWidth * minInkFraction;
  const raw: number[] = [];
  for (let r = 0; r < rowInkCounts.length; r++) {
    const isInk = rowInkCounts[r] >= minInk;
    const prevInk = r > 0 ? rowInkCounts[r - 1] >= minInk : false;
    if (isInk && !prevInk) {
      raw.push(r);
    }
  }
  if (raw.length === 0) return [];
  // Merge ledges within mergeDistance
  const merged: number[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] - merged[merged.length - 1] > mergeDistance) {
      merged.push(raw[i]);
    }
  }
  return merged;
}

/**
 * Find the horizontal center of ink in a specific row of RGBA pixel data.
 *
 * Scans the row for the leftmost and rightmost opaque pixels and returns
 * their midpoint. Returns null if no opaque pixels are found.
 *
 * @param pixelData      - Flat RGBA pixel data (4 bytes per pixel)
 * @param width          - Width of the image in pixels
 * @param row            - Row index (0-based from top)
 * @param alphaThreshold - Minimum alpha value to consider a pixel opaque (default 128)
 * @returns X coordinate of the ink center, or null if row has no ink
 */
export function findInkCenterInRow(
  pixelData: ArrayLike<number>,
  width: number,
  row: number,
  alphaThreshold: number = 128,
): number | null {
  let left = -1;
  let right = -1;
  const rowStart = row * width;
  for (let x = 0; x < width; x++) {
    const alphaIndex = (rowStart + x) * 4 + 3;
    if (pixelData[alphaIndex] >= alphaThreshold) {
      if (left === -1) left = x;
      right = x;
    }
  }
  if (left === -1) return null;
  return (left + right) / 2;
}

/**
 * Count interior-gap pixels per row — transparent pixels enclosed by ink.
 *
 * For each row, scans left-to-right to find transparent pixels that have
 * opaque ink on both their left AND right side in the same row. These are
 * the pixels inside a counter/hole (e.g. inside "d", "a", "9", "0").
 *
 * @param pixelData      - Flat RGBA pixel data (4 bytes per pixel)
 * @param width          - Width of the image in pixels
 * @param height         - Height of the image in pixels
 * @param alphaThreshold - Minimum alpha value to consider a pixel opaque (default 128)
 * @returns Array of length `height` with interior gap pixel counts per row
 */
export function computeRowInteriorGapCounts(
  pixelData: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold: number = 128,
): number[] {
  const counts: number[] = [];
  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    // Find leftmost and rightmost ink pixel in this row
    let leftInk = -1;
    let rightInk = -1;
    for (let x = 0; x < width; x++) {
      if (pixelData[(rowStart + x) * 4 + 3] >= alphaThreshold) {
        if (leftInk === -1) leftInk = x;
        rightInk = x;
      }
    }
    if (leftInk === -1 || leftInk === rightInk) {
      counts.push(0);
      continue;
    }
    // Count transparent pixels strictly between leftInk and rightInk
    let gapCount = 0;
    for (let x = leftInk + 1; x < rightInk; x++) {
      if (pixelData[(rowStart + x) * 4 + 3] < alphaThreshold) {
        gapCount++;
      }
    }
    counts.push(gapCount);
  }
  return counts;
}

/**
 * Find the bottom rows of interior counters/holes in a glyph.
 *
 * A counter bottom is the last row of a vertical run of interior-gap rows —
 * the "floor" of the hole where a crow could sit. Uses the output of
 * {@link computeRowInteriorGapCounts}.
 *
 * @param interiorGapCounts - Interior gap pixels per row
 * @param glyphWidth        - Total width of the glyph in pixels
 * @param minGapFraction    - Minimum gap pixels as fraction of glyphWidth (default 0.15)
 * @param mergeDistance     - Merge counter bottoms within this many rows (default 3)
 * @returns Array of row indices (0-based from top) where counter bottoms are found
 */
export function findCounterBottoms(
  interiorGapCounts: number[],
  glyphWidth: number,
  minGapFraction: number = 0.15,
  mergeDistance: number = 3,
): number[] {
  const minGap = glyphWidth * minGapFraction;
  const raw: number[] = [];
  for (let r = 0; r < interiorGapCounts.length; r++) {
    const hasGap = interiorGapCounts[r] >= minGap;
    const nextHasGap = r < interiorGapCounts.length - 1
      ? interiorGapCounts[r + 1] >= minGap
      : false;
    // A counter bottom is the last row of a gap run (gap → no-gap transition,
    // or gap extends to the last row of the glyph)
    if (hasGap && !nextHasGap) {
      raw.push(r);
    }
  }
  if (raw.length === 0) return [];
  // Merge counter bottoms within mergeDistance (keep the later one)
  const merged: number[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] - merged[merged.length - 1] > mergeDistance) {
      merged.push(raw[i]);
    } else {
      merged[merged.length - 1] = raw[i]; // keep the later (deeper) bottom
    }
  }
  return merged;
}

/**
 * Find the horizontal center of the interior gap in a specific row.
 *
 * Scans for transparent pixels that lie between the leftmost and rightmost
 * ink pixels, then returns the center of that transparent region.
 * Returns null if no interior gap exists.
 *
 * @param pixelData      - Flat RGBA pixel data (4 bytes per pixel)
 * @param width          - Width of the image in pixels
 * @param row            - Row index (0-based from top)
 * @param alphaThreshold - Minimum alpha value to consider a pixel opaque (default 128)
 * @returns X coordinate of the interior gap center, or null if no interior gap
 */
export function findInteriorGapCenter(
  pixelData: ArrayLike<number>,
  width: number,
  row: number,
  alphaThreshold: number = 128,
): number | null {
  const rowStart = row * width;
  // Find leftmost and rightmost ink
  let leftInk = -1;
  let rightInk = -1;
  for (let x = 0; x < width; x++) {
    if (pixelData[(rowStart + x) * 4 + 3] >= alphaThreshold) {
      if (leftInk === -1) leftInk = x;
      rightInk = x;
    }
  }
  if (leftInk === -1 || leftInk === rightInk) return null;
  // Find leftmost and rightmost transparent pixels between the ink edges
  let gapLeft = -1;
  let gapRight = -1;
  for (let x = leftInk + 1; x < rightInk; x++) {
    if (pixelData[(rowStart + x) * 4 + 3] < alphaThreshold) {
      if (gapLeft === -1) gapLeft = x;
      gapRight = x;
    }
  }
  if (gapLeft === -1) return null;
  return (gapLeft + gapRight) / 2;
}

/**
 * Compute the viewport Y coordinate of a glyph's visual top edge.
 *
 * The Range API's `getBoundingClientRect().top` gives the top of the
 * text line-box (em-square), not the top of the actual visible ink.
 * This function adjusts downward using TextMetrics font ascent values
 * so crows land on the real letter strokes, not the invisible box above.
 *
 * @param boundingRectTop - `top` from the character's Range bounding rect
 * @param fontAscent      - `fontBoundingBoxAscent` from canvas TextMetrics
 *                          (px from baseline to em-square top)
 * @param glyphAscent     - `actualBoundingBoxAscent` from canvas TextMetrics
 *                          (px from baseline to glyph visible top)
 * @returns adjusted Y coordinate at the visual top of the glyph
 */
export function computeGlyphVisualTop(
  boundingRectTop: number,
  fontAscent: number,
  glyphAscent: number,
): number {
  return boundingRectTop + (fontAscent - glyphAscent);
}

/**
 * Distribute N crows among M perch spots, cycling through when N > M.
 *
 * Each crow is assigned to one spot (by index modulo). This lets a swarm
 * of crows pile up on a limited set of character positions. Returns an
 * empty array when count ≤ 0 or spots is empty.
 */
export function distributeAmongPerchSpots(
  count: number,
  spots: Array<{ x: number; y: number; }>,
): Array<{ x: number; y: number; }> {
  if (count <= 0 || spots.length === 0) return [];
  const result: Array<{ x: number; y: number; }> = [];
  for (let i = 0; i < count; i++) {
    const spot = spots[i % spots.length];
    result.push({ x: spot.x, y: spot.y });
  }
  return result;
}

/**
 * Get the wing flap angle in degrees based on state and elapsed time.
 * Returns 0 for perched, oscillating for flying/takeoff/landing,
 * and a fixed spread angle for gliding.
 */
export function getWingFlapAngle(state: CrowState | WingMode, timeMs: number): number {
  switch (state) {
    case 'perched':
      return 0;
    case 'flying':
    case 'flapping': {
      // Full sinusoidal flap cycle ~200ms, amplitude ±40°
      const flapFreq = 200;
      return Math.sin((timeMs / flapFreq) * Math.PI * 2) * 40;
    }
    case 'gliding': {
      // Wings held slightly raised and steady — classic crow glide pose
      return -15;
    }
    case 'soaring': {
      // Wings held flat/straight across the body — level soaring pose
      return -3;
    }
    case 'diving': {
      // Wings swept back tight against the body — fast power-dive pose
      return 55;
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

/** Idle sitting animation offsets — rare, discrete gestures */
export interface IdleAnimation {
  headTilt: number;
  bodyShiftX: number;
  bodyShiftY: number;
  tailWag: number;
  lookDirection: number;
  /** 0 = wings folded, 1 = wings fully open */
  wingStretch: number;
  /** 0 = upright, 1 = fully bowed */
  bowAmount: number;
}

/**
 * Compute idle animation values for a perched crow.
 *
 * Instead of constant micro-movements, the crow is mostly still.
 * Occasionally it performs a discrete gesture:
 *   - A bow (head dip forward)       — roughly every 8–15 seconds
 *   - A wing open/close stretch      — roughly every 12–20 seconds
 *
 * Uses a pseudo-random hash of time buckets to decide when to trigger,
 * keeping the function pure (no external state).
 */
export function getIdleAnimation(timeMs: number): IdleAnimation {
  // ── Bowing ──
  // A bow lasts ~800ms. We check 10-second buckets with a hash
  // to decide if a bow happens in that window.
  const bowBucket = Math.floor(timeMs / 10000);
  const bowHash = ((bowBucket * 2654435761) >>> 0) % 100;
  const shouldBow = bowHash < 30; // ~30% chance per 10s bucket
  let bowAmount = 0;
  let headTilt = 0;
  if (shouldBow) {
    const bowStart = bowBucket * 10000 + 2000; // start 2s into the bucket
    const bowElapsed = timeMs - bowStart;
    if (bowElapsed >= 0 && bowElapsed < 800) {
      // Smooth up-and-down bow: sin(0→π) over 800ms
      bowAmount = Math.sin((bowElapsed / 800) * Math.PI);
      headTilt = bowAmount * 12; // head dips forward up to 12°
    }
  }

  // ── Wing stretch ──
  // A stretch lasts ~1200ms. We check 15-second buckets.
  const wingBucket = Math.floor(timeMs / 15000);
  const wingHash = ((wingBucket * 2246822519) >>> 0) % 100;
  const shouldStretch = wingHash < 25; // ~25% chance per 15s bucket
  let wingStretch = 0;
  if (shouldStretch) {
    const stretchStart = wingBucket * 15000 + 5000; // start 5s into the bucket
    const stretchElapsed = timeMs - stretchStart;
    if (stretchElapsed >= 0 && stretchElapsed < 1200) {
      // Smooth open-and-close: sin(0→π) over 1200ms
      wingStretch = Math.sin((stretchElapsed / 1200) * Math.PI);
    }
  }

  // Tail stays still (no constant wag)
  const tailWag = bowAmount * 3; // slight tail lift during a bow

  // Eyes: very rare slow glance, mostly centered
  const lookBucket = Math.floor(timeMs / 12000);
  const lookHash = ((lookBucket * 1597334677) >>> 0) % 100;
  let lookDirection = 0;
  if (lookHash < 20) {
    const lookStart = lookBucket * 12000 + 3000;
    const lookElapsed = timeMs - lookStart;
    if (lookElapsed >= 0 && lookElapsed < 2000) {
      const lookSide = (lookHash % 2 === 0) ? 1 : -1;
      lookDirection = Math.sin((lookElapsed / 2000) * Math.PI) * 1.5 * lookSide;
    }
  }

  return {
    headTilt,
    bodyShiftX: 0,
    bodyShiftY: 0,
    tailWag,
    lookDirection,
    wingStretch,
    bowAmount
  };
}

/**
 * Pick a random non-whitespace character index from a string.
 * Returns -1 if the string has no non-whitespace characters.
 */
export function pickRandomCharIndex(text: string): number {
  const nonWhitespaceIndices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      nonWhitespaceIndices.push(i);
    }
  }
  if (nonWhitespaceIndices.length === 0) return -1;
  return nonWhitespaceIndices[Math.floor(Math.random() * nonWhitespaceIndices.length)];
}

/**
 * Given an array of text node lengths and a flat character index,
 * returns which text node the character belongs to and the offset within it.
 * Used to map a character position in concatenated text back to a specific
 * DOM text node for Range API positioning.
 * Returns null if charIndex is out of bounds.
 */
export function findTextNodeOffset(
  nodeLengths: number[],
  charIndex: number
): { nodeIndex: number; offset: number; } | null {
  if (charIndex < 0) return null;
  let accumulated = 0;
  for (let i = 0; i < nodeLengths.length; i++) {
    if (charIndex < accumulated + nodeLengths[i]) {
      return { nodeIndex: i, offset: charIndex - accumulated };
    }
    accumulated += nodeLengths[i];
  }
  return null;
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

  constructor(targets: CrowTarget[], startingTargetId?: string) {
    this.targets = targets;
    if (startingTargetId) {
      this.currentTarget = targets.find((t) => t.id === startingTargetId) ?? targets[0];
    } else {
      this.currentTarget = targets[0];
    }
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

  /** Update available targets (e.g., after layout changes or zoom) */
  updateTargets(newTargets: CrowTarget[]): void {
    this.targets = newTargets;
    // Refresh currentTarget coordinates from the updated list
    const match = newTargets.find((t) => t.id === this.currentTarget.id);
    if (match) {
      this.currentTarget = match;
    } else {
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

// ═══════════════════════════════════════════════════════════════════
//  Murder of Crows — easter egg: type "murder" to summon a flock
// ═══════════════════════════════════════════════════════════════════

/**
 * Detects the word "murder" being typed anywhere on the page.
 * Feeds one character at a time; fires the callback each time
 * the full word is completed.
 */
export class MurderDetector {
  private readonly word = 'murder';
  private buffer = '';
  private readonly onTrigger: () => void;

  constructor(onTrigger: () => void) {
    this.onTrigger = onTrigger;
  }

  /** Feed a single keystroke character. */
  feed(char: string): void {
    const lower = char.toLowerCase();
    const next = this.word[this.buffer.length];

    if (lower === next) {
      this.buffer += lower;
      if (this.buffer === this.word) {
        this.buffer = '';
        this.onTrigger();
      }
    } else {
      // Reset, but check if the new char is the start of the word
      this.buffer = lower === this.word[0] ? lower : '';
    }
  }
}

/** State of an individual flock crow */
export interface FlockCrow {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  state: 'waiting' | 'flying' | 'perched' | 'departing' | 'departed';
}

/**
 * Generate spawn points that sit just outside the viewport.
 * Points are distributed roughly evenly across all four edges
 * with some randomness, 40–250px outside each edge.
 */
export function generateOffscreenSpawnPoints(
  count: number,
  viewport: { width: number; height: number; }
): { x: number; y: number; }[] {
  if (count === 0) return [];

  const points: { x: number; y: number; }[] = [];
  for (let i = 0; i < count; i++) {
    const edge = i % 4; // 0=top, 1=right, 2=bottom, 3=left
    const margin = 40 + Math.random() * 210; // 40–250px off-edge
    let x: number;
    let y: number;

    switch (edge) {
      case 0: // top
        x = Math.random() * viewport.width;
        y = -margin;
        break;
      case 1: // right
        x = viewport.width + margin;
        y = Math.random() * viewport.height;
        break;
      case 2: // bottom
        x = Math.random() * viewport.width;
        y = viewport.height + margin;
        break;
      case 3: // left
      default:
        x = -margin;
        y = Math.random() * viewport.height;
        break;
    }

    points.push({ x, y });
  }
  return points;
}

/**
 * Compute staggered entry delays so the flock arrives in a natural wave.
 * Returns a sorted array of ms delays. First crow enters immediately (0 ms).
 * Subsequent crows arrive in a gaussian-ish distribution over maxSpreadMs.
 */
export function computeFlockEntryDelays(count: number, maxSpreadMs: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [0];

  const delays: number[] = [0];
  for (let i = 1; i < count; i++) {
    // Use quadratic distribution so early arrivals cluster together
    const t = i / (count - 1);
    const base = t * t * maxSpreadMs;
    // Add ±10% jitter
    const jitter = (Math.random() - 0.5) * 0.2 * maxSpreadMs * t;
    delays.push(Math.max(0, Math.min(maxSpreadMs, base + jitter)));
  }
  return delays.sort((a, b) => a - b);
}

/**
 * Compute the departure schedule: when each crow should leave.
 * One crow (the last) always stays, so this returns count-1 timestamps.
 * There's a grace period at the start (~30s) before any depart.
 * Returns sorted ascending ms offsets from the murder trigger time.
 */
export function computeDepartureSchedule(count: number, totalDurationMs: number): number[] {
  const departures = count - 1;
  if (departures <= 0) return [];

  const graceMs = 30_000;
  const schedule: number[] = [];

  for (let i = 0; i < departures; i++) {
    // Linear spread from grace to totalDuration with jitter
    const t = i / departures;
    const base = graceMs + t * (totalDurationMs - graceMs);
    const jitter = (Math.random() - 0.5) * 0.1 * totalDurationMs;
    schedule.push(Math.max(graceMs, Math.min(totalDurationMs, base + jitter)));
  }
  return schedule.sort((a, b) => a - b);
}

/**
 * Check whether a perch spot is too close to any currently-occupied spot.
 *
 * Used to prevent multiple crows from landing on the exact same position.
 *
 * @param spot          - The candidate perch position
 * @param occupiedSpots - Array of currently-occupied positions
 * @param minDistance    - Minimum distance between perched crows (px)
 * @returns true if the spot is within minDistance of any occupied spot
 */
export function isSpotOccupied(
  spot: { x: number; y: number; },
  occupiedSpots: Array<{ x: number; y: number; }>,
  minDistance: number,
): boolean {
  for (const occ of occupiedSpots) {
    const dx = spot.x - occ.x;
    const dy = spot.y - occ.y;
    if (Math.sqrt(dx * dx + dy * dy) < minDistance) return true;
  }
  return false;
}

/**
 * Pick the nearest available (unoccupied) perch spot for a crow.
 *
 * Tries the crow's assigned spot first (index modulo spots.length),
 * then falls back to the nearest unoccupied alternative. Returns null
 * when all spots are occupied.
 *
 * @param crowIndex     - The crow's index (used to compute preferred spot)
 * @param perchSpots    - Array of all available perch positions
 * @param occupiedSpots - Currently-occupied positions
 * @param minDistance    - Minimum distance between perched crows (px)
 * @returns A perch position, or null if none are available
 */
export function pickAvailablePerchSpot(
  crowIndex: number,
  perchSpots: Array<{ x: number; y: number; }>,
  occupiedSpots: Array<{ x: number; y: number; }>,
  minDistance: number,
): { x: number; y: number; } | null {
  if (perchSpots.length === 0) return null;

  // Try preferred spot first
  const preferred = perchSpots[crowIndex % perchSpots.length];
  if (!isSpotOccupied(preferred, occupiedSpots, minDistance)) {
    return { x: preferred.x, y: preferred.y };
  }

  // Find nearest unoccupied spot
  let bestSpot: { x: number; y: number; } | null = null;
  let bestDist = Infinity;
  for (const spot of perchSpots) {
    if (isSpotOccupied(spot, occupiedSpots, minDistance)) continue;
    const dx = spot.x - preferred.x;
    const dy = spot.y - preferred.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestSpot = { x: spot.x, y: spot.y };
    }
  }
  return bestSpot;
}

/**
 * Compute the response when a crow is scared by the mouse cursor.
 *
 * Returns a normalized flee direction vector (away from the mouse) and
 * a list of nearby perched crow IDs that should also be chain-scared.
 *
 * @param scaredCrowPos  - Position of the scared crow
 * @param mousePos       - Current mouse position
 * @param nearbyPerched  - Other perched crows that might chain-scare
 * @param scareRadius    - Radius for the initial scare (not used for flee)
 * @param chainRadius    - Radius for chain-scaring nearby crows
 * @returns { fleeDirection, scaredNearbyIds }
 */
export function computeScareResponse(
  scaredCrowPos: { x: number; y: number; },
  mousePos: { x: number; y: number; },
  nearbyPerched: Array<{ id: number; x: number; y: number; }>,
  scareRadius: number,
  chainRadius: number,
): { fleeDirection: { dx: number; dy: number; }; scaredNearbyIds: number[]; } {
  // Flee direction: away from mouse
  let dx = scaredCrowPos.x - mousePos.x;
  let dy = scaredCrowPos.y - mousePos.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  } else {
    // Mouse exactly on crow — flee upward
    dx = 0;
    dy = -1;
  }

  // Find nearby perched crows that should chain-scare
  const scaredNearbyIds: number[] = [];
  for (const other of nearbyPerched) {
    const odx = other.x - scaredCrowPos.x;
    const ody = other.y - scaredCrowPos.y;
    if (Math.sqrt(odx * odx + ody * ody) < chainRadius) {
      scaredNearbyIds.push(other.id);
    }
  }

  return { fleeDirection: { dx, dy }, scaredNearbyIds };
}

/**
 * Decide whether a flying crow should attempt to land.
 *
 * Requires the crow to be (a) close enough to its target,
 * (b) have been flying for at least `minFlightTimeMs`, and
 * (c) pass a random roll against `landingChance`.
 *
 * @param distToTarget    - Current distance to target in pixels
 * @param flightTimeMs    - How long this crow has been flying (ms)
 * @param minFlightTimeMs - Minimum flight time before landing is allowed (ms)
 * @param landingChance   - Probability of landing per check (0–1)
 * @param landingRadius   - Maximum distance to target for landing (default 25)
 * @returns true if the crow should land
 */
export function shouldAttemptLanding(
  distToTarget: number,
  flightTimeMs: number,
  minFlightTimeMs: number,
  landingChance: number,
  landingRadius: number = 25,
): boolean {
  if (distToTarget >= landingRadius) return false;
  if (flightTimeMs < minFlightTimeMs) return false;
  return Math.random() < landingChance;
}

/**
 * Compute boids-style flocking forces for all flying crows.
 * Returns an array of { dx, dy } force vectors, one per input crow.
 *
 * Three rules:
 * - **Separation**: steer away from nearby crows (< 60px)
 * - **Alignment**: match average velocity of neighbors (< 200px)
 * - **Cohesion**: move toward the center of nearby flock (< 200px)
 */
export function computeFlockingForces(
  crows: FlockCrow[]
): { dx: number; dy: number; }[] {
  if (crows.length === 0) return [];

  const SEPARATION_RADIUS = 60;
  const NEIGHBOR_RADIUS = 200;
  const SEPARATION_WEIGHT = 2.5;
  const ALIGNMENT_WEIGHT = 0.8;
  const COHESION_WEIGHT = 0.5;
  const MAX_FORCE = 40;

  return crows.map((crow) => {
    if (crow.state !== 'flying') return { dx: 0, dy: 0 };

    let sepX = 0, sepY = 0, sepCount = 0;
    let aliVx = 0, aliVy = 0;
    let cohX = 0, cohY = 0, neighborCount = 0;

    for (const other of crows) {
      if (other.id === crow.id || other.state !== 'flying') continue;

      const ddx = crow.x - other.x;
      const ddy = crow.y - other.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (dist < SEPARATION_RADIUS && dist > 0) {
        // Push away, stronger for closer crows
        sepX += ddx / dist / dist;
        sepY += ddy / dist / dist;
        sepCount++;
      }

      if (dist < NEIGHBOR_RADIUS) {
        aliVx += other.vx;
        aliVy += other.vy;
        cohX += other.x;
        cohY += other.y;
        neighborCount++;
      }
    }

    if (neighborCount === 0) return { dx: 0, dy: 0 };

    let dx = 0;
    let dy = 0;

    // Separation
    if (sepCount > 0) {
      dx += (sepX / sepCount) * SEPARATION_WEIGHT * 100;
      dy += (sepY / sepCount) * SEPARATION_WEIGHT * 100;
    }

    // Alignment — steer toward average velocity
    aliVx /= neighborCount;
    aliVy /= neighborCount;
    dx += (aliVx - crow.vx) * ALIGNMENT_WEIGHT;
    dy += (aliVy - crow.vy) * ALIGNMENT_WEIGHT;

    // Cohesion — steer toward center of neighbors
    cohX /= neighborCount;
    cohY /= neighborCount;
    dx += (cohX - crow.x) * COHESION_WEIGHT * 0.01;
    dy += (cohY - crow.y) * COHESION_WEIGHT * 0.01;

    // Clamp
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > MAX_FORCE) {
      dx = (dx / mag) * MAX_FORCE;
      dy = (dy / mag) * MAX_FORCE;
    }

    return { dx, dy };
  });
}

// ═══════════════════════════════════════════════════════════════
//  Background-image position mapping
// ═══════════════════════════════════════════════════════════════

/** The on-screen rectangle where a contained background image renders. */
export interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the rendered rectangle of a `background-size: contain` image.
 *
 * Given the container (viewport) dimensions, the image's natural dimensions,
 * and an absolute-unit offset (e.g. -9ch → pixels, 18em → pixels), returns the
 * position and size of the rendered image on screen.
 */
export function computeContainedImageBounds(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
  offsetX: number,
  offsetY: number,
): ImageBounds {
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  return {
    x: offsetX,
    y: offsetY,
    width: naturalW * scale,
    height: naturalH * scale,
  };
}

/**
 * Map a point within a background image to viewport coordinates.
 *
 * @param ix  Fraction across the image width  (0 = left, 1 = right)
 * @param iy  Fraction down the image height   (0 = top,  1 = bottom)
 * @param bounds  The rendered image bounds from `computeContainedImageBounds`
 */
export function imageLandmarkToViewport(
  ix: number,
  iy: number,
  bounds: ImageBounds,
): { x: number; y: number; } {
  return {
    x: bounds.x + bounds.width * ix,
    y: bounds.y + bounds.height * iy,
  };
}
