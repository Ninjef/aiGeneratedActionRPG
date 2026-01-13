// Passive Upgrades - permanent bonuses earned through XP leveling

import type { PassiveUpgradeDefinition, PassiveUpgrade, CrystalType } from './types';

export const PASSIVE_UPGRADES: Record<string, PassiveUpgradeDefinition> = {
    coldRateOfFire: {
        id: 'coldRateOfFire',
        name: 'Frost Efficiency',
        description: 'Cold powers fire 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    heatRateOfFire: {
        id: 'heatRateOfFire',
        name: 'Flame Intensity',
        description: 'Heat powers fire 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    forceRateOfFire: {
        id: 'forceRateOfFire',
        name: 'Force Mastery',
        description: 'Force powers fire 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    moveSpeed: {
        id: 'moveSpeed',
        name: 'Swift Stride',
        description: '+12% movement speed',
        rarity: 'common',
        stackable: true,
        effect: { speedBonus: 0.12 }
    },
    instantHeal: {
        id: 'instantHeal',
        name: 'Second Wind',
        description: 'Instantly heal 25 HP',
        rarity: 'common',
        stackable: false, // One-time effect, can pick again
        effect: { heal: 25 }
    },
    damageReduction: {
        id: 'damageReduction',
        name: 'Tough Hide',
        description: '+8% damage reduction',
        rarity: 'common',
        stackable: true,
        effect: { damageReduction: 0.08 }
    },
    reducedAggro: {
        id: 'reducedAggro',
        name: 'Low Profile',
        description: 'Enemies detect you 15% closer',
        rarity: 'common',
        stackable: true,
        effect: { aggroRadius: 0.15 }
    },
    heatProjectileSpeed: {
        id: 'heatProjectileSpeed',
        name: 'Blazing Velocity',
        description: 'Heat projectiles fly 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { projectileSpeed: 0.15 }
    },
    coldProjectileSpeed: {
        id: 'coldProjectileSpeed',
        name: 'Glacial Acceleration',
        description: 'Cold projectiles fly 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { projectileSpeed: 0.15 }
    },
    forceProjectileSpeed: {
        id: 'forceProjectileSpeed',
        name: 'Kinetic Amplification',
        description: 'Force projectiles fly 15% faster',
        rarity: 'common',
        stackable: true,
        effect: { projectileSpeed: 0.15 }
    }
};

// Generate random passive upgrade options for level up
export function generatePassiveUpgradeOptions(count: number = 3): PassiveUpgradeDefinition[] {
    const allUpgrades = Object.values(PASSIVE_UPGRADES);
    const options: PassiveUpgradeDefinition[] = [];
    const available = [...allUpgrades];
    
    while (options.length < count && available.length > 0) {
        const index = Math.floor(Math.random() * available.length);
        options.push({ ...available[index] });
        available.splice(index, 1);
    }
    
    return options;
}

// Calculate total cooldown reduction for a specific category
export function getCooldownReductionForCategory(passiveUpgrades: PassiveUpgrade[], category: CrystalType): number {
    let totalReduction = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.cooldownReduction) {
            totalReduction += def.effect.cooldownReduction * (upgrade.stacks || 1);
        }
    }
    
    // Cap at 75% reduction
    return Math.min(0.75, totalReduction);
}

// Calculate total speed bonus
export function getSpeedBonus(passiveUpgrades: PassiveUpgrade[]): number {
    let totalBonus = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.speedBonus) {
            totalBonus += def.effect.speedBonus * (upgrade.stacks || 1);
        }
    }
    
    return totalBonus;
}

// Calculate total damage reduction
export function getDamageReduction(passiveUpgrades: PassiveUpgrade[]): number {
    let totalReduction = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.damageReduction) {
            totalReduction += def.effect.damageReduction * (upgrade.stacks || 1);
        }
    }
    
    // Cap at 60% reduction
    return Math.min(0.60, totalReduction);
}

// Calculate aggro radius modifier (lower = harder for enemies to detect player)
export function getAggroRadiusModifier(passiveUpgrades: PassiveUpgrade[]): number {
    let totalReduction = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.aggroRadius) {
            totalReduction += def.effect.aggroRadius * (upgrade.stacks || 1);
        }
    }
    
    // Cap at 60% reduction (enemies can still see you at 40% of normal distance)
    return Math.max(0.40, 1 - Math.min(0.60, totalReduction));
}

// Calculate projectile speed bonus for a specific category
export function getProjectileSpeedBonus(passiveUpgrades: PassiveUpgrade[], category: CrystalType): number {
    let totalBonus = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.projectileSpeed) {
            totalBonus += def.effect.projectileSpeed * (upgrade.stacks || 1);
        }
    }
    
    return totalBonus;
}

