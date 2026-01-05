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
// Enemy targeting priority:
1. Check if any crystal is within aggroRadius (200 units)
2. If yes → orbit around that crystal
3. If no → move toward player

// Enemy types (defined in ENEMY_TYPES):
small:  { radius: 12, speed: 180, health: 20,  damage: 5  }
medium: { radius: 22, speed: 120, health: 50,  damage: 10 }
large:  { radius: 35, speed: 70,  health: 120, damage: 20 }
```

### Champion Enemy Fusion

When enough enemies orbit a single crystal, they merge into a powerful **Champion** enemy:

```javascript
// Fusion is triggered when this many enemies orbit a crystal
CHAMPION_FUSION_THRESHOLD = 10  // Configurable in enemy.js

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
speed: 90       // Slower but menacing
health: 350     // Very durable
damage: 30      // High contact damage
xp: 200         // Worth 5x a large enemy
```

#### Champion Abilities by Crystal Type

| Crystal Type | Ability | Cooldown | Effect |
|--------------|---------|----------|--------|
| Heat | Flame Burst | 1.5s | Shoots 3 fireballs in a spread toward player |
| Cold | Frost Trail | While moving | Leaves frost zones that slow and damage player |
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
- Each crystal has `aggroRadius` of 200 units that attracts enemies
- Max 15 crystals in world at once
- Despawn when 150% of visible diagonal from player

### Power System

#### Level-Up Flow

1. Player collects 5 crystals (any mix of types)
2. Game pauses, shows 3 power options
3. Each option's category is weighted by crystal ratio:
   - Example: 2 cold + 3 force → 40% cold options, 60% force options
4. Player selects a power
5. Crystals reset to 0, game resumes

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
spawnInterval = max(0.5, 2.0 - difficulty * 0.2)  // Faster spawns
spawnCount = min(3, ceil(difficulty))  // More enemies per spawn

// Enemy type chances based on difficulty:
difficulty >= 3: 20% chance large enemies
difficulty >= 2: 40% chance medium enemies
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
| Crystal aggro radius | 200 | `crystal.js` |
| Max enemies | 100 | `enemy.js` |
| Max crystals | 15 | `crystal.js` |
| Champion fusion threshold | 10 | `enemy.js` |
| Champion radius | 50 | `enemy.js` |
| Champion health | 350 | `enemy.js` |
| Champion damage | 30 | `enemy.js` |

Note: Enemy/crystal spawn and despawn distances are now **dynamically calculated** based on camera zoom and screen size.

## UI System (`ui.js`)

The UI class manages all DOM elements:

- **Crystal display** - Shows count of each crystal type + total
- **Powers display** - Lists active powers with levels
- **Level-up modal** - Power selection on level up
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

### New Power

1. Add definition to `POWERS` object in `powers.js`
2. Add `castX()` method in `PowerManager`
3. Add case to `castPower()` switch statement
4. If passive, add case to `updatePassivePower()`

### New Enemy Type

1. Add to `ENEMY_TYPES` object in `enemy.js`
2. Update spawn logic in `EnemySpawner.update()` if needed

### New Effect Type

1. Create new class in `projectile.js` or new file
2. Add array in `Game` class to track instances
3. Add update/render/collision logic in game loop
4. Ensure render method scales with `camera.zoom`

## Known Limitations

- No save/load system
- No audio
- No particle system (effects are simple shapes)
- Single player only
- No pause menu (only auto-pause on level up)
