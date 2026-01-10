// Tests for EnemyTypes configuration and concrete enemy classes

import { describe, it, expect, beforeEach } from 'vitest';
import { ENEMY_TYPES, getEnemyConfig, CRYSTAL_ENEMY_MAPPING } from '../../js/entities/EnemyTypes.js';
import { Builder } from '../../js/entities/Builder.js';
import { Fighter } from '../../js/entities/Fighter.js';
import { FieryEnemy } from '../../js/entities/FieryEnemy.js';
import { GravitationalEnemy } from '../../js/entities/GravitationalEnemy.js';
import { FastPurpleEnemy } from '../../js/entities/FastPurpleEnemy.js';
import { SpawnBlock } from '../../js/entities/SpawnBlock.js';

describe('ENEMY_TYPES', () => {
    it('should have all required enemy types', () => {
        expect(ENEMY_TYPES).toHaveProperty('builder');
        expect(ENEMY_TYPES).toHaveProperty('fighter');
        expect(ENEMY_TYPES).toHaveProperty('fiery');
        expect(ENEMY_TYPES).toHaveProperty('gravitational');
        expect(ENEMY_TYPES).toHaveProperty('fastPurple');
    });
    
    it('should have required properties for each type', () => {
        const requiredProps = ['type', 'radius', 'speed', 'health', 'damage', 'color', 'xp'];
        
        for (const [name, config] of Object.entries(ENEMY_TYPES)) {
            for (const prop of requiredProps) {
                expect(config).toHaveProperty(prop);
            }
        }
    });
    
    it('builder should not deal damage', () => {
        expect(ENEMY_TYPES.builder.damage).toBe(0);
    });
    
    it('fiery should have trail properties', () => {
        expect(ENEMY_TYPES.fiery).toHaveProperty('trailInterval');
        expect(ENEMY_TYPES.fiery).toHaveProperty('trailRadius');
        expect(ENEMY_TYPES.fiery).toHaveProperty('trailDuration');
        expect(ENEMY_TYPES.fiery).toHaveProperty('trailDamage');
    });
    
    it('gravitational should have gravity properties', () => {
        expect(ENEMY_TYPES.gravitational).toHaveProperty('gravityRange');
        expect(ENEMY_TYPES.gravitational).toHaveProperty('gravityStrength');
    });
});

describe('getEnemyConfig', () => {
    it('should return config for valid type', () => {
        const config = getEnemyConfig('builder');
        expect(config.type).toBe('builder');
        expect(config.radius).toBe(ENEMY_TYPES.builder.radius);
    });
    
    it('should throw for invalid type', () => {
        expect(() => getEnemyConfig('invalid')).toThrow('Unknown enemy type');
    });
    
    it('should apply scaling', () => {
        const scaling = {
            speed: 1.5,
            health: 2.0,
            damage: 1.3,
            radius: 1.2,
            level: 3
        };
        
        const config = getEnemyConfig('fighter', scaling);
        
        expect(config.speed).toBe(ENEMY_TYPES.fighter.speed * 1.5);
        expect(config.health).toBe(Math.floor(ENEMY_TYPES.fighter.health * 2.0));
        expect(config.damage).toBe(Math.floor(ENEMY_TYPES.fighter.damage * 1.3));
        expect(config.radius).toBe(ENEMY_TYPES.fighter.radius * 1.2);
        expect(config.towerLevel).toBe(3);
    });
    
    it('should scale XP based on level', () => {
        const config = getEnemyConfig('fighter', { level: 3 });
        expect(config.xp).toBe(Math.floor(ENEMY_TYPES.fighter.xp * (1 + 1))); // 1 + (3-1) * 0.5 = 2
    });
});

describe('CRYSTAL_ENEMY_MAPPING', () => {
    it('should map heat to fiery', () => {
        expect(CRYSTAL_ENEMY_MAPPING.heat.enemyType).toBe('fiery');
    });
    
    it('should map cold to gravitational', () => {
        expect(CRYSTAL_ENEMY_MAPPING.cold.enemyType).toBe('gravitational');
    });
    
    it('should map force to fastPurple', () => {
        expect(CRYSTAL_ENEMY_MAPPING.force.enemyType).toBe('fastPurple');
    });
});

