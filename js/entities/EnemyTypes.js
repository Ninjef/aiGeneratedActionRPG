// Enemy type configurations
// Centralized location for all enemy type definitions

export const ENEMY_TYPES = {
    builder: {
        type: 'builder',
        radius: 15,
        speed: 100,
        health: 30,
        damage: 0,  // No contact damage
        color: '#808080',  // Grey
        xp: 5,
        fleeRadius: 200,  // Distance to flee from player
        burningPanicSpeed: 400,
        burningTrailInterval: 0.05
    },
    fighter: {
        type: 'fighter',
        radius: 14,
        speed: 140,
        health: 40,
        damage: 10,
        color: '#2ecc71',  // Green
        xp: 12,
        aggroRadius: 6000,  // Very far aggro distance
        burningPanicSpeed: 400,
        burningTrailInterval: 0.05
    },
    fiery: {
        type: 'fiery',
        radius: 8,
        speed: 300,  // Very fast
        health: 15,
        damage: 8,
        color: '#ff4500',  // Red-orange
        xp: 15,
        trailInterval: 0.07,  // Leave trail every 0.07s
        trailRadius: 15,
        trailDuration: 1.5,
        trailDamage: 6,  // ~6 dps
        burningPanicSpeed: 500,  // Even faster for fiery enemies
        burningTrailInterval: 0.05
    },
    gravitational: {
        type: 'gravitational',
        radius: 18,
        speed: 110,  // Slower
        health: 150,
        damage: 12,
        color: '#4169e1',  // Blue
        xp: 30,
        gravityRange: 100,  // Pull range
        gravityStrength: 150,  // Pull force
        burningPanicSpeed: 350,
        burningTrailInterval: 0.06
    },
    fastPurple: {
        type: 'fastPurple',
        radius: 10,
        speed: 200,
        health: 75,
        damage: 10,
        color: '#8b00ff',  // Purple
        xp: 20,
        burningPanicSpeed: 450,
        burningTrailInterval: 0.05
    }
};

/**
 * Get enemy config with optional scaling applied
 * @param {string} type - Enemy type name
 * @param {object} scaling - Optional scaling multipliers from tower level
 * @returns {object} - Enemy configuration with scaling applied
 */
export function getEnemyConfig(type, scaling = null) {
    const base = ENEMY_TYPES[type];
    if (!base) {
        throw new Error(`Unknown enemy type: ${type}`);
    }
    
    if (!scaling) {
        return { ...base };
    }
    
    // Apply scaling multipliers
    return {
        ...base,
        radius: base.radius * (scaling.radius || 1),
        speed: base.speed * (scaling.speed || 1),
        health: Math.floor(base.health * (scaling.health || 1)),
        damage: Math.floor(base.damage * (scaling.damage || 1)),
        xp: Math.floor(base.xp * (1 + ((scaling.level || 1) - 1) * 0.5)),
        towerLevel: scaling.level || 1
    };
}

/**
 * Mapping of crystal types to the enemy types they spawn
 */
export const CRYSTAL_ENEMY_MAPPING = {
    heat: {
        enemyType: 'fiery',
        count: 5
    },
    cold: {
        enemyType: 'gravitational',
        count: 3
    },
    force: {
        enemyType: 'fastPurple',
        count: 5
    }
};

