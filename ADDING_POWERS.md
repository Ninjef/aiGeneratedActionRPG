# Adding a New Power - Complete Guide

This guide documents every step required to implement a new power in the game. Following the data-driven architecture refactor, adding powers is now significantly simpler.

---

## Table of Contents

1. [Overview: Power System Architecture](#1-overview-power-system-architecture)
2. [Step 1: Add Power Definition to `POWERS` Object](#step-1-add-power-definition-to-powers-object)
3. [Step 2: Create Effect Class (if needed)](#step-2-create-effect-class-if-needed)
4. [Step 3: Integrate Effect into Game Loop (if new effect type)](#step-3-integrate-effect-into-game-loop-if-new-effect-type)
5. [Step 4: (Optional) Add Enemy Status Effects](#step-4-optional-add-enemy-status-effects)
6. [Complete Example: Crucible Power](#complete-example-crucible-power)
7. [Testing Your Power](#testing-your-power)

---

## 1. Overview: Power System Architecture

### Data-Driven Design

The power system uses a **data-driven architecture** where each power is fully defined in a single location - the `POWERS` object in `powers.js`. This includes:

- Power metadata (name, description, category)
- Scaling configuration
- Cast function (inline)
- Icon definition (inline)

### Files Involved

| File | Responsibility |
|------|----------------|
| `powers.js` | Power definitions (`POWERS` object), `PowerManager` class, `getPowerIcon()` helper |
| `projectile.js` | Effect classes (`Projectile`, `AreaEffect`, `RingEffect`, `CrucibleEffect`, etc.) |
| `game.js` | Game loop integration (only for NEW effect types) |
| `js/entities/*.js` | Enemy status effect methods (if power applies status effects) |

### Power Categories

Powers belong to one of three categories:
- **`heat`** - Fire/magma themed (colors: `#ff6b35`, `#dc143c`)
- **`cold`** - Ice/frost themed (colors: `#4fc3f7`, `#88ddff`)
- **`force`** - Gravity/kinetic themed (colors: `#ba68c8`)

### Power Types

- **Active Powers** (`passive: false`): Auto-cast on cooldown
- **Passive Powers** (`passive: true`): Always active, modify player stats (no `cast` function)

---

## Step 1: Add Power Definition to `POWERS` Object

Add your complete power definition to the `POWERS` object in `powers.js`. This is the **only required step** for simple powers that use existing effect classes.

```javascript
// In powers.js - POWERS object

export const POWERS = {
    // ... existing powers ...
    
    myNewPower: {
        id: 'myNewPower',           // Unique identifier (must match key)
        name: 'My New Power',       // Display name
        description: 'Does something cool',  // Tooltip text
        category: 'heat',           // 'heat' | 'cold' | 'force'
        baseCooldown: 5.0,          // Seconds between casts
        passive: false,             // true for always-active powers
        levelScale: {
            cooldown: 0.9,          // Multiplier per level (< 1 = faster)
            damage: 1.15,           // Multiplier per level (> 1 = stronger)
            radius: 1.1,            // Optional: area size scaling
            count: 0.5,             // Optional: for projectile count
        },
        
        // Icon definition (displayed on power runes)
        icon: {
            color: '#ff6b35',                     // Primary icon color
            glowColor: 'rgba(255, 107, 53, 0.5)', // Glow effect color
            render: (ctx, x, y, size) => {
                // Draw icon centered at (x, y) within radius `size`
                ctx.beginPath();
                ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        },
        
        // Cast function - called automatically on cooldown
        cast: (ctx) => {
            const { powerManager, level, def } = ctx;
            
            // Calculate scaled values
            const damage = 20 * Math.pow(def.levelScale.damage, level - 1);
            const radius = 100 * Math.pow(def.levelScale.radius || 1, level - 1);
            
            // Create the effect
            powerManager.areaEffects.push(new AreaEffect(
                powerManager.player.x,
                powerManager.player.y,
                radius,
                damage,
                3.0, // duration
                {
                    color: '#ff6b35',
                    damageInterval: 0.5,
                    type: 'myNewPower'
                }
            ));
        }
    },
};
```

### Level Scaling Formula

```javascript
// For multiplier scaling (cooldown, damage, radius):
scaledValue = baseValue * Math.pow(levelScale.property, level - 1);

// For additive scaling (count):
count = baseCount + Math.floor(level * levelScale.count);
```

### Cast Function Context

The `cast` function receives a context object with:

| Property | Description |
|----------|-------------|
| `powerManager` | Reference to PowerManager (access to effect arrays, player, etc.) |
| `level` | Effective power level (includes bonuses) |
| `def` | The power definition object |
| `player` | Shortcut to `powerManager.player` |

### Available Effect Arrays

Access these through `powerManager`:

```javascript
powerManager.projectiles      // Moving projectiles
powerManager.areaEffects      // Stationary damage zones
powerManager.ringEffects      // Expanding rings
powerManager.crucibleEffects  // Complex timed areas
powerManager.cryostasisBeams  // Ice beam effects
powerManager.orbitalShields   // Orbiting shields
```

### Icon Drawing Tips

- Context has `fillStyle` and `strokeStyle` pre-set to icon color and white
- Use `size` to scale all measurements (icon should fit in radius `size`)
- Use `ctx.fill()` for filled shapes, `ctx.stroke()` for outlines
- Keep icons recognizable at small sizes

**That's it for simple powers!** The system automatically:
- ✅ Registers the power for crystal rewards
- ✅ Handles cooldown timing
- ✅ Displays the icon on power runes
- ✅ Includes it in `generatePowerOptions()`

---

## Step 2: Create Effect Class (if needed)

Only needed if your power requires a **new type of effect** not covered by existing classes.

### Existing Effect Classes

| Class | Use Case | Key Options |
|-------|----------|-------------|
| `Projectile` | Moving projectiles | `piercing`, `knockback`, `slowAmount`, `lifetime` |
| `AreaEffect` | Stationary damage zones | `damageInterval`, `pullForce`, `slowAmount`, `type` |
| `RingEffect` | Expanding ring | `maxRadius`, `knockback` |
| `CrucibleEffect` | Complex timed area | Custom status effect triggers |
| `CryostasisBeam` | Ice beam | Freezing, refraction |
| `OrbitalShield` | Orbiting objects | Launches on collision |

### Effect Class Template

```javascript
// In projectile.js

export class MyNewEffect {
    constructor(x, y, radius, duration, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.duration = duration;
        this.age = 0;
        
        this.color = options.color || '#ff6b35';
        this.damage = options.damage || 10;
        this.damageInterval = options.damageInterval || 0.5;
        this.damageTimer = 0;
        this.level = options.level || 1;
    }

    update(dt) {
        this.age += dt;
        this.damageTimer += dt;
        return this.age < this.duration;  // false = remove
    }

    canDamage() {
        if (this.damageTimer >= this.damageInterval) {
            this.damageTimer = 0;
            return true;
        }
        return false;
    }

    getDamage() {
        return this.damage * this.level;
    }

    isEnemyInArea(enemy) {
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + enemy.radius;
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        // Draw effect (scale everything with camera.zoom)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
```

---

## Step 3: Integrate Effect into Game Loop (if new effect type)

Only needed if you created a **new effect class** in Step 2.

### 3.1 Add Effect Array to `game.js`

```javascript
// In game.js - init() method
this.myNewEffects = [];

// Pass to PowerManager
this.powerManager = new PowerManager(
    this.player,
    this.projectiles,
    this.areaEffects,
    this.ringEffects,
    this.crucibleEffects,
    this.cryostasisBeams
);
// Add: this.powerManager.myNewEffects = this.myNewEffects;
```

### 3.2 Add Update Loop

```javascript
// In game.js - update() method

for (let i = this.myNewEffects.length - 1; i >= 0; i--) {
    const effect = this.myNewEffects[i];
    
    if (!effect.update(dt)) {
        this.myNewEffects.splice(i, 1);
        continue;
    }
    
    // Apply damage to enemies in area
    if (effect.canDamage()) {
        const allEnemies = [
            ...this.enemyManager.getAlive(),
            ...this.spawnBlocks.filter(b => !b._dead)
        ];
        
        const damage = effect.getDamage();
        for (const enemy of allEnemies) {
            if (effect.isEnemyInArea(enemy)) {
                this.handleEnemyDamage(enemy, damage, { source: 'myNewEffect' });
            }
        }
    }
}
```

### 3.3 Add Render Call

```javascript
// In game.js - render() method
for (const effect of this.myNewEffects) {
    effect.render(ctx, this.camera);
}
```

---

## Step 4: (Optional) Add Enemy Status Effects

If your power applies status effects to enemies:

### 4.1 Add to `BaseEnemy` Class

```javascript
// In js/entities/BaseEnemy.js

// Add property in constructor
this.myStatusTime = 0;

// Add apply method
applyMyStatus(duration) {
    this.myStatusTime = Math.max(this.myStatusTime, duration);
}
```

### 4.2 Handle in Enemy Update

```javascript
// In BaseEnemy or specific enemy class

updateStatusEffects(dt) {
    // ... existing effects ...
    if (this.myStatusTime > 0) {
        this.myStatusTime -= dt;
    }
}
```

### 4.3 Apply in Effect Logic

```javascript
// In cast function or game loop
if (effect.shouldTriggerStatus()) {
    for (const enemy of allEnemies) {
        if (effect.isEnemyInArea(enemy) && enemy.applyMyStatus) {
            enemy.applyMyStatus(effect.getRemainingDuration());
        }
    }
}
```

---

## Complete Example: Crucible Power

Here's how Crucible is implemented using the data-driven pattern:

```javascript
// In powers.js - POWERS object

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
            // Crucible vessel shape
            ctx.beginPath();
            ctx.moveTo(x - size * 0.6, y - size * 0.1);
            ctx.quadraticCurveTo(x - size * 0.7, y + size * 0.6, x, y + size * 0.7);
            ctx.quadraticCurveTo(x + size * 0.7, y + size * 0.6, x + size * 0.6, y - size * 0.1);
            // ... more path ...
            ctx.fill();
            ctx.stroke();
            
            // Inner molten glow
            const gradient = ctx.createRadialGradient(x, y + size * 0.2, 0, x, y + size * 0.2, size * 0.4);
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(1, 'rgba(139, 0, 0, 0.5)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(x, y + size * 0.2, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    cast: (ctx) => {
        const { powerManager, level, def } = ctx;
        const radius = 450 * Math.pow(def.levelScale.radius || 1, level - 1);
        const duration = 4.0;
        
        // Random location near player
        const spawnAngle = randomRange(0, Math.PI * 2);
        const spawnDist = randomRange(0, 750);
        const spawnX = powerManager.player.x + Math.cos(spawnAngle) * spawnDist;
        const spawnY = powerManager.player.y + Math.sin(spawnAngle) * spawnDist;
        
        const crucible = new CrucibleEffect(
            spawnX, spawnY, radius, duration,
            {
                baseColor: '#8b0000',
                peakColor: '#ff4500',
                level: level
            }
        );
        
        powerManager.crucibleEffects.push(crucible);
    }
},
```

The `CrucibleEffect` class in `projectile.js` handles:
- Glow intensity phases (dim → bright → fade)
- Timed status effect triggers (delirious at 30%, immobilize at 70%, burning panic at 90%)
- Damage scaling with intensity
- Complex visual rendering

---

## Testing Your Power

### Manual Testing Checklist

- [ ] Power appears when collecting crystal of matching category
- [ ] Cooldown and damage scale correctly with levels
- [ ] Effect renders at correct position and scales with zoom
- [ ] Enemies take damage and award XP on kills
- [ ] Icon displays correctly on power runes
- [ ] Status effects work (if applicable)

### Quick Test Setup

```javascript
// In browser console
const game = window.game;

// Add power directly for testing
game.player.powers.push({
    id: 'myNewPower',
    level: 3,
    runesCollected: 6,
    passive: false
});
```

---

## Summary Checklist

For **simple powers** using existing effects:
- [ ] Add complete definition to `POWERS` object (includes icon + cast function)

For **powers with new effect types**, also:
- [ ] Create effect class in `projectile.js`
- [ ] Add effect array to `game.js`
- [ ] Add update loop in `game.js`
- [ ] Add render call in `game.js`

For **powers with status effects**, also:
- [ ] Add status properties to `BaseEnemy`
- [ ] Add apply method to `BaseEnemy`
- [ ] Handle status in enemy update
