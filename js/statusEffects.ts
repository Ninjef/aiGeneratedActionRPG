// Status Effect System
// Provides a reusable framework for temporary effects that modify gameplay

import type { CrystalType } from './types';

// Configuration for status effects - centralized for easy tuning
export const STATUS_EFFECT_CONFIG = {
    supercharge: {
        defaultDuration: 7.0,       // seconds
        defaultBonusLevels: 3       // power level bonus
    }
};

interface StatusEffectConfig {
    bonusLevels?: number;
    [key: string]: any;
}

/**
 * Base StatusEffect class
 * Represents a temporary effect that can modify player/game state
 */
export class StatusEffect {
    type: string;
    category: CrystalType | null;
    duration: number;
    remaining: number;
    config: StatusEffectConfig;
    onApplyCallback: (() => void) | null;
    onExpireCallback: (() => void) | null;

    /**
     * @param type - Effect type identifier (e.g., 'supercharge', 'slow')
     * @param category - Crystal category ('heat', 'cold', 'force') or null for global effects
     * @param duration - Effect duration in seconds
     * @param config - Effect-specific configuration
     */
    constructor(type: string, category: CrystalType | null, duration: number, config: StatusEffectConfig = {}) {
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
     * @param dt - Delta time in seconds
     */
    update(dt: number): void {
        this.remaining -= dt;
    }

    /**
     * Check if the effect has expired
     */
    isExpired(): boolean {
        return this.remaining <= 0;
    }

    /**
     * Get the progress of the effect (0 = just started, 1 = expired)
     */
    getProgress(): number {
        return 1 - (this.remaining / this.duration);
    }

    /**
     * Get remaining time as a formatted string
     */
    getRemainingFormatted(): string {
        return this.remaining.toFixed(1) + 's';
    }
}

/**
 * StatusEffectManager
 * Manages all active status effects for a game entity (typically the player)
 */
export class StatusEffectManager {
    effects: StatusEffect[];

    constructor() {
        this.effects = [];
    }

    /**
     * Add a new status effect
     * If an effect of the same type and category exists, refresh its duration
     * @param effect - The effect to add
     */
    addEffect(effect: StatusEffect): void {
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
     * @param dt - Delta time in seconds
     */
    update(dt: number): void {
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
     * @param category - Crystal category ('heat', 'cold', 'force')
     * @returns Total bonus levels from all matching effects
     */
    getBonusLevels(category: CrystalType): number {
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
     * @param type - Effect type to check
     * @param category - Optional category filter
     */
    hasEffect(type: string, category: CrystalType | null = null): boolean {
        return this.effects.some(e => 
            e.type === type && (category === null || e.category === category)
        );
    }

    /**
     * Get all active effects (for UI display)
     */
    getActiveEffects(): StatusEffect[] {
        return [...this.effects];
    }

    /**
     * Get effects filtered by type
     * @param type - Effect type to filter
     */
    getEffectsByType(type: string): StatusEffect[] {
        return this.effects.filter(e => e.type === type);
    }

    /**
     * Remove all effects of a specific type
     * @param type - Effect type to remove
     */
    removeEffectsByType(type: string): void {
        this.effects = this.effects.filter(e => e.type !== type);
    }

    /**
     * Clear all active effects
     */
    clearAll(): void {
        this.effects = [];
    }
}

/**
 * Factory function to create a supercharge effect
 * @param category - Crystal category ('heat', 'cold', 'force')
 * @param duration - Optional custom duration
 * @param bonusLevels - Optional custom bonus levels
 */
export function createSuperchargeEffect(
    category: CrystalType, 
    duration: number | null = null, 
    bonusLevels: number | null = null
): StatusEffect {
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

