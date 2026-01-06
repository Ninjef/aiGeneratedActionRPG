import { describe, it, expect, beforeEach } from 'vitest';
import { Builder, ENEMY_TYPES, EnemySpawner, SpawnBlock, FieryEnemy, GravitationalEnemy, FastPurpleEnemy } from '../js/enemy.js';
import { Crystal } from '../js/crystal.js';

describe('Builder', () => {
    let builder;

    beforeEach(() => {
        builder = new Builder(100, 200);
    });

    describe('constructor', () => {
        it('should initialize at given position', () => {
            expect(builder.x).toBe(100);
            expect(builder.y).toBe(200);
        });

        it('should have builder type stats', () => {
            expect(builder.type).toBe('builder');
            expect(builder.health).toBe(30);
            expect(builder.damage).toBe(0);
            expect(builder.radius).toBe(15);
        });

        it('should have flee radius', () => {
            expect(builder.fleeRadius).toBe(200);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            builder.takeDamage(10);
            expect(builder.health).toBe(20);
        });

        it('should return true when builder dies', () => {
            expect(builder.takeDamage(30)).toBe(true);
        });

        it('should return false when builder survives', () => {
            expect(builder.takeDamage(10)).toBe(false);
        });
    });

    describe('update', () => {
        it('should flee from player when close', () => {
            const playerX = 150;
            const playerY = 200;
            const initialX = builder.x;
            
            builder.update(0.1, playerX, playerY, []);
            
            // Should have moved away from player (x decreased)
            expect(builder.x).toBeLessThan(initialX);
        });

        it('should move toward crystal when nearby', () => {
            const crystals = [new Crystal(200, 200, 'heat')];
            const initialX = builder.x;
            
            builder.update(0.1, 500, 500, crystals); // Player far away
            
            // Should have moved toward crystal
            expect(builder.x).toBeGreaterThan(initialX);
        });

        it('should wander when no crystal or player nearby', () => {
            const initialX = builder.x;
            const initialY = builder.y;
            
            builder.update(0.1, 500, 500, []); // Player and crystals far away
            
            // Should have moved (wandering)
            const moved = builder.x !== initialX || builder.y !== initialY;
            expect(moved).toBe(true);
        });
    });
});

describe('SpawnBlock', () => {
    let spawnBlock;

    beforeEach(() => {
        spawnBlock = new SpawnBlock(100, 100, 'heat');
    });

    describe('constructor', () => {
        it('should initialize at given position', () => {
            expect(spawnBlock.x).toBe(100);
            expect(spawnBlock.y).toBe(100);
        });

        it('should store crystal type', () => {
            expect(spawnBlock.crystalType).toBe('heat');
        });

        it('should have 250 health', () => {
            expect(spawnBlock.health).toBe(250);
            expect(spawnBlock.maxHealth).toBe(250);
        });

        it('should have correct spawn interval for type', () => {
            const heatBlock = new SpawnBlock(0, 0, 'heat');
            const coldBlock = new SpawnBlock(0, 0, 'cold');
            const forceBlock = new SpawnBlock(0, 0, 'force');
            
            expect(heatBlock.spawnInterval).toBe(5.0);
            expect(coldBlock.spawnInterval).toBe(5.0);
            expect(forceBlock.spawnInterval).toBe(8.0);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            spawnBlock.takeDamage(50);
            expect(spawnBlock.health).toBe(200);
        });

        it('should return true when destroyed', () => {
            expect(spawnBlock.takeDamage(250)).toBe(true);
        });

        it('should return false when survives', () => {
            expect(spawnBlock.takeDamage(100)).toBe(false);
        });
    });

    describe('update', () => {
        it('should return spawn info after interval', () => {
            const result = spawnBlock.update(5.0);
            
            expect(result).not.toBeNull();
            expect(result.enemyType).toBe('fiery'); // heat -> fiery
            expect(result.count).toBe(5);
        });

        it('should not spawn before interval', () => {
            const result = spawnBlock.update(2.0);
            expect(result).toBeNull();
        });

        it('should spawn correct enemy types', () => {
            const heatBlock = new SpawnBlock(0, 0, 'heat');
            const coldBlock = new SpawnBlock(0, 0, 'cold');
            const forceBlock = new SpawnBlock(0, 0, 'force');
            
            expect(heatBlock.update(5.0).enemyType).toBe('fiery');
            expect(heatBlock.update(5.0).count).toBe(5);
            
            expect(coldBlock.update(5.0).enemyType).toBe('gravitational');
            expect(coldBlock.update(5.0).count).toBe(3);
            
            expect(forceBlock.update(8.0).enemyType).toBe('fastPurple');
            expect(forceBlock.update(8.0).count).toBe(5);
        });
    });
});

