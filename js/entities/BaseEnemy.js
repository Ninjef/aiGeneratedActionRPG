// BaseEnemy - Shared enemy logic extracted from repeated patterns
// This base class contains all status effect properties, methods, and shared update/render logic

import { normalize } from '../utils.js';
import { spriteCache, simplifiedRendering } from '../enemy.js';

/**
 * BaseEnemy class that all enemy types extend
 * Handles common functionality:
 * - Status effects (slow, knockback, delirious, immobilize, burning panic)
 * - Damage handling with invulnerability checks
 * - Shared update logic (timers, speed calculation, knockback movement)
 * - Shared render logic (status effect visuals)
 */
export class BaseEnemy {
    constructor(x, y, config) {
        // Position
        this.x = x;
        this.y = y;
        
        // Type identifier
        this.type = config.type || 'base';
        
        // Base stats from config
        this.radius = config.radius || 15;
        this.baseSpeed = config.speed || 100;
        this.speed = this.baseSpeed;
        this.maxHealth = config.health || 30;
        this.health = this.maxHealth;
        this.damage = config.damage || 0;
        this.color = config.color || '#808080';
        this.xp = config.xp || 5;
        
        // Tower level scaling
        this.towerLevel = config.towerLevel || 1;
        
        // Visual state
        this.hurtTime = 0;
        
        // === Status Effect Properties ===
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        // Delirious effect (from Crucible)
        this.deliriousTime = 0;
        this.deliriousPhase = 'chase'; // 'chase' or 'wander'
        this.deliriousPhaseDuration = 0.8;
        this.deliriousPhaseTimer = 0;
        this.deliriousWanderAngle = 0;
        
        // Immobilize effect
        this.immobilizedTime = 0;
        this.permanentlyFrozen = false; // Cryostasis permanent freeze
        this.cryostasisInvulnerable = false; // Invulnerable while being used as cryostasis prism
        
        // Burning panic state (triggered by Crucible burst at 90%)
        this.burningPanicTime = 0;
        this.burningPanicAngle = 0;
        this.burningPanicSpeed = config.burningPanicSpeed || 400;
        this.burningTrailTimer = 0;
        this.burningTrailInterval = config.burningTrailInterval || 0.05;
    }
    
    // === Status Effect Methods ===
    
