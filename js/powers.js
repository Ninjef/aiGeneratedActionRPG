// Power definitions and management system

import { Projectile, AreaEffect, RingEffect, OrbitalShield } from './projectile.js';
import { randomRange, angle, normalize, randomChoice } from './utils.js';
import { findClosest } from './collision.js';
import { getCooldownReductionForCategory } from './passiveUpgrades.js';

// Power definitions
export const POWERS = {
    // HEAT POWERS
    fireballBarrage: {
        id: 'fireballBarrage',
        name: 'Fireball Barrage',
        description: 'Rapidly fires fireballs in random directions',
        category: 'heat',
        baseCooldown: 0.3,
        passive: false,
        levelScale: {
            cooldown: 0.9,    // 10% faster per level
            damage: 1.2,      // 20% more damage per level
            count: 1          // +1 projectile every 2 levels
        }
    },
    magmaPool: {
        id: 'magmaPool',
        name: 'Magma Pool',
        description: 'Drops a persistent pool of lava that burns enemies',
        category: 'heat',
        baseCooldown: 5.0,
        passive: false,
        levelScale: {
            cooldown: 0.85,
            damage: 1.3,
            radius: 1.15
        }
    },
    infernoRing: {
        id: 'infernoRing',
        name: 'Inferno Ring',
        description: 'Releases an expanding ring of fire around you',
        category: 'heat',
        baseCooldown: 3.0,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.25,
            radius: 1.2
        }
    },

    // COLD POWERS
    iceShards: {
        id: 'iceShards',
        name: 'Ice Shards',
        description: 'Fires piercing icicles that auto-target the nearest enemy',
        category: 'cold',
        baseCooldown: 0.5,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.15,
            count: 0.5
        }
    },
    frostNova: {
        id: 'frostNova',
        name: 'Frost Nova',
        description: 'Releases a freezing pulse that slows and damages enemies',
        category: 'cold',
        baseCooldown: 4.0,
        passive: false,
        levelScale: {
            cooldown: 0.85,
            damage: 1.2,
            radius: 1.15,
            slow: 1.1
        }
    },
    frozenArmor: {
        id: 'frozenArmor',
        name: 'Frozen Armor',
        description: 'Reduces damage taken and slows attackers',
        category: 'cold',
        baseCooldown: 0,
        passive: true,
        levelScale: {
            damageReduction: 1.0,  // Flat +10% per level
            slowAmount: 1.0
        }
    },

    // FORCE POWERS
    forceBolt: {
        id: 'forceBolt',
        name: 'Force Bolt',
        description: 'Fires a powerful bolt that knocks enemies back',
        category: 'force',
        baseCooldown: 0.4,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.2,
            knockback: 1.15
        }
    },
    gravityWell: {
        id: 'gravityWell',
        name: 'Gravity Well',
        description: 'Creates a black hole that pulls in and damages enemies',
        category: 'force',
        baseCooldown: 6.0,
        passive: false,
        levelScale: {
            cooldown: 0.85,
            damage: 1.3,
            radius: 1.1,
            pull: 1.2
        }
    },
    orbitalShields: {
        id: 'orbitalShields',
        name: 'Orbital Shields',
        description: 'Summon orbiting shields that block and damage enemies',
        category: 'force',
        baseCooldown: 0,
        passive: true,
        levelScale: {
            damage: 1.2,
            count: 1
        }
    }
};

export class PowerManager {
    constructor(player, projectiles, areaEffects, ringEffects) {
        this.player = player;
        this.projectiles = projectiles;
        this.areaEffects = areaEffects;
        this.ringEffects = ringEffects;
        this.cooldowns = {};
        this.orbitalShield = null;
        this.enemies = []; // Reference to enemies array for targeting
        this.champions = []; // Reference to champions array for targeting
    }

    setEnemies(enemies, champions = []) {
        this.enemies = enemies;
        this.champions = champions;
    }
    
    // Get all targetable enemies (regular enemies + champions)
    getAllTargets() {
        return [...this.enemies, ...this.champions];
    }

    /**
     * Get the effective level of a power, including status effect bonuses
     * @param {Object} power - The power object with id and level
     * @returns {number} Effective level (base + bonus)
     */
    getEffectiveLevel(power) {
        const def = POWERS[power.id];
        const category = def.category;
        const bonusLevels = this.player.statusEffects.getBonusLevels(category);
        return power.level + bonusLevels;
    }

    update(dt) {
        // Update cooldowns
        for (const powerId in this.cooldowns) {
            this.cooldowns[powerId] -= dt;
        }

        // Update orbital shields
        if (this.orbitalShield) {
            this.orbitalShield.update(dt);
        }

        // Process active powers
        for (const power of this.player.powers) {
            if (power.passive) {
                this.updatePassivePower(power);
            } else {
                this.updateActivePower(power, dt);
            }
        }
    }

