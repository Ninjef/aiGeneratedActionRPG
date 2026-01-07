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

        it('should initialize with zero movement', () => {
            expect(player.vx).toBe(0);
            expect(player.vy).toBe(0);
        });

        it('should initialize with empty powers array', () => {
            expect(player.powers).toEqual([]);
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

    describe('addPower', () => {
        it('should add new power to powers array', () => {
            const power = { id: 'fireball', passive: false };
            player.addPower(power);
            
            expect(player.powers).toHaveLength(1);
            expect(player.powers[0].id).toBe('fireball');
            expect(player.powers[0].level).toBe(1);
            expect(player.powers[0].runesCollected).toBe(1);
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

    describe('Power Rune System', () => {
        describe('getTotalRunesForLevel (static)', () => {
            it('should return 1 for level 1', () => {
                expect(Player.getTotalRunesForLevel(1)).toBe(1);
            });

            it('should return 3 for level 2 (1+2)', () => {
                expect(Player.getTotalRunesForLevel(2)).toBe(3);
            });

            it('should return 6 for level 3 (1+2+3)', () => {
                expect(Player.getTotalRunesForLevel(3)).toBe(6);
            });

            it('should return 10 for level 4 (1+2+3+4)', () => {
                expect(Player.getTotalRunesForLevel(4)).toBe(10);
            });
        });

        describe('getRunesNeededForNextLevel (static)', () => {
            it('should return 2 to go from level 1 to 2', () => {
                expect(Player.getRunesNeededForNextLevel(1)).toBe(2);
            });

            it('should return 3 to go from level 2 to 3', () => {
                expect(Player.getRunesNeededForNextLevel(2)).toBe(3);
            });

            it('should return 4 to go from level 3 to 4', () => {
                expect(Player.getRunesNeededForNextLevel(3)).toBe(4);
            });
        });

        describe('collectPowerRune', () => {
            it('should grant power at level 1 on first rune', () => {
                const result = player.collectPowerRune('fireballBarrage', false);
                
                expect(result.isNew).toBe(true);
                expect(result.leveledUp).toBe(false);
                expect(result.power.level).toBe(1);
                expect(result.power.runesCollected).toBe(1);
                expect(player.powers).toHaveLength(1);
            });

            it('should increment rune count without leveling up', () => {
                player.collectPowerRune('fireballBarrage', false);
                const result = player.collectPowerRune('fireballBarrage', false);
                
                expect(result.isNew).toBe(false);
                expect(result.leveledUp).toBe(false);
                expect(result.power.level).toBe(1);
                expect(result.power.runesCollected).toBe(2);
            });

            it('should level up when enough runes collected', () => {
                // First rune: level 1 (1 total)
                player.collectPowerRune('fireballBarrage', false);
                // Second rune: still level 1 (2 total, need 3 for level 2)
                player.collectPowerRune('fireballBarrage', false);
                // Third rune: level up to 2 (3 total = 1+2)
                const result = player.collectPowerRune('fireballBarrage', false);
                
                expect(result.isNew).toBe(false);
                expect(result.leveledUp).toBe(true);
                expect(result.power.level).toBe(2);
                expect(result.power.runesCollected).toBe(3);
            });

            it('should track multiple different powers separately', () => {
                player.collectPowerRune('fireballBarrage', false);
                player.collectPowerRune('iceShards', false);
                
                expect(player.powers).toHaveLength(2);
                expect(player.powers.find(p => p.id === 'fireballBarrage').level).toBe(1);
                expect(player.powers.find(p => p.id === 'iceShards').level).toBe(1);
            });

            it('should level up from 2 to 3 correctly', () => {
                // Level 1: 1 rune
                player.collectPowerRune('fireballBarrage', false);
                // Level 2: need 2 more (3 total)
                player.collectPowerRune('fireballBarrage', false);
                player.collectPowerRune('fireballBarrage', false);
                // Level 3: need 3 more (6 total)
                player.collectPowerRune('fireballBarrage', false);
                player.collectPowerRune('fireballBarrage', false);
                const result = player.collectPowerRune('fireballBarrage', false);
                
                expect(result.leveledUp).toBe(true);
                expect(result.power.level).toBe(3);
                expect(result.power.runesCollected).toBe(6);
            });
        });

        describe('getPowerProgress', () => {
            it('should return null for unknown power', () => {
                expect(player.getPowerProgress('unknownPower')).toBeNull();
            });

            it('should return correct progress at level 1', () => {
                player.collectPowerRune('fireballBarrage', false);
                const progress = player.getPowerProgress('fireballBarrage');
                
                expect(progress.level).toBe(1);
                expect(progress.runesProgress).toBe(0); // 1 - 1 = 0
                expect(progress.runesNeeded).toBe(2); // need 2 more for level 2
            });

            it('should return correct progress mid-level', () => {
                player.collectPowerRune('fireballBarrage', false);
                player.collectPowerRune('fireballBarrage', false);
                const progress = player.getPowerProgress('fireballBarrage');
                
                expect(progress.level).toBe(1);
                expect(progress.runesProgress).toBe(1); // 2 - 1 = 1
                expect(progress.runesNeeded).toBe(2);
            });
        });
    });
});

