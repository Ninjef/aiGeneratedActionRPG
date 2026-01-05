// Enemy class and spawning system

import { randomRange, randomPositionInRing, distance, normalize, angle } from './utils.js';

// Configurable fusion threshold - how many enemies need to orbit a crystal to create a Champion
export const CHAMPION_FUSION_THRESHOLD = 5;

// Champion configuration based on crystal type
export const CHAMPION_CONFIG = {
    // Base stats (shared across all types)
    radius: 50,
    speed: 140, // Faster than all regular enemies (small: 180, medium: 120, large: 70)
    health: 350,
    damage: 30,
    xp: 200,
    
    // Type-specific configurations
    types: {
        heat: {
            color: '#ff6b35',
            glowColor: 'rgba(255, 107, 53, 0.6)',
            eyeColor: '#ffcc00',
            abilityName: 'Flame Burst',
            abilityCooldown: 1.5,
            abilityDamage: 15,
            projectileSpeed: 350,
            projectileCount: 3
        },
        cold: {
            color: '#4fc3f7',
            glowColor: 'rgba(79, 195, 247, 0.6)',
            eyeColor: '#aef4ff',
            abilityName: 'Frost Trail',
            abilityCooldown: 0.3, // Creates trail segments frequently
            abilityDamage: 5,
            trailRadius: 40,
            trailDuration: 30.0, // 10x longer trail persistence
            slowAmount: 0.4,
            slowDuration: 1.5,
            speedMultiplier: 1.5 // Cold champions move faster
        },
        force: {
            color: '#ba68c8',
            glowColor: 'rgba(186, 104, 200, 0.6)',
            eyeColor: '#e1bee7',
            abilityName: 'Force Beam',
            abilityCooldown: 2.0,
            abilityDamage: 25,
            beamSpeed: 700,
            beamPiercing: true,
            knockback: 200
        }
    }
};

export const ENEMY_TYPES = {
    small: {
        radius: 12,
        speed: 180,
        health: 20,
        damage: 5,
        color: '#8b0000',
        xp: 10
    },
    medium: {
        radius: 22,
        speed: 120,
        health: 50,
        damage: 10,
        color: '#cc0000',
        xp: 25
    },
    large: {
        radius: 35,
        speed: 70,
        health: 120,
        damage: 20,
        color: '#dc143c',
        xp: 50
    }
};

