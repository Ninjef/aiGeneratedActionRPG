import { describe, it, expect } from 'vitest';
import { 
    getProjectileSpeedBonus,
    getCooldownReductionForCategory,
    getSpeedBonus,
    getDamageReduction,
    getAggroRadiusModifier,
    PASSIVE_UPGRADES
} from '../js/passiveUpgrades.js';

describe('passiveUpgrades', () => {
    describe('getProjectileSpeedBonus', () => {
        it('should return 0 for empty upgrades', () => {
            const bonus = getProjectileSpeedBonus([], 'heat');
            
            expect(bonus).toBe(0);
        });

        it('should return bonus for single heat projectile speed upgrade', () => {
            const upgrades = [
                { id: 'heatProjectileSpeed', stacks: 1 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'heat');
            
            expect(bonus).toBe(0.15);
        });

        it('should return bonus for single cold projectile speed upgrade', () => {
            const upgrades = [
                { id: 'coldProjectileSpeed', stacks: 1 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'cold');
            
            expect(bonus).toBe(0.15);
        });

        it('should return bonus for single force projectile speed upgrade', () => {
            const upgrades = [
                { id: 'forceProjectileSpeed', stacks: 1 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'force');
            
            expect(bonus).toBe(0.15);
        });

        it('should stack bonuses for multiple upgrades of same category', () => {
            const upgrades = [
                { id: 'heatProjectileSpeed', stacks: 3 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'heat');
            
            expect(bonus).toBeCloseTo(0.45, 5); // 0.15 * 3 (allow for floating point precision)
        });

        it('should not apply bonus for different category', () => {
            const upgrades = [
                { id: 'heatProjectileSpeed', stacks: 1 },
                { id: 'coldProjectileSpeed', stacks: 1 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'force');
            
            expect(bonus).toBe(0);
        });

        it('should only count upgrades matching the category', () => {
            const upgrades = [
                { id: 'heatProjectileSpeed', stacks: 2 },
                { id: 'coldProjectileSpeed', stacks: 1 },
                { id: 'moveSpeed', stacks: 3 }
            ];
            const bonus = getProjectileSpeedBonus(upgrades, 'heat');
            
            expect(bonus).toBe(0.30); // Only heat: 0.15 * 2
        });
    });

    describe('PASSIVE_UPGRADES definitions', () => {
        it('should have heatProjectileSpeed upgrade defined', () => {
            expect(PASSIVE_UPGRADES.heatProjectileSpeed).toBeDefined();
            expect(PASSIVE_UPGRADES.heatProjectileSpeed.category).toBe('heat');
            expect(PASSIVE_UPGRADES.heatProjectileSpeed.effect.projectileSpeedBonus).toBe(0.15);
        });

        it('should have coldProjectileSpeed upgrade defined', () => {
            expect(PASSIVE_UPGRADES.coldProjectileSpeed).toBeDefined();
            expect(PASSIVE_UPGRADES.coldProjectileSpeed.category).toBe('cold');
            expect(PASSIVE_UPGRADES.coldProjectileSpeed.effect.projectileSpeedBonus).toBe(0.15);
        });

        it('should have forceProjectileSpeed upgrade defined', () => {
            expect(PASSIVE_UPGRADES.forceProjectileSpeed).toBeDefined();
            expect(PASSIVE_UPGRADES.forceProjectileSpeed.category).toBe('force');
            expect(PASSIVE_UPGRADES.forceProjectileSpeed.effect.projectileSpeedBonus).toBe(0.15);
        });
    });
});

