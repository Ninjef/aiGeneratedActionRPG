# Test Documentation

This document describes the unit testing setup and test coverage for Horde Survival RPG.

## Recent Game Mechanics Changes

**Note:** The following features were recently added/changed but are not covered by unit tests (they involve UI/DOM):

1. **No Base Attack** - The player has no default attack. Powers are obtained by collecting power runes.
2. **Power Rune System** - Crystals spawn power runes when touched. Collecting runes grants/upgrades powers.
3. **Pause Functionality** - Pressing ESC pauses/unpauses the game (displays a pause screen).

## Test Framework

- **Vitest** - A fast, ESM-native test runner compatible with the project's ES modules
- **No mocking libraries** - Tests use simple mock objects where needed

## Running Tests

```bash
# Install dependencies (first time)
npm install

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files Overview

| File | Tests | Description |
|------|-------|-------------|
| `tests/utils.test.js` | 28 | Math utilities and helper functions |
| `tests/collision.test.js` | 19 | Collision detection algorithms |
| `tests/camera.test.js` | 23 | Camera coordinate transforms and zoom |
| `tests/player.test.js` | 42 | Player state, movement, damage, power rune system |
| `tests/enemy.test.js` | 49 | Builder, SpawnBlock, FieryEnemy, GravitationalEnemy, FastPurpleEnemy, EnemySpawner |
| `tests/powers.test.js` | 7 | Power definitions and PowerManager |
| `tests/passiveUpgrades.test.js` | 10 | Passive upgrade system |
| `tests/projectile.test.js` | 9 | Projectile and effect classes |
| **Total** | **187** | |

## Test Structure

All test files follow a consistent structure using Vitest's BDD-style syntax:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { SomeClass } from '../js/some-file.js';

describe('SomeClass', () => {
    let instance;

    beforeEach(() => {
        instance = new SomeClass();
    });

    describe('methodName', () => {
        it('should do something specific', () => {
            expect(instance.methodName()).toBe(expectedValue);
        });
    });
});
```

---

## utils.test.js

Tests for `js/utils.js` - core math utilities used throughout the game.

### Functions Tested

| Function | Tests | What's Verified |
|----------|-------|-----------------|
| `randomRange(min, max)` | 3 | Returns value within range, handles negatives, zero-width |
| `randomInt(min, max)` | 2 | Returns integer, handles same min/max |
| `distance(x1, y1, x2, y2)` | 3 | Euclidean distance, negatives, commutativity |
| `normalize(x, y)` | 4 | Unit vector, zero vector handling, length = 1 |
| `angle(x1, y1, x2, y2)` | 2 | Angle in radians, cardinal directions |
| `lerp(a, b, t)` | 3 | Linear interpolation, extrapolation |
| `clamp(value, min, max)` | 3 | Value clamping, edge cases |
| `randomChoice(array)` | 2 | Returns element from array |
| `weightedRandomChoice(options, weights)` | 3 | Weighted selection, probability distribution |
| `randomPositionInRing(cx, cy, min, max)` | 3 | Position within ring, offset from center |

### Example Test

```javascript
describe('distance', () => {
    it('should calculate distance between two points', () => {
        expect(distance(0, 0, 3, 4)).toBe(5);  // 3-4-5 triangle
        expect(distance(0, 0, 0, 0)).toBe(0);
    });

    it('should be commutative', () => {
        expect(distance(0, 0, 3, 4)).toBe(distance(3, 4, 0, 0));
    });
});
```

---

## collision.test.js

Tests for `js/collision.js` - collision detection utilities.

### Functions Tested

| Function | Tests | What's Verified |
|----------|-------|-----------------|
| `circleCollision(x1, y1, r1, x2, y2, r2)` | 5 | Overlapping, non-overlapping, touching, same position |
| `pointInCircle(px, py, cx, cy, r)` | 3 | Inside, outside, on boundary |
| `circleRectCollision(cx, cy, r, rx, ry, rw, rh)` | 3 | Overlapping sides, corners, non-overlapping |
| `getEntitiesInRange(entities, x, y, range)` | 4 | Entities in range, radius inclusion, empty results |
| `findClosest(entities, x, y)` | 4 | Closest entity, empty array, single element |

### Example Test

```javascript
describe('circleCollision', () => {
    it('should detect overlapping circles', () => {
        expect(circleCollision(0, 0, 10, 15, 0, 10)).toBe(true);
    });

    it('should detect non-overlapping circles', () => {
        expect(circleCollision(0, 0, 10, 25, 0, 10)).toBe(false);
    });

    it('should handle edge case - circles just touching', () => {
        // Uses < not <=, so exactly touching returns false
        expect(circleCollision(0, 0, 10, 20, 0, 10)).toBe(false);
    });
});
```

---

## camera.test.js

Tests for `js/camera.js` - the camera system including zoom and coordinate conversion.

### Mock Canvas