export class Enemy {
    constructor(x, y, type = 'medium') {
        const config = ENEMY_TYPES[type];
        
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
        
        // Target tracking
        this.targetX = x;
        this.targetY = y;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        // Visual
        this.hurtTime = 0;
        
        // Crystal orbit state
        this.orbitTarget = null; // Reference to crystal being orbited
        this.orbitAngle = Math.random() * Math.PI * 2; // Current angle around crystal
        this.orbitSpeed = 1.5 + Math.random() * 1.0; // Radians per second
        this.orbitRadius = 60 + Math.random() * 40; // Distance from crystal center
        
        // Wandering AI state (enemies wander randomly until player is close)
        // Create two behavior types: aggressive (60% chance) and passive (40% chance)
        const isAggressive = Math.random() < 0.6;
        this.awarenessRadius = isAggressive ? 600 : 250; // Aggressive: far sight, Passive: short sight
        this.isAggressive = isAggressive;
        this.isAwareOfPlayer = false;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2.0 + Math.random() * 2.0; // Change direction every 2-4 seconds
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    setOrbitTarget(crystal) {
        this.orbitTarget = crystal;
    }
    
    clearOrbitTarget() {
        this.orbitTarget = null;
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

    update(dt, playerX, playerY, playerAggroModifier = 1.0) {
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
        
        // Check if orbiting a crystal
        if (this.orbitTarget) {
            // Update orbit angle
            this.orbitAngle += this.orbitSpeed * dt;
            
            // Calculate target orbit position
            const orbitX = this.orbitTarget.x + Math.cos(this.orbitAngle) * this.orbitRadius;
            const orbitY = this.orbitTarget.y + Math.sin(this.orbitAngle) * this.orbitRadius;
            
            // Move toward orbit position
            const dx = orbitX - this.x;
            const dy = orbitY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const dir = normalize(dx, dy);
                // Move faster to catch up to orbit position
                const catchUpSpeed = this.speed * 1.5;
                this.x += dir.x * catchUpSpeed * dt;
                this.y += dir.y * catchUpSpeed * dt;
            }
            
            // Update target for eye tracking (look at crystal center)
            this.targetX = this.orbitTarget.x;
            this.targetY = this.orbitTarget.y;
        } else {
            // Check distance to player to determine awareness
            const distToPlayer = distance(this.x, this.y, playerX, playerY);
            const effectiveAwarenessRadius = this.awarenessRadius * playerAggroModifier;
            
            if (distToPlayer <= effectiveAwarenessRadius) {
                // Player is close - chase them!
                this.isAwareOfPlayer = true;
                this.targetX = playerX;
                this.targetY = playerY;
                
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const dir = normalize(dx, dy);
                
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
            } else {
                // Player is far - wander randomly
                this.isAwareOfPlayer = false;
                
                // Update wander timer and change direction periodically
                this.wanderTimer += dt;
                if (this.wanderTimer >= this.wanderChangeInterval) {
                    this.wanderTimer = 0;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                    this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
                }
                
                // Move in wander direction at reduced speed
                const wanderSpeed = this.speed * 0.5;
                this.x += Math.cos(this.wanderAngle) * wanderSpeed * dt;
                this.y += Math.sin(this.wanderAngle) * wanderSpeed * dt;
                
                // Update target for eye tracking (look in movement direction)
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
        
        // Outer glow based on enemy type and aggression
        // Aggressive enemies have brighter, larger glow
        const glowMultiplier = this.isAggressive ? 1.6 : 1.2;
        const glowSize = r * glowMultiplier;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.8,
            screen.x, screen.y, glowSize
        );
        const glowAlpha = this.isAggressive ? '80' : '40'; // Aggressive enemies glow brighter
        glowGradient.addColorStop(0, this.color + glowAlpha);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main body
        const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        
        // Inner shading
        const gradient = ctx.createRadialGradient(
            screen.x - r * 0.3, screen.y - r * 0.3, 0,
            screen.x, screen.y, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Angry eyes - calculate direction to target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const faceAngle = Math.atan2(dy, dx);
        
        // Eye positions (offset toward target slightly)
        const eyeOffset = r * 0.35;
        const eyeSpread = r * 0.3;
        const eyeSize = r * 0.2;
        
        const leftEyeX = screen.x + Math.cos(faceAngle) * eyeOffset - Math.sin(faceAngle) * eyeSpread;
        const leftEyeY = screen.y + Math.sin(faceAngle) * eyeOffset + Math.cos(faceAngle) * eyeSpread;
        const rightEyeX = screen.x + Math.cos(faceAngle) * eyeOffset + Math.sin(faceAngle) * eyeSpread;
        const rightEyeY = screen.y + Math.sin(faceAngle) * eyeOffset - Math.cos(faceAngle) * eyeSpread;
        
        // Draw eyes (glowing yellow/orange)
        ctx.fillStyle = this.hurtTime > 0 ? '#ff0000' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye glow
        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Health bar (only if damaged)
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx, screen, scale);
        }
    }

    renderHealthBar(ctx, screen, scale) {
        const barWidth = this.radius * 2 * scale;
        const barHeight = 4 * scale;
        const barY = screen.y - this.radius * scale - 8 * scale;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#e53935';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
}

export class EnemySpawner {
    constructor() {
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // Faster spawning (was 2.0)
        this.maxEnemies = 150; // More enemies (was 100)
        this.difficulty = 1;
        this.gameTime = 0;
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

    update(dt, playerX, playerY, enemies, crystals, camera) {
        this.gameTime += dt;
        
        // Increase difficulty over time
        this.difficulty = 1 + Math.floor(this.gameTime / 30) * 0.5;
        this.spawnInterval = Math.max(0.3, 1.5 - this.difficulty * 0.15); // Faster ramp-up
        
        this.spawnTimer += dt;
        
        if (this.spawnTimer >= this.spawnInterval && enemies.length < this.maxEnemies) {
            this.spawnTimer = 0;
            
            // Determine spawn target (player or crystal)
            let spawnTarget = { x: playerX, y: playerY };
            
            // 60% chance to spawn near a crystal if any exist (increased for faster champion fusion)
            if (crystals.length > 0 && Math.random() < 0.6) {
                const crystal = crystals[Math.floor(Math.random() * crystals.length)];
                spawnTarget = { x: crystal.x, y: crystal.y };
            }
            
            // Get dynamic spawn distances based on camera zoom
            const spawnDist = this.getSpawnDistances(camera);
            
            // Spawn 2-5 enemies based on difficulty (increased from 1-3)
            const spawnCount = Math.min(5, Math.ceil(this.difficulty) + 1);
            
            for (let i = 0; i < spawnCount; i++) {
                const pos = randomPositionInRing(
                    spawnTarget.x, 
                    spawnTarget.y, 
                    spawnDist.min, 
                    spawnDist.max
                );
                
                // Choose enemy type based on difficulty
                let type = 'small';
                const roll = Math.random();
                if (this.difficulty >= 3 && roll < 0.2) {
                    type = 'large';
                } else if (this.difficulty >= 2 && roll < 0.4) {
                    type = 'medium';
                }
                
                enemies.push(new Enemy(pos.x, pos.y, type));
            }
        }
    }
}

// Champion class - powerful enemy created from enemy fusion around crystals
export class Champion {
    constructor(x, y, crystalType) {
        this.x = x;
        this.y = y;
        this.crystalType = crystalType;
        this.isChampion = true; // Flag to identify champions
        
        // Base stats
        this.radius = CHAMPION_CONFIG.radius;
        this.baseSpeed = CHAMPION_CONFIG.speed;
        this.speed = CHAMPION_CONFIG.speed;
        this.maxHealth = CHAMPION_CONFIG.health;
        this.health = CHAMPION_CONFIG.health;
        this.damage = CHAMPION_CONFIG.damage;
        this.xp = CHAMPION_CONFIG.xp;
        
        // Type-specific configuration
        const typeConfig = CHAMPION_CONFIG.types[crystalType];
        this.color = typeConfig.color;
        this.glowColor = typeConfig.glowColor;
        this.eyeColor = typeConfig.eyeColor;
        this.abilityConfig = typeConfig;
        
        // Apply type-specific speed multiplier (e.g., cold champions are faster)
        if (typeConfig.speedMultiplier) {
            this.baseSpeed *= typeConfig.speedMultiplier;
            this.speed = this.baseSpeed;
        }
        
        // Target tracking
        this.targetX = x;
        this.targetY = y;
        
        // Slow effect
        this.slowAmount = 0;
        this.slowTime = 0;
        
        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        // Visual
        this.hurtTime = 0;
        this.pulsePhase = 0;
        this.crownRotation = 0;
        
        // Ability cooldown
        this.abilityCooldown = 0;
        
        // Track last position for frost trail
        this.lastX = x;
        this.lastY = y;
        this.distanceMoved = 0;
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
        this.hurtTime = 0.15;
        return this.health <= 0;
    }

    update(dt) {
        // Update visual effects
        this.pulsePhase += dt * 3;
        this.crownRotation += dt * 0.5;
        
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
        
        // Track movement for frost trail
        const dx = this.x - this.lastX;
        const dy = this.y - this.lastY;
        this.distanceMoved += Math.sqrt(dx * dx + dy * dy);
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Move toward target
        const tdx = this.targetX - this.x;
        const tdy = this.targetY - this.y;
        const dir = normalize(tdx, tdy);
        
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
        
        // Update hurt visual
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
        
        // Update ability cooldown
        if (this.abilityCooldown > 0) {
            this.abilityCooldown -= dt;
        }
        
        // Return ability info if ready to use
        return this.checkAbility();
    }

    checkAbility() {
        if (this.abilityCooldown > 0) {
            return null;
        }
        
        const config = this.abilityConfig;
        
        switch (this.crystalType) {
            case 'heat':
                // Flame Burst - shoot fireballs at player
                this.abilityCooldown = config.abilityCooldown;
                return {
                    type: 'flameBurst',
                    x: this.x,
                    y: this.y,
                    targetX: this.targetX,
                    targetY: this.targetY,
                    damage: config.abilityDamage,
                    speed: config.projectileSpeed,
                    count: config.projectileCount
                };
                
            case 'cold':
                // Frost Trail - leave freezing zones behind
                if (this.distanceMoved >= 30) {
                    this.distanceMoved = 0;
                    this.abilityCooldown = config.abilityCooldown;
                    return {
                        type: 'frostTrail',
                        x: this.x,
                        y: this.y,
                        radius: config.trailRadius,
                        duration: config.trailDuration,
                        damage: config.abilityDamage,
                        slowAmount: config.slowAmount,
                        slowDuration: config.slowDuration
                    };
                }
                return null;
                
            case 'force':
                // Force Beam - piercing beam toward player
                this.abilityCooldown = config.abilityCooldown;
                return {
                    type: 'forceBeam',
                    x: this.x,
                    y: this.y,
                    targetX: this.targetX,
                    targetY: this.targetY,
                    damage: config.abilityDamage,
                    speed: config.beamSpeed,
                    piercing: config.beamPiercing,
                    knockback: config.knockback
                };
        }
        
        return null;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
        
        ctx.save();
        
        // Large outer glow (crystal-colored aura)
        const glowSize = r * 2.0 * pulse;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.5,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, this.glowColor);
        glowGradient.addColorStop(0.5, this.glowColor.replace('0.6', '0.3'));
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 8 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Crown spikes (behind body)
        this.renderCrown(ctx, screen, r, scale);
        
        // Main body
        const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline (thicker for champions)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3 * scale;
        ctx.stroke();
        
        // Inner shading with crystal core
        const coreGradient = ctx.createRadialGradient(
            screen.x - r * 0.2, screen.y - r * 0.2, 0,
            screen.x, screen.y, r * pulse
        );
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner crystal symbol
        this.renderCrystalCore(ctx, screen, r * 0.4, scale);
        
        // Eyes (3 eyes for champion - more menacing)
        this.renderEyes(ctx, screen, r, scale);
        
        ctx.restore();
        
        // Health bar (always show for champions)
        this.renderHealthBar(ctx, screen, scale);
    }

    renderCrown(ctx, screen, r, scale) {
        const spikeCount = 8;
        const spikeLength = r * 0.6;
        const baseAngle = this.crownRotation;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        
        for (let i = 0; i < spikeCount; i++) {
            const spikeAngle = baseAngle + (i * Math.PI * 2 / spikeCount);
            const baseX = screen.x + Math.cos(spikeAngle) * r * 0.9;
            const baseY = screen.y + Math.sin(spikeAngle) * r * 0.9;
            const tipX = screen.x + Math.cos(spikeAngle) * (r + spikeLength);
            const tipY = screen.y + Math.sin(spikeAngle) * (r + spikeLength);
            
            // Diamond-shaped spike
            const perpAngle = spikeAngle + Math.PI / 2;
            const sideOffset = r * 0.15;
            
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(baseX + Math.cos(perpAngle) * sideOffset, baseY + Math.sin(perpAngle) * sideOffset);
            ctx.lineTo(screen.x + Math.cos(spikeAngle) * r * 0.7, screen.y + Math.sin(spikeAngle) * r * 0.7);
            ctx.lineTo(baseX - Math.cos(perpAngle) * sideOffset, baseY - Math.sin(perpAngle) * sideOffset);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    renderCrystalCore(ctx, screen, size, scale) {
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(this.pulsePhase * 0.5);
        
        // Inner diamond shape (like crystal)
        ctx.fillStyle = this.glowColor.replace('0.6', '0.8');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.3, 0);
        ctx.lineTo(0, size * 0.3);
        ctx.lineTo(-size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    renderEyes(ctx, screen, r, scale) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const faceAngle = Math.atan2(dy, dx);
        
        // Three eyes - one center, two on sides
        const eyeOffset = r * 0.4;
        const eyeSpread = r * 0.35;
        const eyeSize = r * 0.18;
        
        // Center eye (larger)
        const centerEyeX = screen.x + Math.cos(faceAngle) * eyeOffset;
        const centerEyeY = screen.y + Math.sin(faceAngle) * eyeOffset;
        
        // Side eyes
        const leftEyeX = screen.x + Math.cos(faceAngle) * eyeOffset * 0.7 - Math.sin(faceAngle) * eyeSpread;
        const leftEyeY = screen.y + Math.sin(faceAngle) * eyeOffset * 0.7 + Math.cos(faceAngle) * eyeSpread;
        const rightEyeX = screen.x + Math.cos(faceAngle) * eyeOffset * 0.7 + Math.sin(faceAngle) * eyeSpread;
        const rightEyeY = screen.y + Math.sin(faceAngle) * eyeOffset * 0.7 - Math.cos(faceAngle) * eyeSpread;
        
        const eyeGlowColor = this.hurtTime > 0 ? '#ff0000' : this.eyeColor;
        const eyeBaseColor = this.hurtTime > 0 ? '#ff0000' : '#000000';
        
        // Draw eye glows
        ctx.fillStyle = eyeGlowColor + '80';
        ctx.beginPath();
        ctx.arc(centerEyeX, centerEyeY, eyeSize * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye pupils
        ctx.fillStyle = eyeBaseColor;
        ctx.beginPath();
        ctx.arc(centerEyeX, centerEyeY, eyeSize * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize * 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye cores (bright center)
        ctx.fillStyle = eyeGlowColor;
        ctx.beginPath();
        ctx.arc(centerEyeX, centerEyeY, eyeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    renderHealthBar(ctx, screen, scale) {
        const barWidth = this.radius * 2.5 * scale;
        const barHeight = 6 * scale;
        const barY = screen.y - this.radius * scale - 15 * scale;
        
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

