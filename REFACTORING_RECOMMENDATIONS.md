# Codebase Refactoring Recommendations

This document outlines architectural improvements to reduce code duplication, improve maintainability, and enable adding new powers, enemy types, and mechanics with minimal changes.

---

## Executive Summary

### Current Problems

| Issue | Impact | Lines Affected |
|-------|--------|----------------|
| Enemy classes duplicate 60-70% of their code | Adding new enemy types requires 200+ lines of copy-paste | ~1,500 lines in `enemy.js` |
| Separate arrays for each enemy type | Same loop logic repeated 5-6 times throughout `game.js` | ~400 lines in `game.js` |
| Damage handling pattern repeated 12+ times | Bug fixes require changes in many places | ~150 lines in `game.js` |
| Adding powers requires 8 file changes | High friction for new content | Documented in `ADDING_POWERS.md` |
| Switch statements for power dispatch | Must modify existing code for new powers | `powers.js` |

### Goals

1. **Reduce duplication** - Eliminate ~2,000 lines of repeated code
2. **Single point of change** - Adding new enemies/powers should require changes in 1-2 places
3. **Extensibility** - Support future complex mechanics (bosses, channeled powers, combos) without major refactoring
4. **Maintain testability** - Keep logic isolated and testable

---

## Recommendation 1: BaseEnemy Class with Behavior Composition

### Problem

Each enemy class (Builder, Fighter, FieryEnemy, GravitationalEnemy, FastPurpleEnemy) contains nearly identical code for:
- Status effects (slow, knockback, delirious, immobilize, burning panic)
- Damage handling
- Update loop structure
- Rendering patterns

### Solution

Create a hybrid system: a `BaseEnemy` class for shared logic, with optional `Behavior` components for unique functionality.

### Architecture

```
js/
├── entities/
│   ├── BaseEnemy.js          # Shared enemy logic
│   ├── Behavior.js           # Base behavior class
│   └── behaviors/
│       ├── StatusEffectsBehavior.js
│       ├── KnockbackBehavior.js
│       ├── FireTrailBehavior.js
│       ├── GravityPullBehavior.js
│       └── ChasePlayerBehavior.js
├── enemies/
│   ├── Builder.js            # Extends BaseEnemy
│   ├── Fighter.js
│   ├── FieryEnemy.js
│   ├── GravitationalEnemy.js
│   ├── FastPurpleEnemy.js
│   └── EnemyFactory.js       # Factory for creating enemies
```

### BaseEnemy Class Structure

