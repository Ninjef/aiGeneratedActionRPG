// Main game file - ties everything together

import { Player } from './player.js';
import { Camera } from './camera.js';
// Import enemy classes from the new entities module
import { 
    Builder, Fighter, FieryEnemy, GravitationalEnemy, FastPurpleEnemy, 
    SpawnBlock, EnemyManager, EnemySpawner 
} from './entities/index.js';
// Keep spriteCache and setSimplifiedRendering from enemy.js (rendering utilities)
import { spriteCache, setSimplifiedRendering } from './enemy.js';
import { Crystal, CrystalSpawner, CRYSTAL_TYPES } from './crystal.js';
import { Projectile, AreaEffect, RingEffect, CrucibleEffect, CryostasisBeam } from './projectile.js';
import { PowerManager, POWERS } from './powers.js';
import { PowerRune } from './powerRune.js';
import { FloatingText } from './floatingText.js';
import { UI } from './ui.js';
import { circleCollision, SpatialGrid } from './collision.js';
import { distance, distanceSquared, angle, randomRange, randomChoice } from './utils.js';
import { generatePassiveUpgradeOptions } from './passiveUpgrades.js';
import { EventBus, GameEvents } from './events/index.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.ui = new UI();
        this.ui.onStart = () => this.startGame();
        this.ui.onRestart = () => this.restartGame();
        
        // Event system for loose coupling between game systems
        this.eventBus = new EventBus();
        
        // Game state
        this.running = false;
        this.paused = false;
        this.gameTime = 0;
        this.enemiesDefeated = 0;
        
        // Performance settings
        this.maxTotalEnemies = 20000; // Global cap on all enemy types combined
        
        // Initialize sprite cache for optimized rendering
        spriteCache.init();
        
        // Input
        this.keys = {};
        this.setupInput();
        
        // Show start screen
        this.ui.showStartScreen();
    }
    
    // Get total count of all enemies for performance caps
    getTotalEnemyCount() {
        return this.enemyManager.getCount() + this.spawnBlocks.length;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Handle ESC key for pause
            if (e.key === 'Escape' && this.running) {
                this.togglePause();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    togglePause() {
        // Don't pause if a modal is open
        if (!this.ui.passiveUpgradeModal.classList.contains('hidden')) {
            return;
        }
        
        this.paused = !this.paused;
        if (this.paused) {
            this.ui.showPauseScreen();
            this.eventBus.emit(GameEvents.GAME_PAUSED, { gameTime: this.gameTime });
        } else {
            this.ui.hidePauseScreen();
            this.eventBus.emit(GameEvents.GAME_RESUMED, { gameTime: this.gameTime });
        }
    }

    init() {
        // Player starts at origin
        this.player = new Player(0, 0);
        
        // Camera
        this.camera = new Camera(this.canvas);
        this.camera.x = -this.canvas.width / 2;
        this.camera.y = -this.canvas.height / 2;
        
        // Entity arrays
        this.enemyManager = new EnemyManager(); // Unified enemy management
        this.spawnBlocks = []; // SpawnBlocks managed separately (stationary structures)
        this.crystals = [];
        this.powerRunes = [];
        this.projectiles = [];
        this.areaEffects = [];
        this.ringEffects = [];
        this.crucibleEffects = [];
        this.cryostasisBeams = [];
        this.floatingTexts = [];
        
        // Spawners
        this.enemySpawner = new EnemySpawner();
        this.crystalSpawner = new CrystalSpawner();
        
        // Spatial grid for efficient collision detection (cell size > largest enemy radius * 2)
        this.spatialGrid = new SpatialGrid(100);
        
        // Power manager
        this.powerManager = new PowerManager(
            this.player,
            this.projectiles,
            this.areaEffects,
            this.ringEffects,
            this.crucibleEffects,
            this.cryostasisBeams
        );
        // Set all enemy arrays for power manager
        this.updatePowerManagerEnemies();
        
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
        
        // Spawn starting power runes near the player
        this.spawnStartingRunes();
        
        this.lastTime = performance.now();
        
        // Emit game start event
        this.eventBus.emit(GameEvents.GAME_START, {
            timestamp: Date.now()
        });
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Spawn power runes near the player at game start
     */
    spawnStartingRunes() {
        // Get all power IDs
        const allPowerIds = Object.keys(POWERS);
        
        // Generate unique group ID for this set of runes
        const groupId = `start_${Date.now()}`;
        
        // Spawn 4 runes around the player in a circle
        const numRunes = 4;
        const spawnRadius = 200; // Spawn at final positions
        
        for (let i = 0; i < numRunes; i++) {
            const runeAngle = (i / numRunes) * Math.PI * 2 + Math.PI / 4;
            const spawnX = this.player.x + Math.cos(runeAngle) * spawnRadius;
            const spawnY = this.player.y + Math.sin(runeAngle) * spawnRadius;
            
            // Pick a random power
            const powerId = randomChoice(allPowerIds);
            
            // Create rune at final position with group ID
            const rune = new PowerRune(spawnX, spawnY, powerId, groupId);
            rune.lifetime = 15.0; // Extra time for starting runes
            rune.maxLifetime = 15.0;
            
            this.powerRunes.push(rune);
            console.log('Spawned starting rune with groupId:', rune.groupId);
        }
    }

    restartGame() {
        this.ui.hideGameOver();
        this.init();
        
        // Spawn starting power runes near the player
        this.spawnStartingRunes();
        
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
        
        // Spawn builders, fighters and crystals using EnemyManager
        this.enemySpawner.update(dt, this.player.x, this.player.y, this.enemyManager, this.camera);
        this.crystalSpawner.update(dt, this.player.x, this.player.y, this.crystals, this.camera);
        
        // Update crystals
        for (const crystal of this.crystals) {
            crystal.update(dt);
        }
        
        // Update all enemies via EnemyManager (handles builders, fighters, fiery, gravitational, fastPurple)
        const trailInfos = this.enemyManager.update(dt, this.player.x, this.player.y, {
            crystals: this.crystals,
            spawnBlocks: this.spawnBlocks
        });
        
        // Create fire trail area effects from enemy movement
        EnemyManager.createFireTrails(trailInfos, this.areaEffects);
        
        // Check builder-crystal collisions
        const builders = this.enemyManager.getByType('builder');
        for (let i = builders.length - 1; i >= 0; i--) {
            const builder = builders[i];
            if (builder._dead) continue;
            let builderConsumed = false;
            
            for (let j = this.crystals.length - 1; j >= 0; j--) {
                const crystal = this.crystals[j];
                if (circleCollision(
                    builder.x, builder.y, builder.radius,
                    crystal.x, crystal.y, crystal.radius
                )) {
                    // Create spawn block at crystal's position
                    this.spawnBlocks.push(new SpawnBlock(crystal.x, crystal.y, crystal.type));
                    
                    // Remove crystal and mark builder for removal
                    this.crystals.splice(j, 1);
                    this.enemyManager.markDead(builder);
                    builderConsumed = true;
                    break;
                }
            }
            
            // If builder wasn't consumed by a crystal, check tower collisions
            if (!builderConsumed && !builder._dead) {
                for (const block of this.spawnBlocks) {
                    if (circleCollision(
                        builder.x, builder.y, builder.radius,
                        block.x, block.y, block.radius
                    )) {
                        // Builder enters tower - give tower XP
                        const xpAmount = 10;  // XP per builder
                        const leveledUp = block.addTowerXp(xpAmount);
                        
                        if (leveledUp) {
                            console.log(`Tower leveled up to ${block.level}!`);
                        }
                        
                        // Mark the builder for removal (consumed by tower)
                        this.enemyManager.markDead(builder);
                        break;
                    }
                }
            }
        }
        
        // Check fighter-spawn block collisions (fighters enter towers to spawn enemies)
        const fighters = this.enemyManager.getByType('fighter');
        for (let i = fighters.length - 1; i >= 0; i--) {
            const fighter = fighters[i];
            if (fighter._dead) continue;
            
            for (const block of this.spawnBlocks) {
                if (circleCollision(
                    fighter.x, fighter.y, fighter.radius,
                    block.x, block.y, block.radius
                )) {
                    // Trigger spawn from the block
                    const spawnInfo = block.triggerSpawn();
                    
                    // Check if we're over the enemy cap before spawning
                    const currentTotal = this.getTotalEnemyCount();
                    if (currentTotal < this.maxTotalEnemies) {
                        // Limit spawn count to not exceed cap
                        const maxCanSpawn = this.maxTotalEnemies - currentTotal;
                        const actualSpawnCount = Math.min(spawnInfo.count, maxCanSpawn);
                        
                        // Get scaling from tower level
                        const scaling = spawnInfo.scaling;
                        
                        // Spawn enemies around the block (with scaling applied)
                        for (let j = 0; j < actualSpawnCount; j++) {
                            const angleOffset = (j / spawnInfo.count) * Math.PI * 2;
                            const spawnDist = block.radius + 20;
                            const spawnX = spawnInfo.x + Math.cos(angleOffset) * spawnDist;
                            const spawnY = spawnInfo.y + Math.sin(angleOffset) * spawnDist;
                            
                            if (spawnInfo.enemyType === 'fiery') {
                                this.enemyManager.add(new FieryEnemy(spawnX, spawnY, scaling));
                            } else if (spawnInfo.enemyType === 'gravitational') {
                                this.enemyManager.add(new GravitationalEnemy(spawnX, spawnY, scaling));
                            } else if (spawnInfo.enemyType === 'fastPurple') {
                                this.enemyManager.add(new FastPurpleEnemy(spawnX, spawnY, scaling));
                            }
                        }
                    }
                    
                    // Mark the fighter for removal (consumed by the tower)
                    this.enemyManager.markDead(fighter);
                    break;
                }
            }
        }
        
        // Update spawn blocks (no longer spawns periodically - only via fighter collision)
        for (const block of this.spawnBlocks) {
            block.update(dt);
        }
        
        // Apply burning damage to enemies in burning panic state
        const burningDamagePerSecond = 25; // Substantial damage
        this.enemyManager.applyBurningDamage(dt, burningDamagePerSecond, (enemy) => {
            this.awardXp(enemy.xp);
            this.enemiesDefeated++;
            this.eventBus.emit(GameEvents.ENEMY_KILLED, {
                enemy,
                damage: burningDamagePerSecond * dt,
                source: 'burning',
                totalDefeated: this.enemiesDefeated
            });
        });
        
        // Update power manager
        this.powerManager.update(dt);
        
        // Remove dead enemies from the manager before rebuilding the spatial grid
        this.enemyManager.removeDeadEnemies();
        
        // Rebuild spatial grid with all enemies for efficient collision detection
        this.enemyManager.populateSpatialGrid(this.spatialGrid);
        
        // Add spawn blocks to the spatial grid (managed separately)
        for (const block of this.spawnBlocks) {
            block._sourceArray = this.spawnBlocks;
            block._dead = false;
            block._isSpawnBlock = true;
            this.spatialGrid.insert(block);
        }
        
        // Update projectiles with spatial grid collision detection
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.update(dt)) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            let projHit = false;
            
            // Get nearby enemies from spatial grid (much faster than checking all)
            const nearby = this.spatialGrid.getNearby(proj.x, proj.y);
            
            for (const enemy of nearby) {
                // Skip already dead enemies
                if (enemy._dead) continue;
                
                if (proj.checkCollision(enemy)) {
                    // Create fireball explosion on ANY hit (not just kills)
                    if (proj.sourceType === 'fireballPower') {
                        this.createFireballExplosion(enemy.x, enemy.y, proj.explosionRadius);
                    }
                    
                    // Apply damage using centralized handler
                    this.handleEnemyDamage(enemy, proj.damage, { source: 'projectile' });
                    
                    // Remove projectile if not piercing
                    if (!proj.piercing) {
                        this.projectiles.splice(i, 1);
                        projHit = true;
                        break;
                    }
                }
            }
            
            if (projHit) continue;
        }
        
        // Update area effects using spatial grid
        for (let i = this.areaEffects.length - 1; i >= 0; i--) {
            const effect = this.areaEffects[i];
            if (!effect.update(dt)) {
                this.areaEffects.splice(i, 1);
                continue;
            }
            
            // Check if effect damages player (fire trails)
            if (effect.damagePlayer && effect.canDamage()) {
                const distSq = distanceSquared(effect.x, effect.y, this.player.x, this.player.y);
                const radiusSum = effect.radius + this.player.radius;
                if (distSq < radiusSum * radiusSum) {
                    this.player.takeDamage(effect.playerDamage || effect.damage);
                }
            }
            
            // Get nearby enemies from spatial grid
            const nearbyEnemies = this.spatialGrid.getNearby(effect.x, effect.y);
            
            // Apply effects to nearby enemies
            if (effect.canDamage()) {
                for (const enemy of nearbyEnemies) {
                    if (enemy._dead) continue;
                    // Skip spawn blocks for fire trails
                    if (effect.type === 'fireTrail' && enemy._isSpawnBlock) continue;
                    
                    if (effect.affectEnemy(enemy)) {
                        this.handleEnemyDamage(enemy, effect.damage, { source: 'areaEffect' });
                    }
                }
            } else {
                // Still apply non-damage effects (slow, pull) to nearby enemies
                for (const enemy of nearbyEnemies) {
                    if (enemy._dead) continue;
                    effect.affectEnemy(enemy);
                }
            }
        }
        
        // Update crucible effects and apply status effects
        for (let i = this.crucibleEffects.length - 1; i >= 0; i--) {
            const crucible = this.crucibleEffects[i];
            if (!crucible.update(dt)) {
                this.crucibleEffects.splice(i, 1);
                continue;
            }
            
            // Get all enemies that could be affected
            const allEnemies = [
                ...this.enemyManager.getAlive(),
                ...this.spawnBlocks.filter(b => !b._dead)
            ];
            
            // Apply damage to enemies in the crucible area
            if (crucible.canDamage()) {
                const damage = crucible.getDamage();
                for (const enemy of allEnemies) {
                    if (crucible.isEnemyInArea(enemy)) {
                        this.handleEnemyDamage(enemy, damage, { source: 'crucible' });
                    }
                }
            }
            
            // Check if delirious should be triggered (at 10% progress)
            if (crucible.shouldTriggerDelirious()) {
                const remainingDuration = crucible.getRemainingDuration();
                for (const enemy of allEnemies) {
                    // SpawnBlocks don't get delirious
                    if (enemy.type === undefined) continue;
                    
                    if (crucible.isEnemyInArea(enemy)) {
                        if (typeof enemy.applyDelirious === 'function') {
                            enemy.applyDelirious(remainingDuration);
                        }
                    }
                }
            }
            
            // Check if immobilize should be triggered (at 50% progress)
            if (crucible.shouldTriggerImmobilize()) {
                const remainingDuration = crucible.getRemainingDuration();
                const immobilizeCount = crucible.getImmobilizeCount();
                
                // Get enemies in the area that can be immobilized
                const eligibleEnemies = allEnemies.filter(enemy => {
                    // SpawnBlocks don't get immobilized
                    if (enemy.type === undefined) return false;
                    if (!crucible.isEnemyInArea(enemy)) return false;
                    if (typeof enemy.applyImmobilize !== 'function') return false;
                    return true;
                });
                
                // Randomly select enemies to immobilize
                const toImmobilize = [];
                const shuffled = [...eligibleEnemies].sort(() => Math.random() - 0.5);
                for (let j = 0; j < Math.min(immobilizeCount, shuffled.length); j++) {
                    toImmobilize.push(shuffled[j]);
                }
                
                // Apply immobilize
                for (const enemy of toImmobilize) {
                    enemy.applyImmobilize(remainingDuration);
                    crucible.immobilizedEnemies.add(enemy);
                }
            }
            
            // Check if burst should be triggered (at 90% progress - enemies burst into flames!)
            if (crucible.shouldTriggerBurst()) {
                const remainingDuration = crucible.getRemainingDuration();
                
                // Get all still-immobilized enemies from this crucible
                for (const enemy of crucible.immobilizedEnemies) {
                    // Skip if enemy was killed or is no longer valid
                    if (enemy._dead || !enemy) continue;
                    
                    // Create explosion effect around the enemy
                    this.ringEffects.push(new RingEffect(
                        enemy.x,
                        enemy.y,
                        80, // Explosion radius
                        15, // Small damage
                        0.4,
                        {
                            color: '#ff4500',
                            knockback: 60
                        }
                    ));
                    
                    // Apply burning panic - enemy runs around on fire
                    if (typeof enemy.applyBurningPanic === 'function') {
                        enemy.applyBurningPanic(remainingDuration + 1.0); // Extra second of panic
                    }
                }
            }
        }
        
        // Update cryostasis beams
        for (let i = this.cryostasisBeams.length - 1; i >= 0; i--) {
            const beam = this.cryostasisBeams[i];
            if (!beam.update(dt)) {
                // Beam expired - ALWAYS remove invulnerability from target
                if (beam.target) {
                    beam.target.cryostasisInvulnerable = false;
                }
                this.cryostasisBeams.splice(i, 1);
                continue;
            }
            
            // Check if freeze should be triggered (at 2 seconds)
            if (beam.shouldTriggerFreeze()) {
                beam.markFreezeTriggered();
                
                // Apply permanent freeze to the target (becomes an ice structure)
                // Target is already invulnerable from when beam was cast
                if (beam.target && !beam.target._dead && typeof beam.target.applyPermanentFreeze === 'function') {
                    beam.target.applyPermanentFreeze();
                }
            }
            
            // Handle refracted beam damage
            if (beam.canDamage()) {
                // Get all enemies for collision checking
                const allEnemies = [
                    ...this.enemyManager.getAlive(),
                    ...this.spawnBlocks.filter(b => !b._dead)
                ];
                
                // Check refracted beam collisions and deal damage
                const damage = beam.getDamage();
                const hitEnemies = beam.checkBeamCollision(allEnemies);
                
                for (const enemy of hitEnemies) {
                    this.handleEnemyDamage(enemy, damage, { source: 'cryostasis' });
                }
            }
        }
        
        // Update ring effects using spatial grid
        for (let i = this.ringEffects.length - 1; i >= 0; i--) {
            const ring = this.ringEffects[i];
            if (!ring.update(dt)) {
                this.ringEffects.splice(i, 1);
                continue;
            }
            
            // Get nearby enemies from spatial grid
            const nearbyEnemies = this.spatialGrid.getNearby(ring.x, ring.y);
            
            for (const enemy of nearbyEnemies) {
                if (enemy._dead) continue;
                
                if (ring.checkCollision(enemy)) {
                    this.handleEnemyDamage(enemy, ring.damage, { source: 'ring' });
                }
            }
        }
        
        // Check orbital shield collisions using spatial grid
        this.updatePowerManagerEnemies();
        // Get enemies near player (where orbital shields are)
        const nearbyForShields = this.spatialGrid.getNearby(this.player.x, this.player.y);
        const shieldHits = this.powerManager.checkOrbitalShieldCollisions(nearbyForShields.filter(e => !e._dead));
        for (const hit of shieldHits) {
            const enemy = hit.enemy;
            if (enemy._dead) continue;
            
            this.handleEnemyDamage(enemy, hit.damage, { source: 'orbital' });
        }
        
        // Check player collisions with all damage-dealing enemies via EnemyManager
        this.enemyManager.checkPlayerCollisions(this.player, (enemy) => {
            // Apply frozen armor slow effect if player has it
            const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
            if (frozenArmor && enemy.applySlow) {
                enemy.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
            }
            
            // Emit player damaged event
            this.eventBus.emit(GameEvents.PLAYER_DAMAGED, {
                damage: enemy.damage,
                source: enemy,
                healthBefore: this.player.health + enemy.damage,
                healthAfter: this.player.health
            });
        });
        
        // Check crystal collection
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const crystal = this.crystals[i];
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                crystal.x, crystal.y, crystal.collectRadius
            )) {
                const crystalType = crystal.type;
                const crystalX = crystal.x;
                const crystalY = crystal.y;
                
                // Remove crystal
                this.crystals.splice(i, 1);
                
                // Emit crystal collected event
                this.eventBus.emit(GameEvents.CRYSTAL_COLLECTED, {
                    type: crystalType,
                    x: crystalX,
                    y: crystalY
                });
                
                // Create nova explosion of the crystal's type
                this.createCrystalNova(crystalX, crystalY, crystalType);
                
                // Spawn 3 power runes flying out
                this.spawnPowerRunes(crystalX, crystalY, crystalType);
            }
        }
        
        // Update power runes
        for (let i = this.powerRunes.length - 1; i >= 0; i--) {
            const rune = this.powerRunes[i];
            if (!rune.update(dt)) {
                // Rune expired
                this.powerRunes.splice(i, 1);
                continue;
            }
            
            // Check if player collects the rune
            if (rune.checkCollection(this.player.x, this.player.y, this.player.radius)) {
                const powerDef = POWERS[rune.powerId];
                const result = this.player.collectPowerRune(rune.powerId, powerDef?.passive || false);
                
                // Create floating text to show what was collected
                const progress = this.player.getPowerProgress(rune.powerId);
                if (progress && powerDef) {
                    const floatingText = new FloatingText(
                        this.player.x,
                        this.player.y - 400, // Position far above the player
                        powerDef.name,
                        progress.level,
                        progress.runesProgress,
                        progress.runesNeeded
                    );
                    this.floatingTexts.push(floatingText);
                }
                
                // Remove all runes in the same group (tethered runes)
                const groupId = rune.groupId;
                console.log('Collected rune, groupId:', groupId, 'total runes before:', this.powerRunes.length);
                if (groupId) {
                    // Remove all runes with matching groupId
                    let removed = 0;
                    for (let j = this.powerRunes.length - 1; j >= 0; j--) {
                        if (this.powerRunes[j].groupId === groupId) {
                            this.powerRunes.splice(j, 1);
                            removed++;
                        }
                    }
                    console.log('Removed', removed, 'runes with groupId:', groupId);
                } else {
                    // No group, just remove the single rune
                    this.powerRunes.splice(i, 1);
                    console.log('No groupId, removed single rune');
                }
                
                // Break since we may have modified the array significantly
                break;
            }
        }
        
        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            if (!this.floatingTexts[i].update(dt)) {
                this.floatingTexts.splice(i, 1);
            }
        }
        
        // Update UI
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
        
        // Despawn enemies via EnemyManager (excludes spawn blocks)
        this.enemyManager.despawnFarEnemies(this.player.x, this.player.y, despawnDistance);
        
        // Note: SpawnBlocks are not despawned - they persist as world structures
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

    updatePowerManagerEnemies() {
        // Combine all enemies for power manager (includes spawn blocks)
        const allEnemies = [
            ...this.enemyManager.getAlive(),
            ...this.spawnBlocks.filter(b => !b._dead)
        ];
        this.powerManager.setEnemies(allEnemies, []);
    }

    createFireballExplosion(x, y, radius = 120) {
        // Create explosion area effect when fireball hits an enemy
        this.areaEffects.push(new AreaEffect(
            x,
            y,
            radius,  // Explosion radius (scales with level)
            45,      // Explosion damage
            0.5,     // Brief duration for instant damage
            {
                color: '#ff6b35',
                damageInterval: 0,  // Damage immediately
                type: 'fireballExplosion'
            }
        ));
        
        // Add visual ring effect for impact feedback
        this.ringEffects.push(new RingEffect(
            x,
            y,
            radius * 0.8,
            0,    // No additional damage from ring
            0.3,  // Quick visual flash
            {
                color: '#ffaa00',
                knockback: 30
            }
        ));
    }

    /**
     * Create a damaging nova explosion when a crystal is touched
     */
    createCrystalNova(x, y, crystalType) {
        const crystalConfig = CRYSTAL_TYPES[crystalType];
        const color = crystalConfig?.color || '#ffffff';
        
        // Visual ring effect
        this.ringEffects.push(new RingEffect(
            x,
            y,
            180,  // Max radius
            30,   // Damage
            0.6,  // Duration
            {
                color: color,
                knockback: 80
            }
        ));
    }

    /**
     * Spawn 3 power runes when a crystal is collected
     * 1 guaranteed from crystal's element, 2 random from all powers
     * Runes appear instantly at final positions, tethered together
     */
    spawnPowerRunes(x, y, crystalType) {
        const powersByCategory = {
            heat: ['crucible', 'magmaPool', 'infernoRing'],
            cold: ['iceShards', 'frostNova', 'frozenArmor'],
            force: ['forceBolt', 'gravityWell', 'orbitalShields']
        };
        
        const allPowerIds = Object.keys(POWERS);
        const categoryPowers = powersByCategory[crystalType] || allPowerIds;
        
        const runeIds = [];
        
        // First rune: guaranteed from the crystal's element
        runeIds.push(randomChoice(categoryPowers));
        
        // Second and third runes: random from all powers
        runeIds.push(randomChoice(allPowerIds));
        runeIds.push(randomChoice(allPowerIds));
        
        // Generate unique group ID for this set of runes
        const groupId = `crystal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Spawn runes at final positions (200 units from crystal - 2x previous landing distance)
        const spawnRadius = 200;
        for (let i = 0; i < runeIds.length; i++) {
            const runeAngle = (i / 3) * Math.PI * 2 + randomRange(-0.3, 0.3);
            const spawnX = x + Math.cos(runeAngle) * spawnRadius;
            const spawnY = y + Math.sin(runeAngle) * spawnRadius;
            const rune = new PowerRune(spawnX, spawnY, runeIds[i], groupId);
            this.powerRunes.push(rune);
        }
    }

    gameOver() {
        this.running = false;
        
        // Emit game over event
        this.eventBus.emit(GameEvents.GAME_OVER, {
            gameTime: this.gameTime,
            enemiesDefeated: this.enemiesDefeated,
            playerLevel: this.player.playerLevel,
            powers: this.player.powers.map(p => ({ id: p.id, level: p.level }))
        });
        
        this.ui.showGameOver(this.gameTime, this.enemiesDefeated);
    }

    // Award XP for killing an enemy and check for passive upgrade level up
    awardXp(xpAmount) {
        const prevLevel = this.player.playerLevel;
        const leveledUp = this.player.addXp(xpAmount);
        
        // Emit XP gained event
        this.eventBus.emit(GameEvents.PLAYER_XP_GAINED, {
            amount: xpAmount,
            currentXp: this.player.xp,
            xpToNext: this.player.getXpForNextLevel()
        });
        
        if (leveledUp) {
            // Emit level up event
            this.eventBus.emit(GameEvents.PLAYER_LEVEL_UP, {
                previousLevel: prevLevel,
                newLevel: this.player.playerLevel
            });
            
            this.triggerPassiveUpgrade();
        }
    }
    
    /**
     * Centralized enemy damage handler
     * Replaces the repeated pattern of damage handling throughout the codebase
     * 
     * @param {object} enemy - The enemy taking damage
     * @param {number} damage - Amount of damage to deal
     * @param {object} options - Additional options
     * @param {string} options.source - Damage source type ('projectile', 'areaEffect', 'ring', 'crucible', 'cryostasis', 'orbital', 'burning')
     * @param {boolean} options.skipRemoval - If true, don't remove from source array (caller handles it)
     * @returns {boolean} - True if the enemy was killed
     */
    handleEnemyDamage(enemy, damage, options = {}) {
        // Skip if enemy is already dead
        if (enemy._dead) return false;
        
        const source = options.source || 'unknown';
        
        // Emit damage event before applying damage
        this.eventBus.emit(GameEvents.ENEMY_DAMAGED, {
            enemy,
            damage,
            source,
            healthBefore: enemy.health
        });
        
        // Apply damage
        const killed = enemy.takeDamage(damage);
        
        if (killed) {
            // Award XP
            this.awardXp(enemy.xp);
            
            // Handle spawn block crystal drop
            if (enemy._isSpawnBlock) {
                this.crystals.push(new Crystal(enemy.x, enemy.y, enemy.crystalType));
                
                // Emit spawn block destroyed event
                this.eventBus.emit(GameEvents.SPAWN_BLOCK_DESTROYED, {
                    x: enemy.x,
                    y: enemy.y,
                    crystalType: enemy.crystalType
                });
            }
            
            // Remove from source array unless caller handles it
            if (!options.skipRemoval && enemy._sourceArray) {
                const idx = enemy._sourceArray.indexOf(enemy);
                if (idx !== -1) {
                    enemy._sourceArray.splice(idx, 1);
                }
            }
            
            // Mark as dead
            enemy._dead = true;
            this.enemiesDefeated++;
            
            // Emit kill event
            this.eventBus.emit(GameEvents.ENEMY_KILLED, {
                enemy,
                damage,
                source,
                totalDefeated: this.enemiesDefeated
            });
        }
        
        return killed;
    }
    
    /**
     * Handle player taking damage from an enemy
     * Centralizes player damage handling with event emission
     * 
     * @param {object} enemy - The enemy dealing damage
     * @param {number} damage - Amount of damage (defaults to enemy.damage)
     * @returns {boolean} - True if damage was applied (not blocked by i-frames)
     */
    handlePlayerDamage(enemy, damage = null) {
        const actualDamage = damage ?? enemy.damage;
        const healthBefore = this.player.health;
        
        const damageApplied = this.player.takeDamage(actualDamage);
        
        if (damageApplied) {
            // Emit player damaged event
            this.eventBus.emit(GameEvents.PLAYER_DAMAGED, {
                damage: actualDamage,
                source: enemy,
                healthBefore,
                healthAfter: this.player.health
            });
            
            // Apply frozen armor slow effect if player has it
            const frozenArmor = this.player.powers.find(p => p.id === 'frozenArmor');
            if (frozenArmor && enemy.applySlow) {
                enemy.applySlow(0.3 + frozenArmor.level * 0.1, 1.0);
            }
        }
        
        return damageApplied;
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
        
        // Adaptive rendering: enable simplified mode when many enemies are on screen
        const totalEnemies = this.getTotalEnemyCount();
        setSimplifiedRendering(totalEnemies > 300);
        
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
        
        // Draw crucible effects (under everything)
        for (const crucible of this.crucibleEffects) {
            crucible.render(ctx, this.camera);
        }
        
        // Draw cryostasis beams
        for (const beam of this.cryostasisBeams) {
            beam.render(ctx, this.camera);
        }
        
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
        
        // Draw power rune tether lines first
        this.renderRuneTethers(ctx);
        
        // Draw power runes
        for (const rune of this.powerRunes) {
            if (this.camera.isVisible(rune.x, rune.y, 50)) {
                rune.render(ctx, this.camera);
            }
        }
        
        // Draw all enemies via EnemyManager (handles visibility culling)
        this.enemyManager.render(ctx, this.camera);
        
        // Draw spawn blocks (managed separately as stationary structures)
        for (const block of this.spawnBlocks) {
            if (this.camera.isVisible(block.x, block.y, block.radius)) {
                block.render(ctx, this.camera);
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
        
        // Draw floating texts (on top of entities)
        for (const text of this.floatingTexts) {
            text.render(ctx, this.camera);
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
    
    /**
     * Render connecting lines between tethered power runes in the same group
     */
    renderRuneTethers(ctx) {
        // Group runes by their groupId
        const runeGroups = new Map();
        for (const rune of this.powerRunes) {
            if (rune.groupId) {
                if (!runeGroups.has(rune.groupId)) {
                    runeGroups.set(rune.groupId, []);
                }
                runeGroups.get(rune.groupId).push(rune);
            }
        }
        
        // Debug: log groups once at the start
        if (this.powerRunes.length > 0 && !this._tethersLogged) {
            console.log('Rune groups:', runeGroups.size, 'groups from', this.powerRunes.length, 'runes');
            for (const [gid, runes] of runeGroups) {
                console.log('  Group', gid, 'has', runes.length, 'runes');
            }
            this._tethersLogged = true;
        }
        if (this.powerRunes.length === 0) {
            this._tethersLogged = false;
        }
        
        // Draw lines between runes in each group
        for (const [groupId, runes] of runeGroups) {
            if (runes.length < 2) continue;
            
            // Calculate average alpha based on lifetime for fading
            const avgAlpha = runes.reduce((sum, r) => {
                const fadeStart = 2.0;
                let alpha = 1.0;
                if (r.lifetime < fadeStart) {
                    alpha = r.lifetime / fadeStart;
                }
                return sum + alpha;
            }, 0) / runes.length;
            
            // Draw lines connecting each rune to all others (triangle pattern for 3 runes)
            ctx.save();
            ctx.globalAlpha = avgAlpha * 0.4;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            
            ctx.beginPath();
            for (let i = 0; i < runes.length; i++) {
                for (let j = i + 1; j < runes.length; j++) {
                    const screen1 = this.camera.worldToScreen(runes[i].x, runes[i].y);
                    const screen2 = this.camera.worldToScreen(runes[j].x, runes[j].y);
                    ctx.moveTo(screen1.x, screen1.y);
                    ctx.lineTo(screen2.x, screen2.y);
                }
            }
            ctx.stroke();
            
            // Draw a subtle glow effect on the lines
            ctx.globalAlpha = avgAlpha * 0.15;
            ctx.strokeStyle = '#88ccff';
            ctx.lineWidth = 6;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            
            ctx.restore();
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

