// Projectile and spell effect classes

import { distance, normalize } from './utils.js';
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
        this.explosionRadius = options.explosionRadius || 0; // For fireballs
        
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
            
            return true; // Return true to indicate collision occurred
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

// Crucible effect - area that glows brighter then fades, applies status effects
export class CrucibleEffect {
    constructor(x, y, radius, duration, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.duration = duration;
        this.age = 0;
        this.baseColor = options.baseColor || '#8b0000'; // Dark red
        this.peakColor = options.peakColor || '#ff4500'; // Bright orange-red
        this.level = options.level || 1;
        
        // Glow animation phases:
        // 0-40% duration: dim glow, slowly brightening
        // 40-70% duration: rapid brightening to peak
        // 70-100% duration: fade out
        this.brightenPhase1 = 0.4;
        this.brightenPhase2 = 0.7;
        
        // Status effect timing
        this.deliriousTriggerProgress = 0.30; // 10% into effect
        this.immobilizeTriggerProgress = 0.70; // 50% into effect
        this.burstTriggerProgress = 0.90; // 90% into effect - enemies burst into flames
        
        // Track if effects have been triggered (one-time triggers)
        this.deliriousTriggered = false;
        this.immobilizeTriggered = false;
        this.burstTriggered = false;
        
        // Track which enemies have been immobilized (to avoid re-selecting)
        this.immobilizedEnemies = new Set();
        
        // Base count for immobilize (scales with level)
        this.baseImmobilizeCount = 5;
        
        // Damage settings
        this.baseDamage = 2; // Base damage per tick
        this.damageInterval = 0.5; // Damage every 0.5 seconds
        this.damageTimer = 0;
    }

    update(dt) {
        this.age += dt;
        this.damageTimer += dt;
        return this.age < this.duration;
    }
    
    // Check if damage should be applied this frame
    canDamage() {
        if (this.damageTimer >= this.damageInterval) {
            this.damageTimer = 0;
            return true;
        }
        return false;
    }
    
    // Get damage amount (scales with intensity/progress)
    getDamage() {
        const intensity = this.getGlowIntensity();
        // Damage scales from base to 3x base based on intensity
        return this.baseDamage * (1 + intensity * 2) * this.level;
    }
    
    // Get the current progress of the effect (0 to 1)
    getProgress() {
        return this.age / this.duration;
    }
    
    // Check if an enemy is within the crucible area
    isEnemyInArea(enemy) {
        const dist = distance(this.x, this.y, enemy.x, enemy.y);
        return dist < this.radius + enemy.radius;
    }
    
    // Check if delirious should be triggered this frame
    shouldTriggerDelirious() {
        if (this.deliriousTriggered) return false;
        const progress = this.getProgress();
        if (progress >= this.deliriousTriggerProgress) {
            this.deliriousTriggered = true;
            return true;
        }
        return false;
    }
    
    // Check if immobilize should be triggered this frame
    shouldTriggerImmobilize() {
        if (this.immobilizeTriggered) return false;
        const progress = this.getProgress();
        if (progress >= this.immobilizeTriggerProgress) {
            this.immobilizeTriggered = true;
            return true;
        }
        return false;
    }
    
    // Check if burst should be triggered this frame (at 90% - enemies burst into flames)
    shouldTriggerBurst() {
        if (this.burstTriggered) return false;
        const progress = this.getProgress();
        if (progress >= this.burstTriggerProgress) {
            this.burstTriggered = true;
            return true;
        }
        return false;
    }
    
    // Get the number of enemies to immobilize based on level
    getImmobilizeCount() {
        return this.baseImmobilizeCount + Math.floor((this.level - 1) * 2);
    }
    
    // Get the remaining duration for status effects
    getRemainingDuration() {
        return Math.max(0, this.duration - this.age);
    }

