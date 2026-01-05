# Horde Survival RPG - Technical Documentation

A browser-based action RPG where the player fights endless hordes of enemies while collecting crystals to gain magical powers.

## Tech Stack

- **Vanilla HTML5 Canvas + JavaScript (ES Modules)**
- **Vitest** for unit testing
- Requires HTTP server to run (ES modules don't work with `file://`)

## Running the Game

```bash
cd /path/to/game
python3 -m http.server 8080
# Open http://localhost:8080
```

## Running Tests

```bash
npm install        # First time only
npm test           # Run all tests once
npm run test:watch # Watch mode for development
```

## File Structure

```
/
├── index.html          # Entry point, canvas element, UI overlays
├── package.json        # Project config and test scripts
├── vitest.config.js    # Vitest test configuration
├── css/
│   └── style.css       # All styling for UI elements and modals
├── js/
│   ├── game.js         # Main game loop, initialization, orchestration
│   ├── player.js       # Player class (movement, health, crystal inventory)
│   ├── enemy.js        # Enemy class + EnemySpawner + Champion class
│   ├── crystal.js      # Crystal class + CrystalSpawner
│   ├── powers.js       # Power definitions + PowerManager
│   ├── projectile.js   # Projectile, AreaEffect, RingEffect, OrbitalShield classes
│   ├── statusEffects.js # StatusEffect + StatusEffectManager for temporary buffs
│   ├── camera.js       # Camera class for infinite world viewport + zoom
│   ├── collision.js    # Collision detection utilities
│   ├── ui.js           # UI class for DOM manipulation
│   └── utils.js        # Math helpers (distance, normalize, random, etc.)
└── tests/
    ├── utils.test.js     # Tests for utility functions
    ├── collision.test.js # Tests for collision detection
    ├── camera.test.js    # Tests for camera system
    ├── player.test.js    # Tests for player behavior
    └── enemy.test.js     # Tests for enemy and spawner behavior
```

## Architecture Overview

### Game Loop (`game.js`)

The `Game` class orchestrates everything:

1. **Input Handling** - WASD/Arrow keys set player velocity
2. **Entity Updates** - Player, enemies, crystals, projectiles, effects
3. **Collision Detection** - Player-enemy, projectile-enemy, crystal collection
4. **Spawning** - EnemySpawner and CrystalSpawner manage entity creation
5. **Power System** - PowerManager handles cooldowns and spell casting
6. **Rendering** - Draw grid, effects, entities, UI elements

```
┌─────────────────────────────────────────────────────────┐
│                     Game Loop (60fps)                   │
├─────────────────────────────────────────────────────────┤
│  handleInput() → update(dt) → render()                  │
│       │              │            │                     │
│       ▼              ▼            ▼                     │
│  Player.setMovement  All entities Grid + all entities   │
│                      Collisions   UI overlay            │
│                      Spawners                           │
│                      PowerManager                       │
└─────────────────────────────────────────────────────────┘
```

### Camera System with Zoom

The camera provides a zoomed-out view of the game world:

```javascript
// Default zoom level (0.40 = showing 2.5x more world space)
this.zoom = 0.40;

// All entity rendering scales with zoom
const scale = camera.zoom;
const r = this.radius * scale;  // Scaled radius for drawing
```

Key camera features:
- **World-to-screen coordinate conversion** with zoom scaling
- **All entities render at proportional size** to the zoom level
- **Dynamic spawn distances** based on visible screen area
- **Visible bounds calculation** for culling and spawning

### Infinite World System

- Player position is in **world coordinates** (can be any value, including negative)
- Camera follows player, keeping them centered on screen
- Camera converts world coords → screen coords for rendering
- Entities spawn in a ring around the player (at/beyond visible edge)
- Entities despawn based on dynamic distance from visible bounds

### Dynamic Spawn System

Spawn and despawn distances scale with the camera's visible area:

```javascript
// EnemySpawner calculates distances from screen diagonal
getSpawnDistances(camera) {
    const halfDiagonal = /* calculated from visible bounds */;
    return {
        min: halfDiagonal * 0.9,  // Spawn at edge of screen
        max: halfDiagonal * 1.3   // Spawn beyond edge
    };
}

// CrystalSpawner uses similar approach
getDistances(camera) {
    return {
        minSpawn: halfDiagonal * 0.3,  // Within visible area
        maxSpawn: halfDiagonal * 0.9,  // Up to the edge
        despawn: halfDiagonal * 1.5    // Beyond edge
    };
}
```

### Entity System

All game entities share common patterns:

| Entity | World Position | Radius | Update | Render |
|--------|---------------|--------|--------|--------|
| Player | `x, y` | 20 | Movement, invincibility | Circle + health bar |
| Enemy | `x, y` | 12-35 | Move toward target, slow/knockback | Circle + health bar |
| Champion | `x, y` | 50 | Move toward player, use crystal ability | Crown spikes + 3 eyes + health bar |
| Crystal | `x, y` | 15 | Animation | Diamond shape + glow |
| Projectile | `x, y` | 6-12 | Movement, lifetime | Circle + trail |

All entity rendering is scaled by `camera.zoom` for proper proportions at any zoom level.

### Enemy Behavior

```javascript
// Enemy AI - Wandering with Awareness System:
1. Check if any crystal is within aggroRadius (350 units)
   → If yes: orbit around that crystal
2. If no crystal, check distance to player with awareness radius:
   → Within awareness radius: chase player
   → Outside awareness radius: wander randomly

// Enemy Aggression Types (assigned at spawn):
Aggressive (60% chance): awarenessRadius = 600 units, bright glow
Passive (40% chance):    awarenessRadius = 250 units, dim glow

// 60% of enemies spawn near crystals (increased for faster champion fusion)

// Enemy types (defined in ENEMY_TYPES):
small:  { radius: 12, speed: 180, health: 20,  damage: 5,  xp: 10  }
medium: { radius: 22, speed: 120, health: 50,  damage: 10, xp: 25  }
large:  { radius: 35, speed: 70,  health: 120, damage: 20, xp: 50  }
```

### Champion Enemy Fusion

When enough enemies orbit a single crystal, they merge into a powerful **Champion** enemy:

```javascript
// Fusion is triggered when this many enemies orbit a crystal
CHAMPION_FUSION_THRESHOLD = 6  // Configurable in enemy.js

// When fusion occurs:
1. All orbiting enemies are removed
2. The crystal is consumed (removed)
3. A Champion spawns at the crystal's position
4. Champion inherits the crystal's type (heat/cold/force)
```

#### Champion Stats

```javascript
// Champion base stats (defined in CHAMPION_CONFIG):
radius: 50      // Larger than any regular enemy
speed: 140      // Faster than all regular enemies (was 90)
health: 350     // Very durable
damage: 30      // High contact damage
xp: 200         // Worth 5x a large enemy
```

#### Champion Abilities by Crystal Type

| Crystal Type | Ability | Cooldown | Effect |
|--------------|---------|----------|--------|
| Heat | Flame Burst | 1.5s | Shoots 3 fireballs in a spread toward player |
| Cold | Frost Trail | While moving | Leaves frost zones (30s duration) that slow and damage player. Cold champions move 50% faster. |
| Force | Force Beam | 2.0s | Fires piercing beam with knockback toward player |

#### Champion Visual Design

- **Large glowing aura** matching crystal color
- **8 rotating crown spikes** around the body
- **Pulsing crystal core** in the center (diamond shape)
- **3 menacing eyes** (center larger than sides)
- **Always-visible health bar** (thicker than regular enemies)

### Crystal System

- Three types: `heat`, `cold`, `force`
- Spawn dynamically based on visible screen area (30-90% of half diagonal)
- Collected on contact (30 unit collection radius)
- Each crystal has `aggroRadius` of 350 units that attracts enemies
- Max 15 crystals in world at once
- Despawn when 150% of visible diagonal from player
- **Collecting a crystal triggers a Supercharge effect** (see Status Effect System)

### Power System (Crystal-Based)

#### Level-Up Flow

1. Player collects 5 crystals (any mix of types)
2. Game pauses, shows 3 power options
3. Each option's category is weighted by crystal ratio:
   - Example: 2 cold + 3 force → 40% cold options, 60% force options
4. Player selects a power
5. Crystals reset to 0, game resumes

**Note:** This is separate from the XP-based passive upgrade system.

#### Power Definitions (`POWERS` object in `powers.js`)

```javascript
// Each power has:
{
  id: 'fireballBarrage',
  name: 'Fireball Barrage',
  description: 'Rapidly fires fireballs...',
  category: 'heat',           // heat | cold | force
  baseCooldown: 0.3,          // seconds between casts
  passive: false,             // true = always active, no cooldown
  levelScale: {               // multipliers per level
    cooldown: 0.9,            // 10% faster each level
    damage: 1.2,              // 20% more damage each level
    // ... other scalable properties
  }
}
```

#### All 9 Powers

| Category | Power | Type | Frequency | Effect |
|----------|-------|------|-----------|--------|
| Heat | Fireball Barrage | Active | 0.3s | Random direction fireballs |
| Heat | Magma Pool | Active | 5.0s | Persistent damage zone |
| Heat | Inferno Ring | Active | 3.0s | Expanding damage ring |
| Cold | Ice Shards | Active | 0.5s | Auto-targeting piercing projectiles + slow |
| Cold | Frost Nova | Active | 4.0s | AOE slow + damage pulse |
| Cold | Frozen Armor | Passive | - | Damage reduction + slow attackers |
| Force | Force Bolt | Active | 0.4s | High knockback projectile |
| Force | Gravity Well | Active | 6.0s | Black hole that pulls enemies |
| Force | Orbital Shields | Passive | - | Orbiting shields that damage/block |

#### PowerManager

- Tracks cooldowns for each active power
- Casts powers automatically when cooldown expires
- Handles passive power effects (damage reduction, orbital shields)
- Contains `castX()` methods for each power that create projectiles/effects
- Uses `getEffectiveLevel(power)` to combine base level + status effect bonuses

### XP and Passive Upgrade System

A parallel progression system separate from crystal-based powers.

#### XP Mechanics

**Gaining XP:**
- Small enemies: 10 XP
- Medium enemies: 25 XP
- Large enemies: 50 XP
- Champions: 200 XP

**Level Up Formula:**
```javascript
XP needed = 50 × (1.5 ^ playerLevel)
// Level 1→2: 75 XP
// Level 2→3: 112 XP
// Level 3→4: 168 XP
// Diminishing returns continues
```

#### Passive Upgrades (`passiveUpgrades.js`)

When player levels up via XP, they choose from 3 random passive upgrades:

|| Upgrade | Category | Effect | Stackable |
||---------|----------|--------|-----------|
|| Frost Efficiency | Cold | Cold powers fire 15% faster | Yes |
|| Flame Intensity | Heat | Heat powers fire 15% faster | Yes |
|| Force Mastery | Force | Force powers fire 15% faster | Yes |
|| Swift Stride | Neutral | +12% movement speed | Yes |
|| Second Wind | Neutral | Instantly heal 25 HP | No (but can pick again) |
|| Tough Hide | Neutral | +8% damage reduction | Yes |
|| Low Profile | Neutral | Enemies detect you 15% closer | Yes |

**Stackable Effects:**
- Cooldown reductions stack up to 75% max
- Speed bonuses stack without limit
- Damage reduction stacks up to 60% max
- Aggro reduction stacks up to 60% max (min 40% detection range)

**Aggro Radius Modifier:**
- Reduces enemy awareness radius
- Works with both aggressive and passive enemy types
- Example: 30% reduction → aggressive enemies detect at 420 units instead of 600

### Status Effect System (`statusEffects.js`)

A reusable framework for temporary effects that modify gameplay.

#### StatusEffect Class

```javascript
// Each status effect has:
{
  type: 'supercharge',      // Effect identifier
  category: 'heat',         // Crystal category (or null for global)
  duration: 7.0,            // Total duration in seconds
  remaining: 7.0,           // Time left
  config: {                 // Effect-specific data
    bonusLevels: 3          // Power level bonus for supercharge
  }
}
```

#### StatusEffectManager

Attached to the Player, manages all active status effects:

- `addEffect(effect)` - Add new effect (refreshes duration if same type/category exists)
- `update(dt)` - Tick all effects, remove expired ones
- `getBonusLevels(category)` - Get total power bonus for a category
- `hasEffect(type, category)` - Check if effect is active
- `getActiveEffects()` - Get all effects for UI display

#### Supercharge Effect

When the player collects a crystal:

1. A **supercharge effect** is applied for that crystal's category
2. All powers of that category gain **+3 bonus levels** for **7 seconds**
3. This affects damage, cooldowns, projectile counts, and all level-scaled stats
4. Collecting another crystal of the same type **refreshes the duration**

```javascript
// Example: Collecting a heat crystal
// If player has Fireball Barrage at level 2:
// → Effective level becomes 2 + 3 = 5 for 7 seconds
// → More fireballs, faster cooldown, higher damage
```

### Effect Classes (`projectile.js`)

| Class | Purpose | Key Properties |
|-------|---------|----------------|
| `Projectile` | Moving projectile | `angle`, `speed`, `piercing`, `knockback`, `slowAmount` |
| `AreaEffect` | Stationary zone | `radius`, `duration`, `pullForce`, `damageInterval` |
| `RingEffect` | Expanding ring | `maxRadius`, `currentRadius`, `duration` |
| `OrbitalShield` | Orbiting shields | `count`, `orbitRadius`, `damage` |

All effect rendering scales with `camera.zoom`.

### Collision Detection (`collision.js`)

```javascript
circleCollision(x1, y1, r1, x2, y2, r2)  // Returns true if circles overlap
pointInCircle(px, py, cx, cy, radius)    // Point inside circle
circleRectCollision(cx, cy, r, rx, ry, rw, rh)  // Circle vs rectangle
getEntitiesInRange(entities, x, y, range) // All entities within range
findClosest(entities, x, y)              // Nearest entity to point
```

### Difficulty Scaling

```javascript
// In EnemySpawner:
difficulty = 1 + floor(gameTime / 30) * 0.5  // +0.5 every 30 seconds
spawnInterval = max(0.3, 1.5 - difficulty * 0.15)  // Faster spawns (was 0.5, 2.0)
spawnCount = min(5, ceil(difficulty) + 1)  // More enemies per spawn (was min 3)

// Enemy type chances based on difficulty:
difficulty >= 3: 20% chance large enemies
difficulty >= 2: 40% chance medium enemies

// Enemy aggression types (assigned at spawn):
60% chance: Aggressive (600 unit awareness, bright glow)
40% chance: Passive (250 unit awareness, dim glow)
```

## Key Game Constants

| Constant | Value | Location |
|----------|-------|----------|
| Player speed | 250 | `player.js` |
| Player radius | 20 | `player.js` |
| Player max health | 100 | `player.js` |
| Camera zoom | 0.40 | `camera.js` |
| Base attack cooldown | 0.8s | `game.js` |
| Crystals to level up | 5 | `game.js` |
| Crystal aggro radius | 350 | `crystal.js` |
| Crystal spawn near chance | 60% | `enemy.js` |
| Max enemies | 100 | `enemy.js` |
| Max crystals | 15 | `crystal.js` |
| Champion fusion threshold | 6 | `enemy.js` |
| Champion radius | 50 | `enemy.js` |
| Champion health | 350 | `enemy.js` |
| Champion damage | 30 | `enemy.js` |
| Supercharge duration | 7.0s | `statusEffects.js` |
| Supercharge bonus levels | +3 | `statusEffects.js` |
| Projectile lifetime (base) | 3.5s | `game.js` |
| Projectile lifetime (powers) | 3-3.5s | `powers.js` |

Note: Enemy/crystal spawn and despawn distances are now **dynamically calculated** based on camera zoom and screen size.

## UI System (`ui.js`)

The UI class manages all DOM elements:

- **Crystal display** - Shows count of each crystal type + total (max 5)
- **XP bar** - Shows current XP, next level requirement, and player level (gold-themed)
- **Powers display** - Lists active powers with levels (crystal-based powers)
- **Passive upgrades display** - Shows acquired passive upgrades with stack counts
- **Level-up modal** - Power selection on crystal level up (blue-themed)
- **Passive upgrade modal** - Passive upgrade selection on XP level up (gold-themed)
- **Game over modal** - Shows survival time and enemies defeated
- **Start screen** - Initial game start

All UI elements are defined in `index.html` and styled in `style.css`.

## Rendering Order

1. Grid background (scrolls with camera)
2. Ambient particles
3. Area effects (magma pools, gravity wells, frost nova, frost trails)
4. Ring effects (inferno ring)
5. Crystals
6. Enemies
7. Champions
8. Orbital shields
9. Player
10. Player projectiles
11. Enemy projectiles (from Champions)
12. Vignette overlay
13. Game timer (top center)

## Adding New Content

### New Power (Crystal-Based)

1. Add definition to `POWERS` object in `powers.js`
2. Add `castX()` method in `PowerManager`
3. Add case to `castPower()` switch statement
4. If passive, add case to `updatePassivePower()`

### New Passive Upgrade (XP-Based)

1. Add to `PASSIVE_UPGRADES` object in `passiveUpgrades.js`
2. If it modifies cooldowns, ensure `getCooldownReductionForCategory()` handles it
3. If it modifies other stats, update `player.recalculateBonuses()`
4. Add appropriate CSS styling for the upgrade's category

### New Enemy Type

1. Add to `ENEMY_TYPES` object in `enemy.js`
2. Update spawn logic in `EnemySpawner.update()` if needed
3. Remember to set XP value for the new type

### New Effect Type

1. Create new class in `projectile.js` or new file
2. Add array in `Game` class to track instances
3. Add update/render/collision logic in game loop
4. Ensure render method scales with `camera.zoom`

### New Status Effect

1. Add configuration to `STATUS_EFFECT_CONFIG` in `statusEffects.js`
2. Create a factory function like `createSuperchargeEffect()`
3. Apply the effect via `player.statusEffects.addEffect()`
4. If the effect modifies power levels, update `PowerManager.getEffectiveLevel()`
5. For other effects, add handling in relevant game systems

## Known Limitations

- No save/load system
- No audio
- No particle system (effects are simple shapes)
- Single player only
- No pause menu (only auto-pause on level up)
