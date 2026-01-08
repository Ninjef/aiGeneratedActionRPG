import { describe, it, expect, beforeEach } from 'vitest';
import { Builder, Fighter, ENEMY_TYPES, EnemySpawner, SpawnBlock, FieryEnemy, GravitationalEnemy, FastPurpleEnemy } from '../js/enemy.js';
import { Crystal } from '../js/crystal.js';

describe('Builder', () => {
    let builder;

    beforeEach(() => {
        builder = new Builder(100, 200);
    });

    describe('takeDamage', () => {
        it('should return true when builder dies', () => {
            expect(builder.takeDamage(builder.maxHealth)).toBe(true);
        });

        it('should return false when builder survives', () => {
            expect(builder.takeDamage(1)).toBe(false);
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

describe('Fighter', () => {
    let fighter;

    beforeEach(() => {
        fighter = new Fighter(100, 100);
    });

    describe('takeDamage', () => {
        it('should return true when fighter dies', () => {
            expect(fighter.takeDamage(fighter.maxHealth)).toBe(true);
        });

        it('should return false when fighter survives', () => {
            expect(fighter.takeDamage(1)).toBe(false);
        });
    });

    describe('update', () => {
        it('should chase player when in aggro range', () => {
            const playerX = 200;
            const playerY = 200;
            const initialX = fighter.x;
            const initialY = fighter.y;
            
            fighter.update(0.1, playerX, playerY, []);
            
            // Should have moved toward player
            expect(fighter.x).toBeGreaterThan(initialX);
            expect(fighter.y).toBeGreaterThan(initialY);
        });

        it('should prioritize tower over player when both are nearby', () => {
            const playerX = 200;
            const playerY = 100;
            const tower = new SpawnBlock(100, 200, 'heat'); // Tower is below fighter
            
            // Both player and tower are at same distance initially
            fighter.update(0.1, playerX, playerY, [tower]);
            
            // Should have moved toward tower (y increases) instead of player (x increases)
            expect(fighter.targetTower).toBe(tower);
            expect(fighter.y).toBeGreaterThan(100);
        });

        it('should move toward tower within aggro range', () => {
            const tower = new SpawnBlock(100, 300, 'cold');
            const initialY = fighter.y;
            
            fighter.update(0.1, 500, 500, [tower]); // Player far away
            
            // Should have moved toward tower
            expect(fighter.y).toBeGreaterThan(initialY);
            expect(fighter.targetTower).toBe(tower);
        });

        it('should wander when no tower or player nearby', () => {
            // Put fighter far from player (outside 6000 aggro range)
            fighter = new Fighter(0, 0);
            fighter.update(0.1, 10000, 10000, []); // Player very far away, no towers
            
            // Should have moved (wandering)
            const moved = fighter.x !== 0 || fighter.y !== 0;
            expect(moved).toBe(true);
            expect(fighter.targetTower).toBeNull();
        });
    });
});

describe('SpawnBlock', () => {
    let spawnBlock;

    beforeEach(() => {
        spawnBlock = new SpawnBlock(100, 100, 'heat');
    });

    describe('takeDamage', () => {
        it('should return true when destroyed', () => {
            expect(spawnBlock.takeDamage(spawnBlock.maxHealth)).toBe(true);
        });

        it('should return false when survives', () => {
            expect(spawnBlock.takeDamage(1)).toBe(false);
        });
    });

    describe('update', () => {
        it('should always return null (no periodic spawning)', () => {
            const result = spawnBlock.update(5.0);
            expect(result).toBeNull();
        });
    });

    describe('triggerSpawn', () => {
        it('should return spawn info when triggered', () => {
            const result = spawnBlock.triggerSpawn();
            
            expect(result).not.toBeNull();
            expect(result.enemyType).toBe('fiery'); // heat -> fiery
            expect(result.count).toBe(5);
        });

        it('should spawn correct enemy types for each crystal type', () => {
            const heatBlock = new SpawnBlock(0, 0, 'heat');
            const coldBlock = new SpawnBlock(0, 0, 'cold');
            const forceBlock = new SpawnBlock(0, 0, 'force');
            
            const heatResult = heatBlock.triggerSpawn();
            expect(heatResult.enemyType).toBe('fiery');
            expect(heatResult.count).toBe(5);
            
            const coldResult = coldBlock.triggerSpawn();
            expect(coldResult.enemyType).toBe('gravitational');
            expect(coldResult.count).toBe(3);
            
            const forceResult = forceBlock.triggerSpawn();
            expect(forceResult.enemyType).toBe('fastPurple');
            expect(forceResult.count).toBe(5);
        });

        it('should include spawn position', () => {
            const block = new SpawnBlock(200, 300, 'cold');
            const result = block.triggerSpawn();
            
            expect(result.x).toBe(200);
            expect(result.y).toBe(300);
        });
    });
    
    describe('leveling system', () => {
        it('should level up when enough XP is added', () => {
            expect(spawnBlock.level).toBe(1);
            spawnBlock.addTowerXp(20);
            expect(spawnBlock.level).toBe(2);
        });
        
        it('should increase max health on level up', () => {
            const initialMaxHealth = spawnBlock.maxHealth;
            spawnBlock.addTowerXp(20);
            expect(spawnBlock.maxHealth).toBeGreaterThan(initialMaxHealth);
        });
        
        it('should include scaling info in triggerSpawn', () => {
            spawnBlock.addTowerXp(20); // Level up to 2
            const result = spawnBlock.triggerSpawn();
            
            expect(result.scaling).toBeDefined();
            expect(result.scaling.level).toBe(2);
            expect(result.scaling.speed).toBeGreaterThan(1);
            expect(result.scaling.health).toBeGreaterThan(1);
            expect(result.scaling.damage).toBeGreaterThan(1);
        });
    });
});

describe('FieryEnemy', () => {
    let fiery;

    beforeEach(() => {
        fiery = new FieryEnemy(100, 100);
    });

    describe('update', () => {
        it('should change direction periodically', () => {
            const initialAngle = fiery.moveAngle;
            
            fiery.update(1.0, 200, 200); // Long enough to trigger direction change
            
            // Angle should have changed
            expect(fiery.moveAngle).not.toBe(initialAngle);
        });

        it('should return fire trail info after interval', () => {
            fiery.trailTimer = fiery.trailInterval; // Fast-forward to trigger trail
            const result = fiery.update(0.01, 200, 200);
            
            expect(result).not.toBeNull();
            expect(result.type).toBe('fireTrail');
        });
    });

    describe('takeDamage', () => {
        it('should return true when dies', () => {
            expect(fiery.takeDamage(fiery.maxHealth)).toBe(true);
        });
    });
    
    describe('scaling', () => {
        it('should accept scaling parameters', () => {
            const scaling = { speed: 1.5, health: 2.0, damage: 1.5, radius: 1.2, level: 3 };
            const scaledFiery = new FieryEnemy(0, 0, scaling);
            
            expect(scaledFiery.towerLevel).toBe(3);
            expect(scaledFiery.maxHealth).toBeGreaterThan(fiery.maxHealth);
            expect(scaledFiery.damage).toBeGreaterThan(fiery.damage);
        });
    });
});

describe('GravitationalEnemy', () => {
    let grav;

    beforeEach(() => {
        grav = new GravitationalEnemy(100, 100);
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
    });

    describe('takeDamage', () => {
        it('should return true when dies', () => {
            expect(grav.takeDamage(grav.maxHealth)).toBe(true);
        });
    });
    
    describe('scaling', () => {
        it('should accept scaling parameters', () => {
            const scaling = { speed: 1.5, health: 2.0, damage: 1.5, radius: 1.2, level: 3 };
            const scaledGrav = new GravitationalEnemy(0, 0, scaling);
            
            expect(scaledGrav.towerLevel).toBe(3);
            expect(scaledGrav.maxHealth).toBeGreaterThan(grav.maxHealth);
            expect(scaledGrav.damage).toBeGreaterThan(grav.damage);
        });
    });
});

describe('FastPurpleEnemy', () => {
    let purple;

    beforeEach(() => {
        purple = new FastPurpleEnemy(100, 100);
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
        it('should return true when dies', () => {
            expect(purple.takeDamage(purple.maxHealth)).toBe(true);
        });
    });
    
    describe('scaling', () => {
        it('should accept scaling parameters', () => {
            const scaling = { speed: 1.5, health: 2.0, damage: 1.5, radius: 1.2, level: 3 };
            const scaledPurple = new FastPurpleEnemy(0, 0, scaling);
            
            expect(scaledPurple.towerLevel).toBe(3);
            expect(scaledPurple.maxHealth).toBeGreaterThan(purple.maxHealth);
            expect(scaledPurple.damage).toBeGreaterThan(purple.damage);
        });
    });
});

describe('ENEMY_TYPES', () => {
    it('should have all enemy types defined', () => {
        expect(ENEMY_TYPES.builder).toBeDefined();
        expect(ENEMY_TYPES.fighter).toBeDefined();
        expect(ENEMY_TYPES.fiery).toBeDefined();
        expect(ENEMY_TYPES.gravitational).toBeDefined();
        expect(ENEMY_TYPES.fastPurple).toBeDefined();
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
            spawner.update(1.0, 0, 0, [], [], [], mockCamera);
            expect(spawner.gameTime).toBe(1.0);
        });

        it('should increase difficulty over time', () => {
            spawner.update(30, 0, 0, [], [], [], mockCamera);
            expect(spawner.difficulty).toBeGreaterThan(1);
        });

        it('should spawn builders after interval', () => {
            const builders = [];
            spawner.update(3.0, 0, 0, builders, [], [], mockCamera);
            expect(builders.length).toBeGreaterThan(0);
            expect(builders[0].type).toBe('builder');
        });

        it('should not exceed max builders', () => {
            const builders = new Array(spawner.maxBuilders).fill(null).map(() => new Builder(0, 0));
            const initialCount = builders.length;
            
            spawner.update(3.0, 0, 0, builders, [], [], mockCamera);
            
            expect(builders.length).toBe(initialCount);
        });
    });
});

describe('FieryEnemy trail creation', () => {
    let fiery;

    beforeEach(() => {
        fiery = new FieryEnemy(100, 100);
    });

    describe('update trail info', () => {
        it('should return trail info with creator reference', () => {
            // Fast-forward to trigger trail
            fiery.trailTimer = fiery.trailInterval;
            
            const trailInfo = fiery.update(0.01, 0, 0);
            
            expect(trailInfo).toBeDefined();
            expect(trailInfo.type).toBe('fireTrail');
            expect(trailInfo.creator).toBe(fiery);
        });

        it('should include trail position', () => {
            fiery.trailTimer = fiery.trailInterval;
            
            const trailInfo = fiery.update(0.01, 0, 0);
            
            expect(trailInfo.x).toBe(fiery.x);
            expect(trailInfo.y).toBe(fiery.y);
            expect(trailInfo.radius).toBeDefined();
            expect(trailInfo.duration).toBeDefined();
            expect(trailInfo.damage).toBeDefined();
        });

        it('should not return trail info before interval', () => {
            fiery.trailTimer = 0; // Reset to beginning
            const trailInfo = fiery.update(0.001, 0, 0); // Very short time
            
            expect(trailInfo).toBe(null);
        });
    });
});
