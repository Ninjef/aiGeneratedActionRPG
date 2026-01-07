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

## Controls

- **WASD / Arrow Keys** - Move player
- **ESC** - Pause/unpause game
- **Mouse** - Click to select powers and upgrades

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
│   ├── player.js       # Player class (movement, health, power progression)
│   ├── enemy.js        # Enemy class + EnemySpawner + Champion class
│   ├── crystal.js      # Crystal class + CrystalSpawner
│   ├── powers.js       # Power definitions + PowerManager
│   ├── powerRune.js    # PowerRune class for collectible power items
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

1. **Input Handling** - WASD/Arrow keys set player velocity, ESC to pause
2. **Entity Updates** - Player, enemies, crystals, projectiles, effects
3. **Collision Detection** - Player-enemy, projectile-enemy, crystal collection
4. **Spawning** - EnemySpawner and CrystalSpawner manage entity creation
5. **Power System** - PowerManager handles cooldowns and spell casting
6. **Rendering** - Draw grid, effects, entities, UI elements

**Game Start Flow:**
1. Click "Start Game" on start screen
2. Game begins with 4 power runes spawned near the player
3. Player starts with no powers - must collect runes to gain abilities
4. Touch crystals to trigger explosions and spawn more power runes

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
| Builder | `x, y` | 15 | Flee/crystal seek/wander | Grey circle + simple eyes |
| Fighter | `x, y` | 14 | Chase from far/wander | Green circle + angry eyes |
| SpawnBlock | `x, y` | 30 | Spawn timer, spawning | Pulsing square + health bar |
| FieryEnemy | `x, y` | 8 | Erratic movement, trails | Red circle + flame glow |
| GravitationalEnemy | `x, y` | 18 | Player chase, mutual gravity | Blue circle + aura |
| FastPurpleEnemy | `x, y` | 10 | High-speed chase | Purple circle + speed lines |
| Crystal | `x, y` | 15 | Animation | Diamond shape + glow |
| PowerRune | `x, y` | 18 | Physics, lifetime, fade | Unique icon per power |
| Projectile | `x, y` | 6-12 | Movement, lifetime | Circle + trail |

All entity rendering is scaled by `camera.zoom` for proper proportions at any zoom level.

### Enemy System - Builder & Spawn Block Architecture

The game features a unique enemy spawning system where **Builder** enemies convert crystals into spawn blocks, which then spawn specialized enemies.

#### Enemy Types

**Builder Enemies (Grey)**
```javascript
// Builders spawn randomly and have these behaviors:
- Wander randomly when nothing nearby
- Attracted to crystals within aggroRadius (350 units)
- Flee from player when within fleeRadius (200 units)
- Convert crystal → spawn block on contact
- Deal NO contact damage to player
- Stats: { radius: 15, speed: 100, health: 30, damage: 0, xp: 5 }
```

**Spawn Blocks (Destructible Structures)**
```javascript
// Spawn blocks are created when builders touch crystals
- Health: 250 HP (destructible by player attacks)
- Color matches crystal type (red/blue/purple)
- Spawn enemies every 5-8 seconds
- Drop crystal of same type when destroyed
- Award 50 XP when destroyed
- Visual: Pulsing square with diagonal pattern
```

**Fighter Enemies (Green) - Spawned Incrementally**
```javascript
// Fighters spawn incrementally over time (starting at 15 seconds)
- Behavior: Chase player from very far away (800 unit aggro)
- Wander randomly when player not in range
- Deal contact damage on touch
- Stats: { radius: 14, speed: 140, health: 40, damage: 10, xp: 12 }
```

**Specialized Combat Enemies (from Spawn Blocks)**

1. **Fiery Enemies (Red) - from Heat Spawn Blocks**
   - Spawn: 5 enemies every 5 seconds
   - Behavior: Erratic zig-zag movement
   - Leave fire trails behind them (damages player)
   - Stats: { radius: 8, speed: 250, health: 15, damage: 8, xp: 15 }
   - Fire trail: 20 radius, 9 second duration, 6 damage

2. **Gravitational Enemies (Blue) - from Cold Spawn Blocks**
   - Spawn: 3 enemies every 5 seconds
   - Behavior: Chase player, pull toward each other
   - Mutual gravitational attraction (100 unit range)
   - Form tight groups when near each other
   - Stats: { radius: 18, speed: 80, health: 60, damage: 12, xp: 30 }

