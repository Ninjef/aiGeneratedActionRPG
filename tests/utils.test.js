import { describe, it, expect } from 'vitest';
import {
    randomRange,
    randomInt,
    distance,
    normalize,
    angle,
    lerp,
    clamp,
    randomChoice,
    weightedRandomChoice,
    randomPositionInRing
} from '../js/utils.js';

describe('randomRange', () => {
    it('should return a value within the specified range', () => {
        for (let i = 0; i < 100; i++) {
            const result = randomRange(5, 10);
            expect(result).toBeGreaterThanOrEqual(5);
            expect(result).toBeLessThan(10);
        }
    });

    it('should handle negative ranges', () => {
        for (let i = 0; i < 100; i++) {
            const result = randomRange(-10, -5);
            expect(result).toBeGreaterThanOrEqual(-10);
            expect(result).toBeLessThan(-5);
        }
    });

    it('should handle zero-width range', () => {
        const result = randomRange(5, 5);
        expect(result).toBe(5);
    });
});

describe('randomInt', () => {
    it('should return an integer within the specified range (inclusive)', () => {
        for (let i = 0; i < 100; i++) {
            const result = randomInt(1, 5);
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(5);
        }
    });

    it('should return the same value when min equals max', () => {
        const result = randomInt(3, 3);
        expect(result).toBe(3);
    });
});

describe('distance', () => {
    it('should calculate distance between two points', () => {
        expect(distance(0, 0, 3, 4)).toBe(5);
        expect(distance(0, 0, 0, 0)).toBe(0);
        expect(distance(1, 1, 4, 5)).toBe(5);
    });

    it('should handle negative coordinates', () => {
        expect(distance(-3, -4, 0, 0)).toBe(5);
        expect(distance(-1, -1, -4, -5)).toBe(5);
    });

    it('should be commutative', () => {
        expect(distance(0, 0, 3, 4)).toBe(distance(3, 4, 0, 0));
    });
});

describe('normalize', () => {
    it('should return a unit vector', () => {
        const result = normalize(3, 4);
        expect(result.x).toBeCloseTo(0.6);
        expect(result.y).toBeCloseTo(0.8);
    });

    it('should handle zero vector', () => {
        const result = normalize(0, 0);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
    });

    it('should normalize to length 1', () => {
        const result = normalize(10, 10);
        const length = Math.sqrt(result.x ** 2 + result.y ** 2);
        expect(length).toBeCloseTo(1);
    });

    it('should handle negative values', () => {
        const result = normalize(-3, -4);
        expect(result.x).toBeCloseTo(-0.6);
        expect(result.y).toBeCloseTo(-0.8);
    });
});

describe('angle', () => {
    it('should calculate angle between two points', () => {
        expect(angle(0, 0, 1, 0)).toBeCloseTo(0);
        expect(angle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
        expect(angle(0, 0, -1, 0)).toBeCloseTo(Math.PI);
        expect(angle(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2);
    });

    it('should handle same point (undefined behavior, returns 0)', () => {
        expect(angle(5, 5, 5, 5)).toBe(0);
    });
});

describe('lerp', () => {
    it('should interpolate between two values', () => {
        expect(lerp(0, 10, 0)).toBe(0);
        expect(lerp(0, 10, 1)).toBe(10);
        expect(lerp(0, 10, 0.5)).toBe(5);
        expect(lerp(0, 10, 0.25)).toBe(2.5);
    });

    it('should handle negative values', () => {
        expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it('should extrapolate when t is outside [0, 1]', () => {
        expect(lerp(0, 10, 2)).toBe(20);
        expect(lerp(0, 10, -1)).toBe(-10);
    });
});

describe('clamp', () => {
    it('should clamp value within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
        expect(clamp(-5, -10, -1)).toBe(-5);
        expect(clamp(-15, -10, -1)).toBe(-10);
    });
});

describe('randomChoice', () => {
    it('should return an element from the array', () => {
        const arr = ['a', 'b', 'c'];
        for (let i = 0; i < 100; i++) {
            const result = randomChoice(arr);
            expect(arr).toContain(result);
        }
    });

    it('should return the only element from single-element array', () => {
        expect(randomChoice(['only'])).toBe('only');
    });
});

describe('weightedRandomChoice', () => {
    it('should return an element from the options', () => {
        const options = ['a', 'b', 'c'];
        const weights = [1, 1, 1];
        for (let i = 0; i < 100; i++) {
            const result = weightedRandomChoice(options, weights);
            expect(options).toContain(result);
        }
    });

    it('should favor higher weighted options', () => {
        const options = ['rare', 'common'];
        const weights = [1, 99];
        let commonCount = 0;
        for (let i = 0; i < 1000; i++) {
            if (weightedRandomChoice(options, weights) === 'common') {
                commonCount++;
            }
        }
        // Should be around 99%, allow some variance
        expect(commonCount).toBeGreaterThan(900);
    });

    it('should always return item with only non-zero weight', () => {
        const options = ['zero', 'nonzero'];
        const weights = [0, 10];
        for (let i = 0; i < 100; i++) {
            expect(weightedRandomChoice(options, weights)).toBe('nonzero');
        }
    });
});

describe('randomPositionInRing', () => {
    it('should return a position within the ring', () => {
        for (let i = 0; i < 100; i++) {
            const pos = randomPositionInRing(0, 0, 50, 100);
            const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
            expect(dist).toBeGreaterThanOrEqual(50);
            expect(dist).toBeLessThanOrEqual(100);
        }
    });

    it('should offset from center coordinates', () => {
        for (let i = 0; i < 100; i++) {
            const pos = randomPositionInRing(100, 200, 10, 20);
            const dist = Math.sqrt((pos.x - 100) ** 2 + (pos.y - 200) ** 2);
            expect(dist).toBeGreaterThanOrEqual(10);
            expect(dist).toBeLessThanOrEqual(20);
        }
    });

    it('should return exact radius when min equals max', () => {
        const pos = randomPositionInRing(0, 0, 50, 50);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
        expect(dist).toBeCloseTo(50);
    });
});

