// FastPurpleEnemy class - Fast purple enemies that chase the player

import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_TYPES, getEnemyConfig } from './EnemyTypes.js';
import { normalize } from '../utils.js';
import { spriteCache, simplifiedRendering } from '../spriteCache.js';

export class FastPurpleEnemy extends BaseEnemy {
    constructor(x, y, scaling = null) {
        const config = getEnemyConfig('fastPurple', scaling);
        super(x, y, config);
        
        // Visual
        this.trailPhase = 0;
    }
    
    update(dt, playerX, playerY, context = {}) {
        // Update status effects and timers
        this.updateStatusEffects(dt);
        
        // Apply knockback (even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // Update visuals regardless of movement
        this.trailPhase += dt * 5;
        
        // Handle burning panic
        if (this.isInBurningPanic()) {
            if (Math.random() < 0.05) {
                this.burningPanicAngle += (Math.random() - 0.5) * Math.PI * 0.5;
            }
            
            this.x += Math.cos(this.burningPanicAngle) * this.burningPanicSpeed * dt;
            this.y += Math.sin(this.burningPanicAngle) * this.burningPanicSpeed * dt;
            
            this.burningTrailTimer += dt;
            if (this.burningTrailTimer >= this.burningTrailInterval) {
                this.burningTrailTimer = 0;
                return {
                    type: 'fireTrail',
                    x: this.x,
                    y: this.y,
                    radius: 18,
                    duration: 1.5,
                    damage: 8,
                    creator: this
                };
            }
            return null;
        }
        
        // If immobilized or permanently frozen, skip all movement
        if (!this.canMove()) {
            return null;
        }
        
        // Handle delirious movement
        if (this.isDelirious()) {
            const dir = this.handleDeliriousMovement(dt, playerX, playerY);
            if (dir) {
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
            }
            return null;
        }
        
        // Chase player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dir = normalize(dx, dy);
        
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
        
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
        const sprite = spriteCache.getSprite('fastPurple');
        if (sprite && this.shouldUseSprite()) {
            const spriteScale = (r * 4) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Simplified/fallback rendering
            ctx.fillStyle = this.getDisplayColor();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

