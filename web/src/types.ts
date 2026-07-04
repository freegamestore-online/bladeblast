export type GamePhase = "menu" | "playing" | "levelComplete" | "gameOver" | "customize";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FruitHalf {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  type: FruitType;
  side: "left" | "right";
  alpha: number;
  scale: number;
}

export type FruitType = "watermelon" | "orange" | "apple" | "banana" | "pineapple" | "strawberry" | "lemon" | "grape";

export interface Fruit {
  id: number;
  x: number;
  y: number;
  z: number; // depth 0..1 for 3D effect
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  rotSpeed: number;
  type: FruitType;
  radius: number;
  sliced: boolean;
  missed: boolean; // fell off screen without slicing
  spawnTime: number;
}

export interface Spike {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  rotSpeed: number;
  radius: number;
  hit: boolean;
  spawnTime: number;
}

export interface SliceTrail {
  points: { x: number; y: number; t: number }[];
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface KnifeStyle {
  id: string;
  name: string;
  bladeColor: string;
  handleColor: string;
  glowColor: string;
  trailColor: string;
  emoji: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  fruitsToSlice: number;
  spawnRate: number; // fruits per second
  spikeRate: number; // spikes per second
  maxMisses: number;
  speedMult: number;
  background: string;
}
