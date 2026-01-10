# Adding a New Power - Complete Guide

This guide documents every step required to implement a new power in the game, using the Crucible power as a reference. The Crucible is a complex power with custom visual effects, timed status effects, damage scaling, and enemy behavior modifications—making it an excellent template.

---

## Table of Contents

1. [Overview: Power System Architecture](#1-overview-power-system-architecture)
2. [Step 1: Define the Power in `powers.js`](#step-1-define-the-power-in-powersjs)
3. [Step 2: Create Effect Class(es) in `projectile.js`](#step-2-create-effect-classes-in-projectilejs)
4. [Step 3: Add Cast Method to PowerManager](#step-3-add-cast-method-to-powermanager)
5. [Step 4: Register Power in `castPower()` Switch](#step-4-register-power-in-castpower-switch)
6. [Step 5: Update PowerManager Constructor (if new effect type)](#step-5-update-powermanager-constructor-if-new-effect-type)
7. [Step 6: Integrate into Game Loop (`game.js`)](#step-6-integrate-into-game-loop-gamejs)
8. [Step 7: Add Power Icon to `powerRune.js`](#step-7-add-power-icon-to-powerrunejs)
9. [Step 8: Add to `generatePowerOptions()`](#step-8-add-to-generatepoweroptions)
10. [Step 9: (Optional) Add Enemy Status Effects](#step-9-optional-add-enemy-status-effects)
11. [Complete Example: Crucible Power Implementation](#complete-example-crucible-power-implementation)
12. [Testing Your Power](#testing-your-power)

---

## 1. Overview: Power System Architecture

The power system consists of several interconnected files:

| File | Responsibility |
|------|----------------|
| `powers.js` | Power definitions (`POWERS` object) and `PowerManager` class |
| `projectile.js` | Effect classes (`Projectile`, `AreaEffect`, `RingEffect`, `CrucibleEffect`, etc.) |
| `powerRune.js` | Power icons for collectible runes (`POWER_ICONS` object) |
| `game.js` | Game loop integration, effect arrays, collision/damage processing |
| `enemy.js` | Enemy status effect methods (if power applies status effects) |
| `statusEffects.js` | Player status effect system (for buffs) |

### Power Categories

Powers belong to one of three categories:
- **`heat`** - Fire/magma themed (colors: `#ff6b35`, `#dc143c`)
- **`cold`** - Ice/frost themed (colors: `#4fc3f7`)
- **`force`** - Gravity/kinetic themed (colors: `#ba68c8`)

### Power Types

- **Active Powers** (`passive: false`): Auto-cast on cooldown
- **Passive Powers** (`passive: true`): Always active, modify player stats

---

## Step 1: Define the Power in `powers.js`

Add your power to the `POWERS` object near the top of the file:

```javascript
// In powers.js - POWERS object

export const POWERS = {
    // ... existing powers ...
    
    myNewPower: {
        id: 'myNewPower',           // Unique identifier (must match key)
        name: 'My New Power',       // Display name
        description: 'Does something cool to enemies',  // Tooltip text
        category: 'heat',           // 'heat' | 'cold' | 'force'
        baseCooldown: 8.0,          // Seconds between casts
        passive: false,             // true for always-active powers
        levelScale: {
            cooldown: 0.88,         // Multiplier per level (< 1 = faster)
            damage: 1.15,           // Multiplier per level (> 1 = stronger)
            radius: 1.05,           // Optional: area size scaling
            count: 0.5,             // Optional: for projectile count (adds floor(level * count))
            // Add any custom scaling properties your power needs
        },
        // Optional: custom base properties
        baseMaxShields: 4,          // Example from orbitalShields
    },
};
```

### Level Scaling Formula

The game calculates scaled values using:

```javascript
// For multiplier scaling (cooldown, damage, radius):
scaledValue = baseValue * Math.pow(levelScale.property, level - 1);

// For additive scaling (count):
count = baseCount + Math.floor(level * levelScale.count);
```

### Example: Crucible Definition

```javascript
crucible: {
    id: 'crucible',
    name: 'Crucible',
    description: 'Creates a smoldering area that glows with increasing heat',
    category: 'heat',
    baseCooldown: 8.0,
    passive: false,
    levelScale: {
        cooldown: 0.88,    // 12% faster per level
        damage: 1.15,      // 15% more damage per level
        radius: 1.05       // 5% bigger radius per level
    }
},
```

---

## Step 2: Create Effect Class(es) in `projectile.js`

If your power creates a new type of visual/gameplay effect, create a class in `projectile.js`.

### Effect Class Template

```javascript
// In projectile.js

export class MyNewEffect {
    constructor(x, y, radius, duration, options = {}) {
        // Position (world coordinates)
        this.x = x;
        this.y = y;
        
        // Core properties
        this.radius = radius;
        this.duration = duration;
        this.age = 0;
        
        // Visual properties
        this.color = options.color || '#ff6b35';
        
        // Damage properties (if applicable)
        this.damage = options.damage || 10;
        this.damageInterval = options.damageInterval || 0.5;
        this.damageTimer = 0;
        
        // Level for scaling calculations
        this.level = options.level || 1;
        
        // Track enemies hit (if needed for one-time effects)
        this.hitEnemies = new Set();
        
        // Status effect triggers (if applicable)
        this.effectTriggered = false;
    }

    // Called every frame - return false when effect should be removed
    update(dt) {
        this.age += dt;
        this.damageTimer += dt;
        return this.age < this.duration;  // false = remove effect
    }

    // Check if damage should be applied this frame
    canDamage() {
        if (this.damageTimer >= this.damageInterval) {
            this.damageTimer = 0;
            return true;
        }
        return false;
    }

    // Get damage amount (can scale with progress/intensity)
    getDamage() {
        return this.damage * this.level;
    }

    // Get effect progress (0 to 1)
    getProgress() {
        return this.age / this.duration;
    }

    // Check if an enemy is within effect area
    isEnemyInArea(enemy) {
        const dist = distance(this.x, this.y, enemy.x, enemy.y);
        return dist < this.radius + enemy.radius;
    }

    // Render the effect - MUST scale with camera.zoom
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        const scale = camera.zoom;
        const r = this.radius * scale;
        
        ctx.save();
        
        // Calculate alpha based on age (fade out near end)
        const progress = this.getProgress();
        const alpha = progress < 0.7 ? 1.0 : 1.0 - ((progress - 0.7) / 0.3);
        ctx.globalAlpha = alpha;
        
        // Draw your effect here
        // Example: gradient circle
        const gradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, r
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
```

### Key Rendering Rules

1. **Always convert world to screen coordinates**: `camera.worldToScreen(this.x, this.y)`
2. **Always scale sizes with zoom**: `this.radius * camera.zoom`
3. **Use `ctx.save()` / `ctx.restore()`** to isolate your drawing state
4. **Handle alpha/fading** based on effect progress

### Existing Effect Classes You Can Use

| Class | Use Case | Key Options |
|-------|----------|-------------|
| `Projectile` | Moving projectiles | `piercing`, `knockback`, `slowAmount`, `lifetime` |
| `AreaEffect` | Stationary damage zones | `damageInterval`, `pullForce`, `slowAmount`, `type` |
| `RingEffect` | Expanding ring | `maxRadius`, `knockback` |
| `CrucibleEffect` | Complex timed area | Custom status effect triggers |
| `OrbitalShield` | Orbiting objects | Launches on collision |

---

## Step 3: Add Cast Method to PowerManager

Add a `castMyNewPower()` method to the `PowerManager` class:

```javascript
// In powers.js - PowerManager class

castMyNewPower(level, def) {
    // Calculate scaled values
    const radius = 100 * Math.pow(def.levelScale.radius || 1, level - 1);
    const damage = 20 * Math.pow(def.levelScale.damage || 1, level - 1);
    const duration = 4.0;
    
    // Determine spawn position (common patterns below)
    
    // Pattern A: At player position
    const spawnX = this.player.x;
    const spawnY = this.player.y;
    
    // Pattern B: Random position near player
    const spawnAngle = randomRange(0, Math.PI * 2);
    const spawnDist = randomRange(0, 750);
    const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDist;
    const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDist;
    
    // Pattern C: Targeted at nearest enemy
    const allTargets = this.getAllTargets();
    const nearest = findClosest(allTargets, this.player.x, this.player.y);
    let targetAngle;
    if (nearest) {
        targetAngle = angle(this.player.x, this.player.y, nearest.x, nearest.y);
    } else {
        targetAngle = randomRange(0, Math.PI * 2);
    }
    
    // Create the effect and add to appropriate array
    const effect = new MyNewEffect(
        spawnX,
        spawnY,
        radius,
        duration,
        {
            color: '#ff6b35',
            damage: damage,
            level: level
        }
    );
    
    // Add to the appropriate effect array
    this.myNewEffects.push(effect);  // If new effect type
    // OR
    this.areaEffects.push(effect);   // If using existing AreaEffect
    // OR
    this.projectiles.push(projectile); // If creating projectiles
}
```

### Crucible Cast Method Example

```javascript
castCrucible(level, def) {
    const radius = 450 * Math.pow(def.levelScale.radius || 1, level - 1);
    const duration = 4.0;
    
    // Random location within 750 radius of player
    const spawnAngle = randomRange(0, Math.PI * 2);
    const spawnDist = randomRange(0, 750);
    const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDist;
    const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDist;
    
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
    
    this.crucibleEffects.push(crucible);
}
```

---

## Step 4: Register Power in `castPower()` Switch

Add your power to the switch statement in `castPower()`:

```javascript
// In powers.js - PowerManager.castPower()

castPower(power) {
    const def = POWERS[power.id];
    const level = this.getEffectiveLevel(power);

    switch (power.id) {
        // ... existing cases ...
        
        case 'myNewPower':
            this.castMyNewPower(level, def);
            break;
    }
}
```

---

## Step 5: Update PowerManager Constructor (if new effect type)

If you created a new effect class (not reusing `Projectile`, `AreaEffect`, etc.), update the `PowerManager` constructor:

```javascript
// In powers.js

export class PowerManager {
    constructor(player, projectiles, areaEffects, ringEffects, crucibleEffects = [], myNewEffects = []) {
        this.player = player;
        this.projectiles = projectiles;
        this.areaEffects = areaEffects;
        this.ringEffects = ringEffects;
        this.crucibleEffects = crucibleEffects;
        this.myNewEffects = myNewEffects;  // Add your new array
        // ... rest of constructor
    }
}
```

---

## Step 6: Integrate into Game Loop (`game.js`)

### 6.1 Add Effect Array to Game Class

```javascript
// In game.js - Game constructor

constructor() {
    // ... existing arrays ...
    this.myNewEffects = [];  // Add your new effect array
}
```

### 6.2 Pass Array to PowerManager

```javascript
// In game.js - where PowerManager is created

this.powerManager = new PowerManager(
    this.player,
    this.projectiles,
    this.areaEffects,
    this.ringEffects,
    this.crucibleEffects,
    this.myNewEffects  // Pass your new array
);
```

### 6.3 Add Update Loop for Effects

```javascript
// In game.js - update() method

// Update myNewEffects
for (let i = this.myNewEffects.length - 1; i >= 0; i--) {
    const effect = this.myNewEffects[i];
    
    // Remove if expired
    if (!effect.update(dt)) {
        this.myNewEffects.splice(i, 1);
        continue;
    }
    
    // Get all enemies that could be affected
    const allEnemies = [
        ...this.builders,
        ...this.fighters,
        ...this.fieryEnemies,
        ...this.gravitationalEnemies,
        ...this.fastPurpleEnemies,
        ...this.spawnBlocks
    ].filter(e => !e._dead);
    
    // Apply damage if applicable
    if (effect.canDamage()) {
        const damage = effect.getDamage();
        for (const enemy of allEnemies) {
            if (effect.isEnemyInArea(enemy)) {
                if (enemy.takeDamage(damage)) {
                    this.awardXp(enemy.xp);
                    // Handle spawn block crystal drops
                    if (enemy._isSpawnBlock) {
                        this.crystals.push(new Crystal(enemy.x, enemy.y, enemy.crystalType));
                    }
                    // Remove from source array
                    if (enemy._sourceArray) {
                        const idx = enemy._sourceArray.indexOf(enemy);
                        if (idx !== -1) {
                            enemy._sourceArray.splice(idx, 1);
                        }
                    }
                    enemy._dead = true;
                    this.enemiesDefeated++;
                }
            }
        }
    }
    
    // Apply any status effects (see Step 9)
    // ...
}
```

### 6.4 Add Render Call

```javascript
// In game.js - render() method, in appropriate render order

// Render myNewEffects (usually with other area effects)
for (const effect of this.myNewEffects) {
    effect.render(ctx, this.camera);
}
```

### 6.5 Reset Array on Game Reset

```javascript
// In game.js - resetGame() method

resetGame() {
    // ... existing resets ...
    this.myNewEffects = [];
}
```

---

## Step 7: Add Power Icon to `powerRune.js`

Add an icon definition to the `POWER_ICONS` object:

```javascript
// In powerRune.js - POWER_ICONS object

const POWER_ICONS = {
    // ... existing icons ...
    
    myNewPower: {
        color: '#ff6b35',                    // Primary icon color
        glowColor: 'rgba(255, 107, 53, 0.5)', // Glow effect color
        render: (ctx, x, y, size) => {
            // Draw your icon here
            // x, y = center position
            // size = radius to draw within
            
            // Example: Simple flame shape
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
};
```

### Icon Drawing Tips

- The context already has `fillStyle` and `strokeStyle` set to the icon color and white
- Use `size` to scale all measurements (icon should fit in a circle of radius `size`)
- Use `ctx.fill()` for filled shapes, `ctx.stroke()` for outlines
- Keep icons recognizable at small sizes

### Crucible Icon Example

```javascript
crucible: {
    color: '#dc143c',
    glowColor: 'rgba(220, 20, 60, 0.6)',
    render: (ctx, x, y, size) => {
        // Outer vessel (bowl shape)
        ctx.beginPath();
        ctx.moveTo(x - size * 0.6, y - size * 0.1);
        ctx.quadraticCurveTo(x - size * 0.7, y + size * 0.6, x, y + size * 0.7);
        ctx.quadraticCurveTo(x + size * 0.7, y + size * 0.6, x + size * 0.6, y - size * 0.1);
        // ... more path commands ...
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
        
        // Rising heat waves
        ctx.strokeStyle = '#ff4500';
        ctx.lineWidth = 2;
        // ... draw flames ...
    }
},
```

---

## Step 8: Add to `generatePowerOptions()`

Add your power ID to the appropriate category array in `generatePowerOptions()`:

```javascript
// In powers.js - PowerManager.generatePowerOptions()

static generatePowerOptions(category, existingPowers) {
    const powersByCategory = {
        heat: ['crucible', 'magmaPool', 'infernoRing', 'myNewPower'],  // Add here if heat
        cold: ['iceShards', 'frostNova', 'frozenArmor'],
        force: ['forceBolt', 'gravityWell', 'orbitalShields']
    };
    // ... rest of method unchanged
}
```

---

## Step 9: (Optional) Add Enemy Status Effects

If your power applies status effects to enemies, you need to:

### 9.1 Add Status Properties to Enemy Classes

```javascript
// In enemy.js - Fighter class (and other enemy classes that need it)

constructor(x, y) {
    // ... existing properties ...
    
    // Your new status effect
    this.myStatusEffectTime = 0;
    this.myStatusEffectIntensity = 0;
}
```

### 9.2 Add Apply Method

```javascript
// In enemy.js - Fighter class

applyMyStatusEffect(duration, intensity = 1.0) {
    this.myStatusEffectTime = Math.max(this.myStatusEffectTime, duration);
    this.myStatusEffectIntensity = intensity;
}
```

### 9.3 Add Update Logic

```javascript
// In enemy.js - Fighter.update()

update(dt, playerX, playerY, spawnBlocks = []) {
    // ... existing status effect updates ...
    
    // Update your status effect timer
    if (this.myStatusEffectTime > 0) {
        this.myStatusEffectTime -= dt;
    }
    
    // Handle status effect behavior
    if (this.myStatusEffectTime > 0) {
        // Modify enemy behavior here
        // Return early if movement is completely overridden
    }
    
    // ... rest of update logic
}
```

### 9.4 Trigger Status Effect in Game Loop

```javascript
// In game.js - update() method, inside your effect's update loop

// Check if status effect should be triggered
if (effect.shouldTriggerMyStatus()) {
    const duration = effect.getRemainingDuration();
    for (const enemy of allEnemies) {
        if (effect.isEnemyInArea(enemy)) {
            if (typeof enemy.applyMyStatusEffect === 'function') {
                enemy.applyMyStatusEffect(duration);
            }
        }
    }
}
```

### Crucible Status Effects Example

The Crucible applies three status effects at different times:

| Effect | Trigger | Behavior |
|--------|---------|----------|
| **Delirious** | 30% progress | Enemies alternate between chasing and wandering randomly |
| **Immobilize** | 70% progress | Select N enemies (scales with level) who cannot move |
| **Burning Panic** | 90% progress | Immobilized enemies burst into flames, run randomly, leave fire trails |

---

## Complete Example: Crucible Power Implementation

Here's every piece of code for the Crucible power across all files:

### powers.js - Definition

```javascript
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
    }
},
```

### powers.js - Cast Method

```javascript
castCrucible(level, def) {
    const radius = 450 * Math.pow(def.levelScale.radius || 1, level - 1);
    const duration = 4.0;
    
    const spawnAngle = randomRange(0, Math.PI * 2);
    const spawnDist = randomRange(0, 750);
    const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDist;
    const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDist;
    
    const crucible = new CrucibleEffect(
        spawnX, spawnY, radius, duration,
        {
            baseColor: '#8b0000',
            peakColor: '#ff4500',
            level: level
        }
    );
    
    this.crucibleEffects.push(crucible);
}
```

### projectile.js - CrucibleEffect Class

See the full class in `projectile.js` lines 305-510. Key features:
- Glow intensity phases (dim → bright → fade)
- Timed trigger methods for status effects
- Damage scaling with intensity
- Complex visual rendering with gradients and particles

### powerRune.js - Icon

See `POWER_ICONS.crucible` in `powerRune.js` lines 8-57.

### game.js - Update Loop

See `game.js` lines 631-743 for the complete crucible effect processing including:
- Damage application
- Delirious trigger at 30%
- Immobilize trigger at 70%
- Burning panic burst at 90%

### enemy.js - Status Effect Methods

See `Fighter` class lines 741-890 for:
- `applyDelirious()`
- `applyImmobilize()`
- `applyBurningPanic()`
- Update logic handling each state

---

## Testing Your Power

### Manual Testing Checklist

1. **Power Definition**
   - [ ] Power appears in upgrade selection when collecting crystal of matching category
   - [ ] Cooldown decreases appropriately with levels
   - [ ] Damage/radius scale correctly with levels

2. **Visual Effects**
   - [ ] Effect renders at correct position
   - [ ] Effect scales properly when zooming in/out
   - [ ] Animations/particles look correct
   - [ ] Fading works properly at end of duration

3. **Damage & Collision**
   - [ ] Enemies take damage at correct intervals
   - [ ] Damage amounts are correct for level
   - [ ] XP is awarded on kills
   - [ ] Spawn blocks drop crystals when destroyed

4. **Status Effects (if applicable)**
   - [ ] Status effects trigger at correct timing
   - [ ] Enemy behavior changes appropriately
   - [ ] Status effects expire correctly

5. **Power Icon**
   - [ ] Icon displays correctly on power runes
   - [ ] Icon is recognizable and matches power theme
   - [ ] Colors match category (heat=orange/red, cold=blue, force=purple)

### Quick Test Setup

Start the game and use browser console to give yourself a power:

```javascript
// Access the game instance
const game = window.game;

// Add a power directly
game.player.powers.push({
    id: 'myNewPower',
    level: 3,
    runesCollected: 6,
    passive: false
});
```

---

## Summary Checklist

- [ ] **Step 1**: Add power to `POWERS` object in `powers.js`
- [ ] **Step 2**: Create effect class in `projectile.js` (if needed)
- [ ] **Step 3**: Add `castMyNewPower()` method to `PowerManager`
- [ ] **Step 4**: Add case to `castPower()` switch statement
- [ ] **Step 5**: Update `PowerManager` constructor (if new effect array)
- [ ] **Step 6**: Integrate into `game.js`:
  - [ ] Add effect array to Game class
  - [ ] Pass array to PowerManager
  - [ ] Add update loop for effects
  - [ ] Add render call
  - [ ] Reset array in `resetGame()`
- [ ] **Step 7**: Add icon to `POWER_ICONS` in `powerRune.js`
- [ ] **Step 8**: Add power ID to `generatePowerOptions()`
- [ ] **Step 9**: Add enemy status effects (if applicable)

