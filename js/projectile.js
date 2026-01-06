// Projectile and spell effect classes

import { distance, normalize, angle } from './utils.js';
import { circleCollision } from './collision.js';

// Base projectile class
export class Projectile {
    constructor(x, y, angle, speed, damage, options = {}) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.radius = options.radius || 8;
        this.color = options.color || '#ffffff';
        this.piercing = options.piercing || false;
        this.hitEnemies = new Set();
        this.lifetime = options.lifetime || 3;
        this.age = 0;
        this.knockback = options.knockback || 0;
        this.slowAmount = options.slowAmount || 0;
        this.slowDuration = options.slowDuration || 0;
        this.sourceType = options.sourceType || null; // For special projectile types
        
        // Movement
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Trail effect
        this.trail = [];
        this.trailLength = options.trailLength || 5;
    }

    update(dt) {
        // Store trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.age += dt;
        
        return this.age < this.lifetime;
    }

    checkCollision(enemy) {
        if (this.hitEnemies.has(enemy)) return false;
        
        if (circleCollision(this.x, this.y, this.radius, enemy.x, enemy.y, enemy.radius)) {
            this.hitEnemies.add(enemy);
            
            // Apply effects
            if (this.knockback > 0) {
                const dir = normalize(enemy.x - this.x, enemy.y - this.y);
                enemy.applyKnockback(dir.x, dir.y, this.knockback);
            }
            
            if (this.slowAmount > 0) {
                enemy.applySlow(this.slowAmount, this.slowDuration);
            }
            
            return !this.piercing;
        }
        return false;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        // Draw trail
        ctx.save();
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const ts = camera.worldToScreen(t.x, t.y);
            const alpha = (i / this.trail.length) * 0.5;
            const size = r * (i / this.trail.length);
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(ts.x, ts.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Draw projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r * 2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Area of effect zone (magma pool, gravity well, etc.)
export class AreaEffect {
    constructor(x, y, radius, damage, duration, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.damage = damage;
        this.duration = duration;
        this.age = 0;
        this.color = options.color || '#ff6b35';
        this.damageInterval = options.damageInterval || 0.5;
        this.damageTimer = 0;
        this.slowAmount = options.slowAmount || 0;
        this.slowDuration = options.slowDuration || 0;
        this.pullForce = options.pullForce || 0;
        this.type = options.type || 'damage';
        this.creator = options.creator || null; // Track who created this effect
        this.damagePlayer = options.damagePlayer || false; // Whether to damage player
        this.playerDamage = options.playerDamage || 0; // Damage to player
    }

    update(dt) {
        this.age += dt;
        this.damageTimer += dt;
        return this.age < this.duration;
    }

    canDamage() {
        if (this.damageTimer >= this.damageInterval) {
            this.damageTimer = 0;
            return true;
        }
        return false;
    }

    affectEnemy(enemy) {
        // Skip the creator of this effect
        if (this.creator && enemy === this.creator) {
            return false;
        }
        
        const dist = distance(this.x, this.y, enemy.x, enemy.y);
        if (dist < this.radius + enemy.radius) {
            // Apply slow
            if (this.slowAmount > 0) {
                enemy.applySlow(this.slowAmount, this.slowDuration);
            }
            
            // Apply pull (gravity well)
            if (this.pullForce > 0) {
                const dir = normalize(this.x - enemy.x, this.y - enemy.y);
                enemy.x += dir.x * this.pullForce;
                enemy.y += dir.y * this.pullForce;
            }
            
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const progress = this.age / this.duration;
        const alpha = 1 - progress * 0.5;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (this.type === 'gravity') {
            // Gravity well effect
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, r
            );
            gradient.addColorStop(0, '#1a0033');
            gradient.addColorStop(0.5, this.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Swirl effect
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2 * scale;
            for (let i = 0; i < 3; i++) {
                const spiralAngle = (this.age * 3 + i * Math.PI * 2 / 3);
                const spiralRadius = r * (0.3 + i * 0.2);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, spiralRadius, spiralAngle, spiralAngle + Math.PI);
                ctx.stroke();
            }
        } else {
            // Standard AoE (magma, frost)
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, r
            );
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.7, this.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Bubbling effect for magma
            if (this.type === 'magma') {
                for (let i = 0; i < 5; i++) {
                    const bx = screen.x + Math.cos(this.age * 2 + i) * r * 0.5;
                    const by = screen.y + Math.sin(this.age * 3 + i * 2) * r * 0.5;
                    ctx.fillStyle = '#ffcc00';
                    ctx.beginPath();
                    ctx.arc(bx, by, (3 + Math.sin(this.age * 5 + i) * 2) * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        ctx.restore();
    }
}

// Expanding ring effect
export class RingEffect {
    constructor(x, y, maxRadius, damage, duration, options = {}) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.damage = damage;
        this.duration = duration;
        this.age = 0;
        this.color = options.color || '#ff6b35';
        this.hitEnemies = new Set();
        this.knockback = options.knockback || 0;
    }

    get currentRadius() {
        return (this.age / this.duration) * this.maxRadius;
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    checkCollision(enemy) {
        if (this.hitEnemies.has(enemy)) return false;
        
        const dist = distance(this.x, this.y, enemy.x, enemy.y);
        const ringInner = this.currentRadius - 20;
        const ringOuter = this.currentRadius + 20;
        
        if (dist > ringInner && dist < ringOuter) {
            this.hitEnemies.add(enemy);
            
            if (this.knockback > 0) {
                const dir = normalize(enemy.x - this.x, enemy.y - this.y);
                enemy.applyKnockback(dir.x, dir.y, this.knockback);
            }
            
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const alpha = 1 - (this.age / this.duration);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 15 * scale;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, this.currentRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        ctx.lineWidth = 5 * scale;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, this.currentRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// Orbital shield
export class OrbitalShield {
    constructor(owner, count, radius, damage) {
        this.owner = owner;
        this.count = count;
        this.orbitRadius = radius;
        this.damage = damage;
        this.shieldRadius = 10;
        this.angle = 0;
        this.rotationSpeed = 2;
        this.hitCooldowns = new Map();
        this.hitCooldownTime = 0.5;
    }

    update(dt) {
        this.angle += this.rotationSpeed * dt;
        
        // Update cooldowns
        for (const [enemy, cooldown] of this.hitCooldowns) {
            this.hitCooldowns.set(enemy, cooldown - dt);
            if (cooldown - dt <= 0) {
                this.hitCooldowns.delete(enemy);
            }
        }
    }

    getShieldPositions() {
        const positions = [];
        for (let i = 0; i < this.count; i++) {
            const shieldAngle = this.angle + (i * Math.PI * 2 / this.count);
            positions.push({
                x: this.owner.x + Math.cos(shieldAngle) * this.orbitRadius,
                y: this.owner.y + Math.sin(shieldAngle) * this.orbitRadius
            });
        }
        return positions;
    }

    checkCollision(enemy) {
        if (this.hitCooldowns.has(enemy)) return false;
        
        const positions = this.getShieldPositions();
        for (const pos of positions) {
            if (circleCollision(pos.x, pos.y, this.shieldRadius, enemy.x, enemy.y, enemy.radius)) {
                this.hitCooldowns.set(enemy, this.hitCooldownTime);
                
                // Knockback
                const dir = normalize(enemy.x - this.owner.x, enemy.y - this.owner.y);
                enemy.applyKnockback(dir.x, dir.y, 100);
                
                return true;
            }
        }
        return false;
    }

    render(ctx, camera) {
        const positions = this.getShieldPositions();
        const scale = camera.zoom;
        const r = this.shieldRadius * scale;
        
        for (const pos of positions) {
            const screen = camera.worldToScreen(pos.x, pos.y);
            
            // Shield glow
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, r * 1.5
            );
            gradient.addColorStop(0, 'rgba(186, 104, 200, 0.8)');
            gradient.addColorStop(1, 'rgba(186, 104, 200, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Shield body
            ctx.fillStyle = '#ba68c8';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