3. **Fast Purple Enemies (Purple) - from Force Spawn Blocks**
   - Spawn: 5 enemies every 8 seconds
   - Behavior: High-speed chase toward player
   - Simple, direct pursuit
   - Stats: { radius: 10, speed: 200, health: 25, damage: 10, xp: 20 }

#### Spawn Block Mechanics

```javascript
// Crystal → Spawn Block conversion:
1. Builder touches crystal
2. Builder and crystal both removed
3. Spawn block created at crystal's position
4. Spawn block inherits crystal type

// Spawn intervals:
Heat/Cold spawn blocks: 5.0 seconds
Force spawn blocks: 8.0 seconds

// When spawn block destroyed:
1. Award 50 XP
2. Drop crystal of same type
3. Remove spawn block
```

### Crystal System

- Three types: `heat`, `cold`, `force`
- Spawn dynamically based on visible screen area (30-90% of half diagonal)
- Each crystal has `aggroRadius` of 350 units that attracts builder enemies
- Max 15 crystals in world at once
- Despawn when 150% of visible diagonal from player
- **Builders convert crystals into spawn blocks on contact**
- **Spawn blocks drop crystals when destroyed**
- **Touching a crystal triggers a nova explosion and spawns power runes**

### Power Rune System

Powers are obtained and upgraded by collecting **Power Runes** - glowing icons that spawn when crystals are touched.

#### Crystal Collection Flow

