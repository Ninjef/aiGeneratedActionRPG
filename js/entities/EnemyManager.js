// EnemyManager - Unified enemy collection management
// Replaces multiple separate enemy arrays with a single managed collection

import { AreaEffect } from '../projectile.js';
import { circleCollision } from '../collision.js';

/**
 * EnemyManager provides a unified interface for managing all enemy types
 * Instead of: builders[], fighters[], fieryEnemies[], gravitationalEnemies[], fastPurpleEnemies[]
 * Use: enemyManager.add(), enemyManager.remove(), enemyManager.getByType(), etc.
 */
export class EnemyManager {
    constructor() {
        // Single array for all enemies
        this.enemies = [];
        
        // Quick lookup maps by type
        this._typeIndex = new Map();
        
        // Performance caps
        this.maxTotalEnemies = 20000;
    }
    
    /**
     * Add an enemy to the manager
     * @param {BaseEnemy} enemy - Enemy to add
     * @returns {boolean} - True if added, false if at cap
     */
    add(enemy) {
        if (this.enemies.length >= this.maxTotalEnemies) {
            return false;
        }
        
        this.enemies.push(enemy);
        
        // Update type index
        if (!this._typeIndex.has(enemy.type)) {
            this._typeIndex.set(enemy.type, []);
        }
        this._typeIndex.get(enemy.type).push(enemy);
        
        return true;
    }
    
    /**
     * Add multiple enemies at once
     * @param {BaseEnemy[]} enemies - Enemies to add
     * @returns {number} - Number of enemies actually added
     */
    addMany(enemies) {
        let added = 0;
        for (const enemy of enemies) {
            if (this.add(enemy)) {
                added++;
            }
        }
        return added;
    }
    
    /**
     * Remove an enemy from the manager
     * @param {BaseEnemy} enemy - Enemy to remove
     * @returns {boolean} - True if removed
     */
    remove(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx === -1) return false;
        
        this.enemies.splice(idx, 1);
        
        // Update type index
        const typeArray = this._typeIndex.get(enemy.type);
        if (typeArray) {
            const typeIdx = typeArray.indexOf(enemy);
            if (typeIdx !== -1) {
                typeArray.splice(typeIdx, 1);
            }
        }
        
