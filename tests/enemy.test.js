import { describe, it, expect, beforeEach } from 'vitest';
import { Enemy, ENEMY_TYPES, EnemySpawner, Champion, CHAMPION_CONFIG, CHAMPION_FUSION_THRESHOLD } from '../js/enemy.js';

describe('Enemy', () => {
    let enemy;

    beforeEach(() => {
        enemy = new Enemy(100, 200, 'medium');
    });

    describe('constructor', () => {
        it('should initialize at given position', () => {
            expect(enemy.x).toBe(100);
            expect(enemy.y).toBe(200);
        });

        it('should initialize orbit properties', () => {
            expect(enemy.orbitTarget).toBeNull();
            expect(typeof enemy.orbitAngle).toBe('number');
            expect(typeof enemy.orbitSpeed).toBe('number');
            expect(typeof enemy.orbitRadius).toBe('number');
        });
    });

    describe('setTarget', () => {
        it('should set target position', () => {
            enemy.setTarget(500, 600);
            expect(enemy.targetX).toBe(500);
            expect(enemy.targetY).toBe(600);
        });
    });

    describe('setOrbitTarget and clearOrbitTarget', () => {
        it('should set orbit target', () => {
            const crystal = { x: 300, y: 400 };
            enemy.setOrbitTarget(crystal);
            expect(enemy.orbitTarget).toBe(crystal);
        });

        it('should clear orbit target', () => {
            enemy.orbitTarget = { x: 100, y: 100 };
            enemy.clearOrbitTarget();
            expect(enemy.orbitTarget).toBeNull();
        });
    });

    describe('applySlow', () => {
        it('should apply slow effect', () => {
            enemy.applySlow(0.5, 2.0);
            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTime).toBe(2.0);
        });

        it('should keep higher slow amount', () => {
            enemy.applySlow(0.3, 1.0);
            enemy.applySlow(0.5, 1.0);
            expect(enemy.slowAmount).toBe(0.5);
        });

        it('should keep higher slow duration', () => {
            enemy.applySlow(0.3, 1.0);
            enemy.applySlow(0.3, 2.0);
            expect(enemy.slowTime).toBe(2.0);
        });

        it('should not reduce existing slow', () => {
            enemy.applySlow(0.5, 2.0);
            enemy.applySlow(0.2, 1.0);
            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTime).toBe(2.0);
        });
    });

    describe('applyKnockback', () => {
        it('should add knockback force', () => {
            enemy.applyKnockback(1, 0, 100);
            expect(enemy.knockbackX).toBe(100);
            expect(enemy.knockbackY).toBe(0);
        });

        it('should accumulate knockback', () => {
            enemy.applyKnockback(1, 0, 50);
            enemy.applyKnockback(0, 1, 50);
            expect(enemy.knockbackX).toBe(50);
            expect(enemy.knockbackY).toBe(50);
        });

        it('should apply direction and force', () => {
            enemy.applyKnockback(0.5, 0.5, 200);
            expect(enemy.knockbackX).toBe(100);
            expect(enemy.knockbackY).toBe(100);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            enemy.takeDamage(20);
            expect(enemy.health).toBe(30); // 50 - 20
        });

        it('should set hurt time for visual effect', () => {
            enemy.takeDamage(10);
            expect(enemy.hurtTime).toBe(0.1);
        });

        it('should return true when enemy dies', () => {
            expect(enemy.takeDamage(50)).toBe(true);
            expect(enemy.takeDamage(100)).toBe(true);
        });

        it('should return false when enemy survives', () => {
            expect(enemy.takeDamage(10)).toBe(false);
            expect(enemy.takeDamage(30)).toBe(false);
        });
    });

    describe('update', () => {
        it('should move toward target when player is within awareness radius', () => {
            // Place player at the target location, within awareness radius
            const playerX = 200;
            const playerY = 200;
            enemy.setTarget(playerX, playerY);
            const initialX = enemy.x;
            const initialY = enemy.y;
            
            // Pass player position so enemy can be aware
            enemy.update(0.1, playerX, playerY, 1.0);
            
            // Should have moved closer to target (player)
            expect(enemy.x).toBeGreaterThan(initialX);
        });

        it('should wander when player is outside awareness radius', () => {
            // Place player far away, outside awareness radius (default 400)
            const playerX = 1000;
            const playerY = 1000;
            const initialX = enemy.x;
            const initialY = enemy.y;
            
            enemy.update(0.1, playerX, playerY, 1.0);
            
            // Should have moved (wandering), but not necessarily toward player
            const moved = enemy.x !== initialX || enemy.y !== initialY;
            expect(moved).toBe(true);
            expect(enemy.isAwareOfPlayer).toBe(false);
        });

        it('should apply slow effect to speed', () => {
            enemy.applySlow(0.5, 1.0);
            enemy.update(0.1, 0, 0, 1.0);
            
            expect(enemy.speed).toBe(enemy.baseSpeed * 0.5);
        });

        it('should restore speed after slow expires', () => {
            enemy.applySlow(0.5, 0.1);
            enemy.update(0.2, 0, 0, 1.0); // Slow timer goes negative
            enemy.update(0.1, 0, 0, 1.0); // Now slow is cleared on this update
            
            expect(enemy.speed).toBe(enemy.baseSpeed);
            expect(enemy.slowAmount).toBe(0);
        });

        it('should decrease hurt time', () => {
            enemy.hurtTime = 0.1;
            enemy.update(0.05, 0, 0, 1.0);
            expect(enemy.hurtTime).toBeCloseTo(0.05);
        });

        it('should apply knockback', () => {
            enemy.knockbackX = 100;
            enemy.knockbackY = 0;
            const initialX = enemy.x;
            
            enemy.update(0.1, 0, 0, 1.0);
            
            expect(enemy.x).toBeGreaterThan(initialX);
            expect(enemy.knockbackX).toBeLessThan(100); // Decayed
        });

        it('should orbit around crystal when set', () => {
            const crystal = { x: 100, y: 100 };
            enemy.x = 100;
            enemy.y = 100 + enemy.orbitRadius;
            enemy.setOrbitTarget(crystal);
            
            const initialAngle = enemy.orbitAngle;
            enemy.update(0.1, 0, 0, 1.0);
            
            expect(enemy.orbitAngle).toBeGreaterThan(initialAngle);
        });
    });
});

