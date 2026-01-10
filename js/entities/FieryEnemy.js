// FieryEnemy class - Fast, erratic enemies that leave fire trails

import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_TYPES, getEnemyConfig } from './EnemyTypes.js';
import { normalize } from '../utils.js';
import { spriteCache, simplifiedRendering } from '../enemy.js';

export class FieryEnemy extends BaseEnemy {
    constructor(x, y, scaling = null) {
        const config = getEnemyConfig('fiery', scaling);
        super(x, y, config);
        
        // Trail settings
        this.trailInterval = config.trailInterval;
        this.trailTimer = 0;
        this.trailRadius = config.trailRadius;
        this.trailDuration = config.trailDuration;
        this.trailDamage = config.trailDamage;
        
        // Erratic movement
        this.moveAngle = Math.random() * Math.PI * 2;
        this.moveTimer = 0;
        this.moveChangeInterval = 0.5 + Math.random() * 0.5; // Change every 0.5-1s
    }
    
    update(dt, playerX, playerY, context = {}) {
        // Update status effects and timers
        this.updateStatusEffects(dt);
        
        // Apply knockback (even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // Handle burning panic - move even faster with more trails
        if (this.isInBurningPanic()) {
            if (Math.random() < 0.05) {
                this.burningPanicAngle += (Math.random() - 0.5) * Math.PI * 0.5;
            }
            
            this.x += Math.cos(this.burningPanicAngle) * this.burningPanicSpeed * dt;
            this.y += Math.sin(this.burningPanicAngle) * this.burningPanicSpeed * dt;
            
            // Faster trail during panic
            this.trailTimer += dt;
            if (this.trailTimer >= this.trailInterval * 0.5) {
                this.trailTimer = 0;
                return {
                    type: 'fireTrail',
                    x: this.x,
                    y: this.y,
                    radius: this.trailRadius * 1.5,
                    duration: this.trailDuration,
                    damage: this.trailDamage * 1.5,
                    creator: this
                };
            }
            return null;
        }
        
        // If immobilized or permanently frozen, skip movement but still leave trails
        if (!this.canMove()) {
            this.trailTimer += dt;
            // Still return trail even when immobilized (fiery enemies leave fire)
            if (this.trailTimer >= this.trailInterval) {
                this.trailTimer = 0;
                return {
                    type: 'fireTrail',
                    x: this.x,
                    y: this.y,
                    radius: this.trailRadius,
                    duration: this.trailDuration,
                    damage: this.trailDamage,
                    creator: this
                };
            }
            return null;
        }
        
        // Handle delirious movement
        if (this.isDelirious()) {
            const dir = this.handleDeliriousMovement(dt, playerX, playerY);
            if (dir) {
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
            }
            
            // Still track trails
            this.trailTimer += dt;
            if (this.trailTimer >= this.trailInterval) {
                this.trailTimer = 0;
                return {
                    type: 'fireTrail',
                    x: this.x,
                    y: this.y,
                    radius: this.trailRadius,
                    duration: this.trailDuration,
                    damage: this.trailDamage,
                    creator: this
                };
            }
            return null;
        }
        
        // Erratic zig-zag movement
        this.moveTimer += dt;
        if (this.moveTimer >= this.moveChangeInterval) {
            this.moveTimer = 0;
            // Sharp random angle changes
            this.moveAngle = Math.random() * Math.PI * 2;
            this.moveChangeInterval = 0.5 + Math.random() * 0.5;
        }
        
        // Move in current direction
        this.x += Math.cos(this.moveAngle) * this.speed * dt;
        this.y += Math.sin(this.moveAngle) * this.speed * dt;
        
        // Trail timer
        this.trailTimer += dt;
        
        // Return trail creation info if ready
        if (this.trailTimer >= this.trailInterval) {
            this.trailTimer = 0;
            return {
                type: 'fireTrail',
                x: this.x,
                y: this.y,
                radius: this.trailRadius,
                duration: this.trailDuration,
                damage: this.trailDamage,
                creator: this  // Track which enemy created this trail
            };
        }
        
        return null;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Extra intense glow when in burning panic
        if (this.burningPanicTime > 0) {
            const flameSize = r * 4;
            const flameGradient = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, flameSize
            );
            flameGradient.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
            flameGradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.6)');
            flameGradient.addColorStop(0.6, 'rgba(255, 50, 0, 0.3)');
            flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, flameSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Render slow and freeze effects (skip burning panic since we have custom one above)
        this.renderSlowEffect(ctx, screen, r, scale);
        this.renderPermanentFreeze(ctx, screen, r, scale);
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('fiery');
        if (sprite && this.shouldUseSprite()) {
            const spriteScale = (r * 5) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Simplified/fallback rendering
            let baseColor = this.color;
            if (this.hurtTime > 0) {
                baseColor = '#ffffff';
            } else if (this.burningPanicTime > 0) {
                baseColor = '#ffcc00'; // Brighter when panicking
            }
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core (extra bright in panic)
            ctx.fillStyle = this.burningPanicTime > 0 ? '#ffffff' : '#ffff00';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

