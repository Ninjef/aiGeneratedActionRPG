// Floating text effects that appear when power runes are collected

export class FloatingText {
    constructor(x, y, powerName, level, runesProgress, runesNeeded) {
        this.x = x;
        this.y = y;
        this.startY = y;
        
        // Text content
        this.powerName = powerName;
        this.level = level;
        this.runesProgress = runesProgress;
        this.runesNeeded = runesNeeded;
        
        // Animation properties
        this.lifetime = 2.0; // Duration in seconds
        this.maxLifetime = 2.0;
        this.floatSpeed = 60; // Pixels per second upward
        this.scalePhase = 0; // For scale animation
        
        // Color based on rarity/level
        this.color = '#FFD700'; // Gold color
        this.outlineColor = '#FF6B35'; // Orange outline
    }
    
    update(dt) {
        // Float upward
        this.y -= this.floatSpeed * dt;
        
        // Update lifetime
        this.lifetime -= dt;
        
        // Update scale animation
        this.scalePhase += dt * 3;
        
        return this.lifetime > 0;
    }
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        
        // Calculate fade based on lifetime
        const fadeStart = 0.5;
        let alpha = 1.0;
        if (this.lifetime < fadeStart) {
            alpha = this.lifetime / fadeStart;
        }
        // Also fade in at start
        const fadeInDuration = 0.2;
        if (this.maxLifetime - this.lifetime < fadeInDuration) {
            alpha = (this.maxLifetime - this.lifetime) / fadeInDuration;
        }
        
        // Bouncy scale animation
        const scaleBoost = 1.0 + Math.max(0, Math.sin(this.scalePhase * 2) * 0.3 * (this.lifetime / this.maxLifetime));
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(screen.x, screen.y);
        ctx.scale(scaleBoost, scaleBoost);
        
        // Draw power name (larger text)
        ctx.font = `bold ${Math.floor(24 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Outline
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 4 * scale;
        ctx.strokeText(this.powerName, 0, 0);
        
        // Fill
        ctx.fillStyle = this.color;
        ctx.fillText(this.powerName, 0, 0);
        
        // Draw progress below (smaller text)
        const progressText = `Lv.${this.level} [${this.runesProgress}/${this.runesNeeded}]`;
        ctx.font = `${Math.floor(16 * scale)}px Arial`;
        
        // Outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3 * scale;
        ctx.strokeText(progressText, 0, 28 * scale);
        
        // Fill
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(progressText, 0, 28 * scale);
        
        ctx.restore();
    }
}