        return true;
    }
    
    /**
     * Mark an enemy as dead and schedule for removal
     * @param {BaseEnemy} enemy - Enemy to mark dead
     */
    markDead(enemy) {
        enemy._dead = true;
    }
    
    /**
     * Remove all dead enemies from the collection
     * @returns {number} - Number of enemies removed
     */
    removeDeadEnemies() {
        let removed = 0;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i]._dead) {
                const enemy = this.enemies[i];
                this.enemies.splice(i, 1);
                
                // Update type index
                const typeArray = this._typeIndex.get(enemy.type);
                if (typeArray) {
                    const typeIdx = typeArray.indexOf(enemy);
                    if (typeIdx !== -1) {
                        typeArray.splice(typeIdx, 1);
                    }
                }
                removed++;
            }
        }
        return removed;
    }
    
    /**
     * Get all enemies (alive only by default)
     * @param {boolean} includeDeadEnemies - Whether to include dead enemies
     * @returns {BaseEnemy[]}
     */
    getAll(includeDeadEnemies = false) {
        if (includeDeadEnemies) {
            return this.enemies;
        }
        return this.enemies.filter(e => !e._dead);
    }
    
    /**
     * Get all alive enemies
     * @returns {BaseEnemy[]}
     */
    getAlive() {
        return this.enemies.filter(e => !e._dead);
    }
    
    /**
     * Get enemies of a specific type
     * @param {string} type - Enemy type (e.g., 'builder', 'fighter')
     * @returns {BaseEnemy[]}
     */
    getByType(type) {
        return this._typeIndex.get(type) || [];
    }
    
    /**
     * Get count of enemies by type
     * @param {string} type - Enemy type
     * @returns {number}
     */
    getCountByType(type) {
        const arr = this._typeIndex.get(type);
        return arr ? arr.length : 0;
    }
    
    /**
     * Get total enemy count
     * @returns {number}
     */
    getCount() {
        return this.enemies.length;
    }
    
    /**
     * Check if at capacity
     * @returns {boolean}
     */
    isAtCapacity() {
        return this.enemies.length >= this.maxTotalEnemies;
    }
    
    /**
     * Get remaining capacity
     * @returns {number}
     */
    getRemainingCapacity() {
        return Math.max(0, this.maxTotalEnemies - this.enemies.length);
    }
    
    /**
     * Update all enemies
     * @param {number} dt - Delta time
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {object} context - Additional context (crystals, spawnBlocks, etc.)
     * @returns {object[]} - Array of fire trail info objects to create
     */
    update(dt, playerX, playerY, context = {}) {
        const trailsToCreate = [];
        
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            
            // Build context for this enemy type
            const enemyContext = this._buildContextForEnemy(enemy, context);
            
            // Update the enemy
            const trailInfo = enemy.update(dt, playerX, playerY, enemyContext);
            if (trailInfo) {
                trailsToCreate.push(trailInfo);
            }
        }
        
        return trailsToCreate;
    }
    
    /**
     * Build the appropriate context object for an enemy type
     */
    _buildContextForEnemy(enemy, context) {
        switch (enemy.type) {
            case 'builder':
                return {
                    crystals: context.crystals || [],
                    spawnBlocks: context.spawnBlocks || []
                };
            case 'fighter':
                return {
                    spawnBlocks: context.spawnBlocks || []
                };
            case 'gravitational':
                return {
                    otherGravEnemies: this.getByType('gravitational')
                };
            default:
                return {};
        }
    }
    
    /**
     * Check player collisions with all damage-dealing enemies
     * @param {Player} player - Player object
     * @param {function} onDamageTaken - Callback when player takes damage (enemy) => void
     * @returns {BaseEnemy[]} - Array of enemies that collided with player
     */
    checkPlayerCollisions(player, onDamageTaken = null) {
        const collisions = [];
        
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            if (enemy.damage <= 0) continue; // Skip enemies that don't deal damage
            
            if (circleCollision(
                player.x, player.y, player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                if (player.takeDamage(enemy.damage)) {
                    collisions.push(enemy);
                    if (onDamageTaken) {
                        onDamageTaken(enemy);
                    }
                }
            }
        }
        
        return collisions;
    }
    
    /**
     * Populate a spatial grid with all enemies
     * @param {SpatialGrid} grid - Spatial grid to populate
     */
    populateSpatialGrid(grid) {
        grid.clear();
        for (const enemy of this.enemies) {
            enemy._dead = false;
            this._attachMetadata(enemy);
            grid.insert(enemy);
        }
    }
    
    /**
     * Attach metadata needed for collision handling
     */
    _attachMetadata(enemy) {
        enemy._sourceArray = this.enemies;
        enemy._isSpawnBlock = enemy.type === 'spawnBlock';
    }
    
    /**
     * Render all enemies
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Camera} camera - Camera for visibility culling
     */
    render(ctx, camera) {
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            
            if (camera.isVisible(enemy.x, enemy.y, enemy.radius)) {
                enemy.render(ctx, camera);
            }
        }
    }
    
    /**
     * Despawn enemies far from the player
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {number} despawnDistance - Distance beyond which to despawn
     * @returns {number} - Number of enemies despawned
     */
    despawnFarEnemies(playerX, playerY, despawnDistance) {
        let despawned = 0;
        const distSq = despawnDistance * despawnDistance;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            // Don't despawn spawn blocks
            if (enemy.type === 'spawnBlock') continue;
            
            const dx = playerX - enemy.x;
            const dy = playerY - enemy.y;
            if (dx * dx + dy * dy > distSq) {
                // Update type index
                const typeArray = this._typeIndex.get(enemy.type);
                if (typeArray) {
                    const typeIdx = typeArray.indexOf(enemy);
                    if (typeIdx !== -1) {
                        typeArray.splice(typeIdx, 1);
                    }
                }
                this.enemies.splice(i, 1);
                despawned++;
            }
        }
        
        return despawned;
    }
    
    /**
     * Apply burning damage to all enemies in burning panic state
     * @param {number} dt - Delta time
     * @param {number} damagePerSecond - Damage per second
     * @param {function} onKill - Callback when enemy is killed (enemy) => void
     */
    applyBurningDamage(dt, damagePerSecond, onKill = null) {
        const damage = damagePerSecond * dt;
        
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            if (enemy.burningPanicTime && enemy.burningPanicTime > 0) {
                if (enemy.takeDamage(damage)) {
                    enemy._dead = true;
                    if (onKill) {
                        onKill(enemy);
                    }
                }
            }
        }
    }
    
    /**
     * Clear all enemies
     */
    clear() {
        this.enemies = [];
        this._typeIndex.clear();
    }
    
    /**
     * Create fire trail area effects from trail info array
     * @param {object[]} trailInfos - Array of trail info objects
     * @param {AreaEffect[]} areaEffects - Array to push new effects into
     */
    static createFireTrails(trailInfos, areaEffects) {
        for (const trailInfo of trailInfos) {
            areaEffects.push(new AreaEffect(
                trailInfo.x,
                trailInfo.y,
                trailInfo.radius,
                trailInfo.damage,
                trailInfo.duration,
                {
                    color: '#ff4500',
                    damageInterval: 1.0,
                    type: 'fireTrail',
                    damagePlayer: true,
                    playerDamage: trailInfo.damage,
                    creator: trailInfo.creator
                }
            ));
        }
    }
}