    /**
     * Apply slow effect, keeping the strongest slow
     */
    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }
    
    /**
     * Apply delirious effect (confusion from Crucible)
     */
    applyDelirious(duration) {
        if (this.deliriousTime <= 0) {
            // Starting fresh, randomize initial phase
            this.deliriousPhase = Math.random() < 0.5 ? 'chase' : 'wander';
            this.deliriousPhaseTimer = 0;
            this.deliriousWanderAngle = Math.random() * Math.PI * 2;
        }
        this.deliriousTime = Math.max(this.deliriousTime, duration);
    }
    
    /**
     * Apply immobilize effect (root in place)
     */
    applyImmobilize(duration) {
        this.immobilizedTime = Math.max(this.immobilizedTime, duration);
    }
    
    /**
     * Apply permanent freeze from Cryostasis
     */
    applyPermanentFreeze() {
        this.permanentlyFrozen = true;
        this.immobilizedTime = 0; // Clear regular immobilize, this is permanent
    }
    
    /**
     * Apply burning panic - enemy runs around on fire leaving trails
     */
    applyBurningPanic(duration) {
        // Permanently frozen enemies can't panic
        if (this.permanentlyFrozen) return;
        this.burningPanicTime = duration;
        this.burningPanicAngle = Math.random() * Math.PI * 2;
        this.immobilizedTime = 0; // Break out of immobilize
    }
    
    /**
     * Apply knockback force
     */
    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }
    
    /**
     * Take damage, returns true if killed
     */
    takeDamage(amount) {
        // Invulnerable while serving as cryostasis prism
        if (this.cryostasisInvulnerable) return false;
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }
    
    // === Shared Update Logic ===
    
    /**
     * Update status effect timers and speed
     * Returns the current effective speed
     */
    updateStatusEffects(dt) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Update status effect timers
        if (this.deliriousTime > 0) {
            this.deliriousTime -= dt;
        }
        if (this.immobilizedTime > 0) {
            this.immobilizedTime -= dt;
        }
        if (this.burningPanicTime > 0) {
            this.burningPanicTime -= dt;
        }
        
        // Update hurt visual
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
    }
    
    /**
     * Apply knockback movement (works even when immobilized)
     */
    applyKnockbackMovement(dt) {
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
        }
    }
    
    /**
     * Handle burning panic movement
     * Returns fire trail info if trail should be created, null otherwise
     */
    handleBurningPanic(dt) {
        if (this.burningPanicTime <= 0) return null;
        
        // Randomly change direction occasionally
        if (Math.random() < 0.05) {
            this.burningPanicAngle += (Math.random() - 0.5) * Math.PI * 0.5;
        }
        
        // Move at high speed
        this.x += Math.cos(this.burningPanicAngle) * this.burningPanicSpeed * dt;
        this.y += Math.sin(this.burningPanicAngle) * this.burningPanicSpeed * dt;
        
        // Fire trail
        this.burningTrailTimer += dt;
        if (this.burningTrailTimer >= this.burningTrailInterval) {
            this.burningTrailTimer = 0;
            return {
                type: 'fireTrail',
                x: this.x,
                y: this.y,
                radius: 20,
                duration: 1.5,
                damage: 8,
                creator: this
            };
        }
        
        return null;
    }
    
    /**
     * Check if the enemy can move (not immobilized or frozen)
     */
    canMove() {
        return this.immobilizedTime <= 0 && !this.permanentlyFrozen;
    }
    
    /**
     * Check if enemy is in burning panic state
     */
    isInBurningPanic() {
        return this.burningPanicTime > 0;
    }
    
    /**
     * Check if enemy is delirious
     */
    isDelirious() {
        return this.deliriousTime > 0;
    }
    
    /**
     * Handle delirious movement pattern
     * Returns the direction the enemy should move
     */
    handleDeliriousMovement(dt, playerX, playerY) {
        if (!this.isDelirious()) return null;
        
        this.deliriousPhaseTimer += dt;
        if (this.deliriousPhaseTimer >= this.deliriousPhaseDuration) {
            this.deliriousPhaseTimer = 0;
            // Switch phase
            if (this.deliriousPhase === 'chase') {
                this.deliriousPhase = 'wander';
                this.deliriousWanderAngle = Math.random() * Math.PI * 2;
            } else {
                this.deliriousPhase = 'chase';
            }
        }
        
        if (this.deliriousPhase === 'chase') {
            // Move toward player (inefficiently)
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            return normalize(dx, dy);
        } else {
            // Wander in random direction
            return {
                x: Math.cos(this.deliriousWanderAngle),
                y: Math.sin(this.deliriousWanderAngle)
            };
        }
    }
    
    // === Shared Render Logic ===
    
    /**
     * Render burning panic visual effect
     */
    renderBurningPanic(ctx, screen, r) {
        if (this.burningPanicTime <= 0) return;
        
        const flameSize = r * 2;
        const flameGradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, flameSize
        );
        flameGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        flameGradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
        flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, flameSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render slow effect visual
     */
    renderSlowEffect(ctx, screen, r, scale) {
        if (this.slowTime <= 0) return;
        
        ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render permanent freeze visual (ice encasement)
     */
    renderPermanentFreeze(ctx, screen, r, scale) {
        if (!this.permanentlyFrozen) return;
        
        // Ice shell gradient
        const iceGradient = ctx.createRadialGradient(
            screen.x - r * 0.3, screen.y - r * 0.3, 0,
            screen.x, screen.y, r * 1.4
        );
        iceGradient.addColorStop(0, 'rgba(220, 250, 255, 0.8)');
        iceGradient.addColorStop(0.4, 'rgba(150, 220, 255, 0.5)');
        iceGradient.addColorStop(0.8, 'rgba(100, 180, 255, 0.3)');
        iceGradient.addColorStop(1, 'rgba(80, 160, 255, 0.1)');
        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Ice crystal spikes
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.9)';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 6; i++) {
            const spikeAngle = (i / 6) * Math.PI * 2;
            const spikeLen = r * 0.5;
            ctx.beginPath();
            ctx.moveTo(
                screen.x + Math.cos(spikeAngle) * r,
                screen.y + Math.sin(spikeAngle) * r
            );
            ctx.lineTo(
                screen.x + Math.cos(spikeAngle) * (r + spikeLen),
                screen.y + Math.sin(spikeAngle) * (r + spikeLen)
            );
            ctx.stroke();
        }
    }
    
    /**
     * Render all status effects (call this at start of render)
     */
    renderStatusEffects(ctx, screen, r, scale) {
        this.renderBurningPanic(ctx, screen, r);
        this.renderSlowEffect(ctx, screen, r, scale);
        this.renderPermanentFreeze(ctx, screen, r, scale);
    }
    
    /**
     * Get current display color (accounting for hurt state and burning)
     */
    getDisplayColor() {
        if (this.hurtTime > 0) {
            return '#ffffff';
        }
        if (this.burningPanicTime > 0) {
            return '#ff6600'; // Fiery orange when burning
        }
        return this.color;
    }
    
    /**
     * Should use sprite or fallback rendering
     */
    shouldUseSprite() {
        return !this.hurtTime && !simplifiedRendering && !this.burningPanicTime;
    }
    
    // === Abstract methods that subclasses should implement ===
    
    /**
     * Update enemy behavior (movement, AI, etc.)
     * @param {number} dt - Delta time
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {object} context - Additional context (varies by enemy type)
     * @returns {object|null} - Fire trail info if one should be created
     */
    update(dt, playerX, playerY, context = {}) {
        throw new Error('update() must be implemented by subclass');
    }
    
    /**
     * Render the enemy
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Camera} camera - Camera for world to screen conversion
     */
    render(ctx, camera) {
        throw new Error('render() must be implemented by subclass');
    }
}

