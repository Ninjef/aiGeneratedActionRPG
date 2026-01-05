// Debug test to verify champion fusion with detailed logging

import { describe, it, expect } from 'vitest';
import { Enemy, Champion, CHAMPION_FUSION_THRESHOLD } from '../js/enemy.js';
import { Crystal } from '../js/crystal.js';

describe('Champion Fusion Debug', () => {
    it('should log the complete fusion process', () => {
        console.log('\n=== Champion Fusion Debug Test ===');
        console.log(`Fusion Threshold: ${CHAMPION_FUSION_THRESHOLD} enemies`);
        
        // Setup
        const crystal = new Crystal(100, 100, 'heat');
        const enemies = [];
        const champions = [];
        
        console.log(`\n1. Created crystal at (${crystal.x}, ${crystal.y}) with type '${crystal.type}'`);
        console.log(`   Aggro radius: ${crystal.aggroRadius}`);
        
        // Create enemies and set them to orbit
        for (let i = 0; i < CHAMPION_FUSION_THRESHOLD; i++) {
            const enemy = new Enemy(100 + i * 20, 100 + i * 10, 'medium');
            enemy.setOrbitTarget(crystal);
            enemies.push(enemy);
            console.log(`   Created enemy ${i + 1} at (${enemy.x}, ${enemy.y})`);
        }
        
        console.log(`\n2. Total enemies created: ${enemies.length}`);
        console.log(`   All enemies are orbiting: ${enemies.every(e => e.orbitTarget === crystal)}`);
        
        // Count orbiters
        const orbiters = enemies.filter(e => e.orbitTarget === crystal);
        console.log(`\n3. Orbiters count: ${orbiters.length}`);
        console.log(`   Meets threshold? ${orbiters.length >= CHAMPION_FUSION_THRESHOLD}`);
        
        // Simulate fusion
        if (orbiters.length >= CHAMPION_FUSION_THRESHOLD) {
            console.log(`\n4. FUSION TRIGGERED!`);
            
            // Remove orbiters
            for (const orbiter of orbiters) {
                const idx = enemies.indexOf(orbiter);
                if (idx !== -1) {
                    enemies.splice(idx, 1);
                }
            }
            console.log(`   Removed ${orbiters.length} enemies`);
            
            // Create champion
            const champion = new Champion(crystal.x, crystal.y, crystal.type);
            champions.push(champion);
            console.log(`   Created ${crystal.type} champion at (${champion.x}, ${champion.y})`);
            console.log(`   Champion stats: HP=${champion.maxHealth}, DMG=${champion.damage}, XP=${champion.xp}`);
        }
        
        console.log(`\n5. Final state:`);
        console.log(`   Enemies remaining: ${enemies.length}`);
        console.log(`   Champions created: ${champions.length}`);
        console.log(`   Champion type: ${champions[0]?.crystalType || 'none'}`);
        console.log('=== Test Complete ===\n');
        
        // Assertions
        expect(CHAMPION_FUSION_THRESHOLD).toBe(5);
        expect(enemies.length).toBe(0);
        expect(champions.length).toBe(1);
        expect(champions[0].crystalType).toBe('heat');
        expect(champions[0].isChampion).toBe(true);
    });

    it('should verify orbit assignment works correctly', () => {
        console.log('\n=== Orbit Assignment Test ===');
        
        const crystal = new Crystal(200, 200, 'cold');
        const enemy = new Enemy(250, 250, 'medium');
        
        console.log(`Crystal at (${crystal.x}, ${crystal.y}), radius: ${crystal.aggroRadius}`);
        console.log(`Enemy at (${enemy.x}, ${enemy.y})`);
        
        // Calculate distance
        const dx = enemy.x - crystal.x;
        const dy = enemy.y - crystal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        console.log(`Distance: ${dist.toFixed(2)}`);
        console.log(`Within aggro radius? ${dist < crystal.aggroRadius}`);
        
        // Assign orbit
        if (dist < crystal.aggroRadius) {
            enemy.setOrbitTarget(crystal);
            console.log(`✓ Enemy set to orbit crystal`);
        }
        
        console.log(`Orbit target set? ${enemy.orbitTarget !== null}`);
        console.log(`Orbiting correct crystal? ${enemy.orbitTarget === crystal}`);
        console.log('=== Test Complete ===\n');
        
        expect(enemy.orbitTarget).toBe(crystal);
    });

    it('should verify different crystal types create different champions', () => {
        console.log('\n=== Crystal Type Test ===');
        
        const types = ['heat', 'cold', 'force'];
        
        types.forEach(type => {
            const crystal = new Crystal(0, 0, type);
            const champion = new Champion(crystal.x, crystal.y, crystal.type);
            
            console.log(`${type} crystal → ${champion.crystalType} champion ✓`);
            expect(champion.crystalType).toBe(type);
        });
        
        console.log('=== Test Complete ===\n');
    });
});


