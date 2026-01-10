import { describe, it, expect, beforeEach } from 'vitest';
import { PowerManager, POWERS, getPowerIcon } from '../js/powers.js';

describe('POWERS definitions', () => {
    describe('data-driven structure', () => {
        it('should have all required properties for each power', () => {
            for (const powerId in POWERS) {
                const power = POWERS[powerId];
                expect(power.id).toBe(powerId);
                expect(power.name).toBeDefined();
                expect(power.description).toBeDefined();
                expect(power.category).toMatch(/^(heat|cold|force)$/);
                expect(typeof power.baseCooldown).toBe('number');
                expect(typeof power.passive).toBe('boolean');
                expect(power.levelScale).toBeDefined();
            }
        });

        it('should have icon definitions for all powers', () => {
            for (const powerId in POWERS) {
                const power = POWERS[powerId];
                expect(power.icon).toBeDefined();
                expect(power.icon.color).toBeDefined();
                expect(power.icon.glowColor).toBeDefined();
                expect(typeof power.icon.render).toBe('function');
            }
        });

        it('should have cast functions for all active powers', () => {
            for (const powerId in POWERS) {
                const power = POWERS[powerId];
                if (!power.passive) {
                    expect(typeof power.cast).toBe('function');
                }
            }
        });

        it('passive powers should have null cast functions', () => {
            const passivePowers = Object.values(POWERS).filter(p => p.passive);
            expect(passivePowers.length).toBeGreaterThan(0);
            for (const power of passivePowers) {
                expect(power.cast).toBeNull();
            }
        });
    });

    describe('power categories', () => {
        it('should have 3 heat powers', () => {
            const heatPowers = Object.values(POWERS).filter(p => p.category === 'heat');
            expect(heatPowers).toHaveLength(3);
        });

        it('should have 4 cold powers', () => {
            const coldPowers = Object.values(POWERS).filter(p => p.category === 'cold');
            expect(coldPowers).toHaveLength(4);
        });

        it('should have 3 force powers', () => {
            const forcePowers = Object.values(POWERS).filter(p => p.category === 'force');
            expect(forcePowers).toHaveLength(3);
        });
    });
});

describe('getPowerIcon', () => {
    it('should return icon for known powers', () => {
        const icon = getPowerIcon('crucible');
        expect(icon.color).toBe('#dc143c');
        expect(icon.glowColor).toBe('rgba(220, 20, 60, 0.6)');
        expect(typeof icon.render).toBe('function');
    });

    it('should return fallback icon for unknown powers', () => {
        const icon = getPowerIcon('nonexistent');
        expect(icon.color).toBe('#ffffff');
        expect(icon.glowColor).toBe('rgba(255, 255, 255, 0.5)');
        expect(typeof icon.render).toBe('function');
    });
});

describe('PowerManager', () => {
    describe('generatePowerOptions', () => {
        it('should return 3 heat powers when category is heat', () => {
            const options = PowerManager.generatePowerOptions('heat', []);
            
            expect(options).toHaveLength(3);
            expect(options[0].category).toBe('heat');
            expect(options[1].category).toBe('heat');
            expect(options[2].category).toBe('heat');
        });

        it('should return 4 cold powers when category is cold', () => {
            const options = PowerManager.generatePowerOptions('cold', []);
            
            expect(options).toHaveLength(4);
            expect(options.every(o => o.category === 'cold')).toBe(true);
        });

        it('should return 3 force powers when category is force', () => {
            const options = PowerManager.generatePowerOptions('force', []);
            
            expect(options).toHaveLength(3);
            expect(options[0].category).toBe('force');
            expect(options[1].category).toBe('force');
            expect(options[2].category).toBe('force');
        });

        it('should include currentLevel 0 for new powers', () => {
            const options = PowerManager.generatePowerOptions('heat', []);
            
            expect(options[0].currentLevel).toBe(0);
            expect(options[1].currentLevel).toBe(0);
            expect(options[2].currentLevel).toBe(0);
        });

        it('should include currentLevel for existing powers', () => {
            const existingPowers = [
                { id: 'crucible', level: 3, passive: false }
            ];
            const options = PowerManager.generatePowerOptions('heat', existingPowers);
            
            const crucibleOption = options.find(o => o.id === 'crucible');
            expect(crucibleOption.currentLevel).toBe(3);
        });

        it('should return all powers in category even if player has them', () => {
            const existingPowers = [
                { id: 'crucible', level: 5, passive: false },
                { id: 'magmaPool', level: 3, passive: false },
                { id: 'infernoRing', level: 2, passive: false }
            ];
            const options = PowerManager.generatePowerOptions('heat', existingPowers);
            
            expect(options).toHaveLength(3);
            expect(options.every(o => o.currentLevel > 0)).toBe(true);
        });

        it('should return empty array for invalid category', () => {
            const options = PowerManager.generatePowerOptions('invalid', []);
            
            expect(options).toHaveLength(0);
        });

        it('should include icon in generated options', () => {
            const options = PowerManager.generatePowerOptions('heat', []);
            
            for (const option of options) {
                expect(option.icon).toBeDefined();
                expect(option.icon.color).toBeDefined();
            }
        });

        it('should include cast function in generated options', () => {
            const options = PowerManager.generatePowerOptions('heat', []);
            
            for (const option of options) {
                expect(typeof option.cast).toBe('function');
            }
        });
    });

    describe('castPower', () => {
        it('should not throw when casting with valid power id', () => {
            // Create minimal mock player
            const mockPlayer = {
                x: 0,
                y: 0,
                powers: [],
                passiveUpgrades: [],
                statusEffects: { getBonusLevels: () => 0 }
            };
            
            const powerManager = new PowerManager(
                mockPlayer,
                [], // projectiles
                [], // areaEffects
                [], // ringEffects
                [], // crucibleEffects
                []  // cryostasisBeams
            );

            const power = { id: 'crucible', level: 1, passive: false };
            
            // Should not throw
            expect(() => powerManager.castPower(power)).not.toThrow();
        });

        it('should add crucible effect when casting crucible', () => {
            const mockPlayer = {
                x: 100,
                y: 100,
                powers: [],
                passiveUpgrades: [],
                statusEffects: { getBonusLevels: () => 0 }
            };
            
            const crucibleEffects = [];
            const powerManager = new PowerManager(
                mockPlayer,
                [],
                [],
                [],
                crucibleEffects,
                []
            );

            const power = { id: 'crucible', level: 1, passive: false };
            powerManager.castPower(power);
            
            expect(crucibleEffects).toHaveLength(1);
        });

        it('should not throw for passive powers (null cast)', () => {
            const mockPlayer = {
                x: 0,
                y: 0,
                powers: [],
                passiveUpgrades: [],
                statusEffects: { getBonusLevels: () => 0 }
            };
            
            const powerManager = new PowerManager(mockPlayer, [], [], [], [], []);
            const power = { id: 'frozenArmor', level: 1, passive: true };
            
            // Should not throw for passive powers
            expect(() => powerManager.castPower(power)).not.toThrow();
        });
    });
});