```javascript
// js/entities/BaseEnemy.js
import { ENEMY_TYPES } from './EnemyTypes.js';

export class BaseEnemy {
    constructor(x, y, type, scaling = {}) {
        const config = ENEMY_TYPES[type];
        
        // Position
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Stats (with optional scaling)
        this.radius = config.radius * (scaling.radius || 1);
        this.baseSpeed = config.speed * (scaling.speed || 1);
        this.speed = this.baseSpeed;
        this.maxHealth = Math.floor(config.health * (scaling.health || 1));
        this.health = this.maxHealth;
        this.damage = Math.floor(config.damage * (scaling.damage || 1));
        this.color = config.color;
        this.xp = config.xp;
        
        // Status effects - ALL enemies have these
        this.slowAmount = 0;
        this.slowTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.deliriousTime = 0;
        this.deliriousPhase = 'chase';
        this.deliriousPhaseDuration = 0.8;
        this.deliriousPhaseTimer = 0;
        this.deliriousWanderAngle = 0;
        this.immobilizedTime = 0;
        this.burningPanicTime = 0;
        this.burningPanicAngle = 0;
        this.burningPanicSpeed = 400;
        this.burningTrailTimer = 0;
        this.burningTrailInterval = 0.05;
        
        // Visual
        this.hurtTime = 0;
        
        // Composable behaviors (optional, for complex enemies)
        this.behaviors = new Map();
        
        // Runtime tracking
        this._dead = false;
        this._sourceArray = null;
    }

    // ==================== STATUS EFFECT METHODS ====================
    // These are identical for ALL enemies - defined once here
    
    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTime = Math.max(this.slowTime, duration);
    }

    applyDelirious(duration) {
        if (this.deliriousTime <= 0) {
            this.deliriousPhase = Math.random() < 0.5 ? 'chase' : 'wander';
            this.deliriousPhaseTimer = 0;
            this.deliriousWanderAngle = Math.random() * Math.PI * 2;
        }
        this.deliriousTime = Math.max(this.deliriousTime, duration);
    }

    applyImmobilize(duration) {
        this.immobilizedTime = Math.max(this.immobilizedTime, duration);
    }

    applyBurningPanic(duration) {
        this.burningPanicTime = duration;
        this.burningPanicAngle = Math.random() * Math.PI * 2;
        this.immobilizedTime = 0;
    }

    applyKnockback(dirX, dirY, force) {
        this.knockbackX += dirX * force;
        this.knockbackY += dirY * force;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hurtTime = 0.1;
        return this.health <= 0;
    }

    // ==================== UPDATE LOOP ====================
    // Template method pattern - subclasses override updateBehavior()
    
    update(dt, playerX, playerY, context = {}) {
        // 1. Update status effect timers
        this.updateStatusEffectTimers(dt);
        
        // 2. Update speed based on slow
        this.updateSpeed();
        
        // 3. Apply knockback (always, even when immobilized)
        this.applyKnockbackMovement(dt);
        
        // 4. Run composable behaviors (if any)
        for (const behavior of this.behaviors.values()) {
            if (behavior.enabled) {
                const result = behavior.update(dt, { playerX, playerY, ...context });
                if (result) return result; // Allow behaviors to return effects
            }
        }
        
        // 5. Handle burning panic (overrides normal movement)
        if (this.burningPanicTime > 0) {
            return this.updateBurningPanic(dt);
        }
        
        // 6. Handle immobilize (skip movement)
        if (this.immobilizedTime > 0) {
            this.updateVisuals(dt);
            return null;
        }
        
        // 7. Handle delirious (erratic movement)
        if (this.deliriousTime > 0) {
            return this.updateDelirious(dt, playerX, playerY);
        }
        
        // 8. Normal movement - subclass implements this
        return this.updateBehavior(dt, playerX, playerY, context);
    }

    // Override in subclasses
    updateBehavior(dt, playerX, playerY, context) {
        return null;
    }

    // ==================== SHARED UPDATE LOGIC ====================
    
    updateStatusEffectTimers(dt) {
        if (this.slowTime > 0) this.slowTime -= dt;
        if (this.deliriousTime > 0) this.deliriousTime -= dt;
        if (this.immobilizedTime > 0) this.immobilizedTime -= dt;
        if (this.burningPanicTime > 0) this.burningPanicTime -= dt;
        if (this.hurtTime > 0) this.hurtTime -= dt;
    }

    updateSpeed() {
        if (this.slowTime > 0) {
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.slowAmount = 0;
            this.speed = this.baseSpeed;
        }
    }

    applyKnockbackMovement(dt) {
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dt * 10;
            this.y += this.knockbackY * dt * 10;
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
        }
    }

    updateBurningPanic(dt) {
        // Random direction changes
        if (Math.random() < 0.05) {
            this.burningPanicAngle += (Math.random() - 0.5) * Math.PI * 0.5;
        }
        
        // Move fast
        this.x += Math.cos(this.burningPanicAngle) * this.burningPanicSpeed * dt;
        this.y += Math.sin(this.burningPanicAngle) * this.burningPanicSpeed * dt;
        
        // Fire trail
        this.burningTrailTimer += dt;
        if (this.burningTrailTimer >= this.burningTrailInterval) {
            this.burningTrailTimer = 0;
            return {
                type: 'fireTrail',
                x: this.x,
                y: this.y,
                radius: 20,
                duration: 1.5,
                damage: 8,
                creator: this
            };
        }
        return null;
    }

    updateDelirious(dt, playerX, playerY) {
        this.deliriousPhaseTimer += dt;
        if (this.deliriousPhaseTimer >= this.deliriousPhaseDuration) {
            this.deliriousPhaseTimer = 0;
            this.deliriousPhase = this.deliriousPhase === 'chase' ? 'wander' : 'chase';
            if (this.deliriousPhase === 'wander') {
                this.deliriousWanderAngle = Math.random() * Math.PI * 2;
            }
        }
        
        if (this.deliriousPhase === 'chase') {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.x += (dx / len) * this.speed * dt;
            this.y += (dy / len) * this.speed * dt;
        } else {
            this.x += Math.cos(this.deliriousWanderAngle) * this.speed * dt;
            this.y += Math.sin(this.deliriousWanderAngle) * this.speed * dt;
        }
        return null;
    }

    updateVisuals(dt) {
        // Override in subclass if needed
    }

    // ==================== BEHAVIOR COMPOSITION ====================
    
    addBehavior(name, behavior) {
        this.behaviors.set(name, behavior);
        if (behavior.onAdd) behavior.onAdd();
        return this;
    }

    removeBehavior(name) {
        const behavior = this.behaviors.get(name);
        if (behavior) {
            if (behavior.onRemove) behavior.onRemove();
            this.behaviors.delete(name);
        }
        return this;
    }

    getBehavior(name) {
        return this.behaviors.get(name);
    }

    // ==================== RENDERING ====================
    
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Render status effects (shared)
        this.renderStatusEffects(ctx, screen, scale, r);
        
        // Render body (subclass)
        this.renderBody(ctx, screen, scale, r);
        
        // Render behaviors
        for (const behavior of this.behaviors.values()) {
            if (behavior.render) {
                behavior.render(ctx, camera);
            }
        }
        
        ctx.restore();
    }

    renderStatusEffects(ctx, screen, scale, r) {
        // Burning panic glow
        if (this.burningPanicTime > 0) {
            const flameSize = r * 2;
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, flameSize
            );
            gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, flameSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Slow effect (frost)
        if (this.slowTime > 0) {
            ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderBody(ctx, screen, scale, r) {
        // Default circle body - override in subclass for custom visuals
        let fillColor = this.color;
        if (this.hurtTime > 0) fillColor = '#ffffff';
        if (this.burningPanicTime > 0) fillColor = '#ff6600';
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
    }
}
```

