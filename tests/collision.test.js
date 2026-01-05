import { describe, it, expect } from 'vitest';
import {
    circleCollision,
    pointInCircle,
    circleRectCollision,
    getEntitiesInRange,
    findClosest
} from '../js/collision.js';

describe('circleCollision', () => {
    it('should detect overlapping circles', () => {
        expect(circleCollision(0, 0, 10, 15, 0, 10)).toBe(true);
        expect(circleCollision(0, 0, 10, 5, 0, 10)).toBe(true);
    });

    it('should detect non-overlapping circles', () => {
        expect(circleCollision(0, 0, 10, 25, 0, 10)).toBe(false);
        expect(circleCollision(0, 0, 5, 20, 0, 5)).toBe(false);
    });

    it('should handle edge case - circles just touching', () => {
        // Circles touching at exactly their radii sum should return false (< not <=)
        expect(circleCollision(0, 0, 10, 20, 0, 10)).toBe(false);
    });

    it('should handle same position circles', () => {
        expect(circleCollision(5, 5, 10, 5, 5, 10)).toBe(true);
    });

    it('should work with diagonal positions', () => {
        // Distance is 5 (3-4-5 triangle), radii sum is 6
        expect(circleCollision(0, 0, 3, 3, 4, 3)).toBe(true);
        // Distance is 5, radii sum is 4
        expect(circleCollision(0, 0, 2, 3, 4, 2)).toBe(false);
    });
});

describe('pointInCircle', () => {
    it('should detect point inside circle', () => {
        expect(pointInCircle(5, 5, 0, 0, 10)).toBe(true);
        expect(pointInCircle(0, 0, 0, 0, 10)).toBe(true);
    });

    it('should detect point outside circle', () => {
        expect(pointInCircle(15, 0, 0, 0, 10)).toBe(false);
        expect(pointInCircle(10, 10, 0, 0, 10)).toBe(false);
    });

    it('should handle edge case - point on circle boundary', () => {
        // Point exactly on boundary should return false (< not <=)
        expect(pointInCircle(10, 0, 0, 0, 10)).toBe(false);
    });
});

describe('circleRectCollision', () => {
    it('should detect circle overlapping rectangle', () => {
        // Circle center inside rectangle
        expect(circleRectCollision(50, 50, 10, 0, 0, 100, 100)).toBe(true);
        // Circle overlapping from left
        expect(circleRectCollision(-5, 50, 10, 0, 0, 100, 100)).toBe(true);
        // Circle overlapping from top
        expect(circleRectCollision(50, -5, 10, 0, 0, 100, 100)).toBe(true);
    });

    it('should detect circle not overlapping rectangle', () => {
        expect(circleRectCollision(-20, 50, 10, 0, 0, 100, 100)).toBe(false);
        expect(circleRectCollision(50, -20, 10, 0, 0, 100, 100)).toBe(false);
        expect(circleRectCollision(120, 50, 10, 0, 0, 100, 100)).toBe(false);
    });

    it('should handle corner cases', () => {
        // Circle near corner but not touching
        expect(circleRectCollision(-10, -10, 5, 0, 0, 100, 100)).toBe(false);
        // Circle touching corner (distance to corner is ~14.14, less than radius 15)
        expect(circleRectCollision(-10, -10, 15, 0, 0, 100, 100)).toBe(true);
    });
});

describe('getEntitiesInRange', () => {
    const entities = [
        { x: 0, y: 0, radius: 5 },
        { x: 10, y: 0, radius: 5 },
        { x: 20, y: 0, radius: 5 },
        { x: 100, y: 0, radius: 5 }
    ];

    it('should return entities within range', () => {
        const result = getEntitiesInRange(entities, 0, 0, 15);
        expect(result).toHaveLength(2);
        expect(result).toContain(entities[0]);
        expect(result).toContain(entities[1]);
    });

    it('should include entity radius in calculation', () => {
        // Entity at 20 has radius 5, so edge is at 15, within range 16
        const result = getEntitiesInRange(entities, 0, 0, 16);
        expect(result).toHaveLength(3);
    });

    it('should return empty array when no entities in range', () => {
        const result = getEntitiesInRange(entities, 500, 500, 10);
        expect(result).toHaveLength(0);
    });

    it('should handle entities without radius', () => {
        const noRadiusEntities = [
            { x: 5, y: 0 },
            { x: 50, y: 0 }
        ];
        const result = getEntitiesInRange(noRadiusEntities, 0, 0, 10);
        expect(result).toHaveLength(1);
    });
});

describe('findClosest', () => {
    const entities = [
        { x: 10, y: 0 },
        { x: 5, y: 0 },
        { x: 20, y: 0 }
    ];

    it('should find the closest entity', () => {
        const result = findClosest(entities, 0, 0);
        expect(result).toBe(entities[1]); // x: 5 is closest
    });

    it('should return null for empty array', () => {
        const result = findClosest([], 0, 0);
        expect(result).toBeNull();
    });

    it('should return the only entity from single-element array', () => {
        const result = findClosest([{ x: 100, y: 100 }], 0, 0);
        expect(result).toEqual({ x: 100, y: 100 });
    });

    it('should handle diagonal distances', () => {
        const diagonalEntities = [
            { x: 3, y: 4 },  // distance 5
            { x: 0, y: 6 },  // distance 6
            { x: 4, y: 0 }   // distance 4
        ];
        const result = findClosest(diagonalEntities, 0, 0);
        expect(result).toBe(diagonalEntities[2]);
    });
});