    updatePassivePower(power) {
        const effectiveLevel = this.getEffectiveLevel(power);
        
        switch (power.id) {
            case 'frozenArmor':
                // Use setBaseDamageReduction so it combines with passive upgrades
                this.player.setBaseDamageReduction(Math.min(0.5, 0.1 * effectiveLevel));
                break;
            case 'orbitalShields':
                // Recalculate if shield count should change (including supercharge bonus)
                const targetCount = 2 + effectiveLevel;
                if (!this.orbitalShield || this.orbitalShield.count !== targetCount) {
                    this.orbitalShield = new OrbitalShield(
                        this.player,
                        targetCount,
                        130,
                        15 * Math.pow(1.2, effectiveLevel - 1)
                    );
                }
                break;
        }
    }

    updateActivePower(power, dt) {
        const def = POWERS[power.id];
        const effectiveLevel = this.getEffectiveLevel(power);
        
        // Calculate base cooldown from level
        let cooldown = def.baseCooldown * Math.pow(def.levelScale.cooldown || 1, effectiveLevel - 1);
        
        // Apply passive cooldown reduction from passive upgrades
        const passiveCooldownReduction = getCooldownReductionForCategory(
            this.player.passiveUpgrades, 
            def.category
        );
        cooldown *= (1 - passiveCooldownReduction);

        if (!this.cooldowns[power.id] || this.cooldowns[power.id] <= 0) {
            this.castPower(power);
            this.cooldowns[power.id] = cooldown;
        }
    }

    castPower(power) {
        const def = POWERS[power.id];
        // Use effective level for damage/effect calculations
        const level = this.getEffectiveLevel(power);

        switch (power.id) {
            case 'fireballBarrage':
                this.castFireballBarrage(level, def);
                break;
            case 'magmaPool':
                this.castMagmaPool(level, def);
                break;
            case 'infernoRing':
                this.castInfernoRing(level, def);
                break;
            case 'iceShards':
                this.castIceShards(level, def);
                break;
            case 'frostNova':
                this.castFrostNova(level, def);
                break;
            case 'forceBolt':
                this.castForceBolt(level, def);
                break;
            case 'gravityWell':
                this.castGravityWell(level, def);
                break;
        }
    }

    castFireballBarrage(level, def) {
        const damage = 15 * Math.pow(def.levelScale.damage, level - 1);
        const count = 1 + Math.floor(level / 2);

        for (let i = 0; i < count; i++) {
            const fireAngle = randomRange(0, Math.PI * 2);
            this.projectiles.push(new Projectile(
                this.player.x,
                this.player.y,
                fireAngle,
                400,
                damage,
                {
                    radius: 10,
                    color: '#ff6b35',
                    trailLength: 8,
                    lifetime: 3.5
                }
            ));
        }
    }

    castMagmaPool(level, def) {
        const damage = 10 * Math.pow(def.levelScale.damage, level - 1);
        const radius = 80 * Math.pow(def.levelScale.radius || 1, level - 1);

        this.areaEffects.push(new AreaEffect(
            this.player.x,
            this.player.y,
            radius,
            damage,
            4.0,
            {
                color: '#ff6b35',
                damageInterval: 0.5,
                type: 'magma'
            }
        ));
    }

    castInfernoRing(level, def) {
        const damage = 25 * Math.pow(def.levelScale.damage, level - 1);
        const radius = 200 * Math.pow(def.levelScale.radius || 1, level - 1);

        this.ringEffects.push(new RingEffect(
            this.player.x,
            this.player.y,
            radius,
            damage,
            1.0,
            {
                color: '#ff6b35',
                knockback: 50
            }
        ));
    }

