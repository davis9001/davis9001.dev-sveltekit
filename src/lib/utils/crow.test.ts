import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pickNextTarget,
  computeFlightPosition,
  getWingFlapAngle,
  computeArcControlPoint,
  easeInOutCubic,
  isMouseTooClose,
  getIdleAnimation,
  pickRandomCharIndex,
  findTextNodeOffset,
  MurderDetector,
  generateOffscreenSpawnPoints,
  computeFlockEntryDelays,
  computeDepartureSchedule,
  computeFlockingForces,
  computeContainedImageBounds,
  imageLandmarkToViewport,
  computeWingMode,
  computeSoaringOffset,
  computeDivingOffset,
  computePerchLinePositions,
  distributeAmongPerchSpots,
  computeGlyphVisualTop,
  computeRowInkCounts,
  findGlyphLedges,
  findInkCenterInRow,
  computeRowInteriorGapCounts,
  findCounterBottoms,
  findInteriorGapCenter,
  isSpotOccupied,
  pickAvailablePerchSpot,
  computeScareResponse,
  shouldAttemptLanding,
  type CrowTarget,
  type CrowState,
  type FlockCrow,
  type ImageBounds,
  type WingMode,
  type PerchLine,
  CrowStateMachine
} from './crow';

describe('Crow Animation Logic', () => {
  const targets: CrowTarget[] = [
    { id: 'shoulder', x: 200, y: 400, scale: 1.0 },
    { id: 'logo', x: 500, y: 100, scale: 0.4 },
    { id: 'title', x: 500, y: 200, scale: 0.35 },
    { id: 'cta', x: 400, y: 350, scale: 0.3 },
    { id: 'content', x: 500, y: 600, scale: 0.3 }
  ];

  describe('pickNextTarget', () => {
    it('should return a target from the list', () => {
      const result = pickNextTarget(null, targets);
      expect(targets.some((t) => t.id === result.id)).toBe(true);
    });

    it('should not pick the same target as current', () => {
      // Run multiple times to verify statistical behavior
      for (let i = 0; i < 50; i++) {
        const result = pickNextTarget('shoulder', targets);
        expect(result.id).not.toBe('shoulder');
      }
    });

    it('should return a random target when current is null', () => {
      const result = pickNextTarget(null, targets);
      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
    });

    it('should handle single target list by returning it even if same', () => {
      const single = [{ id: 'only', x: 0, y: 0, scale: 1 }];
      const result = pickNextTarget('only', single);
      expect(result.id).toBe('only');
    });

    it('should select from all non-current targets', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const result = pickNextTarget('shoulder', targets);
        seen.add(result.id);
      }
      // Should eventually pick all non-shoulder targets
      expect(seen.has('shoulder')).toBe(false);
      expect(seen.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('computeFlightPosition', () => {
    const from = { x: 100, y: 400, scale: 1.0 };
    const to: CrowTarget = { id: 'logo', x: 500, y: 100, scale: 0.4 };

    it('should return start position at t=0', () => {
      const pos = computeFlightPosition(from, to, 0);
      expect(pos.x).toBeCloseTo(100, 0);
      expect(pos.y).toBeCloseTo(400, 0);
    });

    it('should return end position at t=1', () => {
      const pos = computeFlightPosition(from, to, 1);
      expect(pos.x).toBeCloseTo(500, 0);
      expect(pos.y).toBeCloseTo(100, 0);
    });

    it('should interpolate scale between from and to', () => {
      const pos = computeFlightPosition(from, to, 0.5);
      // At midpoint, scale should be between 0.4 and 1.0 
      expect(pos.scale).toBeGreaterThan(0.35);
      expect(pos.scale).toBeLessThan(1.05);
    });

    it('should arc above the midpoint (y should dip lower = higher on screen)', () => {
      const pos = computeFlightPosition(from, to, 0.5);
      const linearMidY = (from.y + to.y) / 2;
      // The arc should take the crow above the linear midpoint
      expect(pos.y).toBeLessThan(linearMidY);
    });

    it('should calculate rotation based on direction of travel', () => {
      const pos = computeFlightPosition(from, to, 0.5);
      // Flying up and right, rotation should be negative (nose up)
      expect(pos.rotation).toBeDefined();
      expect(typeof pos.rotation).toBe('number');
    });

    it('should clamp t values below 0 to 0', () => {
      const pos = computeFlightPosition(from, to, -0.5);
      expect(pos.x).toBeCloseTo(100, 0);
      expect(pos.y).toBeCloseTo(400, 0);
    });

    it('should clamp t values above 1 to 1', () => {
      const pos = computeFlightPosition(from, to, 1.5);
      expect(pos.x).toBeCloseTo(500, 0);
      expect(pos.y).toBeCloseTo(100, 0);
    });

    it('should set flipX true when flying left', () => {
      const fromRight = { x: 500, y: 100, scale: 0.4 };
      const toLeft: CrowTarget = { id: 'shoulder', x: 100, y: 400, scale: 1.0 };
      const pos = computeFlightPosition(fromRight, toLeft, 0.5);
      expect(pos.flipX).toBe(true);
    });

    it('should set flipX false when flying right', () => {
      const pos = computeFlightPosition(from, to, 0.5);
      expect(pos.flipX).toBe(false);
    });
  });

  describe('computeArcControlPoint', () => {
    it('should return a point above the midpoint', () => {
      const cp = computeArcControlPoint(
        { x: 0, y: 400 },
        { x: 400, y: 400 }
      );
      expect(cp.x).toBeCloseTo(200, 0);
      expect(cp.y).toBeLessThan(400); // above
    });

    it('should have arc height proportional to distance', () => {
      const cp1 = computeArcControlPoint(
        { x: 0, y: 400 },
        { x: 100, y: 400 }
      );
      const cp2 = computeArcControlPoint(
        { x: 0, y: 400 },
        { x: 1000, y: 400 }
      );
      // Longer distance should have higher arc
      const arc1 = 400 - cp1.y;
      const arc2 = 400 - cp2.y;
      expect(arc2).toBeGreaterThan(arc1);
    });
  });

  describe('getWingFlapAngle', () => {
    it('should return 0 when perched', () => {
      expect(getWingFlapAngle('perched', 0)).toBe(0);
      expect(getWingFlapAngle('perched', 100)).toBe(0);
    });

    it('should return oscillating values when flying', () => {
      const angle1 = getWingFlapAngle('flying', 0);
      const angle2 = getWingFlapAngle('flying', 250);
      // Wing angles should differ between different times in the flap cycle
      expect(angle1).not.toBeCloseTo(angle2, 1);
    });

    it('should return values between -40 and 40 degrees when flying', () => {
      for (let t = 0; t < 1000; t += 50) {
        const angle = getWingFlapAngle('flying', t);
        expect(angle).toBeGreaterThanOrEqual(-45);
        expect(angle).toBeLessThanOrEqual(45);
      }
    });

    it('should return partial flap during landing', () => {
      const angle = getWingFlapAngle('landing', 0);
      // Landing should have some wing spread
      expect(typeof angle).toBe('number');
    });

    it('should return partial flap during taking-off', () => {
      const angle = getWingFlapAngle('taking-off', 100);
      expect(typeof angle).toBe('number');
    });

    it('should return a fixed glide angle when state is gliding', () => {
      const angle1 = getWingFlapAngle('gliding', 0);
      const angle2 = getWingFlapAngle('gliding', 500);
      // Gliding should return the same fixed spread angle regardless of time
      expect(angle1).toBe(angle2);
      // Wings should be slightly raised (negative angle = up) during glide
      expect(angle1).toBeLessThan(0);
      expect(angle1).toBeGreaterThan(-30);
    });

    it('should return a near-flat angle when soaring', () => {
      const angle1 = getWingFlapAngle('soaring', 0);
      const angle2 = getWingFlapAngle('soaring', 999);
      // Soaring should return the same fixed flat angle regardless of time
      expect(angle1).toBe(angle2);
      // Wings should be nearly flat (close to 0°, very slight tilt allowed)
      expect(Math.abs(angle1)).toBeLessThanOrEqual(5);
    });

    it('should return a swept-back angle when diving', () => {
      const angle1 = getWingFlapAngle('diving', 0);
      const angle2 = getWingFlapAngle('diving', 500);
      // Diving should return the same fixed swept-back angle
      expect(angle1).toBe(angle2);
      // Wings should be swept back tight (large positive angle = pulled back)
      expect(angle1).toBeGreaterThan(40);
      expect(angle1).toBeLessThan(70);
    });
  });

  describe('computeWingMode', () => {
    it('should return flapping at the start of flight', () => {
      expect(computeWingMode(0)).toBe('flapping');
    });

    it('should return flapping during the initial flap burst', () => {
      // Well within the first flap cycle
      expect(computeWingMode(200)).toBe('flapping');
      expect(computeWingMode(400)).toBe('flapping');
    });

    it('should return gliding after the flap burst ends', () => {
      // The flap phase is ~600ms, so after that we should be gliding
      expect(computeWingMode(700)).toBe('gliding');
      expect(computeWingMode(800)).toBe('gliding');
    });

    it('should return soaring after the glide phase ends', () => {
      // Flap 600ms + glide 400ms = 1000ms, soaring starts at 1000ms
      expect(computeWingMode(1050)).toBe('soaring');
      expect(computeWingMode(1200)).toBe('soaring');
    });

    it('should return diving after the soaring phase ends', () => {
      // Flap 600ms + glide 400ms + soar 500ms = 1500ms, diving starts at 1500ms
      expect(computeWingMode(1550)).toBe('diving');
      expect(computeWingMode(1700)).toBe('diving');
    });

    it('should cycle back to flapping after the diving phase', () => {
      // Full cycle: 600 flap + 400 glide + 500 soar + 300 dive = 1800ms
      // 1850ms is in the next flap phase
      expect(computeWingMode(1850)).toBe('flapping');
    });

    it('should keep cycling over long durations', () => {
      // Verify multiple cycles
      let flapCount = 0;
      let glideCount = 0;
      let soarCount = 0;
      let diveCount = 0;
      for (let t = 0; t < 7200; t += 50) {
        const mode = computeWingMode(t);
        if (mode === 'flapping') flapCount++;
        else if (mode === 'gliding') glideCount++;
        else if (mode === 'soaring') soarCount++;
        else diveCount++;
      }
      // All four modes should appear across 7.2 seconds (4 full cycles)
      expect(flapCount).toBeGreaterThan(0);
      expect(glideCount).toBeGreaterThan(0);
      expect(soarCount).toBeGreaterThan(0);
      expect(diveCount).toBeGreaterThan(0);
      // Flapping should be the most common (600/1800 = 33%)
      expect(flapCount).toBeGreaterThan(glideCount);
      expect(flapCount).toBeGreaterThan(diveCount);
    });

    it('should only return flapping, gliding, soaring, or diving', () => {
      for (let t = 0; t < 5000; t += 17) {
        const mode = computeWingMode(t);
        expect(['flapping', 'gliding', 'soaring', 'diving']).toContain(mode);
      }
    });
  });

  describe('computeSoaringOffset', () => {
    it('should return an object with dx and dy', () => {
      const offset = computeSoaringOffset(0, 30);
      expect(offset).toHaveProperty('dx');
      expect(offset).toHaveProperty('dy');
    });

    it('should return 0 offset at time 0', () => {
      const offset = computeSoaringOffset(0, 30);
      // At the start the sine is at 0
      expect(offset.dx).toBeCloseTo(0, 0);
    });

    it('should produce non-zero lateral offset during the soaring phase', () => {
      // Some point within a soaring phase should have lateral displacement
      let hasNonZero = false;
      for (let t = 100; t < 2000; t += 50) {
        const offset = computeSoaringOffset(t, 30);
        if (Math.abs(offset.dx) > 1 || Math.abs(offset.dy) > 1) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    });

    it('should scale offset with amplitude', () => {
      const small = computeSoaringOffset(500, 10);
      const large = computeSoaringOffset(500, 60);
      // Larger amplitude should produce larger displacement
      expect(Math.abs(large.dx)).toBeGreaterThanOrEqual(Math.abs(small.dx));
    });

    it('should produce S-shaped pattern over time (sign changes)', () => {
      // Collect dx values over one full S-curve period
      const values: number[] = [];
      for (let t = 0; t < 4000; t += 50) {
        values.push(computeSoaringOffset(t, 40).dx);
      }
      // Should have both positive and negative values (S-curve crosses zero)
      const hasPositive = values.some((v) => v > 1);
      const hasNegative = values.some((v) => v < -1);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it('should produce bounded offsets', () => {
      const amplitude = 40;
      for (let t = 0; t < 5000; t += 25) {
        const offset = computeSoaringOffset(t, amplitude);
        expect(Math.abs(offset.dx)).toBeLessThanOrEqual(amplitude * 1.5);
        expect(Math.abs(offset.dy)).toBeLessThanOrEqual(amplitude);
      }
    });

    it('should produce a secondary vertical undulation', () => {
      // dy should have some variation (gentle rising/falling)
      const dyValues: number[] = [];
      for (let t = 0; t < 3000; t += 100) {
        dyValues.push(computeSoaringOffset(t, 40).dy);
      }
      const hasVariation = dyValues.some((v) => Math.abs(v) > 0.5);
      expect(hasVariation).toBe(true);
    });
  });

  describe('computeDivingOffset', () => {
    it('should return an object with dx and dy', () => {
      const offset = computeDivingOffset(500, 30);
      expect(offset).toHaveProperty('dx');
      expect(offset).toHaveProperty('dy');
    });

    it('should produce a strong downward dy component', () => {
      // Diving should move the crow significantly downward
      const offset = computeDivingOffset(150, 40);
      expect(offset.dy).toBeGreaterThan(0); // positive y = downward on screen
    });

    it('should scale offset with amplitude', () => {
      const small = computeDivingOffset(200, 10);
      const large = computeDivingOffset(200, 60);
      // Larger amplitude should produce larger downward displacement
      expect(Math.abs(large.dy)).toBeGreaterThanOrEqual(Math.abs(small.dy));
    });

    it('should produce slight lateral wobble during dive', () => {
      // There should be some lateral displacement (wobble) over time
      let hasLateral = false;
      for (let t = 50; t < 1000; t += 50) {
        const offset = computeDivingOffset(t, 30);
        if (Math.abs(offset.dx) > 0.5) {
          hasLateral = true;
          break;
        }
      }
      expect(hasLateral).toBe(true);
    });

    it('should produce bounded offsets', () => {
      const amplitude = 40;
      for (let t = 0; t < 3000; t += 25) {
        const offset = computeDivingOffset(t, amplitude);
        // Lateral wobble should be small compared to amplitude
        expect(Math.abs(offset.dx)).toBeLessThanOrEqual(amplitude * 0.5);
        // Downward component bounded by amplitude
        expect(Math.abs(offset.dy)).toBeLessThanOrEqual(amplitude * 1.5);
      }
    });

    it('should return 0 lateral offset at time 0', () => {
      const offset = computeDivingOffset(0, 30);
      expect(offset.dx).toBeCloseTo(0, 0);
    });
  });

  describe('computePerchLinePositions', () => {
    const perchLine: PerchLine = { x: 100, y: 50, width: 200 };

    it('should return an array with the requested number of positions', () => {
      const positions = computePerchLinePositions(10, perchLine);
      expect(positions).toHaveLength(10);
    });

    it('should return positions with x and y properties', () => {
      const positions = computePerchLinePositions(5, perchLine);
      for (const pos of positions) {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
      }
    });

    it('should place all positions at the perch line y coordinate', () => {
      const positions = computePerchLinePositions(8, perchLine);
      for (const pos of positions) {
        expect(pos.y).toBe(perchLine.y);
      }
    });

    it('should distribute positions within the perch line width', () => {
      const positions = computePerchLinePositions(10, perchLine);
      for (const pos of positions) {
        expect(pos.x).toBeGreaterThanOrEqual(perchLine.x);
        expect(pos.x).toBeLessThanOrEqual(perchLine.x + perchLine.width);
      }
    });

    it('should space positions evenly across the line', () => {
      const positions = computePerchLinePositions(5, perchLine);
      // With 5 crows on a 200px line, spacing should be ~40px
      const sorted = [...positions].sort((a, b) => a.x - b.x);
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(sorted[i].x - sorted[i - 1].x);
      }
      // All gaps should be roughly equal
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      for (const gap of gaps) {
        expect(gap).toBeCloseTo(avgGap, 0);
      }
    });

    it('should handle a single crow', () => {
      const positions = computePerchLinePositions(1, perchLine);
      expect(positions).toHaveLength(1);
      // Single crow should be centered on the line
      expect(positions[0].x).toBeCloseTo(perchLine.x + perchLine.width / 2, 0);
      expect(positions[0].y).toBe(perchLine.y);
    });

    it('should handle more crows than pixels of width', () => {
      const narrowLine: PerchLine = { x: 50, y: 30, width: 10 };
      const positions = computePerchLinePositions(20, narrowLine);
      expect(positions).toHaveLength(20);
      // All positions should still be within or near the line
      for (const pos of positions) {
        expect(pos.x).toBeGreaterThanOrEqual(narrowLine.x);
        expect(pos.x).toBeLessThanOrEqual(narrowLine.x + narrowLine.width);
      }
    });

    it('should handle zero crows gracefully', () => {
      const positions = computePerchLinePositions(0, perchLine);
      expect(positions).toHaveLength(0);
    });
  });

  describe('distributeAmongPerchSpots', () => {
    const spots = [
      { x: 10, y: 50 },
      { x: 30, y: 50 },
      { x: 50, y: 50 },
      { x: 70, y: 50 },
      { x: 90, y: 50 },
    ];

    it('should return an array with the requested count', () => {
      const result = distributeAmongPerchSpots(10, spots);
      expect(result).toHaveLength(10);
    });

    it('should assign each crow to a valid spot', () => {
      const result = distributeAmongPerchSpots(8, spots);
      for (const pos of result) {
        expect(spots.some((s) => s.x === pos.x && s.y === pos.y)).toBe(true);
      }
    });

    it('should cycle through spots when count exceeds spots', () => {
      // 10 crows across 5 spots: each spot should get exactly 2
      const result = distributeAmongPerchSpots(10, spots);
      for (const spot of spots) {
        const assigned = result.filter((p) => p.x === spot.x && p.y === spot.y);
        expect(assigned.length).toBe(2);
      }
    });

    it('should handle fewer crows than spots', () => {
      const result = distributeAmongPerchSpots(3, spots);
      expect(result).toHaveLength(3);
      // Each assigned to a unique spot
      const unique = new Set(result.map((p) => `${p.x},${p.y}`));
      expect(unique.size).toBe(3);
    });

    it('should handle exactly one spot', () => {
      const single = [{ x: 42, y: 99 }];
      const result = distributeAmongPerchSpots(5, single);
      expect(result).toHaveLength(5);
      for (const pos of result) {
        expect(pos.x).toBe(42);
        expect(pos.y).toBe(99);
      }
    });

    it('should return empty array when count is 0', () => {
      expect(distributeAmongPerchSpots(0, spots)).toHaveLength(0);
    });

    it('should return empty array when spots is empty', () => {
      expect(distributeAmongPerchSpots(5, [])).toHaveLength(0);
    });
  });

  describe('computeGlyphVisualTop', () => {
    it('should shift y down by the difference between font ascent and glyph ascent', () => {
      // Font em-square ascent = 100px above baseline, glyph actual top = 80px above baseline
      // Gap above glyph = 100 - 80 = 20px, so visual top is 20px below the bounding rect top
      const result = computeGlyphVisualTop(200, 100, 80);
      expect(result).toBe(220);
    });

    it('should return boundingRectTop unchanged when ascent equals glyph ascent', () => {
      // No gap — glyph fills the full ascent
      expect(computeGlyphVisualTop(50, 90, 90)).toBe(50);
    });

    it('should handle zero ascent values', () => {
      expect(computeGlyphVisualTop(100, 0, 0)).toBe(100);
    });

    it('should handle large font sizes (7.5rem ≈ 120px)', () => {
      // Simulating a large display font where the em-square ascent is ~108px
      // but the glyph top for "a" is only ~72px above baseline
      const result = computeGlyphVisualTop(300, 108, 72);
      expect(result).toBe(336); // 300 + 36
    });

    it('should handle case where glyph ascent exceeds font ascent (rare)', () => {
      // Some decorative fonts have glyphs that extend above the em-square
      const result = computeGlyphVisualTop(100, 80, 90);
      expect(result).toBe(90); // 100 + (80 - 90) = 90 (moves up)
    });

    it('should produce different results for different characters', () => {
      // "d" has ascender (glyph ascent close to font ascent)
      const dTop = computeGlyphVisualTop(100, 96, 92);
      // "a" has no ascender (glyph ascent ≈ x-height)
      const aTop = computeGlyphVisualTop(100, 96, 68);
      expect(aTop).toBeGreaterThan(dTop);
    });
  });

  describe('computeRowInkCounts', () => {
    // Helper: build flat RGBA pixel data from rows of alpha values
    function makePixels(rows: number[][]): number[] {
      const data: number[] = [];
      for (const row of rows) {
        for (const a of row) {
          data.push(0, 0, 0, a);
        }
      }
      return data;
    }

    it('should count opaque pixels per row', () => {
      const pixels = makePixels([
        [0, 255, 255, 0],   // row 0: 2 opaque
        [255, 255, 255, 255], // row 1: 4 opaque
        [0, 0, 0, 0],        // row 2: 0 opaque
      ]);
      const counts = computeRowInkCounts(pixels, 4, 3);
      expect(counts).toEqual([2, 4, 0]);
    });

    it('should respect alpha threshold', () => {
      const pixels = makePixels([
        [50, 100, 150, 200], // with threshold 128: 2 opaque (150, 200)
      ]);
      const counts = computeRowInkCounts(pixels, 4, 1, 128);
      expect(counts).toEqual([2]);
    });

    it('should default threshold to 128', () => {
      const pixels = makePixels([
        [127, 128, 0, 255], // 127 < 128, 128 >= 128, 0 < 128, 255 >= 128
      ]);
      const counts = computeRowInkCounts(pixels, 4, 1);
      expect(counts).toEqual([2]);
    });

    it('should handle empty image', () => {
      expect(computeRowInkCounts([], 0, 0)).toEqual([]);
    });
  });

  describe('findGlyphLedges', () => {
    it('should find a single ledge at the top of a block', () => {
      //  . . . . .   row 0: 0 ink
      //  # # # # #   row 1: 5 ink → ledge
      //  # # # # #   row 2: 5 ink (continuation)
      //  . . . . .   row 3: 0 ink
      const counts = [0, 5, 5, 0];
      const ledges = findGlyphLedges(counts, 5);
      expect(ledges).toEqual([1]);
    });

    it('should find two ledges separated by a gap', () => {
      //  # # # #    row 0: 4 → ledge 1
      //  # # # #    row 1: 4 (continuation)
      //  . . . .    row 2: 0 (gap)
      //  . . . .    row 3: 0 (gap)
      //  # # # #    row 4: 4 → ledge 2
      //  # # # #    row 5: 4
      const counts = [4, 4, 0, 0, 4, 4];
      const ledges = findGlyphLedges(counts, 4);
      expect(ledges).toEqual([0, 4]);
    });

    it('should ignore rows below minInkFraction', () => {
      // Thin vertical stroke (1 pixel) should not count as a ledge
      // when minInkFraction requires 2+ pixels out of 10
      const counts = [0, 1, 1, 1, 0, 8, 8, 0];
      const ledges = findGlyphLedges(counts, 10, 0.2); // need 2+ px
      expect(ledges).toEqual([5]);
    });

    it('should merge ledges within mergeDistance', () => {
      // Two ledges only 2 rows apart — should merge
      const counts = [5, 0, 5, 5];
      const ledges = findGlyphLedges(counts, 5, 0.15, 3);
      expect(ledges).toEqual([0]); // second ledge at row 2 merged into first
    });

    it('should not merge ledges beyond mergeDistance', () => {
      const counts = [5, 0, 0, 0, 0, 5];
      const ledges = findGlyphLedges(counts, 5, 0.15, 3);
      expect(ledges).toEqual([0, 5]); // 5 rows apart > mergeDistance 3
    });

    it('should return empty for all-empty glyph', () => {
      expect(findGlyphLedges([0, 0, 0, 0], 5)).toEqual([]);
    });

    it('should return empty for empty array', () => {
      expect(findGlyphLedges([], 5)).toEqual([]);
    });

    it('should handle letter "i" shape (dot + stem)', () => {
      // Simulates "i": dot at rows 2-4, gap at 5-7, stem at 8-14
      const counts = [
        0, 0,       // empty above dot
        3, 3, 3,    // dot (rows 2-4)
        0, 0, 0,    // gap (rows 5-7)
        5, 5, 5, 5, 5, 5, 5, // stem (rows 8-14)
      ];
      const ledges = findGlyphLedges(counts, 10, 0.15);
      expect(ledges).toEqual([2, 8]); // dot top and stem top
    });

    it('should find ledge at row 0 when glyph starts with ink', () => {
      const counts = [5, 5, 5];
      const ledges = findGlyphLedges(counts, 5);
      expect(ledges).toEqual([0]);
    });
  });

  describe('findInkCenterInRow', () => {
    function makePixels(rows: number[][]): number[] {
      const data: number[] = [];
      for (const row of rows) {
        for (const a of row) {
          data.push(0, 0, 0, a);
        }
      }
      return data;
    }

    it('should return center of ink extent', () => {
      // Row: . # # # .   (ink from col 1 to 3, center = 2)
      const pixels = makePixels([[0, 255, 255, 255, 0]]);
      expect(findInkCenterInRow(pixels, 5, 0)).toBe(2);
    });

    it('should return center of full-width ink', () => {
      // Row: # # # # #   (center = 2)
      const pixels = makePixels([[255, 255, 255, 255, 255]]);
      expect(findInkCenterInRow(pixels, 5, 0)).toBe(2);
    });

    it('should return center of left-side ink', () => {
      // Row: # # . . .   (ink cols 0-1, center = 0.5)
      const pixels = makePixels([[255, 255, 0, 0, 0]]);
      expect(findInkCenterInRow(pixels, 5, 0)).toBe(0.5);
    });

    it('should handle two separated ink regions (returns overall center)', () => {
      // Row: # . . . #   (leftmost=0, rightmost=4, center=2)
      const pixels = makePixels([[255, 0, 0, 0, 255]]);
      expect(findInkCenterInRow(pixels, 5, 0)).toBe(2);
    });

    it('should return null for empty row', () => {
      const pixels = makePixels([[0, 0, 0, 0, 0]]);
      expect(findInkCenterInRow(pixels, 5, 0)).toBeNull();
    });

    it('should read correct row from multi-row data', () => {
      const pixels = makePixels([
        [0, 0, 0, 0, 0],     // row 0: empty
        [0, 0, 255, 255, 0], // row 1: ink at cols 2-3, center = 2.5
      ]);
      expect(findInkCenterInRow(pixels, 5, 1)).toBe(2.5);
    });

    it('should respect alpha threshold', () => {
      // Row: 50 200 200 50   threshold 128 → ink at cols 1-2, center 1.5
      const pixels = makePixels([[50, 200, 200, 50]]);
      expect(findInkCenterInRow(pixels, 4, 0, 128)).toBe(1.5);
    });
  });

  describe('computeRowInteriorGapCounts', () => {
    function makePixels(rows: number[][]): number[] {
      const data: number[] = [];
      for (const row of rows) {
        for (const a of row) {
          data.push(0, 0, 0, a);
        }
      }
      return data;
    }

    it('should count transparent pixels between ink on both sides', () => {
      // Row: # # . . # #   (2 interior gaps at cols 2-3)
      const pixels = makePixels([[255, 255, 0, 0, 255, 255]]);
      const counts = computeRowInteriorGapCounts(pixels, 6, 1);
      expect(counts).toEqual([2]);
    });

    it('should return 0 for rows with no interior gap', () => {
      // Row: # # # # # (solid)
      const pixels = makePixels([[255, 255, 255, 255, 255]]);
      expect(computeRowInteriorGapCounts(pixels, 5, 1)).toEqual([0]);
    });

    it('should return 0 for rows with only edge transparency', () => {
      // Row: . . # # .  (transparent only at edges, not interior)
      const pixels = makePixels([[0, 0, 255, 255, 0]]);
      expect(computeRowInteriorGapCounts(pixels, 5, 1)).toEqual([0]);
    });

    it('should handle fully transparent row', () => {
      const pixels = makePixels([[0, 0, 0, 0, 0]]);
      expect(computeRowInteriorGapCounts(pixels, 5, 1)).toEqual([0]);
    });

    it('should handle multiple rows', () => {
      const pixels = makePixels([
        [255, 0, 0, 255],  // 2 interior gaps
        [255, 255, 255, 255],  // 0 interior gaps
        [255, 0, 255, 0],  // 1 interior gap (col 1)
      ]);
      expect(computeRowInteriorGapCounts(pixels, 4, 3)).toEqual([2, 0, 1]);
    });

    it('should handle "0" shape cross-section', () => {
      // # # . . . # #   (3 interior gaps)
      const pixels = makePixels([[255, 255, 0, 0, 0, 255, 255]]);
      expect(computeRowInteriorGapCounts(pixels, 7, 1)).toEqual([3]);
    });

    it('should handle empty image', () => {
      expect(computeRowInteriorGapCounts([], 0, 0)).toEqual([]);
    });
  });

  describe('findCounterBottoms', () => {
    it('should find the bottom of a single hole', () => {
      // "0" shape: solid → hole → solid
      // Rows:  solid(0-2), hole(3-7), solid(8-10)
      const gapCounts = [0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0];
      const bottoms = findCounterBottoms(gapCounts, 7, 0.2);
      // Bottom of hole is the last row with interior gap = row 7
      expect(bottoms).toEqual([7]);
    });

    it('should find bottoms of two separate holes', () => {
      // "8" shape: upper hole rows 2-4, lower hole rows 7-9
      const gapCounts = [0, 0, 3, 3, 3, 0, 0, 3, 3, 3, 0, 0];
      const bottoms = findCounterBottoms(gapCounts, 7, 0.2);
      expect(bottoms).toEqual([4, 9]);
    });

    it('should ignore small gaps below minGapFraction', () => {
      // A trivial 1px gap in a 10px wide glyph (fraction 0.1 < 0.2)
      const gapCounts = [0, 1, 0];
      expect(findCounterBottoms(gapCounts, 10, 0.2)).toEqual([]);
    });

    it('should merge nearby counter bottoms within mergeDistance', () => {
      // Two holes only 2 rows apart
      const gapCounts = [0, 3, 3, 0, 0, 3, 3, 0];
      const bottoms = findCounterBottoms(gapCounts, 7, 0.2, 3);
      // Row 2 and row 6 are bottoms, but 6-2=4 > 3, so NOT merged
      expect(bottoms).toEqual([2, 6]);
    });

    it('should merge counter bottoms within merge distance', () => {
      const gapCounts = [0, 3, 0, 3, 0];
      // Bottoms at row 1 and row 3, distance = 2 <= mergeDistance 3
      const bottoms = findCounterBottoms(gapCounts, 7, 0.2, 3);
      expect(bottoms).toEqual([3]); // keep only last
    });

    it('should return empty for no interior gaps', () => {
      expect(findCounterBottoms([0, 0, 0, 0], 5, 0.2)).toEqual([]);
    });

    it('should return empty for empty array', () => {
      expect(findCounterBottoms([], 5, 0.2)).toEqual([]);
    });

    it('should handle gap that extends to bottom of glyph', () => {
      // Open counter: gap never closes (like "u" bottom)
      const gapCounts = [0, 0, 3, 3, 3];
      // The gap ends at the last row — bottom is row 4
      const bottoms = findCounterBottoms(gapCounts, 7, 0.2);
      expect(bottoms).toEqual([4]);
    });
  });

  describe('findInteriorGapCenter', () => {
    function makePixels(rows: number[][]): number[] {
      const data: number[] = [];
      for (const row of rows) {
        for (const a of row) {
          data.push(0, 0, 0, a);
        }
      }
      return data;
    }

    it('should return center of interior transparent region', () => {
      // Row: # # . . . # #   gap at cols 2-4, center = 3
      const pixels = makePixels([[255, 255, 0, 0, 0, 255, 255]]);
      expect(findInteriorGapCenter(pixels, 7, 0)).toBe(3);
    });

    it('should return center for asymmetric gap', () => {
      // Row: # . . . . # #   gap at cols 1-4, center = 2.5
      const pixels = makePixels([[255, 0, 0, 0, 0, 255, 255]]);
      expect(findInteriorGapCenter(pixels, 7, 0)).toBe(2.5);
    });

    it('should return null for row with no interior gap', () => {
      // Row: . . # # # . .   (no ink on both sides of transparent regions)
      const pixels = makePixels([[0, 0, 255, 255, 255, 0, 0]]);
      expect(findInteriorGapCenter(pixels, 7, 0)).toBeNull();
    });

    it('should return null for fully opaque row', () => {
      const pixels = makePixels([[255, 255, 255, 255, 255]]);
      expect(findInteriorGapCenter(pixels, 5, 0)).toBeNull();
    });

    it('should return null for fully transparent row', () => {
      const pixels = makePixels([[0, 0, 0, 0, 0]]);
      expect(findInteriorGapCenter(pixels, 5, 0)).toBeNull();
    });

    it('should handle single-pixel gap', () => {
      // Row: # # . # #   gap at col 2 only, center = 2
      const pixels = makePixels([[255, 255, 0, 255, 255]]);
      expect(findInteriorGapCenter(pixels, 5, 0)).toBe(2);
    });

    it('should read correct row from multi-row data', () => {
      const pixels = makePixels([
        [255, 255, 255, 255, 255], // row 0: solid
        [255, 0, 0, 0, 255],       // row 1: gap at 1-3, center = 2
      ]);
      expect(findInteriorGapCenter(pixels, 5, 1)).toBe(2);
    });
  });

  describe('isSpotOccupied', () => {
    it('should return true when a spot is within minDistance of an occupied spot', () => {
      const occupied = [{ x: 100, y: 200 }, { x: 300, y: 400 }];
      expect(isSpotOccupied({ x: 105, y: 202 }, occupied, 20)).toBe(true);
    });

    it('should return false when no occupied spots are within minDistance', () => {
      const occupied = [{ x: 100, y: 200 }, { x: 300, y: 400 }];
      expect(isSpotOccupied({ x: 500, y: 500 }, occupied, 20)).toBe(false);
    });

    it('should return false when occupied list is empty', () => {
      expect(isSpotOccupied({ x: 100, y: 200 }, [], 20)).toBe(false);
    });

    it('should use exact distance comparison', () => {
      const occupied = [{ x: 0, y: 0 }];
      // Distance exactly 20 — should NOT be occupied (< not <=)
      expect(isSpotOccupied({ x: 20, y: 0 }, occupied, 20)).toBe(false);
      // Distance 19.99 — should be occupied
      expect(isSpotOccupied({ x: 19, y: 0 }, occupied, 20)).toBe(true);
    });
  });

  describe('pickAvailablePerchSpot', () => {
    const spots = [
      { x: 10, y: 50 },
      { x: 30, y: 50 },
      { x: 50, y: 50 },
      { x: 70, y: 50 },
      { x: 90, y: 50 },
    ];

    it('should return the assigned spot when it is not occupied', () => {
      const result = pickAvailablePerchSpot(0, spots, [], 15);
      expect(result).toEqual({ x: 10, y: 50 });
    });

    it('should return nearest unoccupied spot when assigned spot is taken', () => {
      const occupied = [{ x: 10, y: 50 }]; // spot 0 is taken
      const result = pickAvailablePerchSpot(0, spots, occupied, 15);
      // Should pick spot 1 (x=30) as nearest alternative
      expect(result).toEqual({ x: 30, y: 50 });
    });

    it('should cycle crow index through spots', () => {
      // Crow 7 with 5 spots → index 2
      const result = pickAvailablePerchSpot(7, spots, [], 15);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('should return null when all spots are occupied', () => {
      const occupied = spots.map(s => ({ ...s }));
      const result = pickAvailablePerchSpot(0, spots, occupied, 15);
      expect(result).toBeNull();
    });

    it('should return null when spots array is empty', () => {
      expect(pickAvailablePerchSpot(0, [], [], 15)).toBeNull();
    });

    it('should skip spots near multiple occupied positions', () => {
      const occupied = [{ x: 10, y: 50 }, { x: 30, y: 50 }];
      const result = pickAvailablePerchSpot(0, spots, occupied, 15);
      expect(result).toEqual({ x: 50, y: 50 });
    });
  });

  describe('computeScareResponse', () => {
    it('should return a flee vector away from mouse position', () => {
      const crow = { x: 100, y: 100 };
      const mouse = { x: 110, y: 100 }; // mouse to the right
      const result = computeScareResponse(crow, mouse, [], 80, 120);
      // Crow should flee to the left (negative dx)
      expect(result.fleeDirection.dx).toBeLessThan(0);
      expect(result.scaredNearbyIds).toEqual([]);
    });

    it('should identify nearby perched crows within chainRadius', () => {
      const crow = { x: 100, y: 100 };
      const mouse = { x: 110, y: 100 };
      const nearby = [
        { id: 5, x: 130, y: 100 },  // 30px away — within 120 chain radius
        { id: 8, x: 400, y: 100 },  // 300px away — outside chain radius
        { id: 3, x: 115, y: 110 },  // ~18px away — within chain radius
      ];
      const result = computeScareResponse(crow, mouse, nearby, 80, 120);
      expect(result.scaredNearbyIds).toContain(5);
      expect(result.scaredNearbyIds).toContain(3);
      expect(result.scaredNearbyIds).not.toContain(8);
    });

    it('should produce a flee vector with nonzero magnitude', () => {
      const crow = { x: 200, y: 300 };
      const mouse = { x: 200, y: 280 }; // mouse above
      const result = computeScareResponse(crow, mouse, [], 80, 120);
      // Crow should flee downward (positive dy)
      expect(result.fleeDirection.dy).toBeGreaterThan(0);
    });

    it('should handle mouse at exact crow position', () => {
      const crow = { x: 100, y: 100 };
      const mouse = { x: 100, y: 100 };
      const result = computeScareResponse(crow, mouse, [], 80, 120);
      // Should still produce a valid flee direction (random upward)
      expect(result.fleeDirection.dy).toBeLessThan(0);
    });

    it('should normalize flee direction', () => {
      const crow = { x: 0, y: 0 };
      const mouse = { x: 30, y: 40 };
      const result = computeScareResponse(crow, mouse, [], 80, 120);
      const mag = Math.sqrt(
        result.fleeDirection.dx ** 2 + result.fleeDirection.dy ** 2
      );
      expect(mag).toBeCloseTo(1, 1);
    });
  });

  describe('shouldAttemptLanding', () => {
    it('should return false when distance is too far', () => {
      expect(shouldAttemptLanding(100, 5000, 2000, 0.5)).toBe(false);
    });

    it('should return false when flight time is below minimum', () => {
      expect(shouldAttemptLanding(10, 500, 2000, 1.0)).toBe(false);
    });

    it('should return true when close enough and flight time met and roll succeeds', () => {
      // landingChance = 1.0 guarantees landing
      expect(shouldAttemptLanding(10, 5000, 2000, 1.0)).toBe(true);
    });

    it('should return false when landing chance is 0', () => {
      expect(shouldAttemptLanding(10, 5000, 2000, 0.0)).toBe(false);
    });

    it('should use default landingRadius of 25', () => {
      // At distance 24, should be within range
      expect(shouldAttemptLanding(24, 5000, 2000, 1.0)).toBe(true);
      // At distance 26, should be out of range
      expect(shouldAttemptLanding(26, 5000, 2000, 1.0)).toBe(false);
    });

    it('should accept custom landing radius', () => {
      expect(shouldAttemptLanding(40, 5000, 2000, 1.0, 50)).toBe(true);
      expect(shouldAttemptLanding(55, 5000, 2000, 1.0, 50)).toBe(false);
    });
  });

  describe('easeInOutCubic', () => {
    it('should return 0 at t=0', () => {
      expect(easeInOutCubic(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(easeInOutCubic(1)).toBe(1);
    });

    it('should return 0.5 at t=0.5', () => {
      expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    });

    it('should ease in slowly at start', () => {
      const val = easeInOutCubic(0.1);
      expect(val).toBeLessThan(0.1);
    });

    it('should ease out slowly at end', () => {
      const val = easeInOutCubic(0.9);
      expect(val).toBeGreaterThan(0.9);
    });
  });

  describe('CrowStateMachine', () => {
    let machine: CrowStateMachine;

    beforeEach(() => {
      machine = new CrowStateMachine(targets);
    });

    it('should start in perched state', () => {
      expect(machine.getState()).toBe('perched');
    });

    it('should start at the first target (shoulder)', () => {
      expect(machine.getCurrentTarget().id).toBe('shoulder');
    });

    it('should start at the specified target when startingTargetId is provided', () => {
      const m = new CrowStateMachine(targets, 'logo');
      expect(machine.getState()).toBe('perched');
      expect(m.getCurrentTarget().id).toBe('logo');
    });

    it('should fall back to first target when startingTargetId is not found', () => {
      const m = new CrowStateMachine(targets, 'nonexistent');
      expect(m.getCurrentTarget().id).toBe('shoulder');
    });

    it('should fall back to first target when startingTargetId is undefined', () => {
      const m = new CrowStateMachine(targets, undefined);
      expect(m.getCurrentTarget().id).toBe('shoulder');
    });

    it('should transition to flying when startFlight is called', () => {
      machine.startFlight();
      expect(machine.getState()).toBe('flying');
    });

    it('should pick a new target when starting flight', () => {
      machine.startFlight();
      const target = machine.getFlightTarget();
      expect(target).toBeDefined();
      expect(target!.id).not.toBe('shoulder');
    });

    it('should transition to perched when completeFlight is called', () => {
      machine.startFlight();
      machine.completeFlight();
      expect(machine.getState()).toBe('perched');
    });

    it('should update current target after completing flight', () => {
      machine.startFlight();
      const flightTarget = machine.getFlightTarget()!;
      machine.completeFlight();
      expect(machine.getCurrentTarget().id).toBe(flightTarget.id);
    });

    it('should not start flight when already flying', () => {
      machine.startFlight();
      const target1 = machine.getFlightTarget();
      machine.startFlight(); // should be no-op
      expect(machine.getFlightTarget()).toEqual(target1);
    });

    it('should not complete flight when not flying', () => {
      machine.completeFlight(); // should be no-op
      expect(machine.getState()).toBe('perched');
      expect(machine.getCurrentTarget().id).toBe('shoulder');
    });

    it('should return flight progress as 0 when perched', () => {
      expect(machine.getFlightProgress()).toBe(0);
    });

    it('should track flight start time', () => {
      machine.startFlight();
      expect(machine.getFlightStartTime()).toBeGreaterThan(0);
    });

    it('should return the flight duration', () => {
      expect(machine.getFlightDuration()).toBeGreaterThan(0);
    });

    it('should allow setting a custom flight duration', () => {
      machine.setFlightDuration(3000);
      expect(machine.getFlightDuration()).toBe(3000);
    });

    it('should support carrying an item', () => {
      expect(machine.getCarriedItem()).toBeNull();
      machine.setCarriedItem('letter');
      expect(machine.getCarriedItem()).toBe('letter');
    });

    it('should allow dropping carried item', () => {
      machine.setCarriedItem('letter');
      machine.setCarriedItem(null);
      expect(machine.getCarriedItem()).toBeNull();
    });

    it('should return current position when perched', () => {
      const pos = machine.getCurrentPosition();
      expect(pos.x).toBe(200);
      expect(pos.y).toBe(400);
      expect(pos.scale).toBe(1.0);
    });

    it('should return interpolated position when flying', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      machine.startFlight();

      // Simulate halfway through flight
      const duration = machine.getFlightDuration();
      vi.spyOn(Date, 'now').mockReturnValue(1000 + duration / 2);
      const pos = machine.getCurrentPosition();

      // Should be somewhere between start and target
      expect(pos.x).not.toBe(200);
      expect(pos.y).not.toBe(400);

      vi.restoreAllMocks();
    });

    it('should allow updating targets', () => {
      const newTargets: CrowTarget[] = [
        { id: 'new1', x: 100, y: 100, scale: 0.5 },
        { id: 'new2', x: 200, y: 200, scale: 0.5 }
      ];
      machine.updateTargets(newTargets);
      machine.startFlight();
      const target = machine.getFlightTarget();
      expect(newTargets.some((t) => t.id === target!.id)).toBe(true);
    });

    it('should provide all available carried items', () => {
      const items = CrowStateMachine.availableItems();
      expect(items).toContain('letter');
      expect(items).toContain('flower');
      expect(items).toContain('key');
      expect(Array.isArray(items)).toBe(true);
    });

    it('should flee when startFleeingFlight is called while perched', () => {
      machine.startFleeingFlight(300, 500);
      expect(machine.getState()).toBe('flying');
    });

    it('should pick a target far from the mouse when fleeing', () => {
      // Mouse is near shoulder (200, 400), so it should flee to a distant target
      machine.startFleeingFlight(200, 400);
      const target = machine.getFlightTarget();
      expect(target).toBeDefined();
      expect(target!.id).not.toBe('shoulder');
    });

    it('should not flee when already flying', () => {
      machine.startFlight();
      const target1 = machine.getFlightTarget();
      machine.startFleeingFlight(100, 100);
      expect(machine.getFlightTarget()).toEqual(target1);
    });

    it('should use shorter flight duration when fleeing', () => {
      machine.setFlightDuration(2500);
      machine.startFleeingFlight(200, 400);
      // Fleeing flight should be faster (shorter duration)
      expect(machine.getFlightDuration()).toBeLessThan(2500);
    });
  });

  describe('isMouseTooClose', () => {
    it('should return true when mouse is within scare radius', () => {
      const crowPos = { x: 200, y: 300 };
      const mousePos = { x: 210, y: 310 };
      expect(isMouseTooClose(crowPos, mousePos, 100)).toBe(true);
    });

    it('should return false when mouse is outside scare radius', () => {
      const crowPos = { x: 200, y: 300 };
      const mousePos = { x: 500, y: 600 };
      expect(isMouseTooClose(crowPos, mousePos, 100)).toBe(false);
    });

    it('should return true when mouse is exactly at crow position', () => {
      const pos = { x: 200, y: 300 };
      expect(isMouseTooClose(pos, pos, 50)).toBe(true);
    });

    it('should return false when mouse is exactly at the radius boundary', () => {
      const crowPos = { x: 200, y: 300 };
      // Distance = exactly 100
      const mousePos = { x: 300, y: 300 };
      // At boundary, not "too close" (strictly less than)
      expect(isMouseTooClose(crowPos, mousePos, 100)).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const crowPos = { x: -100, y: -200 };
      const mousePos = { x: -90, y: -190 };
      expect(isMouseTooClose(crowPos, mousePos, 50)).toBe(true);
    });
  });

  describe('getIdleAnimation', () => {
    it('should return an object with headTilt, bodyShiftX, bodyShiftY', () => {
      const anim = getIdleAnimation(0);
      expect(anim).toHaveProperty('headTilt');
      expect(anim).toHaveProperty('bodyShiftX');
      expect(anim).toHaveProperty('bodyShiftY');
    });

    it('should return subtle values (all within small ranges)', () => {
      for (let t = 0; t < 10000; t += 500) {
        const anim = getIdleAnimation(t);
        expect(anim.headTilt).toBeGreaterThanOrEqual(-6);
        expect(anim.headTilt).toBeLessThanOrEqual(6);
        expect(anim.bodyShiftX).toBeGreaterThanOrEqual(-2);
        expect(anim.bodyShiftX).toBeLessThanOrEqual(2);
        expect(anim.bodyShiftY).toBeGreaterThanOrEqual(-2);
        expect(anim.bodyShiftY).toBeLessThanOrEqual(2);
      }
    });

    it('should produce varying values over time', () => {
      const anim1 = getIdleAnimation(0);
      const anim2 = getIdleAnimation(2000);
      // At least one property should differ meaningfully
      const diff =
        Math.abs(anim1.headTilt - anim2.headTilt) +
        Math.abs(anim1.bodyShiftX - anim2.bodyShiftX) +
        Math.abs(anim1.bodyShiftY - anim2.bodyShiftY);
      expect(diff).toBeGreaterThan(0.01);
    });

    it('should have a tailWag property', () => {
      const anim = getIdleAnimation(500);
      expect(anim).toHaveProperty('tailWag');
      expect(typeof anim.tailWag).toBe('number');
    });

    it('should have a lookDirection property for eye movement', () => {
      const anim = getIdleAnimation(1000);
      expect(anim).toHaveProperty('lookDirection');
      expect(typeof anim.lookDirection).toBe('number');
    });
  });

  describe('CrowTarget zIndex support', () => {
    it('should allow zIndex on a CrowTarget', () => {
      const target: CrowTarget = { id: 'shoulder', x: 200, y: 400, scale: 1.5, zIndex: 35 };
      expect(target.zIndex).toBe(35);
    });

    it('should make zIndex optional (defaults to undefined)', () => {
      const target: CrowTarget = { id: 'logo', x: 500, y: 100, scale: 0.4 };
      expect(target.zIndex).toBeUndefined();
    });
  });

  describe('CrowTarget anchor support', () => {
    it('should allow anchorSelector on a CrowTarget', () => {
      const target: CrowTarget = {
        id: 'logo', x: 0, y: 0, scale: 0.4,
        anchorSelector: '.hero-logo'
      };
      expect(target.anchorSelector).toBe('.hero-logo');
    });

    it('should make anchorSelector optional (defaults to undefined)', () => {
      const target: CrowTarget = { id: 'shoulder', x: 200, y: 400, scale: 1.5 };
      expect(target.anchorSelector).toBeUndefined();
    });

    it('should allow anchorAlign on a CrowTarget', () => {
      const target: CrowTarget = {
        id: 'title', x: 0, y: 0, scale: 0.35,
        anchorSelector: '.hero-title',
        anchorAlign: { x: 0.65, y: 0 }
      };
      expect(target.anchorAlign).toEqual({ x: 0.65, y: 0 });
    });

    it('should make anchorAlign optional (defaults to undefined)', () => {
      const target: CrowTarget = {
        id: 'logo', x: 0, y: 0, scale: 0.4,
        anchorSelector: '.hero-logo'
      };
      expect(target.anchorAlign).toBeUndefined();
    });

    it('should work with all CrowTarget fields together', () => {
      const target: CrowTarget = {
        id: 'cta', x: 100, y: 200, scale: 0.3,
        flipX: true, zIndex: 45,
        anchorSelector: '.hero-cta',
        anchorAlign: { x: 0.5, y: 0 }
      };
      expect(target.id).toBe('cta');
      expect(target.anchorSelector).toBe('.hero-cta');
      expect(target.anchorAlign).toEqual({ x: 0.5, y: 0 });
      expect(target.zIndex).toBe(45);
    });
  });

  describe('CrowStateMachine getCurrentZIndex', () => {
    it('should return current target zIndex when perched', () => {
      const targetsWithZ: CrowTarget[] = [
        { id: 'shoulder', x: 200, y: 400, scale: 1.5, zIndex: 35 },
        { id: 'logo', x: 500, y: 100, scale: 0.4, zIndex: 45 },
      ];
      const m = new CrowStateMachine(targetsWithZ);
      expect(m.getCurrentZIndex()).toBe(35);
    });

    it('should return default z-index (45) when target has no zIndex', () => {
      const targetsNoZ: CrowTarget[] = [
        { id: 'shoulder', x: 200, y: 400, scale: 1.0 },
        { id: 'logo', x: 500, y: 100, scale: 0.4 },
      ];
      const m = new CrowStateMachine(targetsNoZ);
      expect(m.getCurrentZIndex()).toBe(45);
    });

    it('should return flying z-index (45) when in flight', () => {
      const targetsWithZ: CrowTarget[] = [
        { id: 'shoulder', x: 200, y: 400, scale: 1.5, zIndex: 35 },
        { id: 'logo', x: 500, y: 100, scale: 0.4, zIndex: 45 },
      ];
      const m = new CrowStateMachine(targetsWithZ);
      m.startFlight();
      expect(m.getCurrentZIndex()).toBe(45);
    });

    it('should return target zIndex after completing flight to that target', () => {
      const targetsWithZ: CrowTarget[] = [
        { id: 'shoulder', x: 200, y: 400, scale: 1.5, zIndex: 35 },
        { id: 'logo', x: 500, y: 100, scale: 0.4, zIndex: 51 },
      ];
      const m = new CrowStateMachine(targetsWithZ);
      m.startFlight();
      m.completeFlight();
      const target = m.getCurrentTarget();
      expect(m.getCurrentZIndex()).toBe(target.zIndex);
    });

    it('should use custom default z-index parameter', () => {
      const targetsNoZ: CrowTarget[] = [
        { id: 'a', x: 0, y: 0, scale: 1.0 },
      ];
      const m = new CrowStateMachine(targetsNoZ);
      expect(m.getCurrentZIndex(50)).toBe(50);
    });
  });

  describe('pickRandomCharIndex', () => {
    it('should return an index of a non-whitespace character', () => {
      const text = 'hello world';
      for (let i = 0; i < 50; i++) {
        const idx = pickRandomCharIndex(text);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(text.length);
        expect(text[idx]).not.toMatch(/\s/);
      }
    });

    it('should return -1 for whitespace-only string', () => {
      expect(pickRandomCharIndex('   ')).toBe(-1);
    });

    it('should return -1 for empty string', () => {
      expect(pickRandomCharIndex('')).toBe(-1);
    });

    it('should handle single character', () => {
      expect(pickRandomCharIndex('a')).toBe(0);
    });

    it('should eventually pick different characters', () => {
      const text = 'abcdef';
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) {
        seen.add(pickRandomCharIndex(text));
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    it('should skip whitespace characters like tabs and newlines', () => {
      const text = '\t\n a \t';
      for (let i = 0; i < 50; i++) {
        const idx = pickRandomCharIndex(text);
        expect(idx).toBe(3); // only non-whitespace is 'a' at index 3
      }
    });
  });

  describe('findTextNodeOffset', () => {
    it('should return first node for index within first node', () => {
      expect(findTextNodeOffset([5, 4], 3)).toEqual({ nodeIndex: 0, offset: 3 });
    });

    it('should return second node for index past first node', () => {
      expect(findTextNodeOffset([5, 4], 7)).toEqual({ nodeIndex: 1, offset: 2 });
    });

    it('should return null for charIndex beyond total length', () => {
      expect(findTextNodeOffset([5, 4], 10)).toBeNull();
    });

    it('should return null for negative charIndex', () => {
      expect(findTextNodeOffset([5], -1)).toBeNull();
    });

    it('should handle single node', () => {
      expect(findTextNodeOffset([10], 5)).toEqual({ nodeIndex: 0, offset: 5 });
    });

    it('should handle index at exact node boundary (start of next node)', () => {
      expect(findTextNodeOffset([5, 5], 5)).toEqual({ nodeIndex: 1, offset: 0 });
    });

    it('should handle empty nodes array', () => {
      expect(findTextNodeOffset([], 0)).toBeNull();
    });

    it('should handle three or more nodes', () => {
      expect(findTextNodeOffset([3, 4, 5], 9)).toEqual({ nodeIndex: 2, offset: 2 });
    });

    it('should return first position for index 0', () => {
      expect(findTextNodeOffset([5, 5], 0)).toEqual({ nodeIndex: 0, offset: 0 });
    });

    it('should handle last valid index', () => {
      expect(findTextNodeOffset([5, 4], 8)).toEqual({ nodeIndex: 1, offset: 3 });
    });
  });

  describe('CrowTarget textAware support', () => {
    it('should allow textAware on a CrowTarget', () => {
      const target: CrowTarget = {
        id: 'title', x: 0, y: 0, scale: 0.35,
        anchorSelector: '.hero-title',
        textAware: true
      };
      expect(target.textAware).toBe(true);
    });

    it('should make textAware optional (defaults to undefined)', () => {
      const target: CrowTarget = { id: 'logo', x: 500, y: 100, scale: 0.4 };
      expect(target.textAware).toBeUndefined();
    });

    it('should work with all CrowTarget fields together', () => {
      const target: CrowTarget = {
        id: 'title', x: 0, y: 0, scale: 0.35,
        flipX: true, zIndex: 45,
        anchorSelector: '.hero-title',
        anchorAlign: { x: 0.5, y: 0 },
        textAware: true
      };
      expect(target.textAware).toBe(true);
      expect(target.anchorSelector).toBe('.hero-title');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Murder of crows — the easter egg where 42 crows flock in
  // ═══════════════════════════════════════════════════════════════════

  describe('MurderDetector', () => {
    it('should fire callback when "murder" is typed', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should not fire on partial word', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murd') detector.feed(ch);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should accept uppercase letters', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'MURDER') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should accept mixed case letters', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'MuRdEr') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should reset after a wrong letter', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murxmurder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should reset buffer after triggering', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murdermurder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('should handle overlapping: m-u-r-d-e-r-m-u-r-d-e-r', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      // type "murder" twice back-to-back
      for (const ch of 'murdermurder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('should not fire for "murders" before completing "murder"', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murde') detector.feed(ch);
      expect(cb).not.toHaveBeenCalled();
      detector.feed('r');
      expect(cb).toHaveBeenCalledTimes(1);
      // An 's' after 'murder' shouldn't trigger anything extra
      detector.feed('s');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should fire only once per complete word', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      for (const ch of 'murder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should handle "m" restart mid-sequence correctly', () => {
      const cb = vi.fn();
      const detector = new MurderDetector(cb);
      // "murm" then "urder" — the m should restart the buffer
      for (const ch of 'murmurder') detector.feed(ch);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateOffscreenSpawnPoints', () => {
    const viewport = { width: 1920, height: 1080 };

    it('should generate the requested number of points', () => {
      const points = generateOffscreenSpawnPoints(42, viewport);
      expect(points).toHaveLength(42);
    });

    it('should generate points outside the viewport', () => {
      const points = generateOffscreenSpawnPoints(42, viewport);
      for (const p of points) {
        const outside =
          p.x < -20 || p.x > viewport.width + 20 ||
          p.y < -20 || p.y > viewport.height + 20;
        expect(outside).toBe(true);
      }
    });

    it('should spread points around all four edges', () => {
      const points = generateOffscreenSpawnPoints(100, viewport);
      const left = points.filter((p) => p.x < 0);
      const right = points.filter((p) => p.x > viewport.width);
      const top = points.filter((p) => p.y < 0);
      const bottom = points.filter((p) => p.y > viewport.height);
      // With 100 points, each edge should get at least some
      expect(left.length).toBeGreaterThan(0);
      expect(right.length).toBeGreaterThan(0);
      expect(top.length).toBeGreaterThan(0);
      expect(bottom.length).toBeGreaterThan(0);
    });

    it('should return objects with x and y properties', () => {
      const points = generateOffscreenSpawnPoints(5, viewport);
      for (const p of points) {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
      }
    });

    it('should not generate points too far offscreen (within 300px of edges)', () => {
      const points = generateOffscreenSpawnPoints(42, viewport);
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(-300);
        expect(p.x).toBeLessThanOrEqual(viewport.width + 300);
        expect(p.y).toBeGreaterThanOrEqual(-300);
        expect(p.y).toBeLessThanOrEqual(viewport.height + 300);
      }
    });

    it('should handle zero count', () => {
      expect(generateOffscreenSpawnPoints(0, viewport)).toHaveLength(0);
    });
  });

  describe('computeFlockEntryDelays', () => {
    it('should return an array of the requested length', () => {
      const delays = computeFlockEntryDelays(42, 8000);
      expect(delays).toHaveLength(42);
    });

    it('should have all delays between 0 and maxSpreadMs', () => {
      const maxSpread = 8000;
      const delays = computeFlockEntryDelays(42, maxSpread);
      for (const d of delays) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(maxSpread);
      }
    });

    it('should be sorted ascending (first crow arrives first)', () => {
      const delays = computeFlockEntryDelays(42, 8000);
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }
    });

    it('should handle single crow', () => {
      const delays = computeFlockEntryDelays(1, 5000);
      expect(delays).toHaveLength(1);
      expect(delays[0]).toBe(0);
    });

    it('should have first delay as 0', () => {
      const delays = computeFlockEntryDelays(10, 5000);
      expect(delays[0]).toBe(0);
    });

    it('should have the last delay close to maxSpreadMs', () => {
      const maxSpread = 8000;
      const delays = computeFlockEntryDelays(42, maxSpread);
      // The last crow should arrive near the end of the spread window
      expect(delays[delays.length - 1]).toBeGreaterThan(maxSpread * 0.5);
    });
  });

  describe('computeDepartureSchedule', () => {
    it('should schedule count-1 departures (one crow stays)', () => {
      const schedule = computeDepartureSchedule(42, 9 * 60 * 1000);
      expect(schedule).toHaveLength(41);
    });

    it('should be sorted ascending', () => {
      const schedule = computeDepartureSchedule(42, 9 * 60 * 1000);
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i]).toBeGreaterThanOrEqual(schedule[i - 1]);
      }
    });

    it('should not start departures too early (at least 30s of grace)', () => {
      const schedule = computeDepartureSchedule(42, 9 * 60 * 1000);
      expect(schedule[0]).toBeGreaterThanOrEqual(30_000);
    });

    it('should have all values within the duration', () => {
      const duration = 9 * 60 * 1000;
      const schedule = computeDepartureSchedule(42, duration);
      for (const t of schedule) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(duration);
      }
    });

    it('should handle 2 crows (one leaves, one stays)', () => {
      const schedule = computeDepartureSchedule(2, 60000);
      expect(schedule).toHaveLength(1);
    });

    it('should handle 1 crow (none leave)', () => {
      const schedule = computeDepartureSchedule(1, 60000);
      expect(schedule).toHaveLength(0);
    });
  });

  describe('computeFlockingForces', () => {
    const makeCrow = (id: number, x: number, y: number, vx = 0, vy = 0): FlockCrow => ({
      id,
      x, y,
      vx, vy,
      targetX: x + 50,
      targetY: y + 50,
      state: 'flying' as const,
    });

    it('should return forces with dx and dy for each crow', () => {
      const crows = [makeCrow(0, 100, 100), makeCrow(1, 200, 200)];
      const forces = computeFlockingForces(crows);
      expect(forces).toHaveLength(2);
      for (const f of forces) {
        expect(typeof f.dx).toBe('number');
        expect(typeof f.dy).toBe('number');
      }
    });

    it('should produce separation force when crows are very close', () => {
      // Two crows at nearly the same spot
      const crows = [makeCrow(0, 100, 100), makeCrow(1, 105, 100)];
      const forces = computeFlockingForces(crows);
      // Crow 0 should be pushed left (away from crow 1)
      expect(forces[0].dx).toBeLessThan(0);
      // Crow 1 should be pushed right (away from crow 0)
      expect(forces[1].dx).toBeGreaterThan(0);
    });

    it('should return zero forces for single crow', () => {
      const crows = [makeCrow(0, 100, 100)];
      const forces = computeFlockingForces(crows);
      expect(forces[0].dx).toBe(0);
      expect(forces[0].dy).toBe(0);
    });

    it('should return zero forces for empty array', () => {
      expect(computeFlockingForces([])).toHaveLength(0);
    });

    it('should produce cohesion force pulling distant crows together', () => {
      // Two crows within neighbor radius (200px) but beyond separation (60px)
      // Same velocity so alignment doesn't interfere; cohesion pulls them together
      const crows = [makeCrow(0, 0, 0, 0, 0), makeCrow(1, 150, 0, 0, 0)];
      const forces = computeFlockingForces(crows);
      // Crow 0 should be pulled right (toward crow 1)
      expect(forces[0].dx).toBeGreaterThan(0);
      // Crow 1 should be pulled left (toward crow 0)
      expect(forces[1].dx).toBeLessThan(0);
    });

    it('should skip non-flying crows for force computation', () => {
      const crows: FlockCrow[] = [
        makeCrow(0, 100, 100),
        { ...makeCrow(1, 105, 100), state: 'departed' }
      ];
      const forces = computeFlockingForces(crows);
      // Crow 0 has no flying neighbors, so zero forces
      expect(forces[0].dx).toBe(0);
      expect(forces[0].dy).toBe(0);
    });

    it('should produce bounded forces (no extreme values)', () => {
      const crows = [
        makeCrow(0, 100, 100, 5, 0),
        makeCrow(1, 102, 100, 5, 0),
        makeCrow(2, 104, 100, 5, 0),
      ];
      const forces = computeFlockingForces(crows);
      for (const f of forces) {
        expect(Math.abs(f.dx)).toBeLessThan(50);
        expect(Math.abs(f.dy)).toBeLessThan(50);
      }
    });
  });

  // ── computeContainedImageBounds ─────────────────────────────
  describe('computeContainedImageBounds', () => {
    it('should scale portrait image to fit viewport height when viewport is wider', () => {
      // Image: 420×736 (portrait), viewport: 1920×1080
      // contain → scale = min(1920/420, 1080/736) = min(4.571, 1.467) = 1.467
      const bounds = computeContainedImageBounds(1920, 1080, 420, 736, 0, 0);
      expect(bounds.width).toBeCloseTo(420 * (1080 / 736), 1);
      expect(bounds.height).toBeCloseTo(1080, 1);
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
    });

    it('should scale landscape image to fit viewport width when viewport is taller', () => {
      // Image: 1200×600, viewport: 800×1000
      // contain → scale = min(800/1200, 1000/600) = min(0.667, 1.667) = 0.667
      const bounds = computeContainedImageBounds(800, 1000, 1200, 600, 0, 0);
      expect(bounds.width).toBeCloseTo(800, 1);
      expect(bounds.height).toBeCloseTo(600 * (800 / 1200), 1);
    });

    it('should apply pixel offsets to position', () => {
      const bounds = computeContainedImageBounds(1920, 1080, 420, 736, -72, 288);
      expect(bounds.x).toBe(-72);
      expect(bounds.y).toBe(288);
    });

    it('should handle viewport exactly matching image aspect ratio', () => {
      const bounds = computeContainedImageBounds(840, 1472, 420, 736, 0, 0);
      // Perfect 2× scale
      expect(bounds.width).toBeCloseTo(840, 1);
      expect(bounds.height).toBeCloseTo(1472, 1);
    });

    it('should handle square image in rectangular viewport', () => {
      const bounds = computeContainedImageBounds(1600, 900, 500, 500, 0, 0);
      // contain → scale = min(1600/500, 900/500) = min(3.2, 1.8) = 1.8
      expect(bounds.width).toBeCloseTo(900, 1);
      expect(bounds.height).toBeCloseTo(900, 1);
    });

    it('should return correct ImageBounds shape', () => {
      const bounds = computeContainedImageBounds(1920, 1080, 420, 736, -50, 200);
      expect(bounds).toHaveProperty('x');
      expect(bounds).toHaveProperty('y');
      expect(bounds).toHaveProperty('width');
      expect(bounds).toHaveProperty('height');
    });
  });

  // ── imageLandmarkToViewport ─────────────────────────────────
  describe('imageLandmarkToViewport', () => {
    const bounds: ImageBounds = { x: -72, y: 288, width: 616, height: 1080 };

    it('should map (0,0) to the image top-left corner', () => {
      const pos = imageLandmarkToViewport(0, 0, bounds);
      expect(pos.x).toBe(-72);
      expect(pos.y).toBe(288);
    });

    it('should map (1,1) to the image bottom-right corner', () => {
      const pos = imageLandmarkToViewport(1, 1, bounds);
      expect(pos.x).toBeCloseTo(-72 + 616, 1);
      expect(pos.y).toBeCloseTo(288 + 1080, 1);
    });

    it('should map (0.5, 0.5) to the image center', () => {
      const pos = imageLandmarkToViewport(0.5, 0.5, bounds);
      expect(pos.x).toBeCloseTo(-72 + 308, 1);
      expect(pos.y).toBeCloseTo(288 + 540, 1);
    });

    it('should correctly map a right-shoulder landmark', () => {
      // If right shoulder is at 20% across, 58% down in the image:
      const pos = imageLandmarkToViewport(0.20, 0.58, bounds);
      expect(pos.x).toBeCloseTo(-72 + 616 * 0.20, 1);
      expect(pos.y).toBeCloseTo(288 + 1080 * 0.58, 1);
    });

    it('should correctly map a left-shoulder landmark', () => {
      const pos = imageLandmarkToViewport(0.75, 0.53, bounds);
      expect(pos.x).toBeCloseTo(-72 + 616 * 0.75, 1);
      expect(pos.y).toBeCloseTo(288 + 1080 * 0.53, 1);
    });

    it('should work with zero-offset bounds', () => {
      const zeroBounds: ImageBounds = { x: 0, y: 0, width: 420, height: 736 };
      const pos = imageLandmarkToViewport(0.5, 0.5, zeroBounds);
      expect(pos.x).toBeCloseTo(210, 1);
      expect(pos.y).toBeCloseTo(368, 1);
    });

    it('should handle fractional values outside 0-1 range (off-image targets)', () => {
      const pos = imageLandmarkToViewport(-0.1, 1.2, bounds);
      expect(pos.x).toBeCloseTo(-72 + 616 * (-0.1), 1);
      expect(pos.y).toBeCloseTo(288 + 1080 * 1.2, 1);
    });
  });
});
