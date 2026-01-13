// Core type definitions for the game

// Position and movement
export interface Position { 
  x: number; 
  y: number;
}

export interface Velocity { 
  vx: number; 
  vy: number;
}

// Camera interface
export interface Camera {
  x: number;
  y: number;
  zoom: number;
  worldToScreen(x: number, y: number): Position;
  isVisible(x: number, y: number, radius: number): boolean;
  getVisibleBounds(): { left: number; right: number; top: number; bottom: number };
  follow(target: Entity): void;
  update(): void;
}

// Base entity interface
export interface Entity extends Position {
  radius: number;
  _dead?: boolean;
  _sourceArray?: Entity[];
}

// Fire trail info returned by enemies in burning panic
export interface FireTrailInfo {
  type: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  damage: number;
  creator: Enemy;
}

// Enemy interface (extends BaseEnemy patterns)
export interface Enemy extends Entity {
  type: string;
  health: number;
  maxHealth: number;
  damage: number;
  xp: number;
  speed: number;
  baseSpeed: number;
  color: string;
  hurtTime: number;
  towerLevel: number;
  _isSpawnBlock?: boolean;
  cryostasisInvulnerable?: boolean;
  takeDamage(amount: number): boolean;
  applySlow?(amount: number, duration: number): void;
  applyKnockback?(dirX: number, dirY: number, force: number): void;
  applyDelirious?(duration: number): void;
  applyImmobilize?(duration: number): void;
  applyBurningPanic?(duration: number): void;
  applyPermanentFreeze?(): void;
  update(dt: number, playerX: number, playerY: number, context?: any): FireTrailInfo | null;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

// Enemy configuration
export interface EnemyConfig {
  type: string;
  radius: number;
  speed: number;
  health: number;
  damage: number;
  color: string;
  xp: number;
  towerLevel?: number;
  burningPanicSpeed?: number;
  burningTrailInterval?: number;
}

// Power system types
export interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  category: 'heat' | 'cold' | 'force';
  baseCooldown: number;
  passive: boolean;
  levelScale: { 
    cooldown?: number; 
    damage?: number; 
    radius?: number;
  };
  icon: PowerIcon;
  cast: (ctx: PowerCastContext) => void;
}

export interface PowerIcon {
  color: string;
  glowColor: string;
  render: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;
}

export interface PowerCastContext {
  powerManager: any; // PowerManager type
  level: number;
  def: PowerDefinition;
}

// Player power tracking
export interface PlayerPower {
  id: string;
  level: number;
  runesCollected: number;
  passive: boolean;
}

// Passive upgrade
export interface PassiveUpgrade {
  id: string;
  stacks: number;
}

export interface PassiveUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  stackable: boolean;
  effect: {
    heal?: number;
    maxHealth?: number;
    speedBonus?: number;
    damageReduction?: number;
    cooldownReduction?: number;
    projectileSpeed?: number;
    aggroRadius?: number;
  };
}

// Crystal types
export type CrystalType = 'heat' | 'cold' | 'force';

export interface CrystalTypeConfig {
  color: string;
  glowColor: string;
  particleColor: string;
}

// Event types
export interface GameEvent {
  type: string;
  data: any;
}

// Projectile options
export interface ProjectileOptions {
  radius?: number;
  color?: string;
  piercing?: boolean;
  lifetime?: number;
  knockback?: number;
  slowAmount?: number;
  slowDuration?: number;
  sourceType?: string;
  explosionRadius?: number;
  trailLength?: number;
}

// Area effect options
export interface AreaEffectOptions {
  color?: string;
  damageInterval?: number;
  slowAmount?: number;
  slowDuration?: number;
  pullForce?: number;
  type?: string;
  creator?: Enemy;
  damagePlayer?: boolean;
  playerDamage?: number;
}

// Spawn info from spawn blocks
export interface SpawnInfo {
  x: number;
  y: number;
  count: number;
  enemyType: string;
  scaling: number;
}

