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

// Cryostasis effect - ice beam that freezes enemy, then refracts rainbow beams
export class CryostasisBeam {
    constructor(source, target, duration, options = {}) {
        this.source = source; // Player reference (for refraction direction)
        this.target = target; // Target enemy
        this.duration = duration; // Total duration (~4 seconds)
        this.age = 0;
        this.level = options.level || 1;
        
        // Beam properties - starts narrow/dim, grows intense
        this.baseWidth = 3;
        this.maxWidth = 8;
        
        // Phase timing
        this.freezeTime = 2.0; // When enemy gets frozen and encased
        
        // State tracking
        this.freezeTriggered = false;
        this.targetFrozen = false;
        
        // Refracted beams - emerge after freeze, direction based on player angle
        this.refractedBeams = [];
        this.baseRefractCount = 4; // Start with 3 beams
        this.maxRefractCount = Math.min(8, 3 + Math.floor(this.level / 2)); // Scales with level
        this.refractSpawnInterval = 0.5; // Time between new refract beams spawning (after initial burst)
        this.lastRefractSpawn = 0;
        this.initialBeamsSpawned = false;
        this.randomAngleOffset = Math.random() * Math.PI * 2; // Random starting angle for the fan
        this.initialPlayerAngle = 0; // Set when beams first spawn, used for amplified rotation
        
        // Refracted beam damage (fast ticks, lower damage per tick)
        this.baseDamage = options.damage || 12; // Lower per-tick damage
        this.damageInterval = 0.05; // Very fast tick rate - enemies get hit even with brief exposure
        this.damageTimer = 0;
        
        // Ice encasement visual
        this.iceShards = [];
        this.generateIceShards();
        
        // Particle effects along beam
        this.beamParticles = [];
    }
    