describe('Builder', () => {
    let builder;
    
    beforeEach(() => {
        builder = new Builder(100, 100);
    });
    
    it('should initialize correctly', () => {
        expect(builder.type).toBe('builder');
        expect(builder.x).toBe(100);
        expect(builder.y).toBe(100);
        expect(builder.fleeRadius).toBe(ENEMY_TYPES.builder.fleeRadius);
    });
    
    it('should flee from player when close', () => {
        const startX = builder.x;
        // Player is close (within flee radius)
        builder.update(0.1, 100, 100, { crystals: [], spawnBlocks: [] });
        // Builder should not have moved much since player is at same position
        // Let's test with player slightly offset
        builder.x = 100;
        builder.y = 100;
        builder.update(0.1, 50, 100, { crystals: [], spawnBlocks: [] });
        expect(builder.x).toBeGreaterThan(100); // Should flee right
    });
    
    it('should inherit status effect methods from BaseEnemy', () => {
        expect(typeof builder.applySlow).toBe('function');
        expect(typeof builder.applyDelirious).toBe('function');
        expect(typeof builder.applyImmobilize).toBe('function');
        expect(typeof builder.applyBurningPanic).toBe('function');
        expect(typeof builder.takeDamage).toBe('function');
    });
});

describe('Fighter', () => {
    let fighter;
    
    beforeEach(() => {
        fighter = new Fighter(100, 100);
    });
    
    it('should initialize correctly', () => {
        expect(fighter.type).toBe('fighter');
        expect(fighter.aggroRadius).toBe(ENEMY_TYPES.fighter.aggroRadius);
        expect(fighter.damage).toBeGreaterThan(0);
    });
    
    it('should chase player', () => {
        const startX = fighter.x;
        // Player is far to the right
        fighter.update(0.1, 500, 100, { spawnBlocks: [] });
        expect(fighter.x).toBeGreaterThan(startX);
    });
    
    it('should inherit status effect methods from BaseEnemy', () => {
        expect(typeof fighter.applySlow).toBe('function');
        expect(typeof fighter.applyDelirious).toBe('function');
    });
});

describe('FieryEnemy', () => {
    let fiery;
    
    beforeEach(() => {
        fiery = new FieryEnemy(100, 100);
    });
    
    it('should initialize correctly', () => {
        expect(fiery.type).toBe('fiery');
        expect(fiery.trailInterval).toBe(ENEMY_TYPES.fiery.trailInterval);
    });
    
    it('should accept scaling', () => {
        const scaled = new FieryEnemy(0, 0, {
            speed: 1.5,
            health: 2.0,
            level: 3
        });
        expect(scaled.baseSpeed).toBe(ENEMY_TYPES.fiery.speed * 1.5);
        expect(scaled.maxHealth).toBe(Math.floor(ENEMY_TYPES.fiery.health * 2.0));
    });
    
    it('should create fire trails', () => {
        // Force trail creation by setting timer
        fiery.trailTimer = fiery.trailInterval;
        const result = fiery.update(0.01, 0, 0, {});
        expect(result).not.toBeNull();
        expect(result.type).toBe('fireTrail');
    });
});

describe('GravitationalEnemy', () => {
    let grav;
    
    beforeEach(() => {
        grav = new GravitationalEnemy(100, 100);
    });
    
    it('should initialize correctly', () => {
        expect(grav.type).toBe('gravitational');
        expect(grav.gravityRange).toBe(ENEMY_TYPES.gravitational.gravityRange);
        expect(grav.gravityStrength).toBe(ENEMY_TYPES.gravitational.gravityStrength);
    });
    
    it('should have velocity properties', () => {
        expect(grav.velocityX).toBe(0);
        expect(grav.velocityY).toBe(0);
    });
});

describe('FastPurpleEnemy', () => {
    let purple;
    
    beforeEach(() => {
        purple = new FastPurpleEnemy(100, 100);
    });
    
    it('should initialize correctly', () => {
        expect(purple.type).toBe('fastPurple');
        expect(purple.speed).toBe(ENEMY_TYPES.fastPurple.speed);
    });
    
    it('should chase player', () => {
        const startX = purple.x;
        purple.update(0.1, 500, 100, {});
        expect(purple.x).toBeGreaterThan(startX);
    });
});

describe('SpawnBlock', () => {
    let block;
    
    beforeEach(() => {
        block = new SpawnBlock(100, 100, 'heat');
    });
    
    it('should initialize correctly', () => {
        expect(block.type).toBe('spawnBlock');
        expect(block.crystalType).toBe('heat');
        expect(block.level).toBe(1);
    });
    
    it('should level up when XP threshold reached', () => {
        block.towerXp = block.xpToNextLevel - 1;
        const leveledUp = block.addTowerXp(5);
        expect(leveledUp).toBe(true);
        expect(block.level).toBe(2);
    });
    
    it('should trigger spawn correctly', () => {
        const spawnInfo = block.triggerSpawn();
        expect(spawnInfo.enemyType).toBe('fiery');
        expect(spawnInfo.count).toBe(5);
        expect(spawnInfo.scaling).toBeDefined();
    });
    
    it('should be immune to movement effects', () => {
        const startX = block.x;
        block.applySlow(1.0, 10);
        block.applyKnockback(1, 0, 100);
        block.update(1.0);
        expect(block.x).toBe(startX);
    });
});

