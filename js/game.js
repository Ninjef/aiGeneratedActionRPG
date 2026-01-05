// Main game file - ties everything together

import { Player } from './player.js';
import { Camera } from './camera.js';
import { Enemy, EnemySpawner, Champion, CHAMPION_FUSION_THRESHOLD } from './enemy.js';
import { Crystal, CrystalSpawner } from './crystal.js';
import { Projectile, AreaEffect, RingEffect } from './projectile.js';
import { PowerManager, POWERS } from './powers.js';
import { UI } from './ui.js';
import { circleCollision } from './collision.js';
import { distance, angle, randomRange } from './utils.js';
import { createSuperchargeEffect } from './statusEffects.js';

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
        this.enemies = [];
        this.champions = [];
        this.crystals = [];
        this.projectiles = [];
        this.areaEffects = [];
        this.ringEffects = [];
        
        // Enemy projectiles (from champions attacking the player)
        this.enemyProjectiles = [];
        
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
        this.powerManager.setEnemies(this.enemies);
        
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
        
        // Spawn enemies and crystals
        this.enemySpawner.update(dt, this.player.x, this.player.y, this.enemies, this.crystals, this.camera);
        this.crystalSpawner.update(dt, this.player.x, this.player.y, this.crystals, this.camera);
        
        // Update crystals
        for (const crystal of this.crystals) {
            crystal.update(dt);
        }
        
        // Update enemies - target player or orbit nearby crystals
        for (const enemy of this.enemies) {
            // Check if enemy should orbit a crystal
            let foundCrystal = null;
            
            for (const crystal of this.crystals) {
                const distToCrystal = distance(enemy.x, enemy.y, crystal.x, crystal.y);
                if (distToCrystal < crystal.aggroRadius) {
                    foundCrystal = crystal;
                    break;
                }
            }
            
            if (foundCrystal) {
                // Set enemy to orbit this crystal
                enemy.setOrbitTarget(foundCrystal);
            } else {
                // No crystal nearby - target the player directly
                enemy.clearOrbitTarget();
                enemy.setTarget(this.player.x, this.player.y);
            }
            
            enemy.update(dt);
        }
        
        // Check for champion fusion (enemies orbiting crystals)
        this.checkChampionFusion();
        
        // Update champions
        this.updateChampions(dt);
        
        // Update enemy projectiles (from champions)
        this.updateEnemyProjectiles(dt);
        
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
            
            // Check collisions with enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (proj.checkCollision(enemy)) {
                    if (enemy.takeDamage(proj.damage)) {
                        this.enemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Check collisions with champions
            for (let j = this.champions.length - 1; j >= 0; j--) {
                const champion = this.champions[j];
                if (proj.checkCollision(champion)) {
                    if (champion.takeDamage(proj.damage)) {
                        this.champions.splice(j, 1);
                        this.enemiesDefeated += 5; // Champions count as 5 enemies
                    }
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
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
            
            // Apply effects to enemies
            if (effect.canDamage()) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (effect.affectEnemy(enemy)) {
                        if (enemy.takeDamage(effect.damage)) {
                            this.enemies.splice(j, 1);
                            this.enemiesDefeated++;
                        }
                    }
                }
                // Also affect champions
                for (let j = this.champions.length - 1; j >= 0; j--) {
                    const champion = this.champions[j];
                    if (effect.affectEnemy(champion)) {
                        if (champion.takeDamage(effect.damage)) {
                            this.champions.splice(j, 1);
                            this.enemiesDefeated += 5;
                        }
                    }
                }
            } else {
                // Still apply non-damage effects (slow, pull)
                for (const enemy of this.enemies) {
                    effect.affectEnemy(enemy);
                }
                for (const champion of this.champions) {
                    effect.affectEnemy(champion);
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
            
            // Check collisions with enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (ring.checkCollision(enemy)) {
                    if (enemy.takeDamage(ring.damage)) {
                        this.enemies.splice(j, 1);
                        this.enemiesDefeated++;
                    }
                }
            }
            
            // Check collisions with champions
            for (let j = this.champions.length - 1; j >= 0; j--) {
                const champion = this.champions[j];
                if (ring.checkCollision(champion)) {
                    if (champion.takeDamage(ring.damage)) {
                        this.champions.splice(j, 1);
                        this.enemiesDefeated += 5;
                    }
                }
            }
        }
        
        // Check orbital shield collisions with enemies
        const shieldHits = this.powerManager.checkOrbitalShieldCollisions(this.enemies);
        for (const hit of shieldHits) {
            if (hit.enemy.takeDamage(hit.damage)) {
                const idx = this.enemies.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.enemies.splice(idx, 1);
                    this.enemiesDefeated++;
                }
            }
        }
        
        // Check orbital shield collisions with champions
        const championShieldHits = this.powerManager.checkOrbitalShieldCollisions(this.champions);
        for (const hit of championShieldHits) {
            if (hit.enemy.takeDamage(hit.damage)) {
                const idx = this.champions.indexOf(hit.enemy);
                if (idx !== -1) {
                    this.champions.splice(idx, 1);
                    this.enemiesDefeated += 5;
                }
            }
        }
        
        // Check player-enemy collisions
        for (const enemy of this.enemies) {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                if (this.player.takeDamage(enemy.damage)) {
                    // Apply frozen armor slow if player has it
                    const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
                    if (frozenArmor) {
                        enemy.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
                    }
                }
            }
        }
        
        // Check player-champion collisions
        for (const champion of this.champions) {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                champion.x, champion.y, champion.radius
            )) {
                if (this.player.takeDamage(champion.damage)) {
                    const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
                    if (frozenArmor) {
                        champion.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
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
        
        // Check game over
        if (this.player.health <= 0) {
            this.gameOver();
        }
        
        // Despawn far enemies (based on visible area)
        const bounds = this.camera.getVisibleBounds();
        const visibleWidth = bounds.right - bounds.left;
        const visibleHeight = bounds.bottom - bounds.top;
        const despawnDistance = Math.sqrt(visibleWidth * visibleWidth + visibleHeight * visibleHeight) * 0.75;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (distance(this.player.x, this.player.y, enemy.x, enemy.y) > despawnDistance) {
                this.enemies.splice(i, 1);
            }
        }
        
        // Despawn far champions (with larger threshold since they're important)
        for (let i = this.champions.length - 1; i >= 0; i--) {
            const champion = this.champions[i];
            if (distance(this.player.x, this.player.y, champion.x, champion.y) > despawnDistance * 1.5) {
                this.champions.splice(i, 1);
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
        
        if (this.baseAttackTimer >= this.baseAttackCooldown && this.enemies.length > 0) {
            this.baseAttackTimer = 0;
            
            // Find nearest enemy
            let nearest = this.enemies[0];
            let nearestDist = distance(this.player.x, this.player.y, nearest.x, nearest.y);
            
            for (let i = 1; i < this.enemies.length; i++) {
                const dist = distance(this.player.x, this.player.y, this.enemies[i].x, this.enemies[i].y);
                if (dist < nearestDist) {
                    nearest = this.enemies[i];
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

    checkChampionFusion() {
        // Check each crystal for enough orbiting enemies
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const crystal = this.crystals[i];
            
            // Find all enemies orbiting this crystal
            const orbiters = this.enemies.filter(e => e.orbitTarget === crystal);
            
            if (orbiters.length >= CHAMPION_FUSION_THRESHOLD) {
                // Fusion triggered! Remove orbiting enemies and crystal
                for (const orbiter of orbiters) {
                    const idx = this.enemies.indexOf(orbiter);
                    if (idx !== -1) {
                        this.enemies.splice(idx, 1);
                    }
                }
                
                // Remove the crystal
                this.crystals.splice(i, 1);
                
                // Spawn a champion at the crystal's position
                const champion = new Champion(crystal.x, crystal.y, crystal.type);
                champion.setTarget(this.player.x, this.player.y);
                this.champions.push(champion);
            }
        }
    }

    updateChampions(dt) {
        for (let i = this.champions.length - 1; i >= 0; i--) {
            const champion = this.champions[i];
            
            // Set target to player
            champion.setTarget(this.player.x, this.player.y);
            
            // Update champion and check for ability usage
            const abilityResult = champion.update(dt);
            
            if (abilityResult) {
                this.handleChampionAbility(champion, abilityResult);
            }
        }
    }

    handleChampionAbility(champion, ability) {
        switch (ability.type) {
            case 'flameBurst':
                // Shoot fireballs toward the player
                const baseAngle = angle(ability.x, ability.y, ability.targetX, ability.targetY);
                const spreadAngle = Math.PI / 6; // 30 degree spread
                
                for (let i = 0; i < ability.count; i++) {
                    const offsetAngle = baseAngle + (i - (ability.count - 1) / 2) * spreadAngle;
                    this.enemyProjectiles.push(new Projectile(
                        ability.x,
                        ability.y,
                        offsetAngle,
                        ability.speed,
                        ability.damage,
                        {
                            radius: 12,
                            color: '#ff6b35',
                            trailLength: 8,
                            lifetime: 3,
                            isEnemyProjectile: true
                        }
                    ));
                }
                break;
                
            case 'frostTrail':
                // Create a frost zone at the champion's position
                this.areaEffects.push(new AreaEffect(
                    ability.x,
                    ability.y,
                    ability.radius,
                    0, // No damage to enemies
                    ability.duration,
                    {
                        color: '#4fc3f7',
                        damageInterval: 0.5,
                        slowAmount: ability.slowAmount,
                        slowDuration: ability.slowDuration,
                        type: 'frostTrail',
                        damagePlayer: true,
                        playerDamage: ability.damage
                    }
                ));
                break;
                
            case 'forceBeam':
                // Shoot a piercing beam toward the player
                const beamAngle = angle(ability.x, ability.y, ability.targetX, ability.targetY);
                this.enemyProjectiles.push(new Projectile(
                    ability.x,
                    ability.y,
                    beamAngle,
                    ability.speed,
                    ability.damage,
                    {
                        radius: 10,
                        color: '#ba68c8',
                        trailLength: 15,
                        lifetime: 2,
                        piercing: ability.piercing,
                        knockback: ability.knockback,
                        isEnemyProjectile: true
                    }
                ));
                break;
        }
    }

    updateEnemyProjectiles(dt) {
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            
            if (!proj.update(dt)) {
                this.enemyProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (circleCollision(
                proj.x, proj.y, proj.radius,
                this.player.x, this.player.y, this.player.radius
            )) {
                this.player.takeDamage(proj.damage);
                
                // Apply knockback to player if applicable
                if (proj.knockback > 0) {
                    // Player doesn't have knockback, but we could add it
                }
                
                if (!proj.piercing) {
                    this.enemyProjectiles.splice(i, 1);
                }
            }
        }
        
        // Check frost trail effects damaging the player
        for (const effect of this.areaEffects) {
            if (effect.damagePlayer && effect.canDamage()) {
                const dist = distance(effect.x, effect.y, this.player.x, this.player.y);
                if (dist < effect.radius + this.player.radius) {
                    this.player.takeDamage(effect.playerDamage || effect.damage);
                    // Apply slow to player (optional - player doesn't have slow system)
                }
            }
        }
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
        
        // Draw enemies
        for (const enemy of this.enemies) {
            if (this.camera.isVisible(enemy.x, enemy.y, enemy.radius)) {
                enemy.render(ctx, this.camera);
            }
        }
        
        // Draw champions (larger, render after regular enemies)
        for (const champion of this.champions) {
            if (this.camera.isVisible(champion.x, champion.y, champion.radius * 2)) {
                champion.render(ctx, this.camera);
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
        
        // Draw enemy projectiles (from champions)
        for (const proj of this.enemyProjectiles) {
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