    generateIceShards() {
        // Pre-generate ice crystal shard positions for the encasement
        const shardCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < shardCount; i++) {
            this.iceShards.push({
                angle: (Math.PI * 2 / shardCount) * i + Math.random() * 0.3,
                length: 20 + Math.random() * 25,
                width: 4 + Math.random() * 6,
                offset: Math.random() * 0.3, // Slight timing offset for animation
                hue: 180 + Math.random() * 40 // Cyan to blue range
            });
        }
    }

    update(dt) {
        this.age += dt;
        this.damageTimer += dt;
        
        // Check if target is still valid (but keep beam if frozen - permanent ice block)
        if (!this.target || (this.target._dead && !this.targetFrozen)) {
            return false;
        }
        
        // Update beam particles
        this.updateBeamParticles(dt);
        
        // Note: freeze trigger is handled by game.js via shouldTriggerFreeze()/markFreezeTriggered()
        // After freeze, manage refracted beams
        if (this.targetFrozen) {
            this.updateRefractedBeams(dt);
        }
        
        return this.age < this.duration;
    }
    
    updateBeamParticles(dt) {
        // Spawn particles along the beam
        if (Math.random() < 0.3) {
            const t = Math.random();
            const startX = this.source.x;
            const startY = this.source.y;
            const targetX = this.target.x;
            const targetY = this.target.y;
            
            this.beamParticles.push({
                x: startX + (targetX - startX) * t,
                y: startY + (targetY - startY) * t,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                life: 0.3 + Math.random() * 0.3,
                age: 0,
                size: 2 + Math.random() * 3
            });
        }
        
        // Update existing particles
        this.beamParticles = this.beamParticles.filter(p => {
            p.age += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            return p.age < p.life;
        });
    }
    
    updateRefractedBeams(dt) {
        // Calculate angle from target to player (refraction source direction)
        const dx = this.source.x - this.target.x;
        const dy = this.source.y - this.target.y;
        const playerAngle = Math.atan2(dy, dx);
        
        // Spawn initial burst of beams immediately when freeze triggers
        if (!this.initialBeamsSpawned) {
            this.initialBeamsSpawned = true;
            // Store the initial player angle as reference for amplified rotation
            this.initialPlayerAngle = playerAngle;
            for (let i = 0; i < this.baseRefractCount; i++) {
                this.spawnRefractedBeam(playerAngle, i, this.baseRefractCount);
            }
        }
        
        // Spawn additional refracted beams over time (beyond initial burst)
        const timeSinceFreeze = this.age - this.freezeTime;
        if (timeSinceFreeze - this.lastRefractSpawn >= this.refractSpawnInterval && 
            this.refractedBeams.length < this.maxRefractCount) {
            this.lastRefractSpawn = timeSinceFreeze;
            this.spawnRefractedBeam(playerAngle, this.refractedBeams.length, this.maxRefractCount);
        }
        
        // Calculate amplified rotation - small player movement = big beam rotation
        // The beams rotate 4x faster than the player moves around the target
        const angleFromInitial = this.normalizeAngle(playerAngle - this.initialPlayerAngle);
        const amplifiedAngle = this.initialPlayerAngle + angleFromInitial * 4; // 4x amplification
        
        // Update existing refracted beams - they rotate based on player position (amplified)
        this.refractedBeams.forEach((beam, index) => {
            beam.age += dt;
            
            // Base angle offset from amplified player direction (spread out from player) + random offset
            const spreadAngle = (Math.PI * 1.2); // Wider spread range (~216 degrees)
            const angleOffset = ((index / Math.max(1, this.refractedBeams.length - 1)) - 0.5) * spreadAngle;
            
            // Target angle uses amplified rotation (refracting away from amplified player position)
            const targetAngle = amplifiedAngle + Math.PI + angleOffset + this.randomAngleOffset;
            
            // Fast snap to target angle (nearly instant response)
            const angleDiff = this.normalizeAngle(targetAngle - beam.angle);
            beam.angle += angleDiff * 15 * dt; // Very fast rotation to follow amplified angle
            
            // Shimmer/color cycling
            beam.hueOffset += 60 * dt; // Cycle through rainbow
        });
    }
    
    spawnRefractedBeam(playerAngle, index, totalCount) {
        // Spawn with fanned out angles + random offset - INSTANT full length
        const spreadAngle = (Math.PI * 1.2); // Wider spread
        const angleOffset = ((index / Math.max(1, totalCount - 1)) - 0.5) * spreadAngle;
        const beamLength = 750 + Math.random() * 500; // Full length immediately
        
        this.refractedBeams.push({
            angle: playerAngle + Math.PI + angleOffset + this.randomAngleOffset,
            length: beamLength, // Start at full length (instant)
            maxLength: beamLength,
            width: 3 + Math.random() * 2,
            age: 0,
            hueOffset: index * 40, // Start at different hue positions
            alpha: 0.6 + Math.random() * 0.2
        });
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    // Get the current intensity of the main beam (0 to 1)
    getBeamIntensity() {
        // Ramps up over the duration, peaks near freeze time, stays high after
        if (this.age < this.freezeTime) {
            // Gradual increase to freeze point
            const progress = this.age / this.freezeTime;
            return 0.2 + progress * 0.8;
        } else {
            // After freeze, full intensity with slight pulse
            return 0.9 + 0.1 * Math.sin(this.age * 8);
        }
    }
    
    // Check if freeze should be triggered (for game.js to apply status)
    shouldTriggerFreeze() {
        if (!this.freezeTriggered && this.age >= this.freezeTime) {
            return true;
        }
        return false;
    }
    
    // Mark freeze as handled
    markFreezeTriggered() {
        this.freezeTriggered = true;
        this.targetFrozen = true;
    }
    
    // Get remaining duration after freeze for permanent immobilize
    getRemainingDuration() {
        return Math.max(0, this.duration - this.age);
    }
    
    // Check if refracted beams should deal damage this frame
    canDamage() {
        if (!this.targetFrozen || this.refractedBeams.length === 0) {
            return false;
        }
        if (this.damageTimer >= this.damageInterval) {
            this.damageTimer = 0;
            return true;
        }
        return false;
    }
    
    // Get damage per refracted beam
    getDamage() {
        return this.baseDamage * (1 + (this.level - 1) * 0.15);
    }
    
    // Get the world position of each refracted beam's end point
    getRefractedBeamEndpoints() {
        if (!this.targetFrozen) return [];
        
        return this.refractedBeams.map(beam => ({
            startX: this.target.x,
            startY: this.target.y,
            endX: this.target.x + Math.cos(beam.angle) * beam.length,
            endY: this.target.y + Math.sin(beam.angle) * beam.length
        }));
    }
    
    // Check if a line segment intersects a circle - returns closest hit or null
    // Used for refracted beam collision checking (no pierce - first hit only)
    checkBeamCollision(enemies) {
        if (!this.targetFrozen || this.refractedBeams.length === 0) {
            return [];
        }
        
        const hits = [];
        
        for (const beam of this.refractedBeams) {
            const startX = this.target.x;
            const startY = this.target.y;
            const endX = this.target.x + Math.cos(beam.angle) * beam.length;
            const endY = this.target.y + Math.sin(beam.angle) * beam.length;
            
            // Find closest enemy hit by this beam (no pierce)
            let closestEnemy = null;
            let closestDist = Infinity;
            
            for (const enemy of enemies) {
                // Skip the frozen target
                if (enemy === this.target) continue;
                if (enemy._dead) continue;
                
                // Line-circle intersection check
                const hit = this.lineCircleIntersection(
                    startX, startY, endX, endY,
                    enemy.x, enemy.y, enemy.radius
                );
                
                if (hit && hit.distance < closestDist) {
                    closestDist = hit.distance;
                    closestEnemy = enemy;
                }
            }
            
            if (closestEnemy) {
                hits.push(closestEnemy);
            }
        }
        
        return hits;
    }
    
    // Line segment to circle intersection - returns { distance } or null
    lineCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
        // Direction vector of the line
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Vector from line start to circle center
        const fx = x1 - cx;
        const fy = y1 - cy;
        
        // Quadratic coefficients
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - r * r;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null; // No intersection
        }
        
        const sqrtDisc = Math.sqrt(discriminant);
        
        // Check both intersection points
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        
        // Check if intersection is within line segment (0 <= t <= 1)
        let t = null;
        if (t1 >= 0 && t1 <= 1) {
            t = t1;
        } else if (t2 >= 0 && t2 <= 1) {
            t = t2;
        }
        
        if (t === null) {
            return null;
        }
        
        // Calculate intersection point and distance from start
        const hitX = x1 + t * dx;
        const hitY = y1 + t * dy;
        const dist = Math.sqrt((hitX - x1) * (hitX - x1) + (hitY - y1) * (hitY - y1));
        
        return { distance: dist };
    }

    render(ctx, camera) {
        if (!this.target) return;
        
        const sourceScreen = camera.worldToScreen(this.source.x, this.source.y);
        const targetScreen = camera.worldToScreen(this.target.x, this.target.y);
        const scale = camera.zoom;
        const intensity = this.getBeamIntensity();
        
        ctx.save();
        
        // === MAIN BEAM ===
        this.renderMainBeam(ctx, sourceScreen, targetScreen, scale, intensity);
        
        // === BEAM PARTICLES ===
        this.renderBeamParticles(ctx, camera, scale, intensity);
        
        // === ICE ENCASEMENT (after freeze) ===
        if (this.targetFrozen) {
            this.renderIceEncasement(ctx, targetScreen, scale);
        }
        
        // === REFRACTED BEAMS (after freeze) ===
        if (this.targetFrozen && this.refractedBeams.length > 0) {
            this.renderRefractedBeams(ctx, targetScreen, scale);
        }
        
        ctx.restore();
    }
    
    renderMainBeam(ctx, sourceScreen, targetScreen, scale, intensity) {
        const beamWidth = (this.baseWidth + (this.maxWidth - this.baseWidth) * intensity) * scale;
        
        // Calculate beam angle for gradient orientation
        const angle = Math.atan2(targetScreen.y - sourceScreen.y, targetScreen.x - sourceScreen.x);
        
        // Outer glow
        ctx.save();
        ctx.globalAlpha = intensity * 0.4;
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = beamWidth * 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sourceScreen.x, sourceScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();
        ctx.restore();
        
        // Middle glow layer
        ctx.save();
        ctx.globalAlpha = intensity * 0.6;
        ctx.strokeStyle = '#66bbff';
        ctx.lineWidth = beamWidth * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sourceScreen.x, sourceScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();
        ctx.restore();
        
        // Core beam - bright white-blue
        ctx.save();
        ctx.globalAlpha = intensity;
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = beamWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#88ddff';
        ctx.shadowBlur = 15 * intensity * scale;
        ctx.beginPath();
        ctx.moveTo(sourceScreen.x, sourceScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();
        ctx.restore();
        
        // Inner white core
        ctx.save();
        ctx.globalAlpha = intensity * 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = beamWidth * 0.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sourceScreen.x, sourceScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();
        ctx.restore();
        
        // Sparkle effect at target point
        if (intensity > 0.5) {
            const sparkleSize = 8 * scale * intensity;
            const sparkleAlpha = 0.5 + 0.5 * Math.sin(this.age * 15);
            
            ctx.save();
            ctx.globalAlpha = sparkleAlpha;
            ctx.fillStyle = '#ffffff';
            
            // Draw 4-point star
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const starAngle = (Math.PI / 2) * i + this.age * 3;
                const outerX = targetScreen.x + Math.cos(starAngle) * sparkleSize;
                const outerY = targetScreen.y + Math.sin(starAngle) * sparkleSize;
                const innerAngle = starAngle + Math.PI / 4;
                const innerX = targetScreen.x + Math.cos(innerAngle) * sparkleSize * 0.3;
                const innerY = targetScreen.y + Math.sin(innerAngle) * sparkleSize * 0.3;
                
                if (i === 0) {
                    ctx.moveTo(outerX, outerY);
                } else {
                    ctx.lineTo(outerX, outerY);
                }
                ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    
    renderBeamParticles(ctx, camera, scale, intensity) {
        this.beamParticles.forEach(p => {
            const pScreen = camera.worldToScreen(p.x, p.y);
            const alpha = (1 - p.age / p.life) * intensity * 0.7;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#aaeeff';
            ctx.shadowColor = '#66ccff';
            ctx.shadowBlur = 5 * scale;
            ctx.beginPath();
            ctx.arc(pScreen.x, pScreen.y, p.size * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    renderIceEncasement(ctx, targetScreen, scale) {
        const encaseProgress = Math.min(1, (this.age - this.freezeTime) / 0.5); // 0.5s to fully encase
        
        // Ice crystal shards radiating from enemy
        this.iceShards.forEach(shard => {
            const shardProgress = Math.min(1, Math.max(0, (encaseProgress - shard.offset) / (1 - shard.offset)));
            if (shardProgress <= 0) return;
            
            const currentLength = shard.length * shardProgress * scale;
            const currentWidth = shard.width * shardProgress * scale;
            
            ctx.save();
            ctx.translate(targetScreen.x, targetScreen.y);
            ctx.rotate(shard.angle);
            
            // Ice shard gradient - glassy transparent look
            const gradient = ctx.createLinearGradient(0, 0, currentLength, 0);
            gradient.addColorStop(0, `hsla(${shard.hue}, 70%, 80%, 0.9)`);
            gradient.addColorStop(0.5, `hsla(${shard.hue}, 80%, 90%, 0.6)`);
            gradient.addColorStop(1, `hsla(${shard.hue}, 90%, 95%, 0.2)`);
            
            // Draw crystalline shard shape
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(currentLength * 0.7, -currentWidth / 2);
            ctx.lineTo(currentLength, 0);
            ctx.lineTo(currentLength * 0.7, currentWidth / 2);
            ctx.closePath();
            ctx.fill();
            
            // Shard edge highlight
            ctx.strokeStyle = `hsla(${shard.hue}, 60%, 95%, 0.8)`;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
        });
        
        // Central ice sphere around enemy
        const sphereRadius = (this.target.radius + 10) * scale * encaseProgress;
        
        // Outer frost halo
        const haloGradient = ctx.createRadialGradient(
            targetScreen.x, targetScreen.y, sphereRadius * 0.5,
            targetScreen.x, targetScreen.y, sphereRadius * 1.3
        );
        haloGradient.addColorStop(0, 'rgba(200, 240, 255, 0.3)');
        haloGradient.addColorStop(0.7, 'rgba(150, 220, 255, 0.15)');
        haloGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        
        ctx.fillStyle = haloGradient;
        ctx.beginPath();
        ctx.arc(targetScreen.x, targetScreen.y, sphereRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ice shell
        const iceGradient = ctx.createRadialGradient(
            targetScreen.x - sphereRadius * 0.3, targetScreen.y - sphereRadius * 0.3, 0,
            targetScreen.x, targetScreen.y, sphereRadius
        );
        iceGradient.addColorStop(0, 'rgba(220, 250, 255, 0.7)');
        iceGradient.addColorStop(0.4, 'rgba(180, 230, 255, 0.4)');
        iceGradient.addColorStop(0.8, 'rgba(140, 210, 255, 0.25)');
        iceGradient.addColorStop(1, 'rgba(100, 180, 255, 0.15)');
        
        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.arc(targetScreen.x, targetScreen.y, sphereRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Crystalline edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(targetScreen.x, targetScreen.y, sphereRadius, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
    }
    
    renderRefractedBeams(ctx, targetScreen, scale) {
        this.refractedBeams.forEach(beam => {
            const beamAlpha = Math.min(1, beam.age / 0.3) * beam.alpha; // Fade in
            const beamLength = beam.length * scale;
            const beamWidth = beam.width * scale;
            
            // Calculate end point
            const endX = targetScreen.x + Math.cos(beam.angle) * beamLength;
            const endY = targetScreen.y + Math.sin(beam.angle) * beamLength;
            
            // Rainbow cycling hue
            const hue = (beam.hueOffset + this.age * 30) % 360;
            
            ctx.save();
            
            // Outer prismatic glow
            ctx.globalAlpha = beamAlpha * 0.3;
            ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 1)`;
            ctx.lineWidth = beamWidth * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(targetScreen.x, targetScreen.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Middle layer with slight hue shift
            ctx.globalAlpha = beamAlpha * 0.5;
            ctx.strokeStyle = `hsla(${(hue + 20) % 360}, 70%, 80%, 1)`;
            ctx.lineWidth = beamWidth * 2;
            ctx.beginPath();
            ctx.moveTo(targetScreen.x, targetScreen.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Core - bright white with color tint
            ctx.globalAlpha = beamAlpha * 0.8;
            ctx.strokeStyle = `hsla(${(hue + 40) % 360}, 50%, 90%, 1)`;
            ctx.lineWidth = beamWidth;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
            ctx.shadowBlur = 10 * scale;
            ctx.beginPath();
            ctx.moveTo(targetScreen.x, targetScreen.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Sparkle at end
            const sparklePhase = (this.age * 10 + beam.hueOffset) % (Math.PI * 2);
            const sparkleSize = (3 + Math.sin(sparklePhase) * 2) * scale;
            ctx.globalAlpha = beamAlpha * (0.5 + 0.5 * Math.sin(sparklePhase));
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(endX, endY, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
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

