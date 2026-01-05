// Player class

import { StatusEffectManager } from './statusEffects.js';
import { 
    PASSIVE_UPGRADES, 
    getSpeedBonus, 
    getDamageReduction, 
    getAggroRadiusModifier 
} from './passiveUpgrades.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.baseSpeed = 250;
        this.speed = 250;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        
        // Movement
        this.vx = 0;
        this.vy = 0;
        
        // Crystal inventory
        this.crystals = {
            heat: 0,
            cold: 0,
            force: 0
        };
        
        // Active powers
        this.powers = [];
        
        // Defense modifier (from powers and passive upgrades)
        this.damageReduction = 0;
        this.baseDamageReduction = 0; // From active powers
        
        // XP and leveling system (separate from crystal-based powers)
        this.xp = 0;
        this.playerLevel = 1;
        this.passiveUpgrades = [];
        
        // Aggro radius modifier (from passive upgrades)
        this.aggroRadiusModifier = 1.0;
        
        // Invincibility frames after taking damage
        this.invincibleTime = 0;
        this.invincibleDuration = 0.5;
        
        // Visual effects
        this.flashTime = 0;
        this.rotationAngle = 0;
        
        // Status effects (supercharge, etc.)
        this.statusEffects = new StatusEffectManager();
    }

    get totalCrystals() {
        return this.crystals.heat + this.crystals.cold + this.crystals.force;
    }

    setMovement(dx, dy) {
        this.vx = dx;
        this.vy = dy;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            this.vx = dx / len;
            this.vy = dy / len;
        }
    }

    update(dt) {
        // Apply movement
        this.x += this.vx * this.speed * dt;
        this.y += this.vy * this.speed * dt;
        
        // Update invincibility
        if (this.invincibleTime > 0) {
            this.invincibleTime -= dt;
        }
        
        // Update flash effect
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        // Update rotation for visual effect
        this.rotationAngle += dt * 1.5;
        
        // Update status effects
        this.statusEffects.update(dt);
    }

    takeDamage(amount) {
        if (this.invincibleTime > 0) return false;
        
        const actualDamage = amount * (1 - this.damageReduction);
        this.health -= actualDamage;
        this.invincibleTime = this.invincibleDuration;
        this.flashTime = 0.1;
        
        return true;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    collectCrystal(type) {
        if (this.crystals[type] !== undefined) {
            this.crystals[type]++;
            return true;
        }
        return false;
    }

    resetCrystals() {
        this.crystals.heat = 0;
        this.crystals.cold = 0;
        this.crystals.force = 0;
    }

    addPower(power) {
        // Check if we already have this power
        const existing = this.powers.find(p => p.id === power.id);
        if (existing) {
            existing.level++;
            return existing;
        }
        
        power.level = 1;
        this.powers.push(power);
        return power;
    }

    // XP System methods
    getXpForNextLevel() {
        // Diminishing returns formula: 50 * (1.5 ^ level)
        // Level 1->2: 75 XP, Level 2->3: 112 XP, Level 3->4: 168 XP, etc.
        return Math.floor(50 * Math.pow(1.5, this.playerLevel));
    }

    addXp(amount) {
        this.xp += amount;
        
        // Check for level up
        const xpNeeded = this.getXpForNextLevel();
        if (this.xp >= xpNeeded) {
            this.xp -= xpNeeded;
            this.playerLevel++;
            return true; // Level up occurred
        }
        return false;
    }

    addPassiveUpgrade(upgradeId) {
        const def = PASSIVE_UPGRADES[upgradeId];
        if (!def) return false;

        // Handle instant effects (like healing)
        if (def.effect.heal) {
            this.heal(def.effect.heal);
        }

        // Check if we already have this upgrade
        const existing = this.passiveUpgrades.find(u => u.id === upgradeId);
        if (existing && def.stackable) {
            existing.stacks = (existing.stacks || 1) + 1;
        } else if (!existing) {
            this.passiveUpgrades.push({ id: upgradeId, stacks: 1 });
        }
        // Non-stackable upgrades that already exist just don't add again (but heal still applies)

        // Recalculate all bonuses
        this.recalculateBonuses();
        return true;
    }

    recalculateBonuses() {
        // Speed bonus from passive upgrades
        const speedBonus = getSpeedBonus(this.passiveUpgrades);
        this.speed = this.baseSpeed * (1 + speedBonus);

        // Damage reduction from passive upgrades (combined with active power reduction)
        const passiveDR = getDamageReduction(this.passiveUpgrades);
        this.damageReduction = Math.min(0.75, this.baseDamageReduction + passiveDR);

        // Aggro radius modifier
        this.aggroRadiusModifier = getAggroRadiusModifier(this.passiveUpgrades);
    }

    // Set base damage reduction (from active powers like Frozen Armor)
    setBaseDamageReduction(amount) {
        this.baseDamageReduction = amount;
        this.recalculateBonuses();
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        // Draw player circle
        ctx.save();
        
        // Flash effect when damaged
        if (this.flashTime > 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Invincibility visual
        if (this.invincibleTime > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        }
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
            screen.x, screen.y, r * 0.5,
            screen.x, screen.y, r * 1.5
        );
        gradient.addColorStop(0, 'rgba(79, 195, 247, 0.3)');
        gradient.addColorStop(1, 'rgba(79, 195, 247, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Rotating inner pattern - creates a subtle energy core effect
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(this.rotationAngle);
        
        // Inner rotating arcs
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 3; i++) {
            const arcAngle = (i * Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.55, arcAngle, arcAngle + Math.PI * 0.4);
            ctx.stroke();
        }
        
        // Counter-rotating smaller arcs
        ctx.rotate(-this.rotationAngle * 2);
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.4)';
        ctx.lineWidth = 1.5 * scale;
        for (let i = 0; i < 4; i++) {
            const arcAngle = (i * Math.PI / 2);
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.35, arcAngle, arcAngle + Math.PI * 0.3);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Center core glow
        const coreGradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r * 0.3
        );
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        coreGradient.addColorStop(0.5, 'rgba(79, 195, 247, 0.4)');
        coreGradient.addColorStop(1, 'rgba(79, 195, 247, 0)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight (shifted for 3D effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(screen.x - 5 * scale, screen.y - 5 * scale, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Health bar
        this.renderHealthBar(ctx, screen, scale);
    }

    renderHealthBar(ctx, screen, scale) {
        const barWidth = 50 * scale;
        const barHeight = 6 * scale;
        const barY = screen.y - this.radius * scale - 15 * scale;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#4caf50' : 
                           healthPercent > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillStyle = healthColor;
        ctx.fillRect(screen.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(screen.x - barWidth / 2, barY, barWidth, barHeight);
    }
}

