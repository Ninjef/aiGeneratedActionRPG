// Crystal class and spawning system

import { randomPositionInRing, randomChoice, distance } from './utils.js';

export const CRYSTAL_TYPES = {
    heat: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.4)',
        name: 'Heat'
    },
    cold: {
        color: '#4fc3f7',
        glowColor: 'rgba(79, 195, 247, 0.4)',
        name: 'Cold'
    },
    force: {
        color: '#ba68c8',
        glowColor: 'rgba(186, 104, 200, 0.4)',
        name: 'Force'
    }
};

export class Crystal {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 15;
        this.collectRadius = 30;
        this.aggroRadius = 200; // Attracts enemies
        
        const config = CRYSTAL_TYPES[type];
        this.color = config.color;
        this.glowColor = config.glowColor;
        
        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotationAngle = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.rotationAngle += dt * 2;
        this.pulsePhase += dt * 3;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * 3 * scale;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        
        ctx.save();
        ctx.translate(screen.x, screen.y + bobY);
        
        // Outer glow
        const glowSize = this.radius * 2 * pulse * scale;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Aggro range indicator (subtle)
        ctx.strokeStyle = this.glowColor.replace('0.4', '0.1');
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([5 * scale, 10 * scale]);
        ctx.beginPath();
        ctx.arc(0, 0, this.aggroRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Diamond shape
        ctx.rotate(this.rotationAngle);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        
        const size = this.radius * pulse * scale;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.3, 0);
        ctx.lineTo(0, size * 0.3);
        ctx.lineTo(-size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

export class CrystalSpawner {
    constructor() {
        this.spawnTimer = 0;
        this.spawnInterval = 5.0;
        this.maxCrystals = 15;
    }

    // Calculate spawn and despawn distances based on visible screen
    getDistances(camera) {
        const bounds = camera.getVisibleBounds();
        const visibleWidth = bounds.right - bounds.left;
        const visibleHeight = bounds.bottom - bounds.top;
        const halfDiagonal = Math.sqrt(visibleWidth * visibleWidth + visibleHeight * visibleHeight) / 2;
        return {
            minSpawn: halfDiagonal * 0.3,   // Spawn within visible area
            maxSpawn: halfDiagonal * 0.9,   // Up to the edge
            despawn: halfDiagonal * 1.5     // Despawn well beyond edge
        };
    }

    update(dt, playerX, playerY, crystals, camera) {
        this.spawnTimer += dt;
        
        // Get dynamic distances based on camera zoom
        const dist = this.getDistances(camera);
        
        // Spawn new crystals
        if (this.spawnTimer >= this.spawnInterval && crystals.length < this.maxCrystals) {
            this.spawnTimer = 0;
            
            const pos = randomPositionInRing(
                playerX, 
                playerY, 
                dist.minSpawn, 
                dist.maxSpawn
            );
            
            const type = randomChoice(['heat', 'cold', 'force']);
            crystals.push(new Crystal(pos.x, pos.y, type));
        }
        
        // Despawn crystals that are too far
        for (let i = crystals.length - 1; i >= 0; i--) {
            const crystalDist = distance(playerX, playerY, crystals[i].x, crystals[i].y);
            if (crystalDist > dist.despawn) {
                crystals.splice(i, 1);
            }
        }
    }
}

