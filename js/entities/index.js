// Entity module - Re-exports all entity classes for easy importing
// Usage: import { Builder, Fighter, EnemyManager } from './entities/index.js';

// Base class
export { BaseEnemy } from './BaseEnemy.js';

// Enemy types
export { Builder } from './Builder.js';
export { Fighter } from './Fighter.js';
export { FieryEnemy } from './FieryEnemy.js';
export { GravitationalEnemy } from './GravitationalEnemy.js';
export { FastPurpleEnemy } from './FastPurpleEnemy.js';
export { SpawnBlock } from './SpawnBlock.js';

// Management
export { EnemyManager } from './EnemyManager.js';
export { EnemySpawner } from './EnemySpawner.js';

// Configuration
export { ENEMY_TYPES, getEnemyConfig, CRYSTAL_ENEMY_MAPPING } from './EnemyTypes.js';