    // Calculate current glow intensity (0 to 1)
    getGlowIntensity() {
        const progress = this.age / this.duration;
        
        if (progress < this.brightenPhase1) {
            // Phase 1: dim glow, slowly brightening (0.1 to 0.3)
            const phaseProgress = progress / this.brightenPhase1;
            return 0.1 + phaseProgress * 0.2;
        } else if (progress < this.brightenPhase2) {
            // Phase 2: rapid brightening (0.3 to 1.0)
            const phaseProgress = (progress - this.brightenPhase1) / (this.brightenPhase2 - this.brightenPhase1);
            return 0.3 + phaseProgress * 0.7;
        } else {
            // Phase 3: fade out (1.0 to 0)
            const phaseProgress = (progress - this.brightenPhase2) / (1 - this.brightenPhase2);
            return 1.0 - phaseProgress;
        }
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const intensity = this.getGlowIntensity();
        
        ctx.save();
        
        // Calculate color based on intensity
        // Interpolate from dark red to bright orange-red
        const baseR = 139, baseG = 0, baseB = 0;      // #8b0000
        const peakR = 255, peakG = 69, peakB = 0;     // #ff4500
        
        const currentR = Math.floor(baseR + (peakR - baseR) * intensity);
        const currentG = Math.floor(baseG + (peakG - baseG) * intensity);
        const currentB = Math.floor(baseB + (peakB - baseB) * intensity);
        
        // Outer glow - larger, more diffuse
        const outerGradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r * 1.3
        );
        outerGradient.addColorStop(0, `rgba(${currentR}, ${currentG}, ${currentB}, ${intensity * 0.6})`);
        outerGradient.addColorStop(0.5, `rgba(${currentR}, ${currentG}, ${currentB}, ${intensity * 0.3})`);
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core glow - more intense
        const innerGradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r * 0.7
        );
        
        // At peak intensity, add white-hot center
        const coreIntensity = Math.pow(intensity, 2);
        const coreR = Math.min(255, currentR + 100 * coreIntensity);
        const coreG = Math.min(255, currentG + 80 * coreIntensity);
        const coreB = Math.min(255, currentB + 60 * coreIntensity);
        
        innerGradient.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${intensity * 0.9})`);
        innerGradient.addColorStop(0.6, `rgba(${currentR}, ${currentG}, ${currentB}, ${intensity * 0.5})`);
        innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle pulsing particles at higher intensities
        if (intensity > 0.3) {
            const particleCount = Math.floor(5 * intensity);
            for (let i = 0; i < particleCount; i++) {
                const particleAngle = (this.age * 2 + i * Math.PI * 2 / particleCount);
                const particleDist = r * 0.4 * (0.5 + 0.5 * Math.sin(this.age * 3 + i));
                const px = screen.x + Math.cos(particleAngle) * particleDist;
                const py = screen.y + Math.sin(particleAngle) * particleDist;
                
                ctx.fillStyle = `rgba(255, ${100 + Math.floor(intensity * 100)}, 50, ${intensity * 0.7})`;
                ctx.beginPath();
                ctx.arc(px, py, 3 * scale * intensity, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// Single orbital shield - orbits player, launches on enemy collision in movement direction
export class OrbitalShield {
    constructor(owner, orbitRadius, damage, projectilesArray, startAngle) {
        this.owner = owner;
        this.orbitRadius = orbitRadius;
        this.damage = damage;
        this.shieldRadius = 14;
        this.angle = startAngle;
        this.rotationSpeed = 3.5; // Consistent orbit speed
        this.projectilesArray = projectilesArray;
        
        this.age = 0;
        this.launched = false;
        this.expired = false;
        
        // Spawn animation
        this.spawnProgress = 0;
        this.spawnDuration = 0.15;
    }

    update(dt) {
        if (this.expired) return false;
        
        this.age += dt;
        this.angle += this.rotationSpeed * dt;
        
        // Spawn animation
        if (this.spawnProgress < 1) {
            this.spawnProgress = Math.min(1, this.age / this.spawnDuration);
        }
        
        return true;
    }

    // Called when collision detected - launches the shield as a projectile
    launch() {
        if (this.launched) return;
        
        const pos = this.getPosition();
        
        // Launch in tangent direction (perpendicular to radius, in direction of movement)
        // For counterclockwise rotation: tangent = angle + π/2
        const tangentAngle = this.angle + Math.PI / 2;
        
        const projectile = new Projectile(
            pos.x,
            pos.y,
            tangentAngle,
            500,
            this.damage,
            {
                radius: this.shieldRadius,
                color: '#ba68c8',
                trailLength: 14,
                lifetime: 2.5,
                piercing: true,
                knockback: 200,
                sourceType: 'orbitalLaunch'
            }
        );
        this.projectilesArray.push(projectile);
        
        this.launched = true;
        this.expired = true;
    }

    getPosition() {
        return {
            x: this.owner.x + Math.cos(this.angle) * this.orbitRadius,
            y: this.owner.y + Math.sin(this.angle) * this.orbitRadius
        };
    }

    checkCollision(enemy) {
        if (this.launched) return false;
        
        const pos = this.getPosition();
        if (circleCollision(pos.x, pos.y, this.shieldRadius, enemy.x, enemy.y, enemy.radius)) {
            // Launch on collision!
            this.launch();
            
            // Apply knockback to enemy in launch direction
            const tangentAngle = this.angle + Math.PI / 2;
            enemy.applyKnockback(Math.cos(tangentAngle), Math.sin(tangentAngle), 120);
            
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        if (this.expired) return;
        
        const pos = this.getPosition();
        const screen = camera.worldToScreen(pos.x, pos.y);
        const scale = camera.zoom;
        
        // Spawn scale animation
        const spawnScale = this.spawnProgress < 1 
            ? 0.3 + 0.7 * Math.pow(this.spawnProgress, 0.5) 
            : 1;
        
        const r = this.shieldRadius * scale * spawnScale;
        
        // Pulsing glow
        const pulseIntensity = 0.7 + 0.3 * Math.sin(this.age * 8);
        
        // Shield glow
        const gradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r * 1.6
        );
        gradient.addColorStop(0, `rgba(186, 104, 200, ${0.8 * pulseIntensity})`);
        gradient.addColorStop(0.6, 'rgba(220, 150, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(186, 104, 200, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield body
        ctx.fillStyle = '#ba68c8';
        ctx.strokeStyle = '#ddaaff';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

