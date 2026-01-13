// Fighter class - Aggressive green enemies that prioritize towers, then chase player

import { BaseEnemy } from './BaseEnemy';
import { ENEMY_TYPES } from './EnemyTypes';
import { distance, normalize, angle } from '../utils';
import { spriteCache, simplifiedRendering } from '../spriteCache';
import type { Camera, FireTrailInfo } from '../types';

interface SpawnBlock {
    x: number;
    y: number;
    radius: number;
    aggroRadius: number;
}

interface FighterContext {
    spawnBlocks?: SpawnBlock[];
}

export class Fighter extends BaseEnemy {
    aggroRadius: number;
    facingAngle: number;
    targetTower: SpawnBlock | null;
    wanderAngle: number;
    wanderTimer: number;
    wanderChangeInterval: number;

    constructor(x: number, y: number) {
        const config = ENEMY_TYPES.fighter;
        super(x, y, config);
        
        this.aggroRadius = config.aggroRadius!;
        
        // Direction tracking for visuals
        this.facingAngle = Math.random() * Math.PI * 2;
        
        // Target tracking
        this.targetTower = null;
        
        // Wandering AI state (when nothing in range)
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
    }
    
    update(dt: number, playerX: number, playerY: number, context: FighterContext = {}): FireTrailInfo | null {
        const spawnBlocks = context.spawnBlocks || [];
        
        // Update status effects and timers
        this.updateStatusEffects(dt);
        
        // Apply knockback (even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // Handle burning panic - moves fast in random directions with flame trail
        if (this.isInBurningPanic()) {
            const trailInfo = this.handleBurningPanic(dt);
            this.facingAngle = this.burningPanicAngle;
            return trailInfo;
        }
        
        // If immobilized or permanently frozen, skip all movement
        if (!this.canMove()) {
            return null;
        }
        
        // Handle delirious movement
        if (this.isDelirious()) {
            const dir = this.handleDeliriousMovement(dt, playerX, playerY);
            if (dir) {
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                if (this.deliriousPhase === 'chase') {
                    this.facingAngle = angle(this.x, this.y, playerX, playerY);
                } else {
                    this.facingAngle = this.deliriousWanderAngle;
                }
            }
            return null;
        }
        
        // PRIORITY 1: Check for nearby spawn blocks (towers) - these take priority
        let nearestTower: SpawnBlock | null = null;
        let nearestTowerDist = Infinity;
        
        for (const block of spawnBlocks) {
            const dist = distance(this.x, this.y, block.x, block.y);
            if (dist < block.aggroRadius && dist < nearestTowerDist) {
                nearestTower = block;
                nearestTowerDist = dist;
            }
        }
        
        if (nearestTower) {
            // Move toward tower (highest priority)
            this.targetTower = nearestTower;
            const dx = nearestTower.x - this.x;
            const dy = nearestTower.y - this.y;
            const dir = normalize(dx, dy);
            
            this.x += dir.x * this.speed * dt;
            this.y += dir.y * this.speed * dt;
            
            // Update facing direction
            this.facingAngle = angle(this.x, this.y, nearestTower.x, nearestTower.y);
        } else {
            this.targetTower = null;
            
            // PRIORITY 2: Chase player if within aggro range
            const distToPlayer = distance(this.x, this.y, playerX, playerY);
            
            if (distToPlayer < this.aggroRadius) {
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const dir = normalize(dx, dy);
                
                this.x += dir.x * this.speed * dt;
                this.y += dir.y * this.speed * dt;
                
                // Update facing direction
                this.facingAngle = angle(this.x, this.y, playerX, playerY);
            } else {
                // PRIORITY 3: Wander randomly when nothing in range
                this.wanderTimer += dt;
                if (this.wanderTimer >= this.wanderChangeInterval) {
                    this.wanderTimer = 0;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                    this.wanderChangeInterval = 2.0 + Math.random() * 2.0;
                }
                
                const wanderSpeed = this.speed * 0.4;
                this.x += Math.cos(this.wanderAngle) * wanderSpeed * dt;
                this.y += Math.sin(this.wanderAngle) * wanderSpeed * dt;
                
                this.facingAngle = this.wanderAngle;
            }
        }
        
        return null;
    }
    
    render(ctx: CanvasRenderingContext2D, camera: Camera): void {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Render status effects (burning, slow, freeze)
        this.renderStatusEffects(ctx, screen, r, scale);
        
        // Use cached sprite if available and not hurt
        const sprite = spriteCache.getSprite('fighter');
        if (sprite && this.shouldUseSprite()) {
            const spriteScale = (r * 2) / spriteCache.baseSize;
            ctx.drawImage(
                sprite,
                screen.x - (spriteCache.baseSize * spriteScale) / 2,
                screen.y - (spriteCache.baseSize * spriteScale) / 2,
                spriteCache.baseSize * spriteScale,
                spriteCache.baseSize * spriteScale
            );
        } else {
            // Fallback/simplified rendering (or hurt state or burning)
            ctx.fillStyle = this.getDisplayColor();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
        }
        
        // Angry eyes pointing toward facing direction
        if (!simplifiedRendering) {
            const eyeOffset = r * 0.35;
            const eyeSpread = r * 0.28;
            const eyeSize = r * 0.18;
            
            const leftEyeX = screen.x + Math.cos(this.facingAngle) * eyeOffset - Math.sin(this.facingAngle) * eyeSpread;
            const leftEyeY = screen.y + Math.sin(this.facingAngle) * eyeOffset + Math.cos(this.facingAngle) * eyeSpread;
            const rightEyeX = screen.x + Math.cos(this.facingAngle) * eyeOffset + Math.sin(this.facingAngle) * eyeSpread;
            const rightEyeY = screen.y + Math.sin(this.facingAngle) * eyeOffset - Math.cos(this.facingAngle) * eyeSpread;
            
            // Angry eye color (red when hurt, dark when normal)
            ctx.fillStyle = this.hurtTime > 0 ? '#ff0000' : '#1a472a';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