### Example Subclass (Minimal Code)

```javascript
// js/enemies/FieryEnemy.js
import { BaseEnemy } from '../entities/BaseEnemy.js';
import { FireTrailBehavior } from '../entities/behaviors/FireTrailBehavior.js';

export class FieryEnemy extends BaseEnemy {
    constructor(x, y, scaling = null) {
        super(x, y, 'fiery', scaling);
        
        // Fiery-specific properties
        this.moveAngle = Math.random() * Math.PI * 2;
        this.moveTimer = 0;
        this.moveChangeInterval = 0.5 + Math.random() * 0.5;
        
        // Add fire trail behavior
        this.addBehavior('fireTrail', new FireTrailBehavior(this, 0.07, 15, 6));
    }

    // Only implement the unique movement pattern
    updateBehavior(dt, playerX, playerY, context) {
        this.moveTimer += dt;
        if (this.moveTimer >= this.moveChangeInterval) {
            this.moveTimer = 0;
            this.moveAngle = Math.random() * Math.PI * 2;
            this.moveChangeInterval = 0.5 + Math.random() * 0.5;
        }
        
        this.x += Math.cos(this.moveAngle) * this.speed * dt;
        this.y += Math.sin(this.moveAngle) * this.speed * dt;
        
        return null; // Fire trail handled by behavior
    }
}
```

### Impact

- **Before**: Each enemy class is 200-350 lines
- **After**: Each enemy class is 30-80 lines (unique behavior only)
- **Total savings**: ~1,500 lines

---

## Recommendation 2: Unified Enemy Management

### Problem

`game.js` maintains separate arrays and duplicates operations for each enemy type.

### Solution

Create an `EnemyManager` class that handles all enemies in a unified way.

