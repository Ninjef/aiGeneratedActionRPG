// Enemy class and spawning system

import { randomRange, randomPositionInRing, distance, normalize, angle } from './utils.js';

// Sprite cache for pre-rendered enemy sprites (avoids creating gradients every frame)
export class SpriteCache {
    constructor() {
        this.sprites = new Map();
        this.baseSize = 64; // Base sprite size in pixels
    }
    
    // Initialize all enemy sprites
    init() {
        this.createBuilderSprite();
        this.createFighterSprite();
        this.createFierySprite();
        this.createGravitationalSprite();
        this.createFastPurpleSprite();
    }
    
    createFighterSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 4;
        
        // Aggressive aura glow
        const glowGradient = ctx.createRadialGradient(
            center, center, r * 0.5,
            center, center, r * 1.6
        );
        glowGradient.addColorStop(0, 'rgba(46, 204, 113, 0.5)');
        glowGradient.addColorStop(0.6, 'rgba(46, 204, 113, 0.2)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (green)
        ctx.fillStyle = ENEMY_TYPES.fighter.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner highlight gradient
        const gradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(0.5, 'rgba(39, 174, 96, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fighter', canvas);
    }
    
    createBuilderSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 4;
        
        // Main body (grey)
        ctx.fillStyle = ENEMY_TYPES.builder.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner shading gradient
        const gradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('builder', canvas);
    }
    
    createFierySprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 4; // Smaller for fiery enemies
        
        // Flame glow
        const glowSize = r * 2.5;
        const glowGradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.fiery.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(center, center, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fiery', canvas);
    }
    
    createGravitationalSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 8;
        
        // Gravity aura
        const auraGradient = ctx.createRadialGradient(
            center, center, r,
            center, center, r * 1.8
        );
        auraGradient.addColorStop(0, 'rgba(65, 105, 225, 0.4)');
        auraGradient.addColorStop(1, 'rgba(65, 105, 225, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.gravitational.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glow
        const innerGradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        innerGradient.addColorStop(0, 'rgba(100, 149, 237, 0.5)');
        innerGradient.addColorStop(1, 'rgba(25, 25, 112, 0.3)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 50, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.stroke();
        
        this.sprites.set('gravitational', canvas);
    }
    
    createFastPurpleSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 3;
        
        // Speed glow
        const glowGradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, r * 2
        );
        glowGradient.addColorStop(0, 'rgba(139, 0, 255, 0.6)');
        glowGradient.addColorStop(0.6, 'rgba(139, 0, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.fastPurple.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        const innerGradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        innerGradient.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
        innerGradient.addColorStop(1, 'rgba(75, 0, 130, 0.2)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fastPurple', canvas);
    }
    
    getSprite(type) {
        return this.sprites.get(type);
    }
}

// Global sprite cache instance
export const spriteCache = new SpriteCache();

// Global flag for simplified rendering (set by game when enemy count is high)
export let simplifiedRendering = false;
export function setSimplifiedRendering(value) {
    simplifiedRendering = value;
}

export const ENEMY_TYPES = {
    builder: {
        radius: 15,
        speed: 100,
        health: 30,
        damage: 0,  // No contact damage
        color: '#808080',  // Grey
        xp: 5,
        fleeRadius: 200  // Distance to flee from player
    },
    fighter: {
        radius: 14,
        speed: 140,
        health: 40,
        damage: 10,
        color: '#2ecc71',  // Green
        xp: 12,
        aggroRadius: 6000  // Very far aggro distance
    },
    fiery: {
        radius: 8,
        speed: 300,  // Very fast
        health: 15,
        damage: 8,
        color: '#ff4500',  // Red-orange
        xp: 15,
        trailInterval: 0.07,  // Leave trail every 0.2s
        trailRadius: 15,
        trailDuration: 1.5,
        trailDamage: 6  // ~6 dps
    },
    gravitational: {
        radius: 18,
        speed: 110,  // Slower
        health: 150,
        damage: 12,
        color: '#4169e1',  // Blue
        xp: 30,
        gravityRange: 100,  // Pull range
        gravityStrength: 150  // Pull force
    },
    fastPurple: {
        radius: 10,
        speed: 200,
        health: 75,
        damage: 10,
        color: '#8b00ff',  // Purple
        xp: 20
    }
};

