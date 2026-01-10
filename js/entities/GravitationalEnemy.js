// GravitationalEnemy class - Blue enemies that pull each other together

import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_TYPES, getEnemyConfig } from './EnemyTypes.js';
import { distance, normalize } from '../utils.js';
import { spriteCache, simplifiedRendering } from '../spriteCache.js';

export class GravitationalEnemy extends BaseEnemy {
    constructor(x, y, scaling = null) {
        const config = getEnemyConfig('gravitational', scaling);
        super(x, y, config);
        
        this.gravityRange = config.gravityRange;
        this.gravityStrength = config.gravityStrength;
        
        // Velocity for gravity system
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Visual
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    update(dt, playerX, playerY, context = {}) {
        const otherGravEnemies = context.otherGravEnemies || [];
        
        // Update status effects and timers
        this.updateStatusEffects(dt);
        
        // Apply knockback (even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // Update visuals regardless of movement
        this.pulsePhase += dt * 2;
        
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
                    radius: 25,
                    duration: 1.5,
                    damage: 10,
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
        
        // Move toward player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dir = normalize(dx, dy);
        
        this.velocityX = dir.x * this.speed;
        this.velocityY = dir.y * this.speed;
        
        // Apply gravitational pull to other gravitational enemies
        for (const other of otherGravEnemies) {
            if (other === this) continue;
            
            const dist = distance(this.x, this.y, other.x, other.y);
            if (dist < this.gravityRange && dist > 10) {
                const gdx = other.x - this.x;
                const gdy = other.y - this.y;
                const gdir = normalize(gdx, gdy);
                
                // Pull toward each other
                const force = this.gravityStrength / dist;
                this.velocityX += gdir.x * force * dt;
                this.velocityY += gdir.y * force * dt;
            }
        }
        
        // Apply velocity
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        
        // Decay velocity slightly
        this.velocityX *= 0.95;
        this.velocityY *= 0.95;
        
        return null;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        
        ctx.save();
        
        // Render status effects (burning, slow, freeze)
        this.renderStatusEffects(ctx, screen, r, scale);
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('gravitational');
        if (sprite && this.shouldUseSprite()) {
            const spriteScale = (r * 2) / spriteCache.baseSize * pulse;
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
            ctx.arc(screen.x, screen.y, r * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

