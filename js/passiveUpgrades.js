// Passive Upgrades - permanent bonuses earned through XP leveling

export const PASSIVE_UPGRADES = {
    coldRateOfFire: {
        id: 'coldRateOfFire',
        name: 'Frost Efficiency',
        description: 'Cold powers fire 15% faster',
        category: 'cold',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    heatRateOfFire: {
        id: 'heatRateOfFire',
        name: 'Flame Intensity',
        description: 'Heat powers fire 15% faster',
        category: 'heat',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    forceRateOfFire: {
        id: 'forceRateOfFire',
        name: 'Force Mastery',
        description: 'Force powers fire 15% faster',
        category: 'force',
        stackable: true,
        effect: { cooldownReduction: 0.15 }
    },
    moveSpeed: {
        id: 'moveSpeed',
        name: 'Swift Stride',
        description: '+12% movement speed',
        category: null,
        stackable: true,
        effect: { speedBonus: 0.12 }
    },
    instantHeal: {
        id: 'instantHeal',
        name: 'Second Wind',
        description: 'Instantly heal 25 HP',
        category: null,
        stackable: false, // One-time effect, can pick again
        effect: { heal: 25 }
    },
    damageReduction: {
        id: 'damageReduction',
        name: 'Tough Hide',
        description: '+8% damage reduction',
        category: null,
        stackable: true,
        effect: { damageReduction: 0.08 }
    },
    reducedAggro: {
        id: 'reducedAggro',
        name: 'Low Profile',
        description: 'Enemies detect you 15% closer',
        category: null,
        stackable: true,
        effect: { aggroReduction: 0.15 }
    }
};

// Generate random passive upgrade options for level up
export function generatePassiveUpgradeOptions(count = 3) {
    const allUpgrades = Object.values(PASSIVE_UPGRADES);
    const options = [];
    const available = [...allUpgrades];
    
    while (options.length < count && available.length > 0) {
        const index = Math.floor(Math.random() * available.length);
        options.push({ ...available[index] });
        available.splice(index, 1);
    }
    
    return options;
}

// Calculate total cooldown reduction for a specific category
export function getCooldownReductionForCategory(passiveUpgrades, category) {
    let totalReduction = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.category === category && def.effect.cooldownReduction) {
            totalReduction += def.effect.cooldownReduction * (upgrade.stacks || 1);
        }
    }
    
    // Cap at 75% reduction
    return Math.min(0.75, totalReduction);
}

// Calculate total speed bonus
export function getSpeedBonus(passiveUpgrades) {
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
export function getDamageReduction(passiveUpgrades) {
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
export function getAggroRadiusModifier(passiveUpgrades) {
    let totalReduction = 0;
    
    for (const upgrade of passiveUpgrades) {
        const def = PASSIVE_UPGRADES[upgrade.id];
        if (def && def.effect.aggroReduction) {
            totalReduction += def.effect.aggroReduction * (upgrade.stacks || 1);
        }
    }
    
    // Cap at 60% reduction (enemies can still see you at 40% of normal distance)
    return Math.max(0.40, 1 - Math.min(0.60, totalReduction));
}

