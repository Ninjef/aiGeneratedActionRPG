// Builder class - Grey enemies that convert crystals to spawn blocks

import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_TYPES } from './EnemyTypes.js';
import { distance, normalize } from '../utils.js';
import { spriteCache, simplifiedRendering } from '../enemy.js';

export class Builder extends BaseEnemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.builder;
        super(x, y, config);
        
        this.fleeRadius = config.fleeRadius;
        
        // Target tracking
        this.targetX = x;
        this.targetY = y;
        this.targetCrystal = null;
        this.targetTower = null;
        
        // Wandering AI state
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
    }
    
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    update(dt, playerX, playerY, context = {}) {
        const crystals = context.crystals || [];
        const spawnBlocks = context.spawnBlocks || [];
        
        // Update status effects and timers
        this.updateStatusEffects(dt);
        
        // Apply knockback (even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // Handle burning panic - moves fast in random directions with flame trail
        if (this.isInBurningPanic()) {
            const trailInfo = this.handleBurningPanic(dt);
            // Update target for visual direction
            this.targetX = this.x + Math.cos(this.burningPanicAngle) * 100;
            this.targetY = this.y + Math.sin(this.burningPanicAngle) * 100;
            return trailInfo;
        }
        
        // If immobilized or permanently frozen, skip all movement
        if (!this.canMove()) {
            return null;
        }
        
        // Handle delirious movement - alternate between chasing and wandering
        if (this.isDelirious()) {
            const dir = this.handleDeliriousMovement(dt, playerX, playerY);
            if (dir) {
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                if (this.deliriousPhase === 'chase') {
                    this.targetX = playerX;
                    this.targetY = playerY;
                } else {
                    this.targetX = this.x + Math.cos(this.deliriousWanderAngle) * 100;
                    this.targetY = this.y + Math.sin(this.deliriousWanderAngle) * 100;
                }
            }
            return null;
        }
        
        const distToPlayer = distance(this.x, this.y, playerX, playerY);
        
        // Check if player is close - flee!
        if (distToPlayer < this.fleeRadius) {
            // Flee from player
            const dx = this.x - playerX;
            const dy = this.y - playerY;
            const dir = normalize(dx, dy);
            
            this.x += dir.x * this.speed * dt;
            this.y += dir.y * this.speed * dt;
            
            this.targetX = this.x + dir.x * 100;
            this.targetY = this.y + dir.y * 100;
        } else {
            // Check for nearby crystals
            let nearestCrystal = null;
            let nearestCrystalDist = Infinity;
            
            for (const crystal of crystals) {
                const dist = distance(this.x, this.y, crystal.x, crystal.y);
                if (dist < crystal.aggroRadius && dist < nearestCrystalDist) {
                    nearestCrystal = crystal;
                    nearestCrystalDist = dist;
                }
            }
            
            // Check for nearby spawn blocks (towers)
            let nearestTower = null;
            let nearestTowerDist = Infinity;
            const towerAggroRadius = 350; // Same as crystal aggro radius
            
            for (const tower of spawnBlocks) {
                const dist = distance(this.x, this.y, tower.x, tower.y);
                if (dist < towerAggroRadius && dist < nearestTowerDist) {
                    nearestTower = tower;
                    nearestTowerDist = dist;
                }
            }
            
            // Prefer whichever is closer: crystal or tower
            let target = null;
            let targetType = null;
            
            if (nearestCrystal && nearestTower) {
                if (nearestCrystalDist < nearestTowerDist) {
                    target = nearestCrystal;
                    targetType = 'crystal';
                } else {
                    target = nearestTower;
                    targetType = 'tower';
                }
            } else if (nearestCrystal) {
                target = nearestCrystal;
                targetType = 'crystal';
            } else if (nearestTower) {
                target = nearestTower;
                targetType = 'tower';
            }
            
            if (target) {
                // Move toward target (crystal or tower)
                this.targetCrystal = targetType === 'crystal' ? target : null;
                this.targetTower = targetType === 'tower' ? target : null;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dir = normalize(dx, dy);
                
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                
                this.targetX = target.x;
                this.targetY = target.y;
            } else {
                // Wander randomly
                this.targetCrystal = null;
                this.targetTower = null;
                this.wanderTimer += dt;
                if (this.wanderTimer >= this.wanderChangeInterval) {
                    this.wanderTimer = 0;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                    this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
                }
                
                const wanderSpeed = this.speed * 0.5;
                this.x += Math.cos(this.wanderAngle) * wanderSpeed * dt;
                this.y += Math.sin(this.wanderAngle) * wanderSpeed * dt;
                
                this.targetX = this.x + Math.cos(this.wanderAngle) * 100;
                this.targetY = this.y + Math.sin(this.wanderAngle) * 100;
            }
        }
        
        return null;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Render status effects (burning, slow, freeze)
        this.renderStatusEffects(ctx, screen, r, scale);
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('builder');
        if (sprite && this.shouldUseSprite()) {
            const spriteScale = (r * 2) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Fallback/simplified rendering (or hurt state or burning)
            ctx.fillStyle = this.getDisplayColor();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
        }
        
        // Simple eyes - calculate direction to target (always draw)
        if (!simplifiedRendering) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const faceAngle = Math.atan2(dy, dx);
            
            const eyeOffset = r * 0.3;
            const eyeSpread = r * 0.25;
            const eyeSize = r * 0.15;
            
            const leftEyeX = screen.x + Math.cos(faceAngle) * eyeOffset - Math.sin(faceAngle) * eyeSpread;
            const leftEyeY = screen.y + Math.sin(faceAngle) * eyeOffset + Math.cos(faceAngle) * eyeSpread;
            const rightEyeX = screen.x + Math.cos(faceAngle) * eyeOffset + Math.sin(faceAngle) * eyeSpread;
            const rightEyeY = screen.y + Math.sin(faceAngle) * eyeOffset - Math.cos(faceAngle) * eyeSpread;
            
            ctx.fillStyle = this.hurtTime > 0 ? '#ff0000' : '#404040';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// For backward compatibility
export const Enemy = Builder;

