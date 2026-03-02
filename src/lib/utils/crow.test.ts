import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pickNextTarget,
  computeFlightPosition,
  getWingFlapAngle,
  computeArcControlPoint,
  easeInOutCubic,
  isMouseTooClose,
  getIdleAnimation,
  type CrowTarget,
  type CrowState,
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
});
