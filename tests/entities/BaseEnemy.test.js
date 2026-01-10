// Tests for BaseEnemy class and shared status effect logic

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseEnemy } from '../../js/entities/BaseEnemy.js';

// Create a concrete implementation for testing
class TestEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, {
            type: 'test',
            radius: 15,
            speed: 100,
            health: 50,
            damage: 10,
            color: '#ff0000',
            xp: 10
        });
    }
    
    update(dt, playerX, playerY, context) {
        this.updateStatusEffects(dt);
        this.applyKnockbackMovement(dt);
        return null;
    }
    
    render(ctx, camera) {
        // No-op for testing
    }
}

describe('BaseEnemy', () => {
    let enemy;
    
    beforeEach(() => {
        enemy = new TestEnemy(100, 100);
    });
    
    describe('constructor', () => {
        it('should initialize with correct position', () => {
            expect(enemy.x).toBe(100);
            expect(enemy.y).toBe(100);
        });
        
        it('should initialize stats from config', () => {
            expect(enemy.type).toBe('test');
            expect(enemy.radius).toBe(15);
            expect(enemy.baseSpeed).toBe(100);
            expect(enemy.speed).toBe(100);
            expect(enemy.maxHealth).toBe(50);
            expect(enemy.health).toBe(50);
            expect(enemy.damage).toBe(10);
            expect(enemy.xp).toBe(10);
        });
        
        it('should initialize status effects as inactive', () => {
            expect(enemy.slowAmount).toBe(0);
            expect(enemy.slowTime).toBe(0);
            expect(enemy.knockbackX).toBe(0);
            expect(enemy.knockbackY).toBe(0);
            expect(enemy.deliriousTime).toBe(0);
            expect(enemy.immobilizedTime).toBe(0);
            expect(enemy.permanentlyFrozen).toBe(false);
            expect(enemy.burningPanicTime).toBe(0);
        });
    });
    
    describe('applySlow', () => {
        it('should apply slow effect', () => {
            enemy.applySlow(0.5, 2.0);
            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTime).toBe(2.0);
        });
        
        it('should keep strongest slow', () => {
            enemy.applySlow(0.3, 1.0);
            enemy.applySlow(0.5, 2.0);
            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTime).toBe(2.0);
            
            // Weaker slow shouldn't override
            enemy.applySlow(0.2, 0.5);
            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTime).toBe(2.0);
        });
        
        it('should reduce speed when slowed', () => {
            enemy.applySlow(0.5, 1.0);
            enemy.update(0.1, 0, 0, {});
            expect(enemy.speed).toBe(50); // 100 * (1 - 0.5)
        });
    });
    
    describe('applyDelirious', () => {
        it('should apply delirious effect', () => {
            enemy.applyDelirious(3.0);
            expect(enemy.deliriousTime).toBe(3.0);
        });
        
        it('should initialize phase on first application', () => {
            enemy.applyDelirious(3.0);
            expect(['chase', 'wander']).toContain(enemy.deliriousPhase);
            expect(enemy.deliriousPhaseTimer).toBe(0);
        });
        
        it('should not reset phase when reapplying', () => {
            enemy.applyDelirious(2.0);
            const initialPhase = enemy.deliriousPhase;
            enemy.deliriousPhaseTimer = 0.5;
            
            // Reapply longer duration
            enemy.applyDelirious(4.0);
            expect(enemy.deliriousTime).toBe(4.0);
            // Phase should not be reset
            expect(enemy.deliriousPhaseTimer).toBe(0.5);
        });
    });
    
    describe('applyImmobilize', () => {
        it('should apply immobilize effect', () => {
            enemy.applyImmobilize(2.0);
            expect(enemy.immobilizedTime).toBe(2.0);
        });
        
        it('should prevent movement', () => {
            enemy.applyImmobilize(2.0);
            expect(enemy.canMove()).toBe(false);
        });
        
        it('should allow movement after expiration', () => {
            enemy.applyImmobilize(1.0);
            enemy.update(1.1, 0, 0, {});
            expect(enemy.canMove()).toBe(true);
        });
    });
    
    describe('applyPermanentFreeze', () => {
        it('should apply permanent freeze', () => {
            enemy.applyPermanentFreeze();
            expect(enemy.permanentlyFrozen).toBe(true);
        });
        
        it('should clear regular immobilize', () => {
            enemy.applyImmobilize(5.0);
            enemy.applyPermanentFreeze();
            expect(enemy.immobilizedTime).toBe(0);
            expect(enemy.permanentlyFrozen).toBe(true);
        });
        
        it('should prevent movement permanently', () => {
            enemy.applyPermanentFreeze();
            expect(enemy.canMove()).toBe(false);
            
            // Even after update, still can't move
            enemy.update(100, 0, 0, {});
            expect(enemy.canMove()).toBe(false);
        });
    });
    
    describe('applyBurningPanic', () => {
        it('should apply burning panic', () => {
            enemy.applyBurningPanic(3.0);
            expect(enemy.burningPanicTime).toBe(3.0);
        });
        
        it('should set random panic angle', () => {
            enemy.applyBurningPanic(3.0);
            expect(enemy.burningPanicAngle).toBeGreaterThanOrEqual(0);
            expect(enemy.burningPanicAngle).toBeLessThan(Math.PI * 2);
        });
        
        it('should clear immobilize', () => {
            enemy.applyImmobilize(5.0);
            enemy.applyBurningPanic(3.0);
            expect(enemy.immobilizedTime).toBe(0);
        });
        
        it('should not apply to permanently frozen enemies', () => {
            enemy.applyPermanentFreeze();
            enemy.applyBurningPanic(3.0);
            expect(enemy.burningPanicTime).toBe(0);
        });
    });
    
    describe('applyKnockback', () => {
        it('should apply knockback force', () => {
            enemy.applyKnockback(1, 0, 50);
            expect(enemy.knockbackX).toBe(50);
            expect(enemy.knockbackY).toBe(0);
        });
        
        it('should accumulate knockback', () => {
            enemy.applyKnockback(1, 0, 50);
            enemy.applyKnockback(0, 1, 30);
            expect(enemy.knockbackX).toBe(50);
            expect(enemy.knockbackY).toBe(30);
        });
        
        it('should move enemy over time', () => {
            const startX = enemy.x;
            enemy.applyKnockback(1, 0, 100);
            enemy.update(0.1, 0, 0, {});
            expect(enemy.x).toBeGreaterThan(startX);
        });
    });
    
    describe('takeDamage', () => {
        it('should reduce health', () => {
            enemy.takeDamage(20);
            expect(enemy.health).toBe(30);
        });
        
        it('should set hurt time', () => {
            enemy.takeDamage(10);
            expect(enemy.hurtTime).toBe(0.1);
        });
        
        it('should return true when killed', () => {
            expect(enemy.takeDamage(50)).toBe(true);
        });
        
        it('should return false when not killed', () => {
            expect(enemy.takeDamage(20)).toBe(false);
        });
        
        it('should not damage if cryostasis invulnerable', () => {
            enemy.cryostasisInvulnerable = true;
            expect(enemy.takeDamage(100)).toBe(false);
            expect(enemy.health).toBe(50);
        });
    });
    
    describe('updateStatusEffects', () => {
        it('should decrease slow time', () => {
            enemy.applySlow(0.5, 1.0);
            enemy.updateStatusEffects(0.3);
            expect(enemy.slowTime).toBeCloseTo(0.7);
        });
        
        it('should reset speed when slow expires', () => {
            enemy.applySlow(0.5, 0.5);
            // First update brings slowTime below 0
            enemy.updateStatusEffects(0.6);
            // slowTime is now negative, but we need another tick to reset
            // because the check happens at the start of the update
            enemy.updateStatusEffects(0.1);
            expect(enemy.slowAmount).toBe(0);
            expect(enemy.speed).toBe(100);
        });
        
        it('should decrease delirious time', () => {
            enemy.applyDelirious(2.0);
            enemy.updateStatusEffects(0.5);
            expect(enemy.deliriousTime).toBeCloseTo(1.5);
        });
        
        it('should decrease immobilize time', () => {
            enemy.applyImmobilize(2.0);
            enemy.updateStatusEffects(0.5);
            expect(enemy.immobilizedTime).toBeCloseTo(1.5);
        });
        
        it('should decrease burning panic time', () => {
            enemy.applyBurningPanic(2.0);
            enemy.updateStatusEffects(0.5);
            expect(enemy.burningPanicTime).toBeCloseTo(1.5);
        });
        
        it('should decrease hurt time', () => {
            enemy.takeDamage(10);
            enemy.updateStatusEffects(0.05);
            expect(enemy.hurtTime).toBeCloseTo(0.05);
        });
    });
    
    describe('canMove', () => {
        it('should return true when no movement restrictions', () => {
            expect(enemy.canMove()).toBe(true);
        });
        
        it('should return false when immobilized', () => {
            enemy.applyImmobilize(1.0);
            expect(enemy.canMove()).toBe(false);
        });
        
        it('should return false when permanently frozen', () => {
            enemy.applyPermanentFreeze();
            expect(enemy.canMove()).toBe(false);
        });
    });
    
    describe('isInBurningPanic', () => {
        it('should return false when not in panic', () => {
            expect(enemy.isInBurningPanic()).toBe(false);
        });
        
        it('should return true when in panic', () => {
            enemy.applyBurningPanic(2.0);
            expect(enemy.isInBurningPanic()).toBe(true);
        });
    });
    
    describe('isDelirious', () => {
        it('should return false when not delirious', () => {
            expect(enemy.isDelirious()).toBe(false);
        });
        
        it('should return true when delirious', () => {
            enemy.applyDelirious(2.0);
            expect(enemy.isDelirious()).toBe(true);
        });
    });
    
    describe('getDisplayColor', () => {
        it('should return normal color', () => {
            expect(enemy.getDisplayColor()).toBe('#ff0000');
        });
        
        it('should return white when hurt', () => {
            enemy.takeDamage(10);
            expect(enemy.getDisplayColor()).toBe('#ffffff');
        });
        
        it('should return orange when in burning panic', () => {
            enemy.applyBurningPanic(2.0);
            expect(enemy.getDisplayColor()).toBe('#ff6600');
        });
    });
});

