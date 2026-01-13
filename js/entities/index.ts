// Entity module - Re-exports all entity classes for easy importing
// Usage: import { Builder, Fighter, EnemyManager } from './entities';

// Base class
export { BaseEnemy } from './BaseEnemy';

// Enemy types
export { Builder } from './Builder';
export { Fighter } from './Fighter';
export { FieryEnemy } from './FieryEnemy';
export { GravitationalEnemy } from './GravitationalEnemy';
export { FastPurpleEnemy } from './FastPurpleEnemy';
export { SpawnBlock } from './SpawnBlock';

// Management
export { EnemyManager } from './EnemyManager';
export { EnemySpawner } from './EnemySpawner';

// Configuration
export { ENEMY_TYPES, getEnemyConfig, CRYSTAL_ENEMY_MAPPING } from './EnemyTypes';

