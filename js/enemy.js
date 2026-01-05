// Enemy class and spawning system

import { randomRange, randomPositionInRing, distance, normalize } from './utils.js';

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

    update(dt) {
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
            // Normal movement toward target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dir = normalize(dx, dy);
            
            this.x += dir.x * this.speed * dt;
            this.y += dir.y * this.speed * dt;
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
        
        // Outer glow based on enemy type
        const glowSize = r * 1.4;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.8,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, this.color + '60');
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
        this.spawnInterval = 2.0;
        this.maxEnemies = 100;
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
        this.spawnInterval = Math.max(0.5, 2.0 - this.difficulty * 0.2);
        
        this.spawnTimer += dt;
        
        if (this.spawnTimer >= this.spawnInterval && enemies.length < this.maxEnemies) {
            this.spawnTimer = 0;
            
            // Determine spawn target (player or crystal)
            let spawnTarget = { x: playerX, y: playerY };
            
            // 40% chance to spawn near a crystal if any exist
            if (crystals.length > 0 && Math.random() < 0.4) {
                const crystal = crystals[Math.floor(Math.random() * crystals.length)];
                spawnTarget = { x: crystal.x, y: crystal.y };
            }
            
            // Get dynamic spawn distances based on camera zoom
            const spawnDist = this.getSpawnDistances(camera);
            
            // Spawn 1-3 enemies based on difficulty
            const spawnCount = Math.min(3, Math.ceil(this.difficulty));
            
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