```javascript
// js/entities/EnemyManager.js

export class EnemyManager {
    constructor() {
        this.enemies = [];
    }

    add(enemy) {
        this.enemies.push(enemy);
    }

    addMultiple(enemies) {
        this.enemies.push(...enemies);
    }

    remove(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) {
            this.enemies.splice(idx, 1);
        }
    }

    getByType(type) {
        return this.enemies.filter(e => e.type === type && !e._dead);
    }

    getAlive() {
        return this.enemies.filter(e => !e._dead);
    }

    count() {
        return this.enemies.length;
    }

    countByType(type) {
        return this.enemies.filter(e => e.type === type && !e._dead).length;
    }

    // Unified update loop
    update(dt, playerX, playerY, context = {}) {
        const effects = [];
        
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            
            const result = enemy.update(dt, playerX, playerY, context);
            if (result) {
                effects.push(result);
            }
        }
        
        return effects;
    }

    // Remove dead enemies
    removeDeadEnemies() {
        this.enemies = this.enemies.filter(e => !e._dead);
    }

    // Check player collisions (returns enemies that hit player)
    checkPlayerCollisions(player) {
        const hits = [];
        for (const enemy of this.enemies) {
            if (enemy._dead || enemy.damage <= 0) continue;
            
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < player.radius + enemy.radius) {
                hits.push(enemy);
            }
        }
        return hits;
    }

    // Despawn far enemies
    despawnFarEnemies(playerX, playerY, maxDistance) {
        this.enemies = this.enemies.filter(enemy => {
            const dx = playerX - enemy.x;
            const dy = playerY - enemy.y;
            return Math.sqrt(dx * dx + dy * dy) <= maxDistance;
        });
    }

    // Insert all enemies into spatial grid
    populateSpatialGrid(spatialGrid) {
        for (const enemy of this.enemies) {
            if (!enemy._dead) {
                spatialGrid.insert(enemy);
            }
        }
    }

    // Render all enemies
    render(ctx, camera) {
        for (const enemy of this.enemies) {
            if (enemy._dead) continue;
            if (camera.isVisible(enemy.x, enemy.y, enemy.radius)) {
                enemy.render(ctx, camera);
            }
        }
    }

    clear() {
        this.enemies = [];
    }
}
```

### Usage in game.js

```javascript
// Before: 6 separate arrays + repeated loops
this.builders = [];
this.fighters = [];
this.fieryEnemies = [];
// ... etc

// After: One manager
this.enemies = new EnemyManager();

// Adding enemies
this.enemies.add(new Builder(x, y));
this.enemies.add(new FieryEnemy(x, y, scaling));

// Update all at once
const effects = this.enemies.update(dt, this.player.x, this.player.y, context);
for (const effect of effects) {
    this.areaEffects.push(new AreaEffect(...));
}

// Player collision - one call instead of 4 separate loops
const hits = this.enemies.checkPlayerCollisions(this.player);
for (const enemy of hits) {
    if (this.player.takeDamage(enemy.damage)) {
        // Handle frozen armor, etc.
    }
}

// Render all
this.enemies.render(ctx, this.camera);
```

### Impact

- Eliminates ~300 lines of repeated loop code in `game.js`
- Single point of change for enemy lifecycle operations
- Easy to add new enemy types without touching `game.js` loops

---

## Recommendation 3: Centralized Damage Handler

### Problem

The same 12-line damage handling pattern appears 12+ times throughout `game.js`.

### Solution

Create a `DamageHandler` utility or method.

```javascript
// Can be a method on Game class or a separate utility

handleEnemyDamage(enemy, damage, source = null) {
    if (enemy._dead) return false;
    
    const killed = enemy.takeDamage(damage);
    
    if (killed) {
        // Award XP
        this.awardXp(enemy.xp);
        
        // Handle special drops (spawn blocks drop crystals)
        if (enemy.onDeath) {
            enemy.onDeath(this); // Let enemy define death behavior
        } else if (enemy.type === 'spawnBlock') {
            this.crystals.push(new Crystal(enemy.x, enemy.y, enemy.crystalType));
        }
        
        // Mark as dead
        enemy._dead = true;
        this.enemiesDefeated++;
        
        // Emit event (for future mechanics like on-kill procs)
        this.events?.emit('enemy:killed', { enemy, source, damage });
    }
    
    return killed;
}
```

