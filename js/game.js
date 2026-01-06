// Main game file - ties everything together

import { Player } from './player.js';
import { Camera } from './camera.js';
import { Builder, EnemySpawner, SpawnBlock, FieryEnemy, GravitationalEnemy, FastPurpleEnemy } from './enemy.js';
import { Crystal, CrystalSpawner } from './crystal.js';
import { Projectile, AreaEffect, RingEffect } from './projectile.js';
import { PowerManager, POWERS } from './powers.js';
import { UI } from './ui.js';
import { circleCollision } from './collision.js';
import { distance, angle, randomRange } from './utils.js';
import { createSuperchargeEffect } from './statusEffects.js';
import { generatePassiveUpgradeOptions } from './passiveUpgrades.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.ui = new UI();
        this.ui.onStart = () => this.startGame();
        this.ui.onRestart = () => this.restartGame();
        
        // Game state
        this.running = false;
        this.paused = false;
        this.gameTime = 0;
        this.enemiesDefeated = 0;
        
        // Input
        this.keys = {};
        this.setupInput();
        
        // Show start screen
        this.ui.showStartScreen();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    init() {
        // Player starts at origin
        this.player = new Player(0, 0);
        
        // Camera
        this.camera = new Camera(this.canvas);
        this.camera.x = -this.canvas.width / 2;
        this.camera.y = -this.canvas.height / 2;
        
        // Entity arrays
        this.builders = [];
        this.spawnBlocks = [];
        this.fieryEnemies = [];
        this.gravitationalEnemies = [];
        this.fastPurpleEnemies = [];
        this.crystals = [];
        this.projectiles = [];
        this.areaEffects = [];
        this.ringEffects = [];
        
        // Spawners
        this.enemySpawner = new EnemySpawner();
        this.crystalSpawner = new CrystalSpawner();
        
        // Power manager
        this.powerManager = new PowerManager(
            this.player,
            this.projectiles,
            this.areaEffects,
            this.ringEffects
        );
        // Set all enemy arrays for power manager
        this.updatePowerManagerEnemies();
        
        // Base attack
        this.baseAttackCooldown = 0.8;
        this.baseAttackTimer = 0;
        
        // Ambient particles for background
        this.ambientParticles = [];
        this.initAmbientParticles();
        
        // Game state reset
        this.gameTime = 0;
        this.enemiesDefeated = 0;
        this.running = true;
        this.paused = false;
    }
    
    initAmbientParticles() {
        // Create a pool of floating particles
        // Use a large range that works well with zoomed out view
        const range = 6000;
        for (let i = 0; i < 100; i++) {
            this.ambientParticles.push({
                x: Math.random() * range - range / 2,
                y: Math.random() * range - range / 2,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.3 + 0.1,
                speedX: (Math.random() - 0.5) * 20,
                speedY: (Math.random() - 0.5) * 20,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    startGame() {
        this.ui.hideStartScreen();
        this.init();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    restartGame() {
        this.ui.hideGameOver();
        this.init();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(currentTime) {
        if (!this.running) return;
        
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        if (!this.paused) {
            this.update(dt);
        }
        
        this.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        this.gameTime += dt;
        
        // Handle input
        this.handleInput();
        
        // Update ambient particles
        this.updateAmbientParticles(dt);
        
        // Update player
        this.player.update(dt);
        
        // Update camera
        this.camera.follow(this.player);
        this.camera.update();
        
        // Spawn builders and crystals
        this.enemySpawner.update(dt, this.player.x, this.player.y, this.builders, this.crystals, this.camera);
        this.crystalSpawner.update(dt, this.player.x, this.player.y, this.crystals, this.camera);
        
        // Update crystals
        for (const crystal of this.crystals) {
            crystal.update(dt);
        }
        
        // Update builders
        for (const builder of this.builders) {
            builder.update(dt, this.player.x, this.player.y, this.crystals);
        }
        
        // Check builder-crystal collisions
        for (let i = this.builders.length - 1; i >= 0; i--) {
            const builder = this.builders[i];
            for (let j = this.crystals.length - 1; j >= 0; j--) {
                const crystal = this.crystals[j];
                if (circleCollision(
                    builder.x, builder.y, builder.radius,
                    crystal.x, crystal.y, crystal.radius
                )) {
                    // Create spawn block at crystal's position
                    this.spawnBlocks.push(new SpawnBlock(crystal.x, crystal.y, crystal.type));
                    
                    // Remove both crystal and builder
                    this.crystals.splice(j, 1);
                    this.builders.splice(i, 1);
                    break;
                }
            }
        }
        
        // Update spawn blocks and spawn enemies
        for (const block of this.spawnBlocks) {
            const spawnInfo = block.update(dt);
            if (spawnInfo) {
                // Spawn enemies around the block
                for (let i = 0; i < spawnInfo.count; i++) {
                    const angleOffset = (i / spawnInfo.count) * Math.PI * 2;
                    const spawnDist = block.radius + 20;
                    const spawnX = spawnInfo.x + Math.cos(angleOffset) * spawnDist;
                    const spawnY = spawnInfo.y + Math.sin(angleOffset) * spawnDist;
                    
                    if (spawnInfo.enemyType === 'fiery') {
                        this.fieryEnemies.push(new FieryEnemy(spawnX, spawnY));
                    } else if (spawnInfo.enemyType === 'gravitational') {
                        this.gravitationalEnemies.push(new GravitationalEnemy(spawnX, spawnY));
                    } else if (spawnInfo.enemyType === 'fastPurple') {
                        this.fastPurpleEnemies.push(new FastPurpleEnemy(spawnX, spawnY));
                    }
                }
            }
        }
        
        // Update fiery enemies and create fire trails
        for (const fiery of this.fieryEnemies) {
            const trailInfo = fiery.update(dt, this.player.x, this.player.y);
            if (trailInfo) {
                // Create fire trail area effect
                this.areaEffects.push(new AreaEffect(
                    trailInfo.x,
                    trailInfo.y,
                    trailInfo.radius,
                    trailInfo.damage,
                    trailInfo.duration,
                    {
                        color: '#ff4500',
                        damageInterval: 1.0,
                        type: 'fireTrail',
                        damagePlayer: true,
                        playerDamage: trailInfo.damage
                    }
                ));
            }
        }
        
        // Update gravitational enemies (with mutual attraction)
        for (const grav of this.gravitationalEnemies) {
            grav.update(dt, this.player.x, this.player.y, this.gravitationalEnemies);
        }
        
        // Update fast purple enemies
        for (const purple of this.fastPurpleEnemies) {
            purple.update(dt, this.player.x, this.player.y);
        }
        
        
        // Base attack
        this.updateBaseAttack(dt);
        
        // Update power manager
        this.powerManager.update(dt);
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.update(dt)) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            let projHit = false;
            
            // Check collisions with builders
            for (let j = this.builders.length - 1; j >= 0; j--) {
                const builder = this.builders[j];
                if (proj.checkCollision(builder)) {
                    if (builder.takeDamage(proj.damage)) {
                        this.awardXp(builder.xp);
                        this.builders.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
            if (projHit) continue;
            
            // Check collisions with spawn blocks
            for (let j = this.spawnBlocks.length - 1; j >= 0; j--) {
                const block = this.spawnBlocks[j];
                if (proj.checkCollision(block)) {
                    if (block.takeDamage(proj.damage)) {
                        this.awardXp(block.xp);
                        // Drop crystal when spawn block is destroyed
                        this.crystals.push(new Crystal(block.x, block.y, block.crystalType));
                        this.spawnBlocks.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
            if (projHit) continue;
            
            // Check collisions with fiery enemies
            for (let j = this.fieryEnemies.length - 1; j >= 0; j--) {
                const fiery = this.fieryEnemies[j];
                if (proj.checkCollision(fiery)) {
                    if (fiery.takeDamage(proj.damage)) {
                        this.awardXp(fiery.xp);
                        this.fieryEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
            if (projHit) continue;
            
            // Check collisions with gravitational enemies
            for (let j = this.gravitationalEnemies.length - 1; j >= 0; j--) {
                const grav = this.gravitationalEnemies[j];
                if (proj.checkCollision(grav)) {
                    if (grav.takeDamage(proj.damage)) {
                        this.awardXp(grav.xp);
                        this.gravitationalEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
            if (projHit) continue;
            
            // Check collisions with fast purple enemies
            for (let j = this.fastPurpleEnemies.length - 1; j >= 0; j--) {
                const purple = this.fastPurpleEnemies[j];
                if (proj.checkCollision(purple)) {
                    if (purple.takeDamage(proj.damage)) {
                        this.awardXp(purple.xp);
                        this.fastPurpleEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
        }
        
        // Update area effects
        for (let i = this.areaEffects.length - 1; i >= 0; i--) {
            const effect = this.areaEffects[i];
            if (!effect.update(dt)) {
                this.areaEffects.splice(i, 1);
                continue;
            }
            
            // Check if effect damages player (fire trails)
            if (effect.damagePlayer && effect.canDamage()) {
                const dist = distance(effect.x, effect.y, this.player.x, this.player.y);
                if (dist < effect.radius + this.player.radius) {
                    this.player.takeDamage(effect.playerDamage || effect.damage);
                }
            }
            
            // Apply effects to all enemy types
            if (effect.canDamage()) {
                // Damage builders
                for (let j = this.builders.length - 1; j >= 0; j--) {
                    const builder = this.builders[j];
                    if (effect.affectEnemy(builder)) {
                        if (builder.takeDamage(effect.damage)) {
                            this.awardXp(builder.xp);
                            this.builders.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
                // Damage spawn blocks
                for (let j = this.spawnBlocks.length - 1; j >= 0; j--) {
                    const block = this.spawnBlocks[j];
                    if (effect.affectEnemy(block)) {
                        if (block.takeDamage(effect.damage)) {
                            this.awardXp(block.xp);
                            this.crystals.push(new Crystal(block.x, block.y, block.crystalType));
                            this.spawnBlocks.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
                // Damage fiery enemies
                for (let j = this.fieryEnemies.length - 1; j >= 0; j--) {
                    const fiery = this.fieryEnemies[j];
                    if (effect.affectEnemy(fiery)) {
                        if (fiery.takeDamage(effect.damage)) {
                            this.awardXp(fiery.xp);
                            this.fieryEnemies.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
                // Damage gravitational enemies
                for (let j = this.gravitationalEnemies.length - 1; j >= 0; j--) {
                    const grav = this.gravitationalEnemies[j];
                    if (effect.affectEnemy(grav)) {
                        if (grav.takeDamage(effect.damage)) {
                            this.awardXp(grav.xp);
                            this.gravitationalEnemies.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
                // Damage fast purple enemies
                for (let j = this.fastPurpleEnemies.length - 1; j >= 0; j--) {
                    const purple = this.fastPurpleEnemies[j];
                    if (effect.affectEnemy(purple)) {
                        if (purple.takeDamage(effect.damage)) {
                            this.awardXp(purple.xp);
                            this.fastPurpleEnemies.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
            } else {
                // Still apply non-damage effects (slow, pull)
                for (const builder of this.builders) {
                    effect.affectEnemy(builder);
                }
                for (const fiery of this.fieryEnemies) {
                    effect.affectEnemy(fiery);
                }
                for (const grav of this.gravitationalEnemies) {
                    effect.affectEnemy(grav);
                }
                for (const purple of this.fastPurpleEnemies) {
                    effect.affectEnemy(purple);
                }
            }
        }
        
        // Update ring effects
        for (let i = this.ringEffects.length - 1; i >= 0; i--) {
            const ring = this.ringEffects[i];
            if (!ring.update(dt)) {
                this.ringEffects.splice(i, 1);
                continue;
            }
            
            // Check collisions with builders
            for (let j = this.builders.length - 1; j >= 0; j--) {
                const builder = this.builders[j];
                if (ring.checkCollision(builder)) {
                    if (builder.takeDamage(ring.damage)) {
                        this.awardXp(builder.xp);
                        this.builders.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
            
            // Check collisions with spawn blocks
            for (let j = this.spawnBlocks.length - 1; j >= 0; j--) {
                const block = this.spawnBlocks[j];
                if (ring.checkCollision(block)) {
                    if (block.takeDamage(ring.damage)) {
                        this.awardXp(block.xp);
                        this.crystals.push(new Crystal(block.x, block.y, block.crystalType));
                        this.spawnBlocks.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
            
            // Check collisions with fiery enemies
            for (let j = this.fieryEnemies.length - 1; j >= 0; j--) {
                const fiery = this.fieryEnemies[j];
                if (ring.checkCollision(fiery)) {
                    if (fiery.takeDamage(ring.damage)) {
                        this.awardXp(fiery.xp);
                        this.fieryEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
            
            // Check collisions with gravitational enemies
            for (let j = this.gravitationalEnemies.length - 1; j >= 0; j--) {
                const grav = this.gravitationalEnemies[j];
                if (ring.checkCollision(grav)) {
                    if (grav.takeDamage(ring.damage)) {
                        this.awardXp(grav.xp);
                        this.gravitationalEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
            
            // Check collisions with fast purple enemies
            for (let j = this.fastPurpleEnemies.length - 1; j >= 0; j--) {
                const purple = this.fastPurpleEnemies[j];
                if (ring.checkCollision(purple)) {
                    if (purple.takeDamage(ring.damage)) {
                        this.awardXp(purple.xp);
                        this.fastPurpleEnemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
        }
        
        // Check orbital shield collisions with all enemy types
        this.updatePowerManagerEnemies();
        const allEnemies = [
            ...this.builders,
            ...this.spawnBlocks,
            ...this.fieryEnemies,
            ...this.gravitationalEnemies,
            ...this.fastPurpleEnemies
        ];
        const shieldHits = this.powerManager.checkOrbitalShieldCollisions(allEnemies);
        for (const hit of shieldHits) {
            if (hit.enemy.takeDamage(hit.damage)) {
                this.awardXp(hit.enemy.xp);
                
                // Remove from appropriate array
                let idx = this.builders.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.builders.splice(idx, 1);
                    this.enemiesDefeated++;
                    continue;
                }
                
                idx = this.spawnBlocks.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.crystals.push(new Crystal(hit.enemy.x, hit.enemy.y, hit.enemy.crystalType));
                    this.spawnBlocks.splice(idx, 1);
                    this.enemiesDefeated++;
                    continue;
                }
                
                idx = this.fieryEnemies.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.fieryEnemies.splice(idx, 1);
                    this.enemiesDefeated++;
                    continue;
                }
                
                idx = this.gravitationalEnemies.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.gravitationalEnemies.splice(idx, 1);
                    this.enemiesDefeated++;
                    continue;
                }
                
                idx = this.fastPurpleEnemies.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.fastPurpleEnemies.splice(idx, 1);
                    this.enemiesDefeated++;
                }
            }
        }
        
        // Check player collisions with all enemy types
        // Builders don't deal damage
        
        // Fiery enemies deal damage
        for (const fiery of this.fieryEnemies) {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                fiery.x, fiery.y, fiery.radius
            )) {
                if (this.player.takeDamage(fiery.damage)) {
                    const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
                    if (frozenArmor) {
                        fiery.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
                    }
                }
            }
        }
        
        // Gravitational enemies deal damage
        for (const grav of this.gravitationalEnemies) {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                grav.x, grav.y, grav.radius
            )) {
                if (this.player.takeDamage(grav.damage)) {
                    const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
                    if (frozenArmor) {
                        grav.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
                    }
                }
            }
        }
        
        // Fast purple enemies deal damage
        for (const purple of this.fastPurpleEnemies) {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                purple.x, purple.y, purple.radius
            )) {
                if (this.player.takeDamage(purple.damage)) {
                    const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
                    if (frozenArmor) {
                        purple.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
                    }
                }
            }
        }
        
        // Check crystal collection
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const crystal = this.crystals[i];
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                crystal.x, crystal.y, crystal.collectRadius
            )) {
                this.player.collectCrystal(crystal.type);
                
                // Apply supercharge effect - temporarily boost powers of this crystal type
                this.player.statusEffects.addEffect(
                    createSuperchargeEffect(crystal.type)
                );
                
                this.crystals.splice(i, 1);
                
                // Check for level up
                if (this.player.totalCrystals >= 5) {
                    this.triggerLevelUp();
                }
            }
        }
        
        // Update UI
        this.ui.updateCrystals(this.player.crystals);
        this.ui.updatePowers(this.player.powers);
        this.ui.updateXpBar(this.player.xp, this.player.getXpForNextLevel(), this.player.playerLevel);
        this.ui.updatePassiveUpgrades(this.player.passiveUpgrades);
        
        // Check game over
        if (this.player.health <= 0) {
            this.gameOver();
        }
        
        // Despawn far enemies (based on visible area)
        const bounds = this.camera.getVisibleBounds();
        const visibleWidth = bounds.right - bounds.left;
        const visibleHeight = bounds.bottom - bounds.top;
        const despawnDistance = Math.sqrt(visibleWidth * visibleWidth + visibleHeight * visibleHeight) * 0.75;
        
        for (let i = this.builders.length - 1; i >= 0; i--) {
            const builder = this.builders[i];
            if (distance(this.player.x, this.player.y, builder.x, builder.y) > despawnDistance) {
                this.builders.splice(i, 1);
            }
        }
        
        for (let i = this.fieryEnemies.length - 1; i >= 0; i--) {
            const fiery = this.fieryEnemies[i];
            if (distance(this.player.x, this.player.y, fiery.x, fiery.y) > despawnDistance) {
                this.fieryEnemies.splice(i, 1);
            }
        }
        
        for (let i = this.gravitationalEnemies.length - 1; i >= 0; i--) {
            const grav = this.gravitationalEnemies[i];
            if (distance(this.player.x, this.player.y, grav.x, grav.y) > despawnDistance) {
                this.gravitationalEnemies.splice(i, 1);
            }
        }
        
        for (let i = this.fastPurpleEnemies.length - 1; i >= 0; i--) {
            const purple = this.fastPurpleEnemies[i];
            if (distance(this.player.x, this.player.y, purple.x, purple.y) > despawnDistance) {
                this.fastPurpleEnemies.splice(i, 1);
            }
        }
    }

    handleInput() {
        let dx = 0;
        let dy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        this.player.setMovement(dx, dy);
    }
    
    updateAmbientParticles(dt) {
        // Calculate particle range based on visible area
        const bounds = this.camera.getVisibleBounds();
        const visibleWidth = bounds.right - bounds.left;
        const visibleHeight = bounds.bottom - bounds.top;
        const maxDist = Math.sqrt(visibleWidth * visibleWidth + visibleHeight * visibleHeight) * 0.6;
        
        for (const p of this.ambientParticles) {
            p.x += p.speedX * dt;
            p.y += p.speedY * dt;
            p.pulse += dt * 2;
            
            // Keep particles loosely around the player
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > maxDist) {
                // Respawn particle near player within visible range
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = maxDist * 0.3 + Math.random() * maxDist * 0.5;
                p.x = this.player.x + Math.cos(angle) * spawnDist;
                p.y = this.player.y + Math.sin(angle) * spawnDist;
            }
        }
    }

    updateBaseAttack(dt) {
        this.baseAttackTimer += dt;
        
        // Target all enemy types
        const allTargets = [
            ...this.builders,
            ...this.spawnBlocks,
            ...this.fieryEnemies,
            ...this.gravitationalEnemies,
            ...this.fastPurpleEnemies
        ];
        
        if (this.baseAttackTimer >= this.baseAttackCooldown && allTargets.length > 0) {
            this.baseAttackTimer = 0;
            
            // Find nearest enemy
            let nearest = allTargets[0];
            let nearestDist = distance(this.player.x, this.player.y, nearest.x, nearest.y);
            
            for (let i = 1; i < allTargets.length; i++) {
                const dist = distance(this.player.x, this.player.y, allTargets[i].x, allTargets[i].y);
                if (dist < nearestDist) {
                    nearest = allTargets[i];
                    nearestDist = dist;
                }
            }
            
            // Fire at nearest enemy
            const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
            this.projectiles.push(new Projectile(
                this.player.x,
                this.player.y,
                angle,
                450,
                10,
                {
                    radius: 6,
                    color: '#ffffff',
                    trailLength: 4,
                    lifetime: 3.5
                }
            ));
        }
    }
    
    updatePowerManagerEnemies() {
        // Combine all enemy arrays for power manager
        const allEnemies = [
            ...this.builders,
            ...this.spawnBlocks,
            ...this.fieryEnemies,
            ...this.gravitationalEnemies,
            ...this.fastPurpleEnemies
        ];
        this.powerManager.setEnemies(allEnemies, []);
    }

    triggerLevelUp() {
        this.paused = true;
        
        const options = PowerManager.generatePowerOptions(
            this.player.crystals,
            this.player.powers
        );
        
        this.ui.showLevelUp(options, this.player.powers, (selectedPower) => {
            this.player.addPower({ id: selectedPower.id, passive: selectedPower.passive });
            this.player.resetCrystals();
            this.paused = false;
        });
    }

    gameOver() {
        this.running = false;
        this.ui.showGameOver(this.gameTime, this.enemiesDefeated);
    }

    // Award XP for killing an enemy and check for passive upgrade level up
    awardXp(xpAmount) {
        const leveledUp = this.player.addXp(xpAmount);
        if (leveledUp) {
            this.triggerPassiveUpgrade();
        }
    }

    triggerPassiveUpgrade() {
        this.paused = true;
        
        const options = generatePassiveUpgradeOptions(3);
        
        this.ui.showPassiveUpgrade(options, this.player, (selectedUpgrade) => {
            this.player.addPassiveUpgrade(selectedUpgrade.id);
            this.paused = false;
        });
    }


    render() {
        const ctx = this.ctx;
        
        // Clear canvas with gradient background
        const bgGradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
        );
        bgGradient.addColorStop(0, '#12121a');
        bgGradient.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid background
        this.renderGrid();
        
        // Draw ambient particles
        this.renderAmbientParticles();
        
        // Draw area effects (under everything)
        for (const effect of this.areaEffects) {
            effect.render(ctx, this.camera);
        }
        
        // Draw ring effects
        for (const ring of this.ringEffects) {
            ring.render(ctx, this.camera);
        }
        
        // Draw crystals
        for (const crystal of this.crystals) {
            if (this.camera.isVisible(crystal.x, crystal.y, 50)) {
                crystal.render(ctx, this.camera);
            }
        }
        
        // Draw builders
        for (const builder of this.builders) {
            if (this.camera.isVisible(builder.x, builder.y, builder.radius)) {
                builder.render(ctx, this.camera);
            }
        }
        
        // Draw spawn blocks
        for (const block of this.spawnBlocks) {
            if (this.camera.isVisible(block.x, block.y, block.radius)) {
                block.render(ctx, this.camera);
            }
        }
        
        // Draw fiery enemies
        for (const fiery of this.fieryEnemies) {
            if (this.camera.isVisible(fiery.x, fiery.y, fiery.radius)) {
                fiery.render(ctx, this.camera);
            }
        }
        
        // Draw gravitational enemies
        for (const grav of this.gravitationalEnemies) {
            if (this.camera.isVisible(grav.x, grav.y, grav.radius)) {
                grav.render(ctx, this.camera);
            }
        }
        
        // Draw fast purple enemies
        for (const purple of this.fastPurpleEnemies) {
            if (this.camera.isVisible(purple.x, purple.y, purple.radius)) {
                purple.render(ctx, this.camera);
            }
        }
        
        // Draw orbital shields (behind player)
        this.powerManager.renderOrbitalShields(ctx, this.camera);
        
        // Draw player
        this.player.render(ctx, this.camera);
        
        // Draw projectiles
        for (const proj of this.projectiles) {
            if (this.camera.isVisible(proj.x, proj.y, 20)) {
                proj.render(ctx, this.camera);
            }
        }
        
        // Draw vignette overlay
        this.renderVignette();
        
        // Draw game time
        this.renderGameTime();
    }
    
    renderAmbientParticles() {
        const ctx = this.ctx;
        
        for (const p of this.ambientParticles) {
            const screen = this.camera.worldToScreen(p.x, p.y);
            
            // Skip if off screen
            if (screen.x < -10 || screen.x > this.canvas.width + 10 ||
                screen.y < -10 || screen.y > this.canvas.height + 10) {
                continue;
            }
            
            const pulseAlpha = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
            ctx.fillStyle = `rgba(100, 150, 200, ${pulseAlpha})`;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderVignette() {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const maxDim = Math.max(this.canvas.width, this.canvas.height);
        
        const gradient = ctx.createRadialGradient(cx, cy, maxDim * 0.3, cx, cy, maxDim * 0.7);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderGrid() {
        const ctx = this.ctx;
        const gridSize = 60;
        const bounds = this.camera.getVisibleBounds();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        const startX = Math.floor(bounds.left / gridSize) * gridSize;
        const startY = Math.floor(bounds.top / gridSize) * gridSize;
        
        ctx.beginPath();
        for (let x = startX; x <= bounds.right; x += gridSize) {
            const screen = this.camera.worldToScreen(x, 0);
            ctx.moveTo(screen.x, 0);
            ctx.lineTo(screen.x, this.canvas.height);
        }
        for (let y = startY; y <= bounds.bottom; y += gridSize) {
            const screen = this.camera.worldToScreen(0, y);
            ctx.moveTo(0, screen.y);
            ctx.lineTo(this.canvas.width, screen.y);
        }
        ctx.stroke();
    }

    renderGameTime() {
        const ctx = this.ctx;
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.canvas.width / 2 - 40, 10, 80, 30);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, this.canvas.width / 2, 32);
    }
}

// Start the game
const game = new Game();

