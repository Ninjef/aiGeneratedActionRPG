// Sprite cache for pre-rendered enemy sprites (avoids creating gradients every frame)
// Extracted from enemy.js during refactoring

import { ENEMY_TYPES } from './entities/EnemyTypes.js';

export class SpriteCache {
    constructor() {
        this.sprites = new Map();
        this.baseSize = 64; // Base sprite size in pixels
    }
    
    // Initialize all enemy sprites
    init() {
        this.createBuilderSprite();
        this.createFighterSprite();
        this.createFierySprite();
        this.createGravitationalSprite();
        this.createFastPurpleSprite();
    }
    
    createFighterSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 4;
        
        // Aggressive aura glow
        const glowGradient = ctx.createRadialGradient(
            center, center, r * 0.5,
            center, center, r * 1.6
        );
        glowGradient.addColorStop(0, 'rgba(46, 204, 113, 0.5)');
        glowGradient.addColorStop(0.6, 'rgba(46, 204, 113, 0.2)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (green)
        ctx.fillStyle = ENEMY_TYPES.fighter.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner highlight gradient
        const gradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(0.5, 'rgba(39, 174, 96, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fighter', canvas);
    }
    
    createBuilderSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 4;
        
        // Main body (grey)
        ctx.fillStyle = ENEMY_TYPES.builder.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner shading gradient
        const gradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('builder', canvas);
    }
    
    createFierySprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 4; // Smaller for fiery enemies
        
        // Flame glow
        const glowSize = r * 2.5;
        const glowGradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.fiery.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(center, center, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fiery', canvas);
    }
    
    createGravitationalSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 2 - 8;
        
        // Gravity aura
        const auraGradient = ctx.createRadialGradient(
            center, center, r,
            center, center, r * 1.8
        );
        auraGradient.addColorStop(0, 'rgba(65, 105, 225, 0.4)');
        auraGradient.addColorStop(1, 'rgba(65, 105, 225, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.gravitational.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glow
        const innerGradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        innerGradient.addColorStop(0, 'rgba(100, 149, 237, 0.5)');
        innerGradient.addColorStop(1, 'rgba(25, 25, 112, 0.3)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 50, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.stroke();
        
        this.sprites.set('gravitational', canvas);
    }
    
    createFastPurpleSprite() {
        const size = this.baseSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const r = size / 3;
        
        // Speed glow
        const glowGradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, r * 2
        );
        glowGradient.addColorStop(0, 'rgba(139, 0, 255, 0.6)');
        glowGradient.addColorStop(0.6, 'rgba(139, 0, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, r * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = ENEMY_TYPES.fastPurple.color;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        const innerGradient = ctx.createRadialGradient(
            center - r * 0.3, center - r * 0.3, 0,
            center, center, r
        );
        innerGradient.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
        innerGradient.addColorStop(1, 'rgba(75, 0, 130, 0.2)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.fill();
        
        this.sprites.set('fastPurple', canvas);
    }
    
    getSprite(type) {
        return this.sprites.get(type);
    }
}

// Global sprite cache instance
export const spriteCache = new SpriteCache();

// Global flag for simplified rendering (set by game when enemy count is high)
export let simplifiedRendering = false;
export function setSimplifiedRendering(value) {
    simplifiedRendering = value;
}