// Builder class - grey enemies that convert crystals to spawn blocks
export class Builder {
    constructor(x, y) {
        const config = ENEMY_TYPES.builder;
        
        this.x = x;
        this.y = y;
        this.type = 'builder';
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
        this.fleeRadius = config.fleeRadius;
        
        // Target tracking
        this.targetX = x;
        this.targetY = y;
        this.targetCrystal = null;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        // Visual
        this.hurtTime = 0;
        
        // Wandering AI state
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }

    update(dt, playerX, playerY, crystals, spawnBlocks = []) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Apply knockback
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
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
        
        // Update hurt visual
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('builder');
        if (sprite && !this.hurtTime && !simplifiedRendering) {
            const spriteScale = (r * 2) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Fallback/simplified rendering (or hurt state)
            const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
            ctx.fillStyle = baseColor;
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

// For backward compatibility, keep Enemy as an alias to Builder
export const Enemy = Builder;

// Fighter class - aggressive green enemies that prioritize towers, then chase player
export class Fighter {
    constructor(x, y) {
        const config = ENEMY_TYPES.fighter;
        
        this.x = x;
        this.y = y;
        this.type = 'fighter';
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
        this.aggroRadius = config.aggroRadius;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        // Visual
        this.hurtTime = 0;
        
        // Direction tracking for visuals
        this.facingAngle = Math.random() * Math.PI * 2;
        
        // Target tracking
        this.targetTower = null;
        
        // Wandering AI state (when nothing in range)
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
    }

    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }

    update(dt, playerX, playerY, spawnBlocks = []) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Apply knockback
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
        }
        
        // PRIORITY 1: Check for nearby spawn blocks (towers) - these take priority
        let nearestTower = null;
        let nearestTowerDist = Infinity;
        
        for (const block of spawnBlocks) {
            const dist = distance(this.x, this.y, block.x, block.y);
            if (dist < block.aggroRadius && dist < nearestTowerDist) {
                nearestTower = block;
                nearestTowerDist = dist;
            }
        }
        
        if (nearestTower) {
            // Move toward tower (highest priority)
            this.targetTower = nearestTower;
            const dx = nearestTower.x - this.x;
            const dy = nearestTower.y - this.y;
            const dir = normalize(dx, dy);
            
            this.x += dir.x * this.speed * dt;
            this.y += dir.y * this.speed * dt;
            
            // Update facing direction
            this.facingAngle = angle(this.x, this.y, nearestTower.x, nearestTower.y);
        } else {
            this.targetTower = null;
            
            // PRIORITY 2: Chase player if within aggro range
            const distToPlayer = distance(this.x, this.y, playerX, playerY);
            
            if (distToPlayer < this.aggroRadius) {
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const dir = normalize(dx, dy);
                
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                
                // Update facing direction
                this.facingAngle = angle(this.x, this.y, playerX, playerY);
            } else {
                // PRIORITY 3: Wander randomly when nothing in range
                this.wanderTimer += dt;
                if (this.wanderTimer >= this.wanderChangeInterval) {
                    this.wanderTimer = 0;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                    this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
                }
                
                const wanderSpeed = this.speed * 0.4;
                this.x += Math.cos(this.wanderAngle) * wanderSpeed * dt;
                this.y += Math.sin(this.wanderAngle) * wanderSpeed * dt;
                
                this.facingAngle = this.wanderAngle;
            }
        }
        
        // Update hurt visual
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('fighter');
        if (sprite && !this.hurtTime && !simplifiedRendering) {
            const spriteScale = (r * 2) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Fallback/simplified rendering (or hurt state)
            const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
        }
        