### Usage

```javascript
// Before (repeated 12+ times):
if (enemy.takeDamage(damage)) {
    this.awardXp(enemy.xp);
    if (enemy._isSpawnBlock) {
        this.crystals.push(new Crystal(enemy.x, enemy.y, enemy.crystalType));
    }
    if (enemy._sourceArray) {
        const idx = enemy._sourceArray.indexOf(enemy);
        if (idx !== -1) {
            enemy._sourceArray.splice(idx, 1);
        }
    }
    enemy._dead = true;
    this.enemiesDefeated++;
}

// After:
this.handleEnemyDamage(enemy, damage);
```

---

## Recommendation 4: Data-Driven Power System

### Problem

Adding a new power requires changes in 8 different locations (see `ADDING_POWERS.md`).

### Solution

Move power behavior into the power definition itself.

### Power Definition Structure

```javascript
// js/powers/PowerDefinitions.js

export const POWERS = {
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
        
        // Cast function - defines behavior inline
        cast: (ctx) => {
            const { powerManager, level, def, player } = ctx;
            const radius = 450 * Math.pow(def.levelScale.radius || 1, level - 1);
            
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = Math.random() * 750;
            
            powerManager.addEffect(new CrucibleEffect(
                player.x + Math.cos(spawnAngle) * spawnDist,
                player.y + Math.sin(spawnAngle) * spawnDist,
                radius,
                4.0,
                { level }
            ));
        },
        
        // Icon definition (moved from powerRune.js)
        icon: {
            color: '#dc143c',
            glowColor: 'rgba(220, 20, 60, 0.6)',
            render: (ctx, x, y, size) => {
                // Icon rendering code...
            }
        }
    },
    
    // More powers...
};
```

### Simplified PowerManager

```javascript
// No more switch statement!
castPower(power) {
    const def = POWERS[power.id];
    if (!def || !def.cast) return;
    
    const level = this.getEffectiveLevel(power);
    
    def.cast({
        powerManager: this,
        level,
        def,
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        // ... other context
    });
}

// Generate options from data
static generatePowerOptions(category, existingPowers) {
    return Object.values(POWERS)
        .filter(p => p.category === category)
        .map(p => ({
            ...p,
            currentLevel: existingPowers.find(ep => ep.id === p.id)?.level || 0
        }));
}
```

### Adding a New Power

After this refactor, adding a new power requires:

1. ✅ Add entry to `POWERS` object (definition + cast function + icon)
2. ✅ Create effect class if needed (in `projectile.js` or new file)

That's it! No more:
- ❌ Adding to `castPower()` switch
- ❌ Modifying PowerManager constructor
- ❌ Adding to `generatePowerOptions()` array
- ❌ Modifying `game.js` for new effect arrays
- ❌ Separate entry in `powerRune.js`

---

## Recommendation 5: Event System for Future Extensibility

### Purpose

Enables future mechanics that need to react to game events (combos, on-kill procs, achievements, etc.) without modifying core game logic.

### Implementation

```javascript
// js/events/EventBus.js

export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback, priority = 0) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ callback, priority });
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const list = this.listeners.get(event);
        if (list) {
            const idx = list.findIndex(l => l.callback === callback);
            if (idx !== -1) list.splice(idx, 1);
        }
    }

    emit(event, data = {}) {
        const list = this.listeners.get(event);
        if (list) {
            for (const { callback } of list) {
                const result = callback(data);
                if (result === false) break; // Allow cancellation
            }
        }
    }
}
```

### Usage Examples

