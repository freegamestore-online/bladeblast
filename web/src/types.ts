export type GamePhase = "menu" | "select" | "playing" | "dead";

// ── Animal definitions ────────────────────────────────────────────────────────
export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface AnimalTier {
  tier: RarityTier;
  emoji: string;
  label: string;
  color: string;       // body glow color
  cost: number;        // stars to unlock this tier (0 = free)
  aura?: string;       // extra aura color for rare+
}

export interface AnimalDef {
  id: string;
  name: string;
  tiers: AnimalTier[];  // index 0 = common, ascending rarity
}

// ── Game objects ──────────────────────────────────────────────────────────────
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  invincible: number;
}

export interface FallingBomb {
  id: number;
  x: number;
  y: number;
  vy: number;
  r: number;
  rotation: number;
  rotSpeed: number;
  pulse: number;
  exploded: boolean;
  explodeTimer: number;
}

export interface FallingStar {
  id: number;
  x: number;
  y: number;
  vy: number;
  r: number;
  rotation: number;
  rotSpeed: number;
  twinkle: number;
  color: string;
  collected: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export interface FloatText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
}

export interface ShockWave {
  id: number;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
}