Tests use a mock canvas object since no actual rendering is needed:

```javascript
function createMockCanvas(width = 800, height = 600) {
    return { width, height };
}
```

### Methods Tested

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 2 | Default values, canvas reference |
| `follow(target)` | 3 | Target centering, zoom levels, origin |
| `update()` | 3 | Smooth movement, convergence, at-target stability |
| `worldToScreen(x, y)` | 4 | Coordinate conversion, camera offset, zoom scaling |
| `screenToWorld(x, y)` | 4 | Inverse conversion, round-trip accuracy |
| `isVisible(x, y, padding)` | 4 | Visibility detection, custom padding |
| `getVisibleBounds()` | 4 | Bounds calculation, zoom effects |

### Example Test

```javascript
describe('worldToScreen', () => {
    it('should apply zoom scaling', () => {
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 0.5;
        
        const screen = camera.worldToScreen(100, 100);
        expect(screen.x).toBe(50);  // 100 * 0.5
        expect(screen.y).toBe(50);
    });
});
```

---

## player.test.js

Tests for `js/player.js` - player state management and behavior.

### Methods Tested

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 3 | Position, stats, movement, powers |
| `setMovement(dx, dy)` | 5 | Direction setting, diagonal normalization |
| `update(dt)` | 5 | Position change, invincibility decay, rotation |
| `takeDamage(amount)` | 7 | Health reduction, damage reduction, invincibility |
| `heal(amount)` | 3 | Health increase, max health cap |
| `addPower(power)` | 4 | Power addition, level increment, multiple powers |
| `getTotalRunesForLevel(level)` | 4 | Triangular number calculation (1, 3, 6, 10...) |
| `getRunesNeededForNextLevel(level)` | 3 | Runes to reach next level |
| `collectPowerRune(powerId)` | 5 | Power acquisition, rune accumulation, leveling |
| `getPowerProgress(powerId)` | 3 | Progress tracking for UI |

### Power Rune System Tests

```javascript
describe('Power Rune System', () => {
    it('should grant power at level 1 on first rune', () => {
        const result = player.collectPowerRune('fireballBarrage', false);
        
        expect(result.isNew).toBe(true);
        expect(result.power.level).toBe(1);
        expect(result.power.runesCollected).toBe(1);
    });

    it('should level up when enough runes collected', () => {
        // Level 1: 1 rune, Level 2: 3 total (need 2 more)
        player.collectPowerRune('fireballBarrage', false);
        player.collectPowerRune('fireballBarrage', false);
        const result = player.collectPowerRune('fireballBarrage', false);
        
        expect(result.leveledUp).toBe(true);
        expect(result.power.level).toBe(2);
    });
});
```

### Example Test

```javascript
describe('takeDamage', () => {
    it('should reduce health by damage amount', () => {
        player.takeDamage(25);
        expect(player.health).toBe(75);
    });

    it('should apply damage reduction', () => {
        player.damageReduction = 0.5;
        player.takeDamage(20);
        expect(player.health).toBe(90); // 20 * 0.5 = 10 damage
    });

    it('should return false when invincible', () => {
        player.invincibleTime = 1.0;
        expect(player.takeDamage(10)).toBe(false);
        expect(player.health).toBe(100); // No damage taken
    });
});
```

---

## enemy.test.js

Tests for `js/enemy.js` - Builder behavior, SpawnBlock mechanics, and specialized enemy types (FieryEnemy, GravitationalEnemy, FastPurpleEnemy).

### Mock Camera for Spawner Tests

```javascript
function createMockCamera(width = 800, height = 600, zoom = 0.25) {
    return {
        zoom,
        canvas: { width, height },
        getVisibleBounds() {
            return {
                left: 0,
                right: width / zoom,
                top: 0,
                bottom: height / zoom
            };
        }
    };
}
```

### Classes Tested

#### Builder Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 3 | Position, builder stats (no damage), flee radius |
| `takeDamage(amount)` | 3 | Health reduction, death detection |
| `update(dt, playerX, playerY, crystals)` | 3 | Flee from player, move toward crystal, wander |

#### SpawnBlock Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 4 | Position, crystal type storage, 250 HP, spawn intervals by type |
| `takeDamage(amount)` | 3 | Health reduction, destruction detection |
| `update(dt)` | 3 | Spawn info after interval, no spawn before interval, correct enemy types/counts |

#### FieryEnemy Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 1 | Fiery stats (fast, low HP) |
| `update(dt, playerX, playerY)` | 2 | Direction changes (erratic movement), fire trail creation |
| `takeDamage(amount)` | 2 | Health reduction, death detection |

#### GravitationalEnemy Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 2 | Gravitational stats, velocity properties |
| `update(dt, playerX, playerY, others)` | 3 | Move toward player, apply gravity to nearby enemies, no gravity at distance |
| `takeDamage(amount)` | 2 | Health reduction, death detection |