```javascript
// In Game class
this.events = new EventBus();

// In damage handler
handleEnemyDamage(enemy, damage, source) {
    if (killed) {
        this.events.emit('enemy:killed', { enemy, source, damage });
    }
}

// Future: Combo system (new file, doesn't touch existing code)
game.events.on('power:cast', ({ powerId, category }) => {
    comboTracker.recordCast(powerId);
    if (comboTracker.matches('fire-ice-fire')) {
        triggerComboEffect('steamExplosion');
    }
});

// Future: On-kill healing power
game.events.on('enemy:killed', ({ enemy }) => {
    if (player.hasPower('lifeSteal')) {
        player.heal(enemy.maxHealth * 0.1);
    }
});

// Future: Achievement tracking
game.events.on('enemy:killed', ({ enemy }) => {
    achievements.increment('totalKills');
    if (enemy.type === 'boss') {
        achievements.unlock('bossSlayer');
    }
});
```

---

## Migration Strategy

### Phase 1: BaseEnemy Foundation (Highest Impact)

1. Create `BaseEnemy` class with all shared logic
2. Create `EnemyTypes.js` with configuration data
3. Migrate one enemy at a time (start with `Fighter` - simplest)
4. Update tests as you go

**Estimated effort**: 2-3 days
**Code reduction**: ~1,000 lines

### Phase 2: Unified Enemy Management

1. Create `EnemyManager` class
2. Replace separate arrays in `game.js`
3. Consolidate update/render loops
4. Consolidate collision checks

**Estimated effort**: 1-2 days
**Code reduction**: ~300 lines

### Phase 3: Centralized Damage Handling

1. Create `handleEnemyDamage()` method
2. Replace all inline damage handling
3. Add event emission for extensibility

**Estimated effort**: 0.5 days
**Code reduction**: ~150 lines

### Phase 4: Data-Driven Powers

1. Move `cast` functions into power definitions
2. Move icons into power definitions
3. Remove switch statement from `castPower()`
4. Auto-generate power options from data

**Estimated effort**: 1-2 days
**Code reduction**: ~200 lines + major DX improvement

### Phase 5: Event System (Optional - for future features)

1. Create `EventBus` class
2. Add event emissions to key game events
3. Document available events

**Estimated effort**: 0.5 days
**Enables**: Combos, on-kill procs, achievements, analytics

---

## File Structure After Refactoring

```
js/
├── entities/
│   ├── BaseEnemy.js           # Core enemy class
│   ├── EnemyTypes.js          # Enemy configuration data
│   ├── EnemyManager.js        # Unified enemy collection
│   ├── Behavior.js            # Base behavior class
│   └── behaviors/
│       ├── FireTrailBehavior.js
│       ├── GravityPullBehavior.js
│       └── ...
├── enemies/
│   ├── Builder.js             # Minimal subclass
│   ├── Fighter.js
│   ├── FieryEnemy.js
│   ├── GravitationalEnemy.js
│   ├── FastPurpleEnemy.js
│   └── SpawnBlock.js
├── powers/
│   ├── PowerDefinitions.js    # All powers with cast functions + icons
│   ├── PowerManager.js        # Simplified manager
│   └── effects/               # Effect classes (moved from projectile.js)
│       ├── CrucibleEffect.js
│       ├── AreaEffect.js
│       └── ...
├── events/
│   └── EventBus.js
├── game.js                    # Much smaller - orchestration only
├── player.js
├── camera.js
├── collision.js
├── ui.js
└── utils.js
```

---

## Summary

| Recommendation | Effort | Impact | Priority |
|----------------|--------|--------|----------|
| BaseEnemy class | 2-3 days | ~1,000 lines removed, easy new enemies | **High** |
| EnemyManager | 1-2 days | ~300 lines removed, cleaner game.js | **High** |
| Damage Handler | 0.5 days | ~150 lines removed, consistency | **Medium** |
| Data-Driven Powers | 1-2 days | Major DX improvement | **Medium** |
| Event System | 0.5 days | Future extensibility | **Low** (do when needed) |

**Total estimated effort**: 5-8 days
**Total code reduction**: ~2,000+ lines (~40% of core code)

---

## Testing Notes

- Existing tests should continue to work if enemy interfaces remain compatible
- Add unit tests for `BaseEnemy` status effect methods
- Add integration tests for `EnemyManager` operations
- Test damage handler with various enemy types
- Test power casting through the data-driven system

