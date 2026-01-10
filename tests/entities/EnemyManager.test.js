// Tests for EnemyManager class

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnemyManager } from '../../js/entities/EnemyManager.js';
import { BaseEnemy } from '../../js/entities/BaseEnemy.js';

// Mock enemy class for testing
class MockEnemy extends BaseEnemy {
    constructor(x, y, type = 'mock') {
        super(x, y, {
            type,
            radius: 10,
            speed: 100,
            health: 50,
            damage: 10,
            color: '#ff0000',
            xp: 10
        });
        this.updateCalled = false;
    }
    
    update(dt, playerX, playerY, context) {
        this.updateCalled = true;
        this.updateStatusEffects(dt);
        return null;
    }
    
    render(ctx, camera) {
        // No-op
    }
}

describe('EnemyManager', () => {
    let manager;
    
    beforeEach(() => {
        manager = new EnemyManager();
    });
    
    describe('add', () => {
        it('should add enemy to collection', () => {
            const enemy = new MockEnemy(100, 100);
            expect(manager.add(enemy)).toBe(true);
            expect(manager.getCount()).toBe(1);
        });
        
        it('should update type index', () => {
            const enemy = new MockEnemy(100, 100, 'builder');
            manager.add(enemy);
            expect(manager.getByType('builder')).toContain(enemy);
        });
        
        it('should respect max capacity', () => {
            manager.maxTotalEnemies = 2;
            manager.add(new MockEnemy(0, 0));
            manager.add(new MockEnemy(0, 0));
            expect(manager.add(new MockEnemy(0, 0))).toBe(false);
            expect(manager.getCount()).toBe(2);
        });
    });
    
    describe('addMany', () => {
        it('should add multiple enemies', () => {
            const enemies = [
                new MockEnemy(0, 0),
                new MockEnemy(10, 10),
                new MockEnemy(20, 20)
            ];
            expect(manager.addMany(enemies)).toBe(3);
            expect(manager.getCount()).toBe(3);
        });
        
        it('should stop at capacity', () => {
            manager.maxTotalEnemies = 2;
            const enemies = [
                new MockEnemy(0, 0),
                new MockEnemy(10, 10),
                new MockEnemy(20, 20)
            ];
            expect(manager.addMany(enemies)).toBe(2);
            expect(manager.getCount()).toBe(2);
        });
    });
    
    describe('remove', () => {
        it('should remove enemy from collection', () => {
            const enemy = new MockEnemy(100, 100);
            manager.add(enemy);
            expect(manager.remove(enemy)).toBe(true);
            expect(manager.getCount()).toBe(0);
        });
        
        it('should return false for non-existent enemy', () => {
            const enemy = new MockEnemy(100, 100);
            expect(manager.remove(enemy)).toBe(false);
        });
        
        it('should update type index', () => {
            const enemy = new MockEnemy(100, 100, 'fighter');
            manager.add(enemy);
            manager.remove(enemy);
            expect(manager.getByType('fighter')).not.toContain(enemy);
        });
    });
    
    describe('markDead and removeDeadEnemies', () => {
        it('should mark enemy as dead', () => {
            const enemy = new MockEnemy(100, 100);
            manager.add(enemy);
            manager.markDead(enemy);
            expect(enemy._dead).toBe(true);
        });
        
        it('should remove dead enemies', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            
            manager.markDead(enemy1);
            expect(manager.removeDeadEnemies()).toBe(1);
            expect(manager.getCount()).toBe(1);
            expect(manager.getAll()).toContain(enemy2);
        });
    });
    
    describe('getAll', () => {
        it('should return all enemies', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            
            expect(manager.getAll()).toHaveLength(2);
        });
        
        it('should exclude dead by default', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            enemy1._dead = true;
            
            expect(manager.getAll()).toHaveLength(1);
            expect(manager.getAll()).toContain(enemy2);
        });
        
        it('should include dead when requested', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            enemy1._dead = true;
            
            expect(manager.getAll(true)).toHaveLength(2);
        });
    });
    
    describe('getAlive', () => {
        it('should return only alive enemies', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            enemy1._dead = true;
            
            const alive = manager.getAlive();
            expect(alive).toHaveLength(1);
            expect(alive).toContain(enemy2);
        });
    });
    
    describe('getByType', () => {
        it('should return enemies of specific type', () => {
            const builder = new MockEnemy(0, 0, 'builder');
            const fighter = new MockEnemy(10, 10, 'fighter');
            manager.add(builder);
            manager.add(fighter);
            
            expect(manager.getByType('builder')).toContain(builder);
            expect(manager.getByType('builder')).not.toContain(fighter);
        });
        
        it('should return empty array for unknown type', () => {
            expect(manager.getByType('unknown')).toEqual([]);
        });
    });
    
    describe('getCountByType', () => {
        it('should count enemies by type', () => {
            manager.add(new MockEnemy(0, 0, 'builder'));
            manager.add(new MockEnemy(0, 0, 'builder'));
            manager.add(new MockEnemy(0, 0, 'fighter'));
            
            expect(manager.getCountByType('builder')).toBe(2);
            expect(manager.getCountByType('fighter')).toBe(1);
            expect(manager.getCountByType('unknown')).toBe(0);
        });
    });
    
    describe('getCount', () => {
        it('should return total count', () => {
            manager.add(new MockEnemy(0, 0));
            manager.add(new MockEnemy(0, 0));
            expect(manager.getCount()).toBe(2);
        });
    });
    
    describe('isAtCapacity', () => {
        it('should return false when under capacity', () => {
            manager.add(new MockEnemy(0, 0));
            expect(manager.isAtCapacity()).toBe(false);
        });
        
        it('should return true at capacity', () => {
            manager.maxTotalEnemies = 1;
            manager.add(new MockEnemy(0, 0));
            expect(manager.isAtCapacity()).toBe(true);
        });
    });
    
    describe('getRemainingCapacity', () => {
        it('should return remaining capacity', () => {
            manager.maxTotalEnemies = 100;
            manager.add(new MockEnemy(0, 0));
            manager.add(new MockEnemy(0, 0));
            expect(manager.getRemainingCapacity()).toBe(98);
        });
    });
    
    describe('update', () => {
        it('should update all enemies', () => {
            const enemy1 = new MockEnemy(0, 0);
            const enemy2 = new MockEnemy(10, 10);
            manager.add(enemy1);
            manager.add(enemy2);
            
            manager.update(0.1, 0, 0, {});
            
            expect(enemy1.updateCalled).toBe(true);
            expect(enemy2.updateCalled).toBe(true);
        });
        
        it('should skip dead enemies', () => {
            const enemy1 = new MockEnemy(0, 0);
            manager.add(enemy1);
            enemy1._dead = true;
            
            manager.update(0.1, 0, 0, {});
            
            expect(enemy1.updateCalled).toBe(false);
        });
    });
    
    describe('despawnFarEnemies', () => {
        it('should remove enemies beyond despawn distance', () => {
            const nearEnemy = new MockEnemy(10, 10);
            const farEnemy = new MockEnemy(1000, 1000);
            manager.add(nearEnemy);
            manager.add(farEnemy);
            
            const removed = manager.despawnFarEnemies(0, 0, 500);
            
            expect(removed).toBe(1);
            expect(manager.getCount()).toBe(1);
            expect(manager.getAll()).toContain(nearEnemy);
        });
        
        it('should not despawn spawn blocks', () => {
            const spawnBlock = new MockEnemy(1000, 1000, 'spawnBlock');
            manager.add(spawnBlock);
            
            const removed = manager.despawnFarEnemies(0, 0, 500);
            
            expect(removed).toBe(0);
            expect(manager.getCount()).toBe(1);
        });
    });
    
    describe('applyBurningDamage', () => {
        it('should damage burning enemies', () => {
            const enemy = new MockEnemy(0, 0);
            enemy.burningPanicTime = 2.0;
            manager.add(enemy);
            
            manager.applyBurningDamage(0.1, 100);
            
            expect(enemy.health).toBe(40); // 50 - (100 * 0.1)
        });
        
        it('should not damage non-burning enemies', () => {
            const enemy = new MockEnemy(0, 0);
            manager.add(enemy);
            
            manager.applyBurningDamage(0.1, 100);
            
            expect(enemy.health).toBe(50);
        });
        
        it('should call onKill when enemy dies', () => {
            const enemy = new MockEnemy(0, 0);
            enemy.burningPanicTime = 2.0;
            enemy.health = 5;
            manager.add(enemy);
            
            const onKill = vi.fn();
            manager.applyBurningDamage(0.1, 100, onKill);
            
            expect(onKill).toHaveBeenCalledWith(enemy);
            expect(enemy._dead).toBe(true);
        });
    });
    
    describe('clear', () => {
        it('should remove all enemies', () => {
            manager.add(new MockEnemy(0, 0));
            manager.add(new MockEnemy(0, 0));
            
            manager.clear();
            
            expect(manager.getCount()).toBe(0);
            expect(manager.getByType('mock')).toEqual([]);
        });
    });
});

