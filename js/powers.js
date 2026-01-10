// Power definitions and management system - Data-driven architecture

import { Projectile, AreaEffect, RingEffect, OrbitalShield, CrucibleEffect, CryostasisBeam } from './projectile.js';
import { randomRange, angle, normalize, randomChoice } from './utils.js';
import { findClosest } from './collision.js';
import { getCooldownReductionForCategory, getProjectileSpeedBonus } from './passiveUpgrades.js';

// Power definitions with cast functions and icons integrated
export const POWERS = {
    // ==================== HEAT POWERS ====================
    crucible: {
        id: 'crucible',
        name: 'Crucible',
        description: 'Creates a smoldering area that glows with increasing heat',
        category: 'heat',
        baseCooldown: 8.0,
        passive: false,
        levelScale: {
            cooldown: 0.88,
            damage: 1.15,
            radius: 1.05
        },
        icon: {
            color: '#dc143c',
            glowColor: 'rgba(220, 20, 60, 0.6)',
            render: (ctx, x, y, size) => {
                // Crucible - a fiery cauldron/vessel shape with heat waves
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
                ctx.beginPath();
                ctx.moveTo(x - size * 0.2, y);
                ctx.quadraticCurveTo(x - size * 0.35, y - size * 0.4, x - size * 0.15, y - size * 0.65);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y - size * 0.1);
                ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.5, x - size * 0.05, y - size * 0.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + size * 0.2, y);
                ctx.quadraticCurveTo(x + size * 0.35, y - size * 0.35, x + size * 0.18, y - size * 0.6);
                ctx.stroke();
            }
        },
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const radius = 450 * Math.pow(def.levelScale.radius || 1, level - 1);
            const duration = 4.0;
            
            // Pick a random location within 750 radius of the player
            const spawnAngle = randomRange(0, Math.PI * 2);
            const spawnDist = randomRange(0, 750);
            const spawnX = powerManager.player.x + Math.cos(spawnAngle) * spawnDist;
            const spawnY = powerManager.player.y + Math.sin(spawnAngle) * spawnDist;
            
            const crucible = new CrucibleEffect(
                spawnX,
                spawnY,
                radius,
                duration,
                {
                    baseColor: '#8b0000',
                    peakColor: '#ff4500',
                    level: level
                }
            );
            
            powerManager.crucibleEffects.push(crucible);
        }
    },

    magmaPool: {
        id: 'magmaPool',
        name: 'Magma Pool',
        description: 'Drops a persistent pool of lava that burns enemies',
        category: 'heat',
        baseCooldown: 5.0,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.1,
            radius: 1.25
        },
        icon: {
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
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 10 * Math.pow(def.levelScale.damage, level - 1);
            const radius = 80 * Math.pow(def.levelScale.radius || 1, level - 1);

            powerManager.areaEffects.push(new AreaEffect(
                powerManager.player.x,
                powerManager.player.y,
                radius,
                damage,
                4.0,
                {
                    color: '#ff6b35',
                    damageInterval: 0.5,
                    type: 'magma'
                }
            ));
        }
    },

    infernoRing: {
        id: 'infernoRing',
        name: 'Inferno Ring',
        description: 'Releases an expanding ring of fire around you',
        category: 'heat',
        baseCooldown: 3.0,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.25,
            radius: 1.2
        },
        icon: {
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
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 25 * Math.pow(def.levelScale.damage, level - 1);
            const radius = 200 * Math.pow(def.levelScale.radius || 1, level - 1);

            powerManager.ringEffects.push(new RingEffect(
                powerManager.player.x,
                powerManager.player.y,
                radius,
                damage,
                1.0,
                {
                    color: '#ff6b35',
                    knockback: 50
                }
            ));
        }
    },

    // ==================== COLD POWERS ====================
    iceShards: {
        id: 'iceShards',
        name: 'Ice Shards',
        description: 'Fires piercing icicles that auto-target the nearest enemy',
        category: 'cold',
        baseCooldown: 0.5,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.15,
            count: 0.5
        },
        icon: {
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
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 12 * Math.pow(def.levelScale.damage, level - 1);
            const count = 1 + Math.floor(level * (def.levelScale.count || 0.5));
            const speedBonus = getProjectileSpeedBonus(powerManager.player.passiveUpgrades, 'cold');
            const speed = 500 * (1 + speedBonus);

            // Find nearest enemies (including champions)
            const allTargets = powerManager.getAllTargets();
            const targets = allTargets
                .map(e => ({ enemy: e, dist: Math.hypot(e.x - powerManager.player.x, e.y - powerManager.player.y) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, count);

            for (let i = 0; i < count; i++) {
                let targetAngle;
                if (targets[i]) {
                    targetAngle = angle(powerManager.player.x, powerManager.player.y, targets[i].enemy.x, targets[i].enemy.y);
                } else {
                    targetAngle = randomRange(0, Math.PI * 2);
                }

                powerManager.projectiles.push(new Projectile(
                    powerManager.player.x,
                    powerManager.player.y,
                    targetAngle,
                    speed,
                    damage,
                    {
                        radius: 8,
                        color: '#4fc3f7',
                        trailLength: 6,
                        lifetime: 3.5,
                        piercing: true,
                        slowAmount: 0.3,
                        slowDuration: 1.0
                    }
                ));
            }
        }
    },

    frostNova: {
        id: 'frostNova',
        name: 'Frost Nova',
        description: 'Releases a freezing pulse that slows and damages enemies',
        category: 'cold',
        baseCooldown: 4.0,
        passive: false,
        levelScale: {
            cooldown: 0.85,
            damage: 1.2,
            radius: 1.15,
            slow: 1.1
        },
        icon: {
            color: '#4fc3f7',
            glowColor: 'rgba(79, 195, 247, 0.5)',
            render: (ctx, x, y, size) => {
                // Snowflake - 6 lines with branches
                for (let i = 0; i < 6; i++) {
                    const ang = (i / 6) * Math.PI * 2;
                    const cos = Math.cos(ang);
                    const sin = Math.sin(ang);
                    // Main arm
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + cos * size * 0.7, y + sin * size * 0.7);
                    ctx.stroke();
                    // Branch
                    const bx = x + cos * size * 0.4;
                    const by = y + sin * size * 0.4;
                    const branchAngle1 = ang + Math.PI / 4;
                    const branchAngle2 = ang - Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + Math.cos(branchAngle1) * size * 0.2, by + Math.sin(branchAngle1) * size * 0.2);
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + Math.cos(branchAngle2) * size * 0.2, by + Math.sin(branchAngle2) * size * 0.2);
                    ctx.stroke();
                }
            }
        },
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 20 * Math.pow(def.levelScale.damage, level - 1);
            const radius = 150 * Math.pow(def.levelScale.radius || 1, level - 1);
            const slowAmount = 0.4 * Math.pow(def.levelScale.slow || 1, level - 1);

            powerManager.areaEffects.push(new AreaEffect(
                powerManager.player.x,
                powerManager.player.y,
                radius,
                damage,
                2.0,
                {
                    color: '#4fc3f7',
                    damageInterval: 0.5,
                    slowAmount: Math.min(0.8, slowAmount),
                    slowDuration: 2.0,
                    type: 'frost'
                }
            ));

            // Visual burst
            powerManager.ringEffects.push(new RingEffect(
                powerManager.player.x,
                powerManager.player.y,
                radius,
                0,
                0.5,
                {
                    color: '#4fc3f7',
                    knockback: 0
                }
            ));
        }
    },

    frozenArmor: {
        id: 'frozenArmor',
        name: 'Frozen Armor',
        description: 'Reduces damage taken and slows attackers',
        category: 'cold',
        baseCooldown: 0,
        passive: true,
        levelScale: {
            damageReduction: 1.0,
            slowAmount: 1.0
        },
        icon: {
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
        // Passive powers don't have cast functions - handled in updatePassivePower
        cast: null
    },

    cryostasis: {
        id: 'cryostasis',
        name: 'Cryostasis',
        description: 'Ice beam that freezes enemies in place',
        category: 'cold',
        baseCooldown: 5.0,
        passive: false,
        levelScale: {
            cooldown: 0.88,
            damage: 1.15
        },
        baseBeams: 1,
        baseRefractionBeams: 1,
        icon: {
            color: '#88ddff',
            glowColor: 'rgba(136, 221, 255, 0.6)',
            render: (ctx, x, y, size) => {
                // Ice beam with frozen target
                ctx.strokeStyle = '#aaeeff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x - size * 0.6, y + size * 0.4);
                ctx.lineTo(x + size * 0.3, y - size * 0.3);
                ctx.stroke();
                
                // Beam glow
                ctx.strokeStyle = 'rgba(136, 221, 255, 0.5)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(x - size * 0.6, y + size * 0.4);
                ctx.lineTo(x + size * 0.3, y - size * 0.3);
                ctx.stroke();
                
                // Frozen target - ice crystal/sphere at beam end
                const crystalX = x + size * 0.35;
                const crystalY = y - size * 0.35;
                
                const gradient = ctx.createRadialGradient(
                    crystalX - size * 0.1, crystalY - size * 0.1, 0,
                    crystalX, crystalY, size * 0.35
                );
                gradient.addColorStop(0, 'rgba(220, 250, 255, 0.9)');
                gradient.addColorStop(0.5, 'rgba(136, 221, 255, 0.7)');
                gradient.addColorStop(1, 'rgba(79, 195, 247, 0.4)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(crystalX, crystalY, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                // Ice shards radiating from frozen target
                ctx.strokeStyle = '#aaeeff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 5; i++) {
                    const shardAngle = (i / 5) * Math.PI * 2 + Math.PI / 10;
                    const shardLen = size * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(
                        crystalX + Math.cos(shardAngle) * size * 0.25,
                        crystalY + Math.sin(shardAngle) * size * 0.25
                    );
                    ctx.lineTo(
                        crystalX + Math.cos(shardAngle) * (size * 0.25 + shardLen),
                        crystalY + Math.sin(shardAngle) * (size * 0.25 + shardLen)
                    );
                    ctx.stroke();
                }
                
                // Rainbow refraction beams
                ctx.lineWidth = 1.5;
                const colors = ['#ff6b6b', '#ffd93d', '#6bcb77'];
                for (let i = 0; i < 3; i++) {
                    ctx.strokeStyle = colors[i];
                    const refractAngle = Math.PI * 0.1 + (i * Math.PI * 0.15);
                    ctx.beginPath();
                    ctx.moveTo(crystalX, crystalY);
                    ctx.lineTo(
                        crystalX + Math.cos(refractAngle) * size * 0.4,
                        crystalY + Math.sin(refractAngle) * size * 0.4
                    );
                    ctx.stroke();
                }
            }
        },
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            
            // Find nearest enemy to target
            const allTargets = powerManager.getAllTargets();
            const nearest = findClosest(allTargets, powerManager.player.x, powerManager.player.y);
            
            // Don't cast if no targets
            if (!nearest) {
                return;
            }
            
            // Make target invulnerable immediately (they're being used as a prism)
            if (typeof nearest.cryostasisInvulnerable !== 'undefined') {
                nearest.cryostasisInvulnerable = true;
            }
            
            // Calculate damage (scales with level)
            const damage = 35 * Math.pow(def.levelScale.damage || 1, level - 1);
            const duration = 4.0;
            
            const beam = new CryostasisBeam(
                powerManager.player,
                nearest,
                duration,
                {
                    level: level,
                    damage: damage
                }
            );
            
            powerManager.cryostasisBeams.push(beam);
        }
    },

    // ==================== FORCE POWERS ====================
    forceBolt: {
        id: 'forceBolt',
        name: 'Force Bolt',
        description: 'Fires a powerful bolt that knocks enemies back',
        category: 'force',
        baseCooldown: 1.5,
        passive: false,
        levelScale: {
            cooldown: 0.9,
            damage: 1.2,
            knockback: 1.15
        },
        icon: {
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
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 18 * Math.pow(def.levelScale.damage, level - 1);
            const knockback = 150 * Math.pow(def.levelScale.knockback || 1, level - 1);
            const speedBonus = getProjectileSpeedBonus(powerManager.player.passiveUpgrades, 'force');
            const speed = 600 * (1 + speedBonus);

            // Find nearest enemy (including champions)
            const allTargets = powerManager.getAllTargets();
            const nearest = findClosest(allTargets, powerManager.player.x, powerManager.player.y);
            let targetAngle;
            if (nearest) {
                targetAngle = angle(powerManager.player.x, powerManager.player.y, nearest.x, nearest.y);
            } else {
                targetAngle = randomRange(0, Math.PI * 2);
            }

            powerManager.projectiles.push(new Projectile(
                powerManager.player.x,
                powerManager.player.y,
                targetAngle,
                speed,
                damage,
                {
                    radius: 12,
                    color: '#ba68c8',
                    trailLength: 10,
                    lifetime: 3,
                    knockback: knockback
                }
            ));
        }
    },

    gravityWell: {
        id: 'gravityWell',
        name: 'Gravity Well',
        description: 'Creates a black hole that pulls in and damages enemies',
        category: 'force',
        baseCooldown: 6.0,
        passive: false,
        levelScale: {
            cooldown: 0.85,
            damage: 1.3,
            radius: 1.1,
            pull: 1.2
        },
        icon: {
            color: '#ba68c8',
            glowColor: 'rgba(186, 104, 200, 0.5)',
            render: (ctx, x, y, size) => {
                // Spiral/vortex
                ctx.beginPath();
                for (let i = 0; i < 720; i += 10) {
                    const ang = (i / 180) * Math.PI;
                    const radius = size * 0.1 + (i / 720) * size * 0.6;
                    const px = x + Math.cos(ang) * radius;
                    const py = y + Math.sin(ang) * radius;
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
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            const damage = 2 * Math.pow(def.levelScale.damage, level - 1);
            const radius = 120 * Math.pow(def.levelScale.radius || 1, level - 1);
            const pullForce = 3 * Math.pow(def.levelScale.pull || 1, level - 1);

            // Spawn at random nearby position
            const spawnAngle = randomRange(0, Math.PI * 2);
            const spawnDist = 100;

            powerManager.areaEffects.push(new AreaEffect(
                powerManager.player.x + Math.cos(spawnAngle) * spawnDist,
                powerManager.player.y + Math.sin(spawnAngle) * spawnDist,
                radius,
                damage,
                3.0,
                {
                    color: '#ba68c8',
                    damageInterval: 0.3,
                    pullForce: pullForce,
                    type: 'gravity'
                }
            ));
        }
    },

    orbitalShields: {
        id: 'orbitalShields',
        name: 'Orbital Shields',
        description: 'Summon orbiting shields that launch on enemy collision',
        category: 'force',
        baseCooldown: 0.8,
        passive: false,
        levelScale: {
            cooldown: 1.2,
            damage: 1.1,
            maxShields: 1
        },
        baseMaxShields: 4,
        icon: {
            color: '#ba68c8',
            glowColor: 'rgba(186, 104, 200, 0.5)',
            render: (ctx, x, y, size) => {
                // Center
                ctx.beginPath();
                ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
                ctx.fill();
                // Orbit path
                ctx.beginPath();
                ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                // Orbiting shields
                for (let i = 0; i < 3; i++) {
                    const ang = (i / 3) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(
                        x + Math.cos(ang) * size * 0.5,
                        y + Math.sin(ang) * size * 0.5,
                        size * 0.12,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        },
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            // Calculate max shields for this level
            const maxShields = def.baseMaxShields + (level - 1) * (def.levelScale.maxShields || 1);
            
            // Don't spawn if at max
            if (powerManager.orbitalShields.length >= maxShields) {
                return;
            }
            
            const damage = 22 * Math.pow(def.levelScale.damage, level - 1);
            
            // Spawn a single shield at the current spawn angle
            const orbitalShield = new OrbitalShield(
                powerManager.player,
                100, // Orbit radius
                damage,
                powerManager.projectiles,
                powerManager.nextShieldAngle
            );
            
            powerManager.orbitalShields.push(orbitalShield);
            
            // Increment spawn angle for next shield
            powerManager.nextShieldAngle += Math.PI * 0.7;
        }
    }
};

// Legacy icon for fireballBarrage (not currently in POWERS but kept for compatibility)
export const LEGACY_ICONS = {
    fireballBarrage: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.5)',
        render: (ctx, x, y, size) => {
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
    }
};

// Helper to get power icon (checks POWERS first, then LEGACY_ICONS)
export function getPowerIcon(powerId) {
    if (POWERS[powerId]?.icon) {
        return POWERS[powerId].icon;
    }
    if (LEGACY_ICONS[powerId]) {
        return LEGACY_ICONS[powerId];
    }
    // Fallback for unknown powers
    return {
        color: '#ffffff',
        glowColor: 'rgba(255, 255, 255, 0.5)',
        render: (ctx, x, y, size) => {
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    };
}

export class PowerManager {
    constructor(player, projectiles, areaEffects, ringEffects, crucibleEffects = [], cryostasisBeams = []) {
        this.player = player;
        this.projectiles = projectiles;
        this.areaEffects = areaEffects;
        this.ringEffects = ringEffects;
        this.crucibleEffects = crucibleEffects;
        this.cryostasisBeams = cryostasisBeams;
        this.cooldowns = {};
        this.orbitalShields = [];
        this.nextShieldAngle = 0;
        this.enemies = [];
        this.champions = [];
    }

    setEnemies(enemies, champions = []) {
        this.enemies = enemies;
        this.champions = champions;
    }
    
    getAllTargets() {
        return [...this.enemies, ...this.champions];
    }

    /**
     * Get the effective level of a power, including status effect bonuses
     */
    getEffectiveLevel(power) {
        const def = POWERS[power.id];
        const category = def.category;
        const bonusLevels = this.player.statusEffects.getBonusLevels(category);
        return power.level + bonusLevels;
    }

    update(dt) {
        // Update cooldowns
        for (const powerId in this.cooldowns) {
            this.cooldowns[powerId] -= dt;
        }

        // Update orbital shields (remove expired ones)
        for (let i = this.orbitalShields.length - 1; i >= 0; i--) {
            if (!this.orbitalShields[i].update(dt)) {
                this.orbitalShields.splice(i, 1);
            }
        }

        // Process active powers
        for (const power of this.player.powers) {
            if (power.passive) {
                this.updatePassivePower(power);
            } else {
                this.updateActivePower(power, dt);
            }
        }
    }

    updatePassivePower(power) {
        const effectiveLevel = this.getEffectiveLevel(power);
        
        switch (power.id) {
            case 'frozenArmor':
                this.player.setBaseDamageReduction(Math.min(0.5, 0.1 * effectiveLevel));
                break;
        }
    }

    updateActivePower(power, dt) {
        const def = POWERS[power.id];
        const effectiveLevel = this.getEffectiveLevel(power);
        
        // Calculate base cooldown from level
        let cooldown = def.baseCooldown * Math.pow(def.levelScale.cooldown || 1, effectiveLevel - 1);
        
        // Apply passive cooldown reduction
        const passiveCooldownReduction = getCooldownReductionForCategory(
            this.player.passiveUpgrades, 
            def.category
        );
        cooldown *= (1 - passiveCooldownReduction);

        if (!this.cooldowns[power.id] || this.cooldowns[power.id] <= 0) {
            this.castPower(power);
            this.cooldowns[power.id] = cooldown;
        }
    }

    /**
     * Data-driven power casting - looks up cast function from POWERS definition
     */
    castPower(power) {
        const def = POWERS[power.id];
        if (!def?.cast) return;
        
        const level = this.getEffectiveLevel(power);
        
        // Call the cast function with context
        def.cast({
            powerManager: this,
            level,
            def,
            player: this.player
        });
    }

    checkOrbitalShieldCollisions(enemies) {
        if (this.orbitalShields.length === 0) return [];
        
        const hitEnemies = [];
        for (const shield of this.orbitalShields) {
            for (const enemy of enemies) {
                if (shield.checkCollision(enemy)) {
                    hitEnemies.push({ enemy, damage: shield.damage });
                }
            }
        }
        return hitEnemies;
    }

    renderOrbitalShields(ctx, camera) {
        for (const shield of this.orbitalShields) {
            shield.render(ctx, camera);
        }
    }

    /**
     * Auto-generate power options from POWERS definitions
     */
    static generatePowerOptions(category, existingPowers) {
        const options = [];
        
        // Iterate through all powers and filter by category
        for (const powerId in POWERS) {
            const power = POWERS[powerId];
            if (power.category !== category) continue;
            
            const existing = existingPowers.find(p => p.id === powerId);
            options.push({
                ...power,
                currentLevel: existing ? existing.level : 0
            });
        }

        return options;
    }
}
