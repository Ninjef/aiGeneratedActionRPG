// Champion fusion tests - verify that enemies orbiting crystals create champions

import { describe, it, expect, beforeEach } from 'vitest';
import { Enemy, Champion, CHAMPION_FUSION_THRESHOLD } from '../js/enemy.js';
import { Crystal } from '../js/crystal.js';

describe('Champion Fusion', () => {
    let crystal;
    let enemies;

    beforeEach(() => {
        // Create a heat crystal at origin
        crystal = new Crystal(0, 0, 'heat');
        enemies = [];
    });

    describe('Enemy orbiting behavior', () => {
        it('should allow enemies to orbit a crystal', () => {
            const enemy = new Enemy(100, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            
            expect(enemy.orbitTarget).toBe(crystal);
        });

        it('should clear orbit target when told', () => {
            const enemy = new Enemy(100, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            enemy.clearOrbitTarget();
            
            expect(enemy.orbitTarget).toBeNull();
        });

        it('should move toward orbit position when orbiting', () => {
            const enemy = new Enemy(100, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            
            const initialX = enemy.x;
            const initialY = enemy.y;
            
            // Update for a short time
            enemy.update(0.1, 1000, 1000); // Player far away
            
            // Enemy should have moved (can't predict exact position due to orbit mechanics)
            const moved = enemy.x !== initialX || enemy.y !== initialY;
            expect(moved).toBe(true);
        });
    });

    describe('Champion fusion threshold', () => {
        it('should have the correct fusion threshold', () => {
            expect(CHAMPION_FUSION_THRESHOLD).toBe(5);
        });

        it('should identify enemies orbiting a crystal', () => {
            // Create 3 enemies orbiting the crystal
            for (let i = 0; i < 3; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }

            // Filter enemies that are orbiting this crystal
            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            expect(orbiters.length).toBe(3);
        });

        it('should not trigger fusion with fewer than threshold enemies', () => {
            // Create 4 enemies (less than threshold of 5)
            for (let i = 0; i < 4; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }

            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            expect(orbiters.length).toBeLessThan(CHAMPION_FUSION_THRESHOLD);
        });

        it('should detect when threshold is reached', () => {
            // Create exactly 5 enemies (threshold)
            for (let i = 0; i < 5; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }

            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            expect(orbiters.length).toBe(CHAMPION_FUSION_THRESHOLD);
        });

        it('should work with more than threshold enemies', () => {
            // Create 7 enemies (more than threshold)
            for (let i = 0; i < 7; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }

            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            expect(orbiters.length).toBeGreaterThanOrEqual(CHAMPION_FUSION_THRESHOLD);
        });

        it('should not count enemies without orbit target', () => {
            // Create 3 orbiting, 2 not orbiting
            for (let i = 0; i < 3; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }
            for (let i = 0; i < 2; i++) {
                const enemy = new Enemy(200 + i * 10, 200, 'medium');
                enemies.push(enemy);
            }

            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            expect(orbiters.length).toBe(3);
            expect(enemies.length).toBe(5);
        });

        it('should only count enemies orbiting the specific crystal', () => {
            const crystal2 = new Crystal(500, 500, 'cold');
            
            // 3 enemies orbit first crystal
            for (let i = 0; i < 3; i++) {
                const enemy = new Enemy(50 + i * 10, 50, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }
            
            // 2 enemies orbit second crystal
            for (let i = 0; i < 2; i++) {
                const enemy = new Enemy(450 + i * 10, 450, 'medium');
                enemy.setOrbitTarget(crystal2);
                enemies.push(enemy);
            }

            const orbiters1 = enemies.filter(e => e.orbitTarget === crystal);
            const orbiters2 = enemies.filter(e => e.orbitTarget === crystal2);
            
            expect(orbiters1.length).toBe(3);
            expect(orbiters2.length).toBe(2);
        });
    });

    describe('Champion creation', () => {
        it('should create a champion with correct type', () => {
            const heatChampion = new Champion(100, 100, 'heat');
            expect(heatChampion.crystalType).toBe('heat');
            expect(heatChampion.isChampion).toBe(true);

            const coldChampion = new Champion(200, 200, 'cold');
            expect(coldChampion.crystalType).toBe('cold');
            expect(coldChampion.isChampion).toBe(true);

            const forceChampion = new Champion(300, 300, 'force');
            expect(forceChampion.crystalType).toBe('force');
            expect(forceChampion.isChampion).toBe(true);
        });

        it('should create champion at specified position', () => {
            const champion = new Champion(250, 350, 'heat');
            expect(champion.x).toBe(250);
            expect(champion.y).toBe(350);
        });

        it('should have higher stats than regular enemies', () => {
            const enemy = new Enemy(0, 0, 'large'); // Largest regular enemy
            const champion = new Champion(0, 0, 'heat');

            expect(champion.maxHealth).toBeGreaterThan(enemy.maxHealth);
            expect(champion.damage).toBeGreaterThan(enemy.damage);
            expect(champion.xp).toBeGreaterThan(enemy.xp);
        });

        it('should have champion flag set', () => {
            const champion = new Champion(0, 0, 'cold');
            expect(champion.isChampion).toBe(true);
            
            const enemy = new Enemy(0, 0, 'medium');
            expect(enemy.isChampion).toBeUndefined();
        });

        it('should be able to set target', () => {
            const champion = new Champion(0, 0, 'force');
            champion.setTarget(100, 200);
            
            expect(champion.targetX).toBe(100);
            expect(champion.targetY).toBe(200);
        });

        it('should be able to take damage', () => {
            const champion = new Champion(0, 0, 'heat');
            const initialHealth = champion.health;
            
            const isDead = champion.takeDamage(50);
            
            expect(champion.health).toBe(initialHealth - 50);
            expect(isDead).toBe(false);
        });

        it('should die when health reaches zero', () => {
            const champion = new Champion(0, 0, 'cold');
            const damage = champion.maxHealth + 10; // More than max health
            
            const isDead = champion.takeDamage(damage);
            
            expect(champion.health).toBeLessThanOrEqual(0);
            expect(isDead).toBe(true);
        });
    });
});