describe('ENEMY_TYPES', () => {
    it('should have small, medium, and large types', () => {
        expect(ENEMY_TYPES.small).toBeDefined();
        expect(ENEMY_TYPES.medium).toBeDefined();
        expect(ENEMY_TYPES.large).toBeDefined();
    });

    it('should have increasing stats for larger enemies', () => {
        expect(ENEMY_TYPES.small.radius).toBeLessThan(ENEMY_TYPES.medium.radius);
        expect(ENEMY_TYPES.medium.radius).toBeLessThan(ENEMY_TYPES.large.radius);
        
        expect(ENEMY_TYPES.small.health).toBeLessThan(ENEMY_TYPES.medium.health);
        expect(ENEMY_TYPES.medium.health).toBeLessThan(ENEMY_TYPES.large.health);
        
        expect(ENEMY_TYPES.small.damage).toBeLessThan(ENEMY_TYPES.medium.damage);
        expect(ENEMY_TYPES.medium.damage).toBeLessThan(ENEMY_TYPES.large.damage);
    });

    it('should have decreasing speed for larger enemies', () => {
        expect(ENEMY_TYPES.small.speed).toBeGreaterThan(ENEMY_TYPES.medium.speed);
        expect(ENEMY_TYPES.medium.speed).toBeGreaterThan(ENEMY_TYPES.large.speed);
    });
});

// Mock camera for testing spawners
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

        it('should spawn enemies after interval', () => {
            const enemies = [];
            spawner.update(3.0, 0, 0, enemies, [], mockCamera);
            expect(enemies.length).toBeGreaterThan(0);
        });

        it('should not exceed max enemies', () => {
            const enemies = new Array(150).fill(null).map(() => new Enemy(0, 0, 'small'));
            const initialCount = enemies.length;
            
            spawner.update(3.0, 0, 0, enemies, [], mockCamera);
            
            expect(enemies.length).toBe(initialCount);
        });

        it('should decrease spawn interval as difficulty increases', () => {
            const initialInterval = spawner.spawnInterval;
            spawner.update(60, 0, 0, [], [], mockCamera); // 60 seconds
            expect(spawner.spawnInterval).toBeLessThan(initialInterval);
        });

        it('should spawn enemies within dynamic spawn distance from player', () => {
            const enemies = [];
            spawner.update(3.0, 100, 100, enemies, [], mockCamera);
            
            const spawnDist = spawner.getSpawnDistances(mockCamera);
            
            for (const enemy of enemies) {
                const dx = enemy.x - 100;
                const dy = enemy.y - 100;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                expect(dist).toBeGreaterThanOrEqual(spawnDist.min * 0.99); // Small tolerance
                expect(dist).toBeLessThanOrEqual(spawnDist.max * 1.01);
            }
        });
    });
});

