// Integration test for game mechanics including champion fusion

import { describe, it, expect, beforeEach } from 'vitest';
import { Enemy, Champion, CHAMPION_FUSION_THRESHOLD } from '../js/enemy.js';
import { Crystal } from '../js/crystal.js';

describe('Game Integration - Champion Fusion', () => {
    let enemies;
    let champions;
    let crystals;

    beforeEach(() => {
        enemies = [];
        champions = [];
        crystals = [];
    });

    // Simulates the checkChampionFusion logic from game.js
    function checkChampionFusion(playerX, playerY) {
        for (let i = crystals.length - 1; i >= 0; i--) {
            const crystal = crystals[i];
            
            // Find all enemies orbiting this crystal
            const orbiters = enemies.filter(e => e.orbitTarget === crystal);
            
            if (orbiters.length >= CHAMPION_FUSION_THRESHOLD) {
                // Fusion triggered! Remove orbiting enemies and crystal
                for (const orbiter of orbiters) {
                    const idx = enemies.indexOf(orbiter);
                    if (idx !== -1) {
                        enemies.splice(idx, 1);
                    }
                }
                
                // Remove the crystal
                crystals.splice(i, 1);
                
                // Spawn a champion at the crystal's position
                const champion = new Champion(crystal.x, crystal.y, crystal.type);
                champion.setTarget(playerX, playerY);
                champions.push(champion);
            }
        }
    }

    it('should create a champion when 5 enemies orbit a crystal', () => {
        // Setup: Create a crystal
        const crystal = new Crystal(100, 100, 'heat');
        crystals.push(crystal);

        // Create 5 enemies orbiting the crystal (exactly the threshold)
        for (let i = 0; i < CHAMPION_FUSION_THRESHOLD; i++) {
            const enemy = new Enemy(100 + i * 10, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            enemies.push(enemy);
        }

        expect(enemies.length).toBe(5);
        expect(champions.length).toBe(0);
        expect(crystals.length).toBe(1);

        // Act: Check for fusion
        checkChampionFusion(0, 0);

        // Assert: Should have created a champion, removed enemies and crystal
        expect(champions.length).toBe(1);
        expect(enemies.length).toBe(0);
        expect(crystals.length).toBe(0);
        
        // Champion should be at crystal's position
        expect(champions[0].x).toBe(100);
        expect(champions[0].y).toBe(100);
        expect(champions[0].crystalType).toBe('heat');
    });

    it('should not create a champion with only 4 enemies', () => {
        const crystal = new Crystal(100, 100, 'cold');
        crystals.push(crystal);

        // Create only 4 enemies (below threshold)
        for (let i = 0; i < 4; i++) {
            const enemy = new Enemy(100 + i * 10, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            enemies.push(enemy);
        }

        checkChampionFusion(0, 0);

        // Should NOT have created a champion
        expect(champions.length).toBe(0);
        expect(enemies.length).toBe(4);
        expect(crystals.length).toBe(1);
    });

    it('should create a champion with more than 5 enemies', () => {
        const crystal = new Crystal(200, 200, 'force');
        crystals.push(crystal);

        // Create 7 enemies (above threshold)
        for (let i = 0; i < 7; i++) {
            const enemy = new Enemy(200 + i * 10, 200, 'small');
            enemy.setOrbitTarget(crystal);
            enemies.push(enemy);
        }

        checkChampionFusion(0, 0);

        // Should have created a champion and removed all 7 enemies
        expect(champions.length).toBe(1);
        expect(enemies.length).toBe(0);
        expect(crystals.length).toBe(0);
    });

    it('should handle multiple crystals with different enemy counts', () => {
        // Crystal 1: Has 5 enemies (should fuse)
        const crystal1 = new Crystal(100, 100, 'heat');
        crystals.push(crystal1);
        for (let i = 0; i < 5; i++) {
            const enemy = new Enemy(100 + i * 10, 100, 'medium');
            enemy.setOrbitTarget(crystal1);
            enemies.push(enemy);
        }

        // Crystal 2: Has only 3 enemies (should not fuse)
        const crystal2 = new Crystal(300, 300, 'cold');
        crystals.push(crystal2);
        for (let i = 0; i < 3; i++) {
            const enemy = new Enemy(300 + i * 10, 300, 'medium');
            enemy.setOrbitTarget(crystal2);
            enemies.push(enemy);
        }

        expect(enemies.length).toBe(8);
        expect(crystals.length).toBe(2);

        checkChampionFusion(0, 0);

        // Crystal 1 should have fused (1 champion, 5 enemies removed, crystal removed)
        // Crystal 2 should remain (3 enemies still there)
        expect(champions.length).toBe(1);
        expect(enemies.length).toBe(3); // Only the 3 from crystal2 remain
        expect(crystals.length).toBe(1); // Only crystal2 remains
    });

    it('should not count non-orbiting enemies', () => {
        const crystal = new Crystal(100, 100, 'force');
        crystals.push(crystal);

        // 4 enemies orbiting
        for (let i = 0; i < 4; i++) {
            const enemy = new Enemy(100 + i * 10, 100, 'medium');
            enemy.setOrbitTarget(crystal);
            enemies.push(enemy);
        }

        // 3 enemies NOT orbiting
        for (let i = 0; i < 3; i++) {
            const enemy = new Enemy(500 + i * 10, 500, 'medium');
            enemies.push(enemy);
        }

        expect(enemies.length).toBe(7);

        checkChampionFusion(0, 0);

        // Should NOT have fused (only 4 orbiting, threshold is 5)
        expect(champions.length).toBe(0);
        expect(enemies.length).toBe(7);
        expect(crystals.length).toBe(1);
    });

    it('should create champion of the correct crystal type', () => {
        const testTypes = ['heat', 'cold', 'force'];

        testTypes.forEach(type => {
            // Reset
            enemies = [];
            champions = [];
            crystals = [];

            const crystal = new Crystal(100, 100, type);
            crystals.push(crystal);

            for (let i = 0; i < 5; i++) {
                const enemy = new Enemy(100 + i * 10, 100, 'medium');
                enemy.setOrbitTarget(crystal);
                enemies.push(enemy);
            }

            checkChampionFusion(0, 0);

            expect(champions.length).toBe(1);
            expect(champions[0].crystalType).toBe(type);
        });
    });
});