        // Angry eyes pointing toward facing direction
        if (!simplifiedRendering) {
            const eyeOffset = r * 0.35;
            const eyeSpread = r * 0.28;
            const eyeSize = r * 0.18;
            
            const leftEyeX = screen.x + Math.cos(this.facingAngle) * eyeOffset - Math.sin(this.facingAngle) * eyeSpread;
            const leftEyeY = screen.y + Math.sin(this.facingAngle) * eyeOffset + Math.cos(this.facingAngle) * eyeSpread;
            const rightEyeX = screen.x + Math.cos(this.facingAngle) * eyeOffset + Math.sin(this.facingAngle) * eyeSpread;
            const rightEyeY = screen.y + Math.sin(this.facingAngle) * eyeOffset - Math.cos(this.facingAngle) * eyeSpread;
            
            // Angry eye color (red when hurt, dark when normal)
            ctx.fillStyle = this.hurtTime > 0 ? '#ff0000' : '#1a472a';
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

// SpawnBlock class - destructible blocks that spawn specialized enemies when fighters enter
export class SpawnBlock {
    constructor(x, y, crystalType) {
        this.x = x;
        this.y = y;
        this.crystalType = crystalType;  // heat, cold, force
        
        // Level and XP system
        this.level = 1;
        this.towerXp = 0;
        this.xpToNextLevel = 20;  // XP needed to level up (scales with level)
        
        // Base stats (scale with level)
        this.baseHealth = 250;
        this.baseRadius = 30;
        this.recalculateStats();
        
        this.xp = 50;  // XP awarded to player when destroyed
        
        // Aggro radius - fighters are attracted from this distance
        this.aggroRadius = 1000;
        
        // Visual
        this.pulsePhase = 0;
        this.hurtTime = 0;
        this.levelUpFlash = 0;  // Visual flash when leveling up
        
        // Color based on crystal type
        const colors = {
            heat: '#ff6b35',
            cold: '#4fc3f7',
            force: '#ba68c8'
        };
        this.color = colors[crystalType];
        this.glowColor = this.color + '80';
    }
    
    /**
     * Recalculate stats based on current level
     */
    recalculateStats() {
        // HP scales with level: +50% per level (no cap)
        this.maxHealth = Math.floor(this.baseHealth * (1 + (this.level - 1) * 0.5));
        this.health = this.maxHealth;
        
        // Radius scales slightly: +10% per level, capped at 2x base
        const radiusMultiplier = Math.min(2.0, 1 + (this.level - 1) * 0.1);
        this.radius = this.baseRadius * radiusMultiplier;
        
        // XP awarded to player scales with level
        this.xp = 50 + (this.level - 1) * 25;
    }
    
    /**
     * Add XP to the tower (called when a builder enters)
     * Returns true if the tower leveled up
     */
    addTowerXp(amount) {
        this.towerXp += amount;
        
        // Check for level up
        if (this.towerXp >= this.xpToNextLevel) {
            this.towerXp -= this.xpToNextLevel;
            this.level++;
            
            // XP required for next level increases
            this.xpToNextLevel = Math.floor(20 * Math.pow(1.5, this.level - 1));
            
            // Recalculate stats and heal to new max
            const oldMaxHealth = this.maxHealth;
            this.recalculateStats();
            
            // Heal by the difference (don't over-heal)
            this.health = Math.min(this.health + (this.maxHealth - oldMaxHealth), this.maxHealth);
            
            // Visual feedback
            this.levelUpFlash = 0.5;
            
            return true;
        }
        return false;
    }
    
    applySlow(amount, duration) {
        // Spawn blocks are stationary structures, so they ignore slow effects
    }

    applyKnockback(dirX, dirY, force) {
        // Spawn blocks are stationary structures, so they ignore knockback
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.15;
        return this.health <= 0;
    }
    
    update(dt) {
        this.pulsePhase += dt * 2;
        
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
        
        if (this.levelUpFlash > 0) {
            this.levelUpFlash -= dt;
        }
        
        // No periodic spawning - spawning is triggered externally when fighters enter
        return null;
    }
    
    /**
     * Calculate stat multipliers for spawned enemies based on tower level
     */
    getEnemyScaling() {
        const level = this.level;
        
        // Speed: +15% per level, capped at 2x base speed
        const speedMultiplier = Math.min(2.0, 1 + (level - 1) * 0.15);
        
        // HP: +30% per level, no cap
        const healthMultiplier = 1 + (level - 1) * 0.3;
        
        // Damage: +20% per level, no cap
        const damageMultiplier = 1 + (level - 1) * 0.2;
        
        // Radius: +8% per level, capped at 1.5x base radius
        const radiusMultiplier = Math.min(1.5, 1 + (level - 1) * 0.08);
        
        return {
            speed: speedMultiplier,
            health: healthMultiplier,
            damage: damageMultiplier,
            radius: radiusMultiplier,
            level: level
        };
    }
    
    /**
     * Called when a fighter enters the spawn block
     * Returns spawn info for enemies to create
     */
    triggerSpawn() {
        // Spawn counts based on type
        const spawnCounts = {
            heat: 5,   // 5 fiery enemies
            cold: 3,   // 3 gravitational enemies
            force: 5   // 5 fast purple enemies
        };
        
        const enemyTypes = {
            heat: 'fiery',
            cold: 'gravitational',
            force: 'fastPurple'
        };
        
        return {
            count: spawnCounts[this.crystalType],
            enemyType: enemyTypes[this.crystalType],
            x: this.x,
            y: this.y,
            scaling: this.getEnemyScaling()
        };
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        
        ctx.save();
        
        // Level-up flash effect (expands outward)
        if (this.levelUpFlash > 0) {
            const flashProgress = 1 - (this.levelUpFlash / 0.5);
            const flashRadius = r * (1.5 + flashProgress * 2);
            const flashAlpha = (1 - flashProgress) * 0.6;
            
            const flashGradient = ctx.createRadialGradient(
                screen.x, screen.y, r,
                screen.x, screen.y, flashRadius
            );
            flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
            flashGradient.addColorStop(0.5, `rgba(255, 215, 0, ${flashAlpha * 0.5})`);
            flashGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = flashGradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, flashRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Outer glow (stronger for higher levels)
        const glowIntensity = Math.min(1.5, 1 + (this.level - 1) * 0.1);
        const glowSize = r * 1.8 * pulse * glowIntensity;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.5,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, this.glowColor);
        glowGradient.addColorStop(0.5, this.glowColor.replace('80', '40'));
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Main square body
        const baseColor = this.hurtTime > 0 ? '#ffffff' : (this.levelUpFlash > 0 ? '#ffffaa' : this.color);
        ctx.fillStyle = baseColor;
        ctx.fillRect(screen.x - r, screen.y - r, r * 2, r * 2);
        
        // Border (thicker for higher levels)
        const borderWidth = Math.min(6, 3 + (this.level - 1) * 0.5);
        ctx.strokeStyle = this.level >= 3 ? '#ffd700' : '#ffffff';  // Gold border at level 3+
        ctx.lineWidth = borderWidth * scale;
        ctx.strokeRect(screen.x - r, screen.y - r, r * 2, r * 2);
        
        // Inner pattern (diagonal lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(screen.x - r, screen.y - r);
        ctx.lineTo(screen.x + r, screen.y + r);
        ctx.moveTo(screen.x + r, screen.y - r);
        ctx.lineTo(screen.x - r, screen.y + r);
        ctx.stroke();
        
        // Pulsing center
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.4 + Math.sin(this.pulsePhase * 3) * 0.2) + ')';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.3 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Health bar (always visible)
        this.renderHealthBar(ctx, screen, scale);
        
        // Level display above the tower
        this.renderLevel(ctx, screen, scale);
    }
    
    renderLevel(ctx, screen, scale) {
        const levelText = `Lv.${this.level}`;
        const fontSize = Math.max(12, 16 * scale);
        const levelY = screen.y - this.radius * scale - 22 * scale;
        
        ctx.save();
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Background pill
        const textWidth = ctx.measureText(levelText).width;
        const padding = 4 * scale;
        const pillHeight = fontSize + padding * 2;
        const pillWidth = textWidth + padding * 3;
        
        // Darker background for better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(screen.x - pillWidth / 2, levelY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
        
        // Gold text for high level, white otherwise
        ctx.fillStyle = this.level >= 3 ? '#ffd700' : '#ffffff';
        if (this.level >= 5) {
            ctx.fillStyle = '#ff6b35';  // Orange/red for very high level
        }
        ctx.fillText(levelText, screen.x, levelY);
        
        ctx.restore();
    }
    
    renderHealthBar(ctx, screen, scale) {
        const barWidth = this.radius * 2.5 * scale;
        const barHeight = 6 * scale;
        const barY = screen.y - this.radius * scale - 12 * scale;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screen.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
        
        // Health bar
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = this.color;
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
    }
}

// FieryEnemy class - fast, erratic enemies that leave fire trails
export class FieryEnemy {
    constructor(x, y, scaling = null) {
        const config = ENEMY_TYPES.fiery;
        
        this.x = x;
        this.y = y;
        this.type = 'fiery';
        this.towerLevel = scaling?.level || 1;
        
        // Apply scaling if provided
        const speedMult = scaling?.speed || 1;
        const healthMult = scaling?.health || 1;
        const damageMult = scaling?.damage || 1;
        const radiusMult = scaling?.radius || 1;
        
        this.radius = config.radius * radiusMult;
        this.baseSpeed = config.speed * speedMult;
        this.speed = this.baseSpeed;
        this.maxHealth = Math.floor(config.health * healthMult);
        this.health = this.maxHealth;
        this.damage = Math.floor(config.damage * damageMult);
        this.color = config.color;
        this.xp = Math.floor(config.xp * (1 + (this.towerLevel - 1) * 0.5));  // XP scales with tower level
        
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
        
        // Visual
        this.hurtTime = 0;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }
    
