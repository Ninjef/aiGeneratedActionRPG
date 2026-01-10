// Power Rune class - collectible items that grant/upgrade powers

import { distance } from './utils.js';

// Icon rendering functions for each power
const POWER_ICONS = {
    // HEAT POWERS - Orange/Red theme
    crucible: {
        color: '#dc143c',  // Crimson red
        glowColor: 'rgba(220, 20, 60, 0.6)',
        render: (ctx, x, y, size) => {
            // Crucible - a fiery cauldron/vessel shape with heat waves
            
            // Outer vessel (bowl shape)
            ctx.beginPath();
            ctx.moveTo(x - size * 0.6, y - size * 0.1);
            ctx.quadraticCurveTo(x - size * 0.7, y + size * 0.6, x, y + size * 0.7);
            ctx.quadraticCurveTo(x + size * 0.7, y + size * 0.6, x + size * 0.6, y - size * 0.1);
            ctx.lineTo(x + size * 0.5, y - size * 0.2);
            ctx.quadraticCurveTo(x + size * 0.55, y + size * 0.45, x, y + size * 0.55);
            ctx.quadraticCurveTo(x - size * 0.55, y + size * 0.45, x - size * 0.5, y - size * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Inner molten glow
            const gradient = ctx.createRadialGradient(x, y + size * 0.2, 0, x, y + size * 0.2, size * 0.4);
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(0.5, '#ff3300');
            gradient.addColorStop(1, 'rgba(139, 0, 0, 0.5)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(x, y + size * 0.2, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Rising heat waves/flames
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 2;
            
            // Left flame
            ctx.beginPath();
            ctx.moveTo(x - size * 0.2, y);
            ctx.quadraticCurveTo(x - size * 0.35, y - size * 0.4, x - size * 0.15, y - size * 0.65);
            ctx.stroke();
            
            // Center flame (tallest)
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.1);
            ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.5, x - size * 0.05, y - size * 0.8);
            ctx.stroke();
            
            // Right flame
            ctx.beginPath();
            ctx.moveTo(x + size * 0.2, y);
            ctx.quadraticCurveTo(x + size * 0.35, y - size * 0.35, x + size * 0.18, y - size * 0.6);
            ctx.stroke();
        }
    },
    fireballBarrage: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.5)',
        render: (ctx, x, y, size) => {
            // Flame shape
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.8);
            ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.3, x + size * 0.3, y + size * 0.5);
            ctx.quadraticCurveTo(x, y + size * 0.2, x, y + size * 0.5);
            ctx.quadraticCurveTo(x, y + size * 0.2, x - size * 0.3, y + size * 0.5);
            ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.3, x, y - size * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    },
    magmaPool: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.5)',
        render: (ctx, x, y, size) => {
            // Bubbling pool - circle with bubbles
            ctx.beginPath();
            ctx.ellipse(x, y + size * 0.2, size * 0.7, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Bubbles
            ctx.beginPath();
            ctx.arc(x - size * 0.2, y - size * 0.1, size * 0.15, 0, Math.PI * 2);
            ctx.arc(x + size * 0.25, y, size * 0.12, 0, Math.PI * 2);
            ctx.arc(x, y - size * 0.3, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    infernoRing: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.5)',
        render: (ctx, x, y, size) => {
            // Expanding rings
            ctx.beginPath();
            ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // COLD POWERS - Blue/Cyan theme
    iceShards: {
        color: '#4fc3f7',
        glowColor: 'rgba(79, 195, 247, 0.5)',
        render: (ctx, x, y, size) => {
            // Crystal/spike pointing up
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.8);
            ctx.lineTo(x + size * 0.25, y + size * 0.1);
            ctx.lineTo(x + size * 0.15, y + size * 0.6);
            ctx.lineTo(x, y + size * 0.3);
            ctx.lineTo(x - size * 0.15, y + size * 0.6);
            ctx.lineTo(x - size * 0.25, y + size * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    },
    frostNova: {
        color: '#4fc3f7',
        glowColor: 'rgba(79, 195, 247, 0.5)',
        render: (ctx, x, y, size) => {
            // Snowflake - 6 lines with branches
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                // Main arm
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + cos * size * 0.7, y + sin * size * 0.7);
                ctx.stroke();
                // Branch
                const bx = x + cos * size * 0.4;
                const by = y + sin * size * 0.4;
                const branchAngle1 = angle + Math.PI / 4;
                const branchAngle2 = angle - Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(branchAngle1) * size * 0.2, by + Math.sin(branchAngle1) * size * 0.2);
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(branchAngle2) * size * 0.2, by + Math.sin(branchAngle2) * size * 0.2);
                ctx.stroke();
            }
        }
    },
    frozenArmor: {
        color: '#4fc3f7',
        glowColor: 'rgba(79, 195, 247, 0.5)',
        render: (ctx, x, y, size) => {
            // Shield shape with frost pattern
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.7);
            ctx.lineTo(x + size * 0.6, y - size * 0.3);
            ctx.lineTo(x + size * 0.5, y + size * 0.5);
            ctx.lineTo(x, y + size * 0.8);
            ctx.lineTo(x - size * 0.5, y + size * 0.5);
            ctx.lineTo(x - size * 0.6, y - size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Frost crystal in center
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.3);
            ctx.lineTo(x, y + size * 0.3);
            ctx.moveTo(x - size * 0.25, y);
            ctx.lineTo(x + size * 0.25, y);
            ctx.stroke();
        }
    },

    // FORCE POWERS - Purple theme
    forceBolt: {
        color: '#ba68c8',
        glowColor: 'rgba(186, 104, 200, 0.5)',
        render: (ctx, x, y, size) => {
            // Arrow/bolt pointing right
            ctx.beginPath();
            ctx.moveTo(x + size * 0.7, y);
            ctx.lineTo(x, y - size * 0.4);
            ctx.lineTo(x + size * 0.1, y - size * 0.15);
            ctx.lineTo(x - size * 0.5, y - size * 0.15);
            ctx.lineTo(x - size * 0.5, y + size * 0.15);
            ctx.lineTo(x + size * 0.1, y + size * 0.15);
            ctx.lineTo(x, y + size * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    },
    gravityWell: {
        color: '#ba68c8',
        glowColor: 'rgba(186, 104, 200, 0.5)',
        render: (ctx, x, y, size) => {
            // Spiral/vortex
            ctx.beginPath();
            for (let i = 0; i < 720; i += 10) {
                const angle = (i / 180) * Math.PI;
                const radius = size * 0.1 + (i / 720) * size * 0.6;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    orbitalShields: {
        color: '#ba68c8',
        glowColor: 'rgba(186, 104, 200, 0.5)',
        render: (ctx, x, y, size) => {
            // Orbiting dots around center
            ctx.beginPath();
            ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            // Orbit path
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            // Orbiting shields
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(
                    x + Math.cos(angle) * size * 0.5,
                    y + Math.sin(angle) * size * 0.5,
                    size * 0.12,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
};

export class PowerRune {
    constructor(x, y, powerId, groupId = null) {
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
        
        // Get icon config
        this.icon = POWER_ICONS[powerId];
        if (!this.icon) {
            // Fallback for unknown power
            this.icon = {
                color: '#ffffff',
                glowColor: 'rgba(255, 255, 255, 0.5)',
                render: (ctx, x, y, size) => {
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            };
        }
    }

    update(dt) {
        // Update lifetime
        this.lifetime -= dt;
        
        // Update visuals
        this.pulsePhase += dt * 4;
        this.rotation += dt * 0.5;
        
        // Return false when expired
        return this.lifetime > 0;
    }

    checkCollection(playerX, playerY, playerRadius) {
        const dist = distance(this.x, this.y, playerX, playerY);
        return dist < this.collectRadius + playerRadius;
    }

    render(ctx, camera) {
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

export { POWER_ICONS };