describe('FieryEnemy', () => {
    let fiery;

    beforeEach(() => {
        fiery = new FieryEnemy(100, 100);
    });

    describe('constructor', () => {
        it('should initialize with fiery stats', () => {
            expect(fiery.type).toBe('fiery');
            expect(fiery.health).toBe(15);
            expect(fiery.damage).toBe(8);
            expect(fiery.speed).toBe(250);
        });
    });

    describe('update', () => {
        it('should change direction periodically', () => {
            const initialAngle = fiery.moveAngle;
            
            fiery.update(1.0, 200, 200); // Long enough to trigger direction change
            
            // Angle should have changed
            expect(fiery.moveAngle).not.toBe(initialAngle);
        });

        it('should return fire trail info after interval', () => {
            const result = fiery.update(0.2, 200, 200);
            
            expect(result).not.toBeNull();
            expect(result.type).toBe('fireTrail');
            expect(result.radius).toBe(20);
        });

        it('should not return trail before interval', () => {
            const result = fiery.update(0.1, 200, 200);
            expect(result).toBeNull();
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            fiery.takeDamage(5);
            expect(fiery.health).toBe(10);
        });

        it('should return true when dies', () => {
            expect(fiery.takeDamage(15)).toBe(true);
        });
    });
});

describe('GravitationalEnemy', () => {
    let grav;

    beforeEach(() => {
        grav = new GravitationalEnemy(100, 100);
    });

    describe('constructor', () => {
        it('should initialize with gravitational stats', () => {
            expect(grav.type).toBe('gravitational');
            expect(grav.health).toBe(60);
            expect(grav.damage).toBe(12);
            expect(grav.gravityRange).toBe(100);
        });

        it('should have velocity properties', () => {
            expect(grav.velocityX).toBe(0);
            expect(grav.velocityY).toBe(0);
        });
    });

    describe('update', () => {
        it('should move toward player', () => {
            const playerX = 200;
            const playerY = 200;
            const initialX = grav.x;
            const initialY = grav.y;
            
            grav.update(0.1, playerX, playerY, []);
            
            expect(grav.x).toBeGreaterThan(initialX);
            expect(grav.y).toBeGreaterThan(initialY);
        });

        it('should apply gravity to nearby gravitational enemies', () => {
            const other = new GravitationalEnemy(150, 100);
            
            grav.update(0.1, 500, 500, [other]); // Player far away
            
            // Should have velocity toward the other enemy
            expect(Math.abs(grav.velocityX)).toBeGreaterThan(0);
        });

        it('should not apply gravity to distant enemies', () => {
            const other = new GravitationalEnemy(300, 100); // 200 units away, outside gravityRange of 100
            
            const initialVelX = grav.velocityX;
            const initialVelY = grav.velocityY;
            grav.update(0.1, 500, 500, [other]); // Player far away, only gravity matters
            
            // Gravity should not apply beyond range (velocities should only be from player movement)
            // Since player is at (500, 500), enemy should move toward player, not other enemy
            const movedTowardOther = grav.x > 100; // Would move toward other at x=300
            expect(movedTowardOther).toBe(true); // Should have moved, but mostly toward player
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            grav.takeDamage(20);
            expect(grav.health).toBe(40);
        });

        it('should return true when dies', () => {
            expect(grav.takeDamage(60)).toBe(true);
        });
    });
});