describe('Champion', () => {
    let heatChampion;
    let coldChampion;
    let forceChampion;

    beforeEach(() => {
        heatChampion = new Champion(100, 200, 'heat');
        coldChampion = new Champion(100, 200, 'cold');
        forceChampion = new Champion(100, 200, 'force');
    });

    describe('constructor', () => {
        it('should initialize at given position', () => {
            expect(heatChampion.x).toBe(100);
            expect(heatChampion.y).toBe(200);
        });

        it('should have isChampion flag set to true', () => {
            expect(heatChampion.isChampion).toBe(true);
            expect(coldChampion.isChampion).toBe(true);
            expect(forceChampion.isChampion).toBe(true);
        });

        it('should store crystal type', () => {
            expect(heatChampion.crystalType).toBe('heat');
            expect(coldChampion.crystalType).toBe('cold');
            expect(forceChampion.crystalType).toBe('force');
        });
    });

    describe('setTarget', () => {
        it('should set target position', () => {
            heatChampion.setTarget(500, 600);
            expect(heatChampion.targetX).toBe(500);
            expect(heatChampion.targetY).toBe(600);
        });
    });

    describe('applySlow', () => {
        it('should apply slow effect', () => {
            heatChampion.applySlow(0.5, 2.0);
            expect(heatChampion.slowAmount).toBe(0.5);
            expect(heatChampion.slowTime).toBe(2.0);
        });

        it('should keep higher slow amount', () => {
            heatChampion.applySlow(0.3, 1.0);
            heatChampion.applySlow(0.5, 1.0);
            expect(heatChampion.slowAmount).toBe(0.5);
        });
    });

    describe('applyKnockback', () => {
        it('should add knockback force', () => {
            heatChampion.applyKnockback(1, 0, 100);
            expect(heatChampion.knockbackX).toBe(100);
            expect(heatChampion.knockbackY).toBe(0);
        });

        it('should accumulate knockback', () => {
            heatChampion.applyKnockback(1, 0, 50);
            heatChampion.applyKnockback(0, 1, 50);
            expect(heatChampion.knockbackX).toBe(50);
            expect(heatChampion.knockbackY).toBe(50);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health', () => {
            heatChampion.takeDamage(50);
            expect(heatChampion.health).toBe(CHAMPION_CONFIG.health - 50);
        });

        it('should set hurt time for visual effect', () => {
            heatChampion.takeDamage(10);
            expect(heatChampion.hurtTime).toBe(0.15);
        });

        it('should return true when champion dies', () => {
            expect(heatChampion.takeDamage(CHAMPION_CONFIG.health)).toBe(true);
            expect(heatChampion.takeDamage(CHAMPION_CONFIG.health + 100)).toBe(true);
        });

        it('should return false when champion survives', () => {
            expect(heatChampion.takeDamage(10)).toBe(false);
            expect(heatChampion.takeDamage(100)).toBe(false);
        });
    });

    describe('update', () => {
        it('should move toward target', () => {
            heatChampion.setTarget(200, 200);
            const initialX = heatChampion.x;
            
            heatChampion.update(0.1);
            
            expect(heatChampion.x).toBeGreaterThan(initialX);
        });

        it('should apply slow effect to speed', () => {
            heatChampion.applySlow(0.5, 1.0);
            heatChampion.update(0.1);
            
            expect(heatChampion.speed).toBe(heatChampion.baseSpeed * 0.5);
        });

        it('should decrease hurt time', () => {
            heatChampion.hurtTime = 0.15;
            heatChampion.update(0.05);
            expect(heatChampion.hurtTime).toBeCloseTo(0.1);
        });

        it('should update visual effects', () => {
            const initialPulse = heatChampion.pulsePhase;
            const initialCrown = heatChampion.crownRotation;
            
            heatChampion.update(0.1);
            
            expect(heatChampion.pulsePhase).toBeGreaterThan(initialPulse);
            expect(heatChampion.crownRotation).toBeGreaterThan(initialCrown);
        });

        it('should decrease ability cooldown', () => {
            heatChampion.abilityCooldown = 1.0;
            heatChampion.update(0.3);
            expect(heatChampion.abilityCooldown).toBeCloseTo(0.7);
        });
    });

    describe('checkAbility - Heat Champion', () => {
        it('should return flameBurst ability when cooldown is ready', () => {
            heatChampion.setTarget(200, 200);
            const ability = heatChampion.update(0.1);
            
            expect(ability).not.toBeNull();
            expect(ability.type).toBe('flameBurst');
        });

        it('should set cooldown after using ability', () => {
            heatChampion.update(0.1);
            expect(heatChampion.abilityCooldown).toBeGreaterThan(0);
        });

        it('should return null when on cooldown', () => {
            heatChampion.update(0.1); // Use ability
            const ability = heatChampion.update(0.1); // Still on cooldown
            expect(ability).toBeNull();
        });
    });

    describe('checkAbility - Cold Champion', () => {
        it('should return frostTrail ability when enough distance moved', () => {
            coldChampion.setTarget(200, 200);
            coldChampion.distanceMoved = 35; // More than threshold of 30
            
            const ability = coldChampion.update(0.1);
            
            expect(ability).not.toBeNull();
            expect(ability.type).toBe('frostTrail');
        });

        it('should reset distance moved after creating trail', () => {
            coldChampion.distanceMoved = 35;
            coldChampion.update(0.1);
            expect(coldChampion.distanceMoved).toBe(0);
        });

        it('should return null when not enough distance moved', () => {
            coldChampion.distanceMoved = 10;
            const ability = coldChampion.update(0.01);
            expect(ability).toBeNull();
        });
    });

    describe('checkAbility - Force Champion', () => {
        it('should return forceBeam ability when cooldown is ready', () => {
            forceChampion.setTarget(200, 200);
            const ability = forceChampion.update(0.1);
            
            expect(ability).not.toBeNull();
            expect(ability.type).toBe('forceBeam');
        });

        it('should set cooldown after using ability', () => {
            forceChampion.update(0.1);
            expect(forceChampion.abilityCooldown).toBeGreaterThan(0);
        });
    });
});