When player touches a crystal:
1. Crystal is removed
2. **Nova explosion** damages nearby enemies (matching crystal's element color)
3. **3 Power Runes** fly outward from the crystal's position
   - 1 rune is guaranteed from the crystal's element
   - 2 runes are random from all 9 powers
4. Runes land nearby and remain for **6 seconds** before fading away
5. Player must collect runes before they disappear

#### Game Start

At game start, **4 power runes** spawn near the player with extended lifetime (15 seconds). The player starts with no powers and must collect runes to gain abilities.

#### Power Progression

Powers use **triangular number** progression for leveling:

| Level | Runes Needed | Total Runes |
|-------|--------------|-------------|
| 1 | 1 | 1 |
| 2 | 2 more | 3 |
| 3 | 3 more | 6 |
| 4 | 4 more | 10 |
| N | N more | N*(N+1)/2 |

```javascript
// Power structure in player.powers:
{
  id: 'fireballBarrage',
  level: 2,
  runesCollected: 3,  // Total runes collected for this power
  passive: false
}

// Progression calculation:
Player.getTotalRunesForLevel(level)  // Returns triangular number
Player.getRunesNeededForNextLevel(currentLevel)  // Returns currentLevel + 1
```

#### PowerRune Class (`powerRune.js`)

Each power rune has:
- **Position/Physics**: Flies outward from crystal, decelerates, lands
- **Lifetime**: 6 seconds (15 for starting runes), with fade and blink effect
- **Unique Icon**: Each of the 9 powers has a distinctive icon
- **Collection radius**: 35 units

**Power Icons:**

| Power | Icon |
|-------|------|
| Fireball | Flame shape |
| Magma Pool | Bubbling ellipse |
| Inferno Ring | Concentric circles |
| Ice Shards | Crystal spike |
| Frost Nova | Snowflake |
| Frozen Armor | Shield with frost |
| Force Bolt | Arrow shape |
| Gravity Well | Spiral vortex |
| Orbital Shields | Orbiting dots |

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
- Builders: 5 XP
- Fighters: 12 XP
- Fiery enemies: 15 XP
- Gravitational enemies: 30 XP
- Fast purple enemies: 20 XP
- Spawn blocks: 50 XP

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

A reusable framework for temporary effects that modify gameplay. Currently used for enemy slow effects and potential future buffs.

#### StatusEffect Class

```javascript
// Each status effect has:
{
  type: 'slow',             // Effect identifier
  category: null,           // Optional category
  duration: 2.0,            // Total duration in seconds
  remaining: 2.0,           // Time left
  config: { }               // Effect-specific data
}
```

#### StatusEffectManager

Attached to the Player, manages all active status effects:

- `addEffect(effect)` - Add new effect (refreshes duration if same type/category exists)
- `update(dt)` - Tick all effects, remove expired ones
- `getBonusLevels(category)` - Get total power bonus for a category
- `hasEffect(type, category)` - Check if effect is active
- `getActiveEffects()` - Get all effects for UI display

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
spawnInterval = max(0.3, 1.5 - difficulty * 0.15)  // Faster spawns
spawnCount = min(5, ceil(difficulty) + 1)  // More builders per spawn (2-5)

// All spawned enemies are builders
// Specialized enemies come from spawn blocks, not direct spawning
// As more builders spawn, more spawn blocks are created
// More spawn blocks = more specialized enemies
```

## Key Game Constants

| Constant | Value | Location |
|----------|-------|----------|
| Player speed | 250 | `player.js` |
| Player radius | 20 | `player.js` |
| Player max health | 100 | `player.js` |
| Camera zoom | 0.40 | `camera.js` |
| Power rune lifetime | 6.0s | `powerRune.js` |
| Starting rune lifetime | 15.0s | `game.js` |
| Runes per crystal | 3 | `game.js` |
| Starting runes | 4 | `game.js` |
| Crystal nova damage | 30 | `game.js` |
| Crystal aggro radius | 350 | `crystal.js` |
| Max builders | 150 | `enemy.js` |
| Max fighters | 80 | `enemy.js` |
| Fighter spawn delay | 15s | `enemy.js` |
| Fighter aggro radius | 800 | `enemy.js` |
| Max crystals | 15 | `crystal.js` |
| Builder flee radius | 200 | `enemy.js` |
| Spawn block health | 250 | `enemy.js` |
| Spawn block XP | 50 | `enemy.js` |
| Fire trail duration | 9.0s | `enemy.js` |
| Gravity range | 100 | `enemy.js` |
| Projectile lifetime (powers) | 3-3.5s | `powers.js` |

Note: Enemy/crystal spawn and despawn distances are now **dynamically calculated** based on camera zoom and screen size.

## UI System (`ui.js`)

The UI class manages all DOM elements:

- **XP bar** - Shows current XP, next level requirement, and player level (gold-themed)
- **Powers display** - Lists active powers with levels and rune progress (e.g., "Fireball Lv.2 [1/3]")
- **Passive upgrades display** - Shows acquired passive upgrades with stack counts
- **Passive upgrade modal** - Passive upgrade selection on XP level up (gold-themed)
- **Pause screen** - Shows when ESC is pressed, displays "PAUSED" message
- **Game over modal** - Shows survival time and enemies defeated
- **Start screen** - Initial game start

All UI elements are defined in `index.html` and styled in `style.css`.

## Rendering Order

1. Grid background (scrolls with camera)
2. Ambient particles
3. Area effects (magma pools, gravity wells, frost nova, fire trails)
4. Ring effects (inferno ring, crystal nova)
5. Crystals
6. Power runes
7. Builders
8. Spawn blocks
9. Fiery enemies
10. Gravitational enemies
11. Fast purple enemies
12. Orbital shields
13. Player
14. Player projectiles
15. Vignette overlay
16. Game timer (top center)

## Adding New Content

### New Power

1. Add definition to `POWERS` object in `powers.js`
2. Add `castX()` method in `PowerManager`
3. Add case to `castPower()` switch statement
4. If passive, add case to `updatePassivePower()`
5. Add icon definition to `POWER_ICONS` in `powerRune.js`

### New Passive Upgrade (XP-Based)

1. Add to `PASSIVE_UPGRADES` object in `passiveUpgrades.js`
2. If it modifies cooldowns, ensure `getCooldownReductionForCategory()` handles it
3. If it modifies other stats, update `player.recalculateBonuses()`
4. Add appropriate CSS styling for the upgrade's category

### New Enemy Type

1. Create new enemy class in `enemy.js` (extend from base pattern)
2. Add configuration to `ENEMY_TYPES` object
3. Add rendering logic for the new enemy type
4. Update spawn block spawning logic if it's spawned by blocks
5. Remember to set XP value for the new type
6. Add to all relevant collision and update arrays in `game.js`

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
- Minimal pause screen (no pause menu with options)
