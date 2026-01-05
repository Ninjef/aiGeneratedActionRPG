# Test Documentation

This document describes the unit testing setup and test coverage for Horde Survival RPG.

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
| `tests/camera.test.js` | 24 | Camera coordinate transforms and zoom |
| `tests/player.test.js` | 39 | Player state, movement, damage, powers |
| `tests/enemy.test.js` | 74 | Enemy behavior, spawner, difficulty, Champion |
| **Total** | **184** | |

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
| `constructor` | 6 | Position, stats, movement, crystals, powers |
| `totalCrystals` (getter) | 2 | Sum calculation, zero case |
| `setMovement(dx, dy)` | 5 | Direction setting, diagonal normalization |
| `update(dt)` | 5 | Position change, invincibility decay, rotation |
| `takeDamage(amount)` | 6 | Health reduction, damage reduction, invincibility |
| `heal(amount)` | 3 | Health increase, max health cap |
| `collectCrystal(type)` | 6 | Crystal increment, valid/invalid types |
| `resetCrystals()` | 1 | All crystals reset to zero |
| `addPower(power)` | 4 | Power addition, level increment, multiple powers |

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

Tests for `js/enemy.js` - enemy behavior, types, spawning system, and Champion enemies.

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

#### Enemy Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 5 | Position, stats by type, slow init, orbit init |
| `setTarget(x, y)` | 1 | Target position setting |
| `setOrbitTarget/clearOrbitTarget` | 2 | Crystal orbit behavior |
| `applySlow(amount, duration)` | 4 | Slow application, max value tracking |
| `applyKnockback(dx, dy, force)` | 3 | Knockback force, accumulation |
| `takeDamage(amount)` | 4 | Health reduction, death detection, hurt time |
| `update(dt)` | 6 | Movement, slow effect, knockback, orbiting |

#### ENEMY_TYPES

| Test | What's Verified |
|------|-----------------|
| Type existence | small, medium, large types exist |
| Stat scaling | Larger enemies have more health/damage, less speed |

#### EnemySpawner Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 1 | Default values |
| `getSpawnDistances(camera)` | 2 | Dynamic distance calculation, zoom scaling |
| `update(...)` | 6 | Game time, difficulty, spawning, max enemies |

#### Champion Class

| Method | Tests | What's Verified |
|--------|-------|-----------------|
| `constructor` | 10 | Position, isChampion flag, stats, crystal type config |
| `setTarget(x, y)` | 1 | Target position setting |
| `applySlow(amount, duration)` | 2 | Slow application, max value tracking |
| `applyKnockback(dx, dy, force)` | 2 | Knockback force, accumulation |
| `takeDamage(amount)` | 4 | Health reduction, death detection, hurt time |
| `update(dt)` | 5 | Movement, slow effect, visual effects, cooldown |
| `checkAbility - Heat` | 3 | Flame Burst ability, cooldown, null when on cooldown |
| `checkAbility - Cold` | 3 | Frost Trail based on distance moved, reset distance |
| `checkAbility - Force` | 2 | Force Beam ability, cooldown after use |

#### CHAMPION_CONFIG

| Test | What's Verified |
|------|-----------------|
| Base stats | radius, speed, health, damage, xp values |
| Heat type | color, glowColor, ability name, cooldown, projectile count |
| Cold type | color, glowColor, trail radius, slow amount |
| Force type | color, glowColor, beam piercing, knockback |

#### CHAMPION_FUSION_THRESHOLD

| Test | What's Verified |
|------|-----------------|
| Value | Equals 10 (configurable threshold) |

### Example Test

```javascript
describe('getSpawnDistances', () => {
    it('should return larger distances for more zoomed out camera', () => {
        const zoomedOut = createMockCamera(800, 600, 0.1);
        const zoomedIn = createMockCamera(800, 600, 1.0);
        
        const distOut = spawner.getSpawnDistances(zoomedOut);
        const distIn = spawner.getSpawnDistances(zoomedIn);
        
        expect(distOut.min).toBeGreaterThan(distIn.min);
        expect(distOut.max).toBeGreaterThan(distIn.max);
    });
});
```

### Example Champion Test

```javascript
describe('checkAbility - Heat Champion', () => {
    it('should return flameBurst ability when cooldown is ready', () => {
        heatChampion.setTarget(200, 200);
        const ability = heatChampion.update(0.1);
        
        expect(ability).not.toBeNull();
        expect(ability.type).toBe('flameBurst');
        expect(ability.damage).toBe(CHAMPION_CONFIG.types.heat.abilityDamage);
        expect(ability.count).toBe(CHAMPION_CONFIG.types.heat.projectileCount);
    });
});
```

---

## Testing Approach

### What's Tested

1. **Pure Logic Functions** - Math utilities, collision detection
2. **State Management** - Player health, crystals, powers, enemy status
3. **Coordinate Transforms** - Camera world-to-screen and back
4. **Game Mechanics** - Damage, healing, movement, spawning rules

### What's Not Tested

1. **Rendering** - Canvas drawing operations (would require canvas mocking)
2. **DOM Manipulation** - UI class (would require DOM environment)
3. **Input Handling** - Keyboard events
4. **Game Loop** - Main game orchestration

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

