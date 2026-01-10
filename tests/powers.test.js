import { describe, it, expect, beforeEach } from 'vitest';
import { PowerManager, POWERS } from '../js/powers.js';

describe('PowerManager', () => {
    describe('generatePowerOptions', () => {
        it('should return 3 heat powers when category is heat', () => {
            const options = PowerManager.generatePowerOptions('heat', []);
            
            expect(options).toHaveLength(3);
            expect(options[0].category).toBe('heat');
            expect(options[1].category).toBe('heat');
            expect(options[2].category).toBe('heat');
        });

        it('should return 3 cold powers when category is cold', () => {
            const options = PowerManager.generatePowerOptions('cold', []);
            
            expect(options).toHaveLength(3);
            expect(options[0].category).toBe('cold');
            expect(options[1].category).toBe('cold');
            expect(options[2].category).toBe('cold');
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
    });
});



