// Status Effect System
// Provides a reusable framework for temporary effects that modify gameplay

// Configuration for status effects - centralized for easy tuning
export const STATUS_EFFECT_CONFIG = {
    supercharge: {
        defaultDuration: 7.0,       // seconds
        defaultBonusLevels: 3       // power level bonus
    }
};

/**
 * Base StatusEffect class
 * Represents a temporary effect that can modify player/game state
 */
export class StatusEffect {
    /**
     * @param {string} type - Effect type identifier (e.g., 'supercharge', 'slow')
     * @param {string|null} category - Crystal category ('heat', 'cold', 'force') or null for global effects
     * @param {number} duration - Effect duration in seconds
     * @param {Object} config - Effect-specific configuration
     */
    constructor(type, category, duration, config = {}) {
        this.type = type;
        this.category = category;
        this.duration = duration;
        this.remaining = duration;
        this.config = config;
        
        // Visual/audio hooks (for future expansion)
        this.onApplyCallback = null;
        this.onExpireCallback = null;
    }

    /**
     * Update the effect timer
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.remaining -= dt;
    }

    /**
     * Check if the effect has expired
     * @returns {boolean}
     */
    isExpired() {
        return this.remaining <= 0;
    }

    /**
     * Get the progress of the effect (0 = just started, 1 = expired)
     * @returns {number}
     */
    getProgress() {
        return 1 - (this.remaining / this.duration);
    }

    /**
     * Get remaining time as a formatted string
     * @returns {string}
     */
    getRemainingFormatted() {
        return this.remaining.toFixed(1) + 's';
    }
}

/**
 * StatusEffectManager
 * Manages all active status effects for a game entity (typically the player)
 */
export class StatusEffectManager {
    constructor() {
        this.effects = [];
    }

    /**
     * Add a new status effect
     * If an effect of the same type and category exists, refresh its duration
     * @param {StatusEffect} effect - The effect to add
     */
    addEffect(effect) {
        // Check for existing effect of same type and category
        const existing = this.effects.find(
            e => e.type === effect.type && e.category === effect.category
        );

        if (existing) {
            // Refresh duration (take the longer of the two)
            existing.remaining = Math.max(existing.remaining, effect.duration);
            // Update config if provided (allows stacking behavior changes)
            if (effect.config) {
                existing.config = { ...existing.config, ...effect.config };
            }
        } else {
            // Add new effect
            this.effects.push(effect);
            if (effect.onApplyCallback) {
                effect.onApplyCallback();
            }
        }
    }

    /**
     * Update all effects, removing expired ones
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(dt);
            
            if (effect.isExpired()) {
                if (effect.onExpireCallback) {
                    effect.onExpireCallback();
                }
                this.effects.splice(i, 1);
            }
        }
    }

    /**
     * Get total bonus power levels for a specific category
     * @param {string} category - Crystal category ('heat', 'cold', 'force')
     * @returns {number} Total bonus levels from all matching effects
     */
    getBonusLevels(category) {
        let bonus = 0;
        for (const effect of this.effects) {
            if (effect.type === 'supercharge' && effect.category === category) {
                bonus += effect.config.bonusLevels || 0;
            }
        }
        return bonus;
    }

    /**
     * Check if a specific effect type is active
     * @param {string} type - Effect type to check
     * @param {string|null} category - Optional category filter
     * @returns {boolean}
     */
    hasEffect(type, category = null) {
        return this.effects.some(e => 
            e.type === type && (category === null || e.category === category)
        );
    }

    /**
     * Get all active effects (for UI display)
     * @returns {StatusEffect[]}
     */
    getActiveEffects() {
        return [...this.effects];
    }

    /**
     * Get effects filtered by type
     * @param {string} type - Effect type to filter
     * @returns {StatusEffect[]}
     */
    getEffectsByType(type) {
        return this.effects.filter(e => e.type === type);
    }

    /**
     * Remove all effects of a specific type
     * @param {string} type - Effect type to remove
     */
    removeEffectsByType(type) {
        this.effects = this.effects.filter(e => e.type !== type);
    }

    /**
     * Clear all active effects
     */
    clearAll() {
        this.effects = [];
    }
}

/**
 * Factory function to create a supercharge effect
 * @param {string} category - Crystal category ('heat', 'cold', 'force')
 * @param {number} duration - Optional custom duration
 * @param {number} bonusLevels - Optional custom bonus levels
 * @returns {StatusEffect}
 */
export function createSuperchargeEffect(category, duration = null, bonusLevels = null) {
    const config = STATUS_EFFECT_CONFIG.supercharge;
    return new StatusEffect(
        'supercharge',
        category,
        duration || config.defaultDuration,
        {
            bonusLevels: bonusLevels || config.defaultBonusLevels
        }
    );
}