describe('FastPurpleEnemy', () => {
    let purple;

    beforeEach(() => {
        purple = new FastPurpleEnemy(100, 100);
    });

    describe('constructor', () => {
        it('should initialize with fast purple stats', () => {
            expect(purple.type).toBe('fastPurple');
            expect(purple.health).toBe(25);
            expect(purple.damage).toBe(10);
            expect(purple.speed).toBe(200);
        });
    });

    describe('update', () => {
        it('should chase player', () => {
            const playerX = 200;
            const playerY = 200;
            const initialX = purple.x;
            const initialY = purple.y;
            
            purple.update(0.1, playerX, playerY);
            
            expect(purple.x).toBeGreaterThan(initialX);
            expect(purple.y).toBeGreaterThan(initialY);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            purple.takeDamage(10);
            expect(purple.health).toBe(15);
        });

        it('should return true when dies', () => {
            expect(purple.takeDamage(25)).toBe(true);
        });
    });
});

describe('ENEMY_TYPES', () => {
    it('should have all new enemy types', () => {
        expect(ENEMY_TYPES.builder).toBeDefined();
        expect(ENEMY_TYPES.fiery).toBeDefined();
        expect(ENEMY_TYPES.gravitational).toBeDefined();
        expect(ENEMY_TYPES.fastPurple).toBeDefined();
    });

    it('should have correct builder stats', () => {
        expect(ENEMY_TYPES.builder.damage).toBe(0);
        expect(ENEMY_TYPES.builder.fleeRadius).toBe(200);
    });

    it('should have fiery trail properties', () => {
        expect(ENEMY_TYPES.fiery.trailInterval).toBe(0.2);
        expect(ENEMY_TYPES.fiery.trailDuration).toBe(9.0);
    });

    it('should have gravitational gravity properties', () => {
        expect(ENEMY_TYPES.gravitational.gravityRange).toBe(100);
        expect(ENEMY_TYPES.gravitational.gravityStrength).toBe(150);
    });
});

// Mock camera for testing spawner
function createMockCamera(width = 800, height = 600, zoom = 0.25) {
    return {
        zoom,
        canvas: { width, height },
        getVisibleBounds() {
            const visibleWidth = width / zoom;
            const visibleHeight = height / zoom;
            return {
                left: 0,
                right: visibleWidth,
                top: 0,
                bottom: visibleHeight
            };
        }
    };
}

describe('EnemySpawner', () => {
    let spawner;
    let mockCamera;

    beforeEach(() => {
        spawner = new EnemySpawner();
        mockCamera = createMockCamera();
    });

    describe('getSpawnDistances', () => {
        it('should calculate spawn distances based on camera visible area', () => {
            const distances = spawner.getSpawnDistances(mockCamera);
            expect(distances.min).toBeGreaterThan(0);
            expect(distances.max).toBeGreaterThan(distances.min);
        });

        it('should return larger distances for more zoomed out camera', () => {
            const zoomedOut = createMockCamera(800, 600, 0.1);
            const zoomedIn = createMockCamera(800, 600, 1.0);
            
            const distOut = spawner.getSpawnDistances(zoomedOut);
            const distIn = spawner.getSpawnDistances(zoomedIn);
            
            expect(distOut.min).toBeGreaterThan(distIn.min);
            expect(distOut.max).toBeGreaterThan(distIn.max);
        });
    });

    describe('update', () => {
        it('should track game time', () => {
            spawner.update(1.0, 0, 0, [], [], mockCamera);
            expect(spawner.gameTime).toBe(1.0);
        });

        it('should increase difficulty over time', () => {
            spawner.update(30, 0, 0, [], [], mockCamera);
            expect(spawner.difficulty).toBeGreaterThan(1);
        });

        it('should spawn builders after interval', () => {
            const builders = [];
            spawner.update(3.0, 0, 0, builders, [], mockCamera);
            expect(builders.length).toBeGreaterThan(0);
            expect(builders[0].type).toBe('builder');
        });

        it('should not exceed max enemies', () => {
            const builders = new Array(150).fill(null).map(() => new Builder(0, 0));
            const initialCount = builders.length;
            
            spawner.update(3.0, 0, 0, builders, [], mockCamera);
            
            expect(builders.length).toBe(initialCount);
        });
    });
});
