// Enemy class and spawning system

import { randomRange, randomPositionInRing, distance, normalize, angle } from './utils.js';


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
    fiery: {
        radius: 8,
        speed: 250,  // Very fast
        health: 15,
        damage: 8,
        color: '#ff4500',  // Red-orange
        xp: 15,
        trailInterval: 0.2,  // Leave trail every 0.2s
        trailRadius: 20,
        trailDuration: 9.0,  // 8-10 seconds
        trailDamage: 6  // ~6 dps
    },
    gravitational: {
        radius: 18,
        speed: 80,  // Slower
        health: 60,
        damage: 12,
        color: '#4169e1',  // Blue
        xp: 30,
        gravityRange: 100,  // Pull range
        gravityStrength: 150  // Pull force
    },
    fastPurple: {
        radius: 10,
        speed: 200,
        health: 25,
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

    update(dt, playerX, playerY, crystals) {
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
            let nearestDist = Infinity;
            
            for (const crystal of crystals) {
                const dist = distance(this.x, this.y, crystal.x, crystal.y);
                if (dist < crystal.aggroRadius && dist < nearestDist) {
                    nearestCrystal = crystal;
                    nearestDist = dist;
                }
            }
            
            if (nearestCrystal) {
                // Move toward crystal
                this.targetCrystal = nearestCrystal;
                const dx = nearestCrystal.x - this.x;
                const dy = nearestCrystal.y - this.y;
                const dir = normalize(dx, dy);
                
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                
                this.targetX = nearestCrystal.x;
                this.targetY = nearestCrystal.y;
            } else {
                // Wander randomly
                this.targetCrystal = null;
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
        
        // Main body (grey, non-threatening)
        const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        
        // Inner shading
        const gradient = ctx.createRadialGradient(
            screen.x - r * 0.3, screen.y - r * 0.3, 0,
            screen.x, screen.y, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple eyes - calculate direction to target
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
        
        // Draw eyes (simple grey)
        ctx.fillStyle = this.hurtTime > 0 ? '#ff0000' : '#404040';
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
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
        ctx.fillStyle = '#808080';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
}

// For backward compatibility, keep Enemy as an alias to Builder
export const Enemy = Builder;

// SpawnBlock class - destructible blocks that spawn specialized enemies
export class SpawnBlock {
    constructor(x, y, crystalType) {
        this.x = x;
        this.y = y;
        this.crystalType = crystalType;  // heat, cold, force
        this.health = 250;
        this.maxHealth = 250;
        this.radius = 30;
        this.xp = 50;
        
        // Spawn timer based on type
        this.spawnTimer = 0;
        this.spawnInterval = (crystalType === 'force') ? 8.0 : 5.0;
        
        // Visual
        this.pulsePhase = 0;
        this.hurtTime = 0;
        
        // Color based on crystal type
        const colors = {
            heat: '#ff6b35',
            cold: '#4fc3f7',
            force: '#ba68c8'
        };
        this.color = colors[crystalType];
        this.glowColor = this.color + '80';
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.15;
        return this.health <= 0;
    }
    
    update(dt) {
        this.pulsePhase += dt * 2;
        this.spawnTimer += dt;
        
        if (this.hurtTime > 0) {
            this.hurtTime -= dt;
        }
        
        // Return spawn info when ready
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            
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
                y: this.y
            };
        }
        
        return null;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        
        ctx.save();
        
        // Outer glow
        const glowSize = r * 1.8 * pulse;
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
        const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = baseColor;
        ctx.fillRect(screen.x - r, screen.y - r, r * 2, r * 2);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * scale;
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
    constructor(x, y) {
        const config = ENEMY_TYPES.fiery;
        
        this.x = x;
        this.y = y;
        this.type = 'fiery';
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
        
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
                damage: this.trailDamage
            };
        }
        
        return null;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Flame glow
        const glowSize = r * 2.5;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 3 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main body
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
        
        ctx.restore();
        
        // Health bar (only if damaged)
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx, screen, scale);
        }
    }
    
    renderHealthBar(ctx, screen, scale) {
        const barWidth = this.radius * 2 * scale;
        const barHeight = 3 * scale;
        const barY = screen.y - this.radius * scale - 6 * scale;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = this.color;
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
}

// GravitationalEnemy class - blue enemies that pull each other together
export class GravitationalEnemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.gravitational;
        
        this.x = x;
        this.y = y;
        this.type = 'gravitational';
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
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
        
        // Blue aura
        const glowSize = r * 2 * pulse;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.5,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(65, 105, 225, 0.6)');
        glowGradient.addColorStop(0.7, 'rgba(65, 105, 225, 0.2)');
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
        ctx.arc(screen.x, screen.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Darker outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        
        // Inner shading
        const innerGradient = ctx.createRadialGradient(
            screen.x - r * 0.3, screen.y - r * 0.3, 0,
            screen.x, screen.y, r * pulse
        );
        innerGradient.addColorStop(0, 'rgba(135, 206, 250, 0.8)');
        innerGradient.addColorStop(1, 'rgba(0, 0, 139, 0.4)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * pulse, 0, Math.PI * 2);
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
        ctx.fillStyle = this.color;
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
}

// FastPurpleEnemy class - fast purple enemies that chase the player
export class FastPurpleEnemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.fastPurple;
        
        this.x = x;
        this.y = y;
        this.type = 'fastPurple';
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.maxHealth = config.health;
        this.health = config.health;
        this.damage = config.damage;
        this.color = config.color;
        this.xp = config.xp;
        
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
        
        // Purple glow
        const glowSize = r * 1.8;
        const glowGradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.3,
            screen.x, screen.y, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(139, 0, 255, 0.7)');
        glowGradient.addColorStop(0.7, 'rgba(139, 0, 255, 0.3)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Speed lines (motion blur effect)
        ctx.strokeStyle = 'rgba(139, 0, 255, 0.5)';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 3; i++) {
            const offset = (i + 1) * 4 * scale;
            ctx.beginPath();
            ctx.moveTo(screen.x - offset, screen.y);
            ctx.lineTo(screen.x - offset - 5 * scale, screen.y);
            ctx.stroke();
        }
        
        // Slow effect visual
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main body
        const baseColor = this.hurtTime > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        
        ctx.restore();
        
        // Health bar (only if damaged)
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx, screen, scale);
        }
    }
    
    renderHealthBar(ctx, screen, scale) {
        const barWidth = this.radius * 2 * scale;
        const barHeight = 3 * scale;
        const barY = screen.y - this.radius * scale - 6 * scale;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = this.color;
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
            
            // Get dynamic spawn distances based on camera zoom
            const spawnDist = this.getSpawnDistances(camera);
            
            // Spawn 2-5 builders based on difficulty
            const spawnCount = Math.min(5, Math.ceil(this.difficulty) + 1);
            
            for (let i = 0; i < spawnCount; i++) {
                const pos = randomPositionInRing(
                    playerX, 
                    playerY, 
                    spawnDist.min, 
                    spawnDist.max
                );
                
                // Always spawn builders
                enemies.push(new Builder(pos.x, pos.y));
            }
        }
    }
}