    update(dt, playerX, playerY) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Apply knockback
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
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
        
        // Update hurt visual
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
        
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
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 3 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('fiery');
        if (sprite && !this.hurtTime && !simplifiedRendering) {
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
            const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// GravitationalEnemy class - blue enemies that pull each other together
export class GravitationalEnemy {
    constructor(x, y, scaling = null) {
        const config = ENEMY_TYPES.gravitational;
        
        this.x = x;
        this.y = y;
        this.type = 'gravitational';
        this.towerLevel = scaling?.level || 1;
        
        // Apply scaling if provided
        const speedMult = scaling?.speed || 1;
        const healthMult = scaling?.health || 1;
        const damageMult = scaling?.damage || 1;
        const radiusMult = scaling?.radius || 1;
        
        this.radius = config.radius * radiusMult;
        this.baseSpeed = config.speed * speedMult;
        this.speed = this.baseSpeed;
        this.maxHealth = Math.floor(config.health * healthMult);
        this.health = this.maxHealth;
        this.damage = Math.floor(config.damage * damageMult);
        this.color = config.color;
        this.xp = Math.floor(config.xp * (1 + (this.towerLevel - 1) * 0.5));  // XP scales with tower level
        this.gravityRange = config.gravityRange;
        this.gravityStrength = config.gravityStrength;
        
        // Velocity for gravity system
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Visual
        this.hurtTime = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }
    
    update(dt, playerX, playerY, otherGravEnemies) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Apply knockback
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
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
        
        // Update visuals
        this.pulsePhase += dt * 2;
        
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        
        ctx.save();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('gravitational');
        if (sprite && !this.hurtTime && !simplifiedRendering) {
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
            const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
            ctx.fillStyle = baseColor;
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

// FastPurpleEnemy class - fast purple enemies that chase the player
export class FastPurpleEnemy {
    constructor(x, y, scaling = null) {
        const config = ENEMY_TYPES.fastPurple;
        
        this.x = x;
        this.y = y;
        this.type = 'fastPurple';
        this.towerLevel = scaling?.level || 1;
        
        // Apply scaling if provided
        const speedMult = scaling?.speed || 1;
        const healthMult = scaling?.health || 1;
        const damageMult = scaling?.damage || 1;
        const radiusMult = scaling?.radius || 1;
        
        this.radius = config.radius * radiusMult;
        this.baseSpeed = config.speed * speedMult;
        this.speed = this.baseSpeed;
        this.maxHealth = Math.floor(config.health * healthMult);
        this.health = this.maxHealth;
        this.damage = Math.floor(config.damage * damageMult);
        this.color = config.color;
        this.xp = Math.floor(config.xp * (1 + (this.towerLevel - 1) * 0.5));  // XP scales with tower level
        
        // Visual
        this.hurtTime = 0;
        this.trailPhase = 0;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }
    
    update(dt, playerX, playerY) {
        // Update slow
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
        
        // Apply knockback
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
        }
        
        // Chase player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dir = normalize(dx, dy);
        
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
        
        // Update visuals
        this.trailPhase += dt * 5;
        
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('fastPurple');
        if (sprite && !this.hurtTime && !simplifiedRendering) {
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
            const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
            ctx.fillStyle = baseColor;
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
        this.fighterSpawnDelay = 2.0; // Start spawning fighters after 5 seconds
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

    update(dt, playerX, playerY, builders, fighters, crystals, camera) {
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
        this.spawnInterval = Math.max(0.03, 1.5 - this.difficulty * 0.15); // Faster ramp-up
        
        // Get dynamic spawn distances based on camera zoom
        const spawnDist = this.getSpawnDistances(camera);
        
        // Spawn builders
        this.spawnTimer += dt;
        
        if (this.spawnTimer >= this.spawnInterval && builders.length < this.maxBuilders) {
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
                
                builders.push(new Builder(pos.x, pos.y));
            }
        }
        
        // Spawn fighters (after delay, incrementally more over time)
        if (this.gameTime >= this.fighterSpawnDelay) {
            this.fighterSpawnTimer += dt;
            
            // Fighter spawn rate increases over time
            const timeSinceFighterStart = this.gameTime - this.fighterSpawnDelay;
            const fighterDifficulty = 1 + Math.floor(timeSinceFighterStart / 30) * 0.5;
            this.fighterSpawnInterval = Math.max(1.0, 3.0 - fighterDifficulty * 0.3);
            
            if (this.fighterSpawnTimer >= this.fighterSpawnInterval && fighters.length < this.maxFighters) {
                this.fighterSpawnTimer = 0;
                
                // Spawn 1-3 fighters based on difficulty
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


