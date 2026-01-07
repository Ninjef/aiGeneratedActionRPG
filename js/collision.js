// Collision detection utilities

import { distance, distanceSquared } from './utils.js';

// Circle vs Circle collision (fast version using squared distance)
export function circleCollision(x1, y1, r1, x2, y2, r2) {
    const radiiSum = r1 + r2;
    return distanceSquared(x1, y1, x2, y2) < radiiSum * radiiSum;
}

// Spatial partitioning grid for efficient collision detection
export class SpatialGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }
    
    // Get cell key from world coordinates
    getKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    // Clear all cells
    clear() {
        this.cells.clear();
    }
    
    // Insert an entity into the grid
    insert(entity) {
        const key = this.getKey(entity.x, entity.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
    }
    
    // Insert multiple entities
    insertAll(entities) {
        for (const entity of entities) {
            this.insert(entity);
        }
    }
    
    // Get all entities in nearby cells (3x3 grid around the point)
    getNearby(x, y) {
        const nearby = [];
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                const cell = this.cells.get(key);
                if (cell) {
                    nearby.push(...cell);
                }
            }
        }
        return nearby;
    }
    
    // Get entities in range using the grid (more efficient than checking all)
    getInRange(x, y, range) {
        const nearby = this.getNearby(x, y);
        const rangeSquared = range * range;
        return nearby.filter(entity => {
            const radii = range + (entity.radius || 0);
            return distanceSquared(x, y, entity.x, entity.y) < radii * radii;
        });
    }
}

// Check if point is inside circle
export function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) < radius;
}

// Circle vs Rectangle collision
export function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    return distance(cx, cy, closestX, closestY) < radius;
}

// Get all entities in range of a point
export function getEntitiesInRange(entities, x, y, range) {
    return entities.filter(entity => 
        distance(x, y, entity.x, entity.y) < range + (entity.radius || 0)
    );
}

// Find closest entity to a point
export function findClosest(entities, x, y) {
    if (entities.length === 0) return null;
    
    let closest = entities[0];
    let closestDist = distance(x, y, closest.x, closest.y);
    
    for (let i = 1; i < entities.length; i++) {
        const dist = distance(x, y, entities[i].x, entities[i].y);
        if (dist < closestDist) {
            closest = entities[i];
            closestDist = dist;
        }
    }
    
    return closest;
}

