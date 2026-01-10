// EnemySpawner - Handles spawning of enemies over time

import { randomPositionInRing } from '../utils.js';
import { Builder } from './Builder.js';
import { Fighter } from './Fighter.js';

export class EnemySpawner {
    constructor() {
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // Faster spawning (was 2.0)
        this.maxBuilders = 5000; // Max builders
        this.maxFighters = 20000; // Max fighters
        this.difficulty = 1;
        this.gameTime = 0;
        
        // Fighter spawning (separate timer, starts spawning after some time)
        this.fighterSpawnTimer = 0;
        this.fighterSpawnInterval = 0.1; // Initial interval (slower than builders)
        this.fighterSpawnDelay = 2.0; // Start spawning fighters after 2 seconds
    }

    // Calculate spawn distance based on visible screen diagonal
    getSpawnDistances(camera) {
        const bounds = camera.getVisibleBounds();
        const visibleWidth = bounds.right - bounds.left;
        const visibleHeight = bounds.bottom - bounds.top;
        // Use half the diagonal as the base distance (spawn at edge of screen)
        const halfDiagonal = Math.sqrt(visibleWidth * visibleWidth + visibleHeight * visibleHeight) / 2;
        return {
            min: halfDiagonal * 0.9,  // Just inside the edge
            max: halfDiagonal * 1.3   // Beyond the edge
        };
    }

    /**
     * Update spawner and spawn new enemies
     * @param {number} dt - Delta time
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {EnemyManager} enemyManager - Enemy manager to add enemies to
     * @param {Camera} camera - Camera for spawn distance calculations
     */
    update(dt, playerX, playerY, enemyManager, camera) {
        this.gameTime += dt;
        
        // Increase difficulty over time
        this.difficulty = 1 + Math.floor(this.gameTime / 30) * 0.5;
        this.spawnInterval = Math.max(0.03, 1.5 - this.difficulty * 0.15); // Faster ramp-up
        
        // Get dynamic spawn distances based on camera zoom
        const spawnDist = this.getSpawnDistances(camera);
        
        // Count current enemies by type
        const builderCount = enemyManager.getCountByType('builder');
        const fighterCount = enemyManager.getCountByType('fighter');
        
        // Spawn builders
        this.spawnTimer += dt;
        
        if (this.spawnTimer >= this.spawnInterval && builderCount < this.maxBuilders) {
            this.spawnTimer = 0;
            
            // Spawn 2-5 builders based on difficulty
            const spawnCount = Math.min(5, Math.ceil(this.difficulty) + 1);
            
            for (let i = 0; i < spawnCount; i++) {
                const pos = randomPositionInRing(
                    playerX, 
                    playerY, 
                    spawnDist.min, 
                    spawnDist.max
                );
                
                enemyManager.add(new Builder(pos.x, pos.y));
            }
        }
        
        // Spawn fighters (after delay, incrementally more over time)
        if (this.gameTime >= this.fighterSpawnDelay) {
            this.fighterSpawnTimer += dt;
            
            // Fighter spawn rate increases over time
            const timeSinceFighterStart = this.gameTime - this.fighterSpawnDelay;
            const fighterDifficulty = 1 + Math.floor(timeSinceFighterStart / 30) * 0.5;
            this.fighterSpawnInterval = Math.max(1.0, 3.0 - fighterDifficulty * 0.3);
            
            if (this.fighterSpawnTimer >= this.fighterSpawnInterval && fighterCount < this.maxFighters) {
                this.fighterSpawnTimer = 0;
                
                // Spawn 1-3 fighters based on difficulty
                const fighterSpawnCount = Math.min(3, Math.ceil(fighterDifficulty));
                
                for (let i = 0; i < fighterSpawnCount; i++) {
                    const pos = randomPositionInRing(
                        playerX, 
                        playerY, 
                        spawnDist.min, 
                        spawnDist.max
                    );
                    
                    enemyManager.add(new Fighter(pos.x, pos.y));
                }
            }
        }
    }
    
    /**
     * Legacy update method for backward compatibility with separate arrays
     * @deprecated Use update() with EnemyManager instead
     */
    updateLegacy(dt, playerX, playerY, builders, fighters, crystals, camera) {
        this.gameTime += dt;
        
        // Debug: verify fighters array is passed correctly
        if (Math.floor(this.gameTime) % 5 === 0 && Math.floor(this.gameTime) !== this._lastLogTime) {
            this._lastLogTime = Math.floor(this.gameTime);
            console.log('EnemySpawner update - gameTime:', this.gameTime.toFixed(1), 
                        'fighterDelay:', this.fighterSpawnDelay, 
                        'fighters array length:', fighters ? fighters.length : 'UNDEFINED');
        }
        
        // Increase difficulty over time
        this.difficulty = 1 + Math.floor(this.gameTime / 30) * 0.5;
        this.spawnInterval = Math.max(0.03, 1.5 - this.difficulty * 0.15);
        
        const spawnDist = this.getSpawnDistances(camera);
        
        // Spawn builders
        this.spawnTimer += dt;
        
        if (this.spawnTimer >= this.spawnInterval && builders.length < this.maxBuilders) {
            this.spawnTimer = 0;
            
            const spawnCount = Math.min(5, Math.ceil(this.difficulty) + 1);
            
            for (let i = 0; i < spawnCount; i++) {
                const pos = randomPositionInRing(
                    playerX, 
                    playerY, 
                    spawnDist.min, 
                    spawnDist.max
                );
                
                builders.push(new Builder(pos.x, pos.y));
            }
        }
        
        // Spawn fighters (after delay)
        if (this.gameTime >= this.fighterSpawnDelay) {
            this.fighterSpawnTimer += dt;
            
            const timeSinceFighterStart = this.gameTime - this.fighterSpawnDelay;
            const fighterDifficulty = 1 + Math.floor(timeSinceFighterStart / 30) * 0.5;
            this.fighterSpawnInterval = Math.max(1.0, 3.0 - fighterDifficulty * 0.3);
            
            if (this.fighterSpawnTimer >= this.fighterSpawnInterval && fighters.length < this.maxFighters) {
                this.fighterSpawnTimer = 0;
                
                const fighterSpawnCount = Math.min(3, Math.ceil(fighterDifficulty));
                console.log('Spawning', fighterSpawnCount, 'fighters at gameTime:', this.gameTime);
                
                for (let i = 0; i < fighterSpawnCount; i++) {
                    const pos = randomPositionInRing(
                        playerX, 
                        playerY, 
                        spawnDist.min, 
                        spawnDist.max
                    );
                    
                    fighters.push(new Fighter(pos.x, pos.y));
                }
            }
        }
    }
}