    castIceShards(level, def) {
        const damage = 12 * Math.pow(def.levelScale.damage, level - 1);
        const count = 1 + Math.floor(level * (def.levelScale.count || 0.5));

        // Find nearest enemies (including champions)
        const allTargets = this.getAllTargets();
        const targets = allTargets
            .map(e => ({ enemy: e, dist: Math.hypot(e.x - this.player.x, e.y - this.player.y) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, count);

        for (let i = 0; i < count; i++) {
            let targetAngle;
            if (targets[i]) {
                targetAngle = angle(this.player.x, this.player.y, targets[i].enemy.x, targets[i].enemy.y);
            } else {
                targetAngle = randomRange(0, Math.PI * 2);
            }

            this.projectiles.push(new Projectile(
                this.player.x,
                this.player.y,
                targetAngle,
                500,
                damage,
                {
                    radius: 8,
                    color: '#4fc3f7',
                    trailLength: 6,
                    lifetime: 3.5,
                    piercing: true,
                    slowAmount: 0.3,
                    slowDuration: 1.0
                }
            ));
        }
    }

    castFrostNova(level, def) {
        const damage = 20 * Math.pow(def.levelScale.damage, level - 1);
        const radius = 150 * Math.pow(def.levelScale.radius || 1, level - 1);
        const slowAmount = 0.4 * Math.pow(def.levelScale.slow || 1, level - 1);

        this.areaEffects.push(new AreaEffect(
            this.player.x,
            this.player.y,
            radius,
            damage,
            2.0,
            {
                color: '#4fc3f7',
                damageInterval: 0.5,
                slowAmount: Math.min(0.8, slowAmount),
                slowDuration: 2.0,
                type: 'frost'
            }
        ));

        // Visual burst
        this.ringEffects.push(new RingEffect(
            this.player.x,
            this.player.y,
            radius,
            0,
            0.5,
            {
                color: '#4fc3f7',
                knockback: 0
            }
        ));
    }

    castForceBolt(level, def) {
        const damage = 18 * Math.pow(def.levelScale.damage, level - 1);
        const knockback = 150 * Math.pow(def.levelScale.knockback || 1, level - 1);

        // Find nearest enemy (including champions)
        const allTargets = this.getAllTargets();
        const nearest = findClosest(allTargets, this.player.x, this.player.y);
        let targetAngle;
        if (nearest) {
            targetAngle = angle(this.player.x, this.player.y, nearest.x, nearest.y);
        } else {
            targetAngle = randomRange(0, Math.PI * 2);
        }

        this.projectiles.push(new Projectile(
            this.player.x,
            this.player.y,
            targetAngle,
            600,
            damage,
            {
                radius: 12,
                color: '#ba68c8',
                trailLength: 10,
                lifetime: 3,
                knockback: knockback
            }
        ));
    }

    castGravityWell(level, def) {
        const damage = 8 * Math.pow(def.levelScale.damage, level - 1);
        const radius = 120 * Math.pow(def.levelScale.radius || 1, level - 1);
        const pullForce = 3 * Math.pow(def.levelScale.pull || 1, level - 1);

        // Spawn slightly in front of player or at random nearby position
        const spawnAngle = randomRange(0, Math.PI * 2);
        const spawnDist = 100;

        this.areaEffects.push(new AreaEffect(
            this.player.x + Math.cos(spawnAngle) * spawnDist,
            this.player.y + Math.sin(spawnAngle) * spawnDist,
            radius,
            damage,
            3.0,
            {
                color: '#ba68c8',
                damageInterval: 0.3,
                pullForce: pullForce,
                type: 'gravity'
            }
        ));
    }

    checkOrbitalShieldCollisions(enemies) {
        if (!this.orbitalShield) return [];
        
        const hitEnemies = [];
        for (const enemy of enemies) {
            if (this.orbitalShield.checkCollision(enemy)) {
                hitEnemies.push({ enemy, damage: this.orbitalShield.damage });
            }
        }
        return hitEnemies;
    }

    renderOrbitalShields(ctx, camera) {
        if (this.orbitalShield) {
            this.orbitalShield.render(ctx, camera);
        }
    }

    // Generate power options based on crystal weights
    static generatePowerOptions(crystals, existingPowers) {
        const total = crystals.heat + crystals.cold + crystals.force;
        if (total === 0) return [];

        const weights = {
            heat: crystals.heat / total,
            cold: crystals.cold / total,
            force: crystals.force / total
        };

        const powersByCategory = {
            heat: ['fireballBarrage', 'magmaPool', 'infernoRing'],
            cold: ['iceShards', 'frostNova', 'frozenArmor'],
            force: ['forceBolt', 'gravityWell', 'orbitalShields']
        };

        const options = [];
        const usedPowers = new Set();

        for (let i = 0; i < 3; i++) {
            // Weighted random category selection
            const roll = Math.random();
            let category;
            if (roll < weights.heat) {
                category = 'heat';
            } else if (roll < weights.heat + weights.cold) {
                category = 'cold';
            } else {
                category = 'force';
            }

            // Pick a power from this category
            const availablePowers = powersByCategory[category].filter(p => !usedPowers.has(p));
            if (availablePowers.length === 0) {
                // If all powers in category are used, pick from any category
                const allAvailable = Object.values(powersByCategory).flat().filter(p => !usedPowers.has(p));
                if (allAvailable.length === 0) break;
                const powerId = randomChoice(allAvailable);
                usedPowers.add(powerId);
                
                const existing = existingPowers.find(p => p.id === powerId);
                options.push({
                    ...POWERS[powerId],
                    currentLevel: existing ? existing.level : 0
                });
            } else {
                const powerId = randomChoice(availablePowers);
                usedPowers.add(powerId);
                
                const existing = existingPowers.find(p => p.id === powerId);
                options.push({
                    ...POWERS[powerId],
                    currentLevel: existing ? existing.level : 0
                });
            }
        }

        return options;
    }
}

