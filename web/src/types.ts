export type GamePhase = "menu" | "playing" | "dead";

export interface Player {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  invincible: number; // seconds of invincibility remaining
  trail: { x: number; y: number }[];
}

export interface Bomb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rotation: number;
  rotSpeed: number;
  pulse: number; // 0..1 animation phase
}

export interface Star {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rotation: number;
  rotSpeed: number;
  twinkle: number;
  color: string;
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
  text: string;
  color: string;
  life: number;
  vy: number;
}