#### FastPurpleEnemy Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 1 | Fast purple stats |
| `update(dt, playerX, playerY)` | 1 | Chase player behavior |
| `takeDamage(amount)` | 2 | Health reduction, death detection |

#### ENEMY_TYPES

| Test | What's Verified |
|------|-----------------|
| Type existence | builder, fiery, gravitational, fastPurple types exist |
| Builder stats | No damage (0), flee radius (200) |
| Fiery trail properties | Trail interval (0.2s), duration (9.0s) |
| Gravitational gravity properties | Gravity range (100), strength (150) |

#### EnemySpawner Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | - | Implicitly tested in update tests |
| `getSpawnDistances(camera)` | 2 | Dynamic distance calculation, zoom scaling |
| `update(...)` | 4 | Game time tracking, difficulty increase, builder spawning, max enemy cap |

### Example Test

```javascript
describe('SpawnBlock', () => {
    it('should spawn correct enemy types', () => {
        const heatBlock = new SpawnBlock(0, 0, 'heat');
        const coldBlock = new SpawnBlock(0, 0, 'cold');
        const forceBlock = new SpawnBlock(0, 0, 'force');
        
        expect(heatBlock.update(5.0).enemyType).toBe('fiery');
        expect(heatBlock.update(5.0).count).toBe(5);
        
        expect(coldBlock.update(5.0).enemyType).toBe('gravitational');
        expect(coldBlock.update(5.0).count).toBe(3);
        
        expect(forceBlock.update(8.0).enemyType).toBe('fastPurple');
        expect(forceBlock.update(8.0).count).toBe(5);
    });
});
```

### Example Builder Test

```javascript
describe('Builder', () => {
    it('should flee from player when close', () => {
        const builder = new Builder(100, 200);
        const playerX = 150;
        const playerY = 200;
        const initialX = builder.x;
        
        builder.update(0.1, playerX, playerY, []);
        
        // Should have moved away from player (x decreased)
        expect(builder.x).toBeLessThan(initialX);
    });
});
```

---

## Testing Approach

### What's Tested

1. **Pure Logic Functions** - Math utilities, collision detection
2. **State Management** - Player health, power rune progression, enemy status
3. **Coordinate Transforms** - Camera world-to-screen and back
4. **Game Mechanics** - Damage, healing, movement, spawning rules
5. **Power Rune System** - Triangular progression, power acquisition, leveling

### What's Not Tested

1. **Rendering** - Canvas drawing operations (would require canvas mocking)
   - Power rune icons
   - Crystal nova effects
2. **DOM Manipulation** - UI class (would require DOM environment)
   - Pause screen display
   - Game over screen
   - Powers display with rune progress
3. **Input Handling** - Keyboard events
   - WASD/Arrow key movement
   - ESC key pause/unpause
4. **Game Loop Integration** - Full game orchestration with all systems
5. **Status Effects** - StatusEffect and StatusEffectManager classes (pure logic, could be tested)
6. **Fire Trail Effects** - AreaEffect instances created by FieryEnemies
7. **Crystal Nova** - Ring effect when crystals are touched
8. **PowerRune Class** - Physics, lifetime, collection detection (pure logic, could be tested)

### Mocking Strategy

Tests use minimal, inline mocks rather than a mocking library:

```javascript
// Mock canvas for camera tests
const mockCanvas = { width: 800, height: 600 };

// Mock camera for spawner tests
const mockCamera = {
    zoom: 0.25,
    getVisibleBounds() { return { left: 0, right: 3200, ... }; }
};
```

---

## Adding New Tests

### For a New Utility Function

```javascript
// In tests/utils.test.js
describe('newFunction', () => {
    it('should handle basic case', () => {
        expect(newFunction(input)).toBe(expectedOutput);
    });
    
    it('should handle edge case', () => {
        expect(newFunction(edgeInput)).toBe(edgeOutput);
    });
});
```

### For a New Class

```javascript
// In tests/newclass.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { NewClass } from '../js/newclass.js';

describe('NewClass', () => {
    let instance;

    beforeEach(() => {
        instance = new NewClass();
    });

    describe('constructor', () => {
        it('should initialize with defaults', () => {
            expect(instance.property).toBe(defaultValue);
        });
    });

    describe('methodName', () => {
        it('should perform expected behavior', () => {
            const result = instance.methodName(args);
            expect(result).toBe(expected);
        });
    });
});
```

### Running Specific Tests

```bash
# Run a specific test file
npx vitest run tests/player.test.js

# Run tests matching a pattern
npx vitest run -t "should calculate distance"

# Run with verbose output
npx vitest run --reporter=verbose
```

---

## Configuration

### vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        globals: true
    }
});
```

The configuration:
- Uses Node environment (no browser APIs needed for logic tests)
- Looks for test files in `tests/` directory with `.test.js` suffix
- Enables global test functions (`describe`, `it`, `expect`)

