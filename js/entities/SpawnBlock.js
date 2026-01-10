// SpawnBlock class - Destructible blocks that spawn specialized enemies when fighters enter
// Note: SpawnBlock does NOT extend BaseEnemy because it's a stationary structure with different behavior

import { CRYSTAL_ENEMY_MAPPING } from './EnemyTypes.js';

export class SpawnBlock {
    constructor(x, y, crystalType) {
        this.x = x;
        this.y = y;
        this.type = 'spawnBlock';
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
        this.damage = 0;  // Spawn blocks don't deal contact damage
        
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
    
    // Status effect methods (spawn blocks are immune to most effects)
    applySlow(amount, duration) {
        // Spawn blocks are stationary structures, so they ignore slow effects
    }

    applyKnockback(dirX, dirY, force) {
        // Spawn blocks are stationary structures, so they ignore knockback
    }
    
    applyDelirious(duration) {
        // Spawn blocks can't be confused
    }
    
    applyImmobilize(duration) {
        // Spawn blocks are already stationary
    }
    
    applyPermanentFreeze() {
        // Spawn blocks can't be frozen
    }
    
    applyBurningPanic(duration) {
        // Spawn blocks can't panic
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
        const mapping = CRYSTAL_ENEMY_MAPPING[this.crystalType] || { enemyType: 'fiery', count: 3 };
        
        return {
            count: mapping.count,
            enemyType: mapping.enemyType,
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

