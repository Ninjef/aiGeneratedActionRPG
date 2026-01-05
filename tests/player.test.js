import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../js/player.js';

describe('Player', () => {
    let player;

    beforeEach(() => {
        player = new Player(100, 200);
    });

    describe('constructor', () => {
        it('should initialize at given position', () => {
            expect(player.x).toBe(100);
            expect(player.y).toBe(200);
        });

        it('should initialize with default stats', () => {
            expect(player.radius).toBe(20);
            expect(player.speed).toBe(250);
            expect(player.maxHealth).toBe(100);
            expect(player.health).toBe(100);
        });

        it('should initialize with zero movement', () => {
            expect(player.vx).toBe(0);
            expect(player.vy).toBe(0);
        });

        it('should initialize with empty crystal inventory', () => {
            expect(player.crystals.heat).toBe(0);
            expect(player.crystals.cold).toBe(0);
            expect(player.crystals.force).toBe(0);
        });

        it('should initialize with empty powers array', () => {
            expect(player.powers).toEqual([]);
        });

        it('should initialize with zero damage reduction', () => {
            expect(player.damageReduction).toBe(0);
        });
    });

    describe('totalCrystals getter', () => {
        it('should return sum of all crystal types', () => {
            player.crystals.heat = 2;
            player.crystals.cold = 3;
            player.crystals.force = 1;
            expect(player.totalCrystals).toBe(6);
        });

        it('should return 0 when no crystals', () => {
            expect(player.totalCrystals).toBe(0);
        });
    });

    describe('setMovement', () => {
        it('should set movement direction', () => {
            player.setMovement(1, 0);
            expect(player.vx).toBe(1);
            expect(player.vy).toBe(0);
        });

        it('should normalize diagonal movement', () => {
            player.setMovement(1, 1);
            const expectedValue = 1 / Math.sqrt(2);
            expect(player.vx).toBeCloseTo(expectedValue);
            expect(player.vy).toBeCloseTo(expectedValue);
        });

        it('should normalize negative diagonal movement', () => {
            player.setMovement(-1, -1);
            const expectedValue = -1 / Math.sqrt(2);
            expect(player.vx).toBeCloseTo(expectedValue);
            expect(player.vy).toBeCloseTo(expectedValue);
        });

        it('should not normalize cardinal directions', () => {
            player.setMovement(0, -1);
            expect(player.vx).toBe(0);
            expect(player.vy).toBe(-1);
        });

        it('should handle zero movement', () => {
            player.setMovement(0, 0);
            expect(player.vx).toBe(0);
            expect(player.vy).toBe(0);
        });
    });

    describe('update', () => {
        it('should move player based on velocity', () => {
            player.setMovement(1, 0);
            player.update(1); // 1 second
            
            // Should move speed * dt = 250 * 1 = 250 units
            expect(player.x).toBe(100 + 250);
            expect(player.y).toBe(200);
        });

        it('should decrease invincibility time', () => {
            player.invincibleTime = 1.0;
            player.update(0.3);
            expect(player.invincibleTime).toBeCloseTo(0.7);
        });

        it('should not go below zero invincibility', () => {
            player.invincibleTime = 0.1;
            player.update(0.5);
            expect(player.invincibleTime).toBeLessThanOrEqual(0);
        });

        it('should decrease flash time', () => {
            player.flashTime = 0.5;
            player.update(0.2);
            expect(player.flashTime).toBeCloseTo(0.3);
        });

        it('should update rotation angle', () => {
            const initialAngle = player.rotationAngle;
            player.update(1);
            expect(player.rotationAngle).toBe(initialAngle + 1.5);
        });
    });

    describe('takeDamage', () => {
        it('should reduce health by damage amount', () => {
            player.takeDamage(25);
            expect(player.health).toBe(75);
        });

        it('should apply damage reduction', () => {
            player.damageReduction = 0.5;
            player.takeDamage(20);
            expect(player.health).toBe(90); // 20 * 0.5 = 10 damage
        });

        it('should set invincibility time after damage', () => {
            player.takeDamage(10);
            expect(player.invincibleTime).toBe(player.invincibleDuration);
        });

        it('should set flash time after damage', () => {
            player.takeDamage(10);
            expect(player.flashTime).toBe(0.1);
        });

        it('should return true when damage is taken', () => {
            expect(player.takeDamage(10)).toBe(true);
        });

        it('should return false when invincible', () => {
            player.invincibleTime = 1.0;
            expect(player.takeDamage(10)).toBe(false);
            expect(player.health).toBe(100); // No damage taken
        });

        it('should allow health to go negative', () => {
            player.takeDamage(150);
            expect(player.health).toBe(-50);
        });
    });

    describe('heal', () => {
        it('should increase health', () => {
            player.health = 50;
            player.heal(25);
            expect(player.health).toBe(75);
        });

        it('should not exceed max health', () => {
            player.health = 90;
            player.heal(25);
            expect(player.health).toBe(100);
        });

        it('should heal to exactly max health', () => {
            player.health = 50;
            player.heal(50);
            expect(player.health).toBe(100);
        });
    });

    describe('collectCrystal', () => {
        it('should increment heat crystal count', () => {
            player.collectCrystal('heat');
            expect(player.crystals.heat).toBe(1);
        });

        it('should increment cold crystal count', () => {
            player.collectCrystal('cold');
            expect(player.crystals.cold).toBe(1);
        });

        it('should increment force crystal count', () => {
            player.collectCrystal('force');
            expect(player.crystals.force).toBe(1);
        });

        it('should return true for valid crystal type', () => {
            expect(player.collectCrystal('heat')).toBe(true);
        });

        it('should return false for invalid crystal type', () => {
            expect(player.collectCrystal('invalid')).toBe(false);
        });

        it('should accumulate crystals', () => {
            player.collectCrystal('heat');
            player.collectCrystal('heat');
            player.collectCrystal('heat');
            expect(player.crystals.heat).toBe(3);
        });
    });

    describe('resetCrystals', () => {
        it('should reset all crystal counts to zero', () => {
            player.crystals.heat = 5;
            player.crystals.cold = 3;
            player.crystals.force = 2;
            
            player.resetCrystals();
            
            expect(player.crystals.heat).toBe(0);
            expect(player.crystals.cold).toBe(0);
            expect(player.crystals.force).toBe(0);
        });
    });

    describe('addPower', () => {
        it('should add new power to powers array', () => {
            const power = { id: 'fireball', passive: false };
            player.addPower(power);
            
            expect(player.powers).toHaveLength(1);
            expect(player.powers[0].id).toBe('fireball');
            expect(player.powers[0].level).toBe(1);
        });

        it('should increment level of existing power', () => {
            player.addPower({ id: 'fireball', passive: false });
            player.addPower({ id: 'fireball', passive: false });
            
            expect(player.powers).toHaveLength(1);
            expect(player.powers[0].level).toBe(2);
        });

        it('should return the added or upgraded power', () => {
            const power1 = player.addPower({ id: 'iceball', passive: false });
            expect(power1.level).toBe(1);
            
            const power2 = player.addPower({ id: 'iceball', passive: false });
            expect(power2.level).toBe(2);
            expect(power2).toBe(power1); // Same reference
        });

        it('should track multiple different powers', () => {
            player.addPower({ id: 'fire', passive: false });
            player.addPower({ id: 'ice', passive: false });
            player.addPower({ id: 'force', passive: true });
            
            expect(player.powers).toHaveLength(3);
        });
    });
});

