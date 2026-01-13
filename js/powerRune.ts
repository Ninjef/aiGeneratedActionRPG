// Power Rune class - collectible items that grant/upgrade powers

import { distance } from './utils';
import { getPowerIcon } from './powers';
import type { Camera } from './types';

interface PowerIcon {
    color: string;
    glowColor: string;
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;
}

export class PowerRune {
    x: number;
    y: number;
    powerId: string;
    groupId: string | null;
    radius: number;
    collectRadius: number;
    lifetime: number;
    maxLifetime: number;
    pulsePhase: number;
    rotation: number;
    icon: PowerIcon;

    constructor(x: number, y: number, powerId: string, groupId: string | null = null) {
        this.x = x;
        this.y = y;
        this.powerId = powerId;
        this.groupId = groupId; // Links runes together - collecting one removes all in group
        
        this.radius = 22; // Increased from 18 for better visibility
        this.collectRadius = 35;
        this.lifetime = 6.0; // Seconds before disappearing
        this.maxLifetime = 6.0;
        
        // Visual
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;
        
        // Get icon config from powers.ts
        this.icon = getPowerIcon(powerId);
    }

    update(dt: number): boolean {
        // Update lifetime
        this.lifetime -= dt;
        
        // Update visuals
        this.pulsePhase += dt * 4;
        this.rotation += dt * 0.5;
        
        // Return false when expired
        return this.lifetime > 0;
    }

    checkCollection(playerX: number, playerY: number, playerRadius: number): boolean {
        const dist = distance(this.x, this.y, playerX, playerY);
        return dist < this.collectRadius + playerRadius;
    }

    render(ctx: CanvasRenderingContext2D, camera: Camera): void {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        
        // Calculate fade based on remaining lifetime
        const fadeStart = 2.0; // Start fading with 2 seconds left
        let alpha = 1.0;
        if (this.lifetime < fadeStart) {
            alpha = this.lifetime / fadeStart;
            // Blink effect when almost gone
            if (this.lifetime < 1.0) {
                alpha *= 0.5 + 0.5 * Math.sin(this.lifetime * 20);
            }
        }
        
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const size = this.radius * scale * pulse;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(screen.x, screen.y);
        
        // Outer glow
        const glowSize = size * 2.5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, this.icon.glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Rune background circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = this.icon.color;
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw power icon (larger, no text label)
        ctx.fillStyle = this.icon.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * scale;
        this.icon.render(ctx, 0, 0, size * 0.9);
        
        ctx.restore();
    }
}

// Re-export getPowerIcon for any code that was importing POWER_ICONS
export { getPowerIcon };

