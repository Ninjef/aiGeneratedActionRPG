// Collision detection utilities

import { distance } from './utils.js';

// Circle vs Circle collision
export function circleCollision(x1, y1, r1, x2, y2, r2) {
    return distance(x1, y1, x2, y2) < r1 + r2;
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

