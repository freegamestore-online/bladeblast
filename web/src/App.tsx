import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGameLoop } from "./hooks/useGameLoop";
import { useHighScore } from "./hooks/useHighScore";
import { drawGlow } from "./lib/canvas";
import { ANIMALS, RARITY_COLORS, RARITY_LABELS } from "./lib/animals";
import type {
  Player, FallingBomb, FallingStar, Particle, FloatText, ShockWave, GamePhase,
} from "./types";

// ─── constants ────────────────────────────────────────────────────────────────
const PLAYER_W = 52;
const PLAYER_H = 52;
const GRAVITY = 1800;
const JUMP_VEL = -620;
const MOVE_ACCEL = 1800;
const MOVE_FRICTION = 0.78;
const MAX_SPEED = 380;
const GROUND_Y_FRAC = 0.82; // ground line at 82% of canvas height
const STAR_COLORS = ["#ffd700", "#ffe066", "#40c4ff", "#e040fb", "#ff8f00", "#69f0ae"];

let _uid = 1;
const uid = () => _uid++;

// ─── Persistent state (localStorage) ─────────────────────────────────────────
function loadStars(): number {
  return parseInt(localStorage.getItem("avoidit_stars") ?? "0", 10) || 0;
}
function saveStars(n: number) {
  localStorage.setItem("avoidit_stars", String(n));
}
function loadUnlocks(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem("avoidit_unlocks") ?? "{}"); }
  catch { return {}; }
}
function saveUnlocks(u: Record<string, number>) {
  localStorage.setItem("avoidit_unlocks", JSON.stringify(u));
}
function loadSelected(): { animalId: string; tierIdx: number } {
  try { return JSON.parse(localStorage.getItem("avoidit_selected") ?? "null") ?? { animalId: "dog", tierIdx: 0 }; }
  catch { return { animalId: "dog", tierIdx: 0 }; }
}
function saveSelected(s: { animalId: string; tierIdx: number }) {
  localStorage.setItem("avoidit_selected", JSON.stringify(s));
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  pl: Player,
  emoji: string,
  color: string,
  aura: string | undefined,
  t: number,
  invincible: number,
) {
  if (invincible > 0 && Math.floor(t * 10) % 2 === 0) return;
  ctx.save();
  ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2);

  // Aura for rare+
  if (aura) {
    const pulse = Math.sin(t * 3) * 0.5 + 0.5;
    drawGlow(ctx, 0, 0, pl.w * (1.2 + pulse * 0.4), aura);
  }

  // Shadow on ground
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, pl.h / 2 + 10, pl.w * 0.45, pl.w * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body glow
  drawGlow(ctx, 0, 0, pl.w * 0.9, color);

  // Bounce squish when on ground
  const squishY = pl.onGround ? 1.08 : 0.95;
  const squishX = pl.onGround ? 0.94 : 1.04;
  ctx.scale(squishX, squishY);

  // Emoji character
  ctx.font = `${pl.w * 0.95}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 2);

  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D, b: FallingBomb, t: number) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rotation);

  const pulse = Math.sin(t * 5 + b.pulse * Math.PI * 2) * 0.5 + 0.5;

  // Danger glow
  const glowR = b.r * (1.6 + pulse * 0.5);
  const glow = ctx.createRadialGradient(0, 0, b.r * 0.4, 0, 0, glowR);
  glow.addColorStop(0, `rgba(255,60,60,${0.35 + pulse * 0.2})`);
  glow.addColorStop(1, "rgba(255,60,60,0)");
  ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(-b.r * 0.2, -b.r * 0.2, 1, 0, 0, b.r);
  bodyGrad.addColorStop(0, "#555");
  bodyGrad.addColorStop(0.7, "#111");
  bodyGrad.addColorStop(1, "#000");
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad; ctx.fill();

  // Shine
  ctx.beginPath(); ctx.arc(-b.r * 0.28, -b.r * 0.28, b.r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();

  // Fuse
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -b.r);
  ctx.bezierCurveTo(b.r * 0.5, -b.r * 1.4, -b.r * 0.2, -b.r * 1.8, b.r * 0.15, -b.r * 2.1);
  ctx.stroke();

  // Spark
  drawGlow(ctx, b.r * 0.15, -b.r * 2.1, 7 + pulse * 5, "#ff9800");
  ctx.beginPath(); ctx.arc(b.r * 0.15, -b.r * 2.1, 2.5 + pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,200,50,${0.7 + pulse * 0.3})`; ctx.fill();

  ctx.font = `${b.r * 0.95}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💣", 0, 2);

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, s: FallingStar, t: number) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);

  const tw = Math.sin(t * 3 + s.twinkle * Math.PI * 2) * 0.5 + 0.5;
  const sc = 0.85 + tw * 0.3;
  ctx.scale(sc, sc);

  drawGlow(ctx, 0, 0, s.r * 2.2, s.color);

  ctx.beginPath();
  const spikes = 5;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r2 = i % 2 === 0 ? s.r : s.r * 0.42;
    if (i === 0) ctx.moveTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
    else ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
  }
  ctx.closePath();

  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r);
  sg.addColorStop(0, "#fff");
  sg.addColorStop(0.4, s.color);
  sg.addColorStop(1, s.color + "99");
  ctx.fillStyle = sg; ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();

  ctx.restore();
}

function drawExplosion(ctx: CanvasRenderingContext2D, b: FallingBomb) {
  const prog = 1 - b.explodeTimer;
  const r = b.r * (1 + prog * 5);
  ctx.save();
  ctx.globalAlpha = b.explodeTimer * 0.8;
  const eg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
  eg.addColorStop(0, "#fff");
  eg.addColorStop(0.3, "#ff9800");
  eg.addColorStop(0.7, "#f44336");
  eg.addColorStop(1, "rgba(244,67,54,0)");
  ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fillStyle = eg; ctx.fill();
  ctx.restore();
}

function drawShockWave(ctx: CanvasRenderingContext2D, sw: ShockWave) {
  ctx.save();
  ctx.globalAlpha = sw.life * 0.6;
  ctx.strokeStyle = "#ff9800";
  ctx.lineWidth = 3 * sw.life;
  ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ─── Ground / sky drawing ─────────────────────────────────────────────────────
function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number, t: number) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#0d0033");
  sky.addColorStop(0.5, "#1a0050");
  sky.addColorStop(1, "#2d0070");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY);

  // Stars in sky (static)
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5 + 23) % W);
    const sy = ((i * 97.3 + 11) % (groundY * 0.9));
    const sa = Math.sin(t * 1.5 + i) * 0.3 + 0.7;
    ctx.globalAlpha = sa * 0.6;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon
  const moonX = W * 0.85;
  const moonY = H * 0.1;
  drawGlow(ctx, moonX, moonY, 50, "#fffde7");
  ctx.fillStyle = "#fffde7";
  ctx.beginPath(); ctx.arc(moonX, moonY, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0050";
  ctx.beginPath(); ctx.arc(moonX + 8, moonY - 4, 17, 0, Math.PI * 2); ctx.fill();

  // Ground
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, "#2d5a1b");
  groundGrad.addColorStop(0.05, "#3a7a22");
  groundGrad.addColorStop(0.15, "#4a9e2a");
  groundGrad.addColorStop(0.4, "#5c4a1e");
  groundGrad.addColorStop(1, "#3d2f0f");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  // Grass tufts
  ctx.fillStyle = "#5cbf2a";
  for (let i = 0; i < 20; i++) {
    const gx = (i * 113 + 7) % W;
    const gh = 6 + (i % 4) * 3;
    ctx.fillRect(gx, groundY - gh + 2, 4, gh);
    ctx.fillRect(gx + 5, groundY - gh * 0.7 + 2, 3, gh * 0.7);
  }

  // Ground line glow
  ctx.save();
  ctx.shadowColor = "#7fff00";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "#6abf2a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  ctx.restore();

  // Clouds
  const cloudPositions = [
    { x: (W * 0.15 + t * 12) % (W + 120) - 60, y: H * 0.12 },
    { x: (W * 0.55 + t * 7) % (W + 120) - 60, y: H * 0.18 },
    { x: (W * 0.80 + t * 15) % (W + 120) - 60, y: H * 0.08 },
  ];
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (const c of cloudPositions) {
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 55, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + 35, c.y + 5, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x - 30, c.y + 5, 35, 16, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [highScore, updateHighScore] = useHighScore("avoidit_highscore");

  // Persistent currency + unlocks
  const [bankStars, setBankStars] = useState(loadStars);
  const [unlocks, setUnlocks] = useState(loadUnlocks);
  const [selected, setSelected] = useState(loadSelected);

  // HUD state
  const [livesDisplay, setLivesDisplay] = useState(3);
  const [waveDisplay, setWaveDisplay] = useState(1);
  const [starsEarned, setStarsEarned] = useState(0);

  // ── mutable game state ─────────────────────────────────────────────────────
  const player = useRef<Player>({ x: 0, y: 0, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, onGround: false, invincible: 0 });
  const bombs = useRef<FallingBomb[]>([]);
  const stars = useRef<FallingStar[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatTexts = useRef<FloatText[]>([]);
  const shockWaves = useRef<ShockWave[]>([]);
  const keys = useRef<Set<string>>(new Set());
  const touchLeft = useRef(false);
  const touchRight = useRef(false);
  const touchJump = useRef(false);
  const scoreRef = useRef(0);
  const starsEarnedRef = useRef(0);
  const livesRef = useRef(3);
  const waveRef = useRef(1);
  const timeRef = useRef(0);
  const bombTimer = useRef(0);
  const starTimer = useRef(0);
  const phaseRef = useRef<GamePhase>("menu");
  const comboRef = useRef(0);
  const comboTimer = useRef(0);
  const jumpPressed = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Derived animal info
  const animal = ANIMALS.find(a => a.id === selected.animalId) ?? ANIMALS[0]!;
  const tierIdx = selected.tierIdx;
  const tier = animal.tiers[tierIdx]!;

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(e.key)) e.preventDefault();
      if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && !jumpPressed.current) {
        jumpPressed.current = true;
      }
    };
    const ku = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") jumpPressed.current = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Start / reset ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width || 400;
    const H = canvas.height || 600;
    const groundY = H * GROUND_Y_FRAC;
    player.current = {
      x: W / 2 - PLAYER_W / 2,
      y: groundY - PLAYER_H,
      vx: 0, vy: 0,
      w: PLAYER_W, h: PLAYER_H,
      onGround: true,
      invincible: 0,
    };
    bombs.current = [];
    stars.current = [];
    particles.current = [];
    floatTexts.current = [];
    shockWaves.current = [];
    scoreRef.current = 0;
    starsEarnedRef.current = 0;
    livesRef.current = 3;
    waveRef.current = 1;
    timeRef.current = 0;
    bombTimer.current = 0;
    starTimer.current = 0;
    comboRef.current = 0;
    comboTimer.current = 0;
    jumpPressed.current = false;
    setScore(0);
    setStarsEarned(0);
    setLivesDisplay(3);
    setWaveDisplay(1);
    setPhase("playing");
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function spawnBomb(W: number) {
    const wave = waveRef.current;
    const speed = 120 + wave * 28 + Math.random() * 60;
    const r = 18 + Math.random() * 9;
    bombs.current.push({
      id: uid(),
      x: r + Math.random() * (W - r * 2),
      y: -r - Math.random() * 60,
      vy: speed,
      r,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      pulse: Math.random(),
      exploded: false,
      explodeTimer: 0,
    });
  }

  function spawnStar(W: number) {
    const r = 14 + Math.random() * 7;
    stars.current.push({
      id: uid(),
      x: r + Math.random() * (W - r * 2),
      y: -r - Math.random() * 40,
      vy: 80 + Math.random() * 50,
      r,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
      twinkle: Math.random(),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!,
      collected: false,
    });
  }

  function boom(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      particles.current.push({ id: uid(), x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, life: 1, size: 3 + Math.random() * 5 });
    }
  }

  function floatPop(x: number, y: number, text: string, color: string) {
    floatTexts.current.push({ id: uid(), x, y, vy: -70, text, color, life: 1 });
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const groundY = H * GROUND_Y_FRAC;

    // Draw scene always (menu/dead show static bg)
    timeRef.current += (phaseRef.current === "playing") ? dt : dt * 0.2;
    const t = timeRef.current;

    ctx.clearRect(0, 0, W, H);
    drawScene(ctx, W, H, groundY, t);

    if (phaseRef.current !== "playing") return;

    // ── Wave progression ──────────────────────────────────────────────────────
    const newWave = 1 + Math.floor(t / 18);
    if (newWave !== waveRef.current) {
      waveRef.current = newWave;
      setWaveDisplay(newWave);
      floatPop(W / 2, groundY * 0.5, `⚡ WAVE ${newWave}!`, "#e040fb");
    }
    const wave = waveRef.current;

    // ── Spawn bombs ───────────────────────────────────────────────────────────
    const bombInterval = Math.max(0.3, 1.5 - wave * 0.1);
    bombTimer.current += dt;
    while (bombTimer.current >= bombInterval) {
      bombTimer.current -= bombInterval;
      spawnBomb(W);
      if (wave >= 4 && Math.random() < 0.4) spawnBomb(W);
      if (wave >= 7 && Math.random() < 0.3) spawnBomb(W);
    }

    // ── Spawn stars ───────────────────────────────────────────────────────────
    const starInterval = Math.max(1.5, 3.5 - wave * 0.08);
    const maxStars = Math.min(6, 2 + Math.floor(wave / 2));
    starTimer.current += dt;
    while (starTimer.current >= starInterval && stars.current.length < maxStars) {
      starTimer.current -= starInterval;
      spawnStar(W);
    }

    // ── Player input ──────────────────────────────────────────────────────────
    const pl = player.current;
    const k = keys.current;

    let moveX = 0;
    if (k.has("ArrowLeft") || k.has("a") || touchLeft.current) moveX -= 1;
    if (k.has("ArrowRight") || k.has("d") || touchRight.current) moveX += 1;

    pl.vx += moveX * MOVE_ACCEL * dt;
    pl.vx *= Math.pow(MOVE_FRICTION, dt * 60);
    if (Math.abs(pl.vx) > MAX_SPEED) pl.vx = Math.sign(pl.vx) * MAX_SPEED;

    // Jump
    const wantsJump = k.has("ArrowUp") || k.has("w") || k.has(" ") || touchJump.current;
    if (wantsJump && pl.onGround) {
      pl.vy = JUMP_VEL;
      pl.onGround = false;
      jumpPressed.current = false;
    }

    // Gravity
    pl.vy += GRAVITY * dt;

    pl.x += pl.vx * dt;
    pl.y += pl.vy * dt;

    // Ground collision
    if (pl.y + pl.h >= groundY) {
      pl.y = groundY - pl.h;
      pl.vy = 0;
      pl.onGround = true;
    } else {
      pl.onGround = false;
    }

    // Wall clamp
    if (pl.x < 0) { pl.x = 0; pl.vx = 0; }
    if (pl.x + pl.w > W) { pl.x = W - pl.w; pl.vx = 0; }

    if (pl.invincible > 0) pl.invincible -= dt;

    // ── Update bombs ──────────────────────────────────────────────────────────
    const removeBombs = new Set<number>();
    for (const b of bombs.current) {
      if (b.exploded) {
        b.explodeTimer -= dt * 2;
        if (b.explodeTimer <= 0) removeBombs.add(b.id);
        continue;
      }

      b.y += b.vy * dt;
      b.rotation += b.rotSpeed * dt;

      // Hit ground
      if (b.y + b.r >= groundY) {
        b.y = groundY - b.r;
        b.exploded = true;
        b.explodeTimer = 1;
        boom(b.x, b.y, "#ff5722", 20);
        boom(b.x, b.y, "#ffd700", 10);
        shockWaves.current.push({ id: uid(), x: b.x, y: b.y, r: b.r, maxR: b.r * 5, life: 1 });

        // Hurt player if close to explosion
        const dx = pl.x + pl.w / 2 - b.x;
        const dy = pl.y + pl.h / 2 - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.r * 4 && pl.invincible <= 0) {
          livesRef.current--;
          setLivesDisplay(livesRef.current);
          pl.invincible = 2.0;
          comboRef.current = 0;
          floatPop(pl.x + pl.w / 2, pl.y - 20, "💥 OUCH!", "#f44336");
          if (livesRef.current <= 0) {
            updateHighScore(scoreRef.current);
            // Save earned stars to bank
            const newBank = loadStars() + starsEarnedRef.current;
            saveStars(newBank);
            setBankStars(newBank);
            setPhase("dead");
            phaseRef.current = "dead";
          }
        }
        continue;
      }

      // Direct hit on player (falling)
      if (pl.invincible <= 0) {
        const cx = pl.x + pl.w / 2;
        const cy = pl.y + pl.h / 2;
        const dx = cx - b.x;
        const dy = cy - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pl.w * 0.48 + b.r - 4) {
          livesRef.current--;
          setLivesDisplay(livesRef.current);
          pl.invincible = 2.0;
          comboRef.current = 0;
          b.exploded = true;
          b.explodeTimer = 1;
          boom(b.x, b.y, "#ff5722", 24);
          boom(b.x, b.y, "#ffd700", 12);
          shockWaves.current.push({ id: uid(), x: b.x, y: b.y, r: b.r, maxR: b.r * 5, life: 1 });
          floatPop(cx, pl.y - 20, "💥 OUCH!", "#f44336");
          if (livesRef.current <= 0) {
            updateHighScore(scoreRef.current);
            const newBank = loadStars() + starsEarnedRef.current;
            saveStars(newBank);
            setBankStars(newBank);
            setPhase("dead");
            phaseRef.current = "dead";
          }
        }
      }
    }
    bombs.current = bombs.current.filter(b => !removeBombs.has(b.id));

    // ── Update stars ──────────────────────────────────────────────────────────
    const removeStars = new Set<number>();
    for (const s of stars.current) {
      s.y += s.vy * dt;
      s.rotation += s.rotSpeed * dt;

      // Hit ground — disappear
      if (s.y - s.r >= groundY) { removeStars.add(s.id); continue; }

      // Collect
      const cx = pl.x + pl.w / 2;
      const cy = pl.y + pl.h / 2;
      const dx = cx - s.x;
      const dy = cy - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < pl.w * 0.5 + s.r) {
        removeStars.add(s.id);
        comboRef.current++;
        comboTimer.current = 2.5;
        const pts = 10 * Math.max(1, comboRef.current);
        scoreRef.current += pts;
        starsEarnedRef.current++;
        setScore(scoreRef.current);
        setStarsEarned(starsEarnedRef.current);
        boom(s.x, s.y, s.color, 14);
        boom(s.x, s.y, "#fff", 6);
        const comboStr = comboRef.current >= 3 ? ` x${comboRef.current} COMBO!` : "";
        floatPop(s.x, s.y - 20, `⭐ +${pts}${comboStr}`, s.color);
      }
    }
    stars.current = stars.current.filter(s => !removeStars.has(s.id));

    if (comboTimer.current > 0) { comboTimer.current -= dt; if (comboTimer.current <= 0) comboRef.current = 0; }

    // ── Update particles ──────────────────────────────────────────────────────
    for (const p of particles.current) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 400 * dt; // slight gravity on particles
      p.vx *= 0.97; p.life -= dt * 1.5;
    }
    particles.current = particles.current.filter(p => p.life > 0);

    for (const ft of floatTexts.current) { ft.y += ft.vy * dt; ft.life -= dt * 1.1; }
    floatTexts.current = floatTexts.current.filter(ft => ft.life > 0);

    for (const sw of shockWaves.current) {
      sw.r += (sw.maxR - sw.r) * dt * 5;
      sw.life -= dt * 2.5;
    }
    shockWaves.current = shockWaves.current.filter(sw => sw.life > 0);

    // ── Draw ──────────────────────────────────────────────────────────────────
    // Shockwaves
    for (const sw of shockWaves.current) drawShockWave(ctx, sw);

    // Stars
    for (const s of stars.current) drawStar(ctx, s, t);

    // Bombs (exploding first, then flying)
    for (const b of bombs.current) {
      if (b.exploded) drawExplosion(ctx, b);
      else drawBomb(ctx, b, t);
    }

    // Particles
    for (const p of particles.current) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.restore();
    }

    // Player
    drawPlayer(ctx, pl, tier.emoji, tier.color, tier.aura, t, pl.invincible);

    // Float texts
    for (const ft of floatTexts.current) {
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.font = `bold ${Math.min(W * 0.045, 20)}px Manrope, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = ft.color; ctx.shadowColor = ft.color; ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Combo display
    if (comboRef.current >= 3) {
      ctx.save();
      ctx.font = `bold ${Math.min(W * 0.055, 26)}px Fraunces, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffd700"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 20;
      ctx.fillText(`🌟 ${comboRef.current}x COMBO!`, W / 2, groundY * 0.12);
      ctx.restore();
    }

    // Danger indicator — falling bomb close to player
    for (const b of bombs.current) {
      if (b.exploded) continue;
      if (Math.abs(b.x - (pl.x + pl.w / 2)) < 60 && b.y < pl.y) {
        // Arrow indicator
        const ax = b.x;
        const ay = Math.max(b.y + b.r + 10, 30);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#f44336";
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(ax - 8, ay - 14); ctx.lineTo(ax + 8, ay - 14);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }, phase !== "playing");

  // ── Upgrade / select handlers ──────────────────────────────────────────────
  const handleSelectAnimal = (animalId: string, tierIdx: number) => {
    const newSel = { animalId, tierIdx };
    setSelected(newSel);
    saveSelected(newSel);
  };

  const handleUnlock = (animalId: string, tierIdx: number) => {
    const a = ANIMALS.find(x => x.id === animalId);
    if (!a) return;
    const t2 = a.tiers[tierIdx];
    if (!t2) return;
    const current = loadStars();
    if (current < t2.cost) return;
    const newBank = current - t2.cost;
    saveStars(newBank);
    setBankStars(newBank);
    const key = `${animalId}_${tierIdx}`;
    const newUnlocks = { ...loadUnlocks(), [key]: 1 };
    saveUnlocks(newUnlocks);
    setUnlocks(newUnlocks);
    handleSelectAnimal(animalId, tierIdx);
  };

  const isTierUnlocked = (animalId: string, tIdx: number) => {
    if (tIdx === 0) return true;
    return !!(unlocks[`${animalId}_${tIdx}`]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <GameShell topbar={<GameTopbar title="AVOIDit" score={score} highScore={highScore} />}>
      <div className="relative w-full h-full overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* ── HUD (playing) ── */}
        {phase === "playing" && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Lives */}
            <div className="absolute top-3 left-3 flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-2xl" style={{ opacity: i < livesDisplay ? 1 : 0.15, filter: i < livesDisplay ? "drop-shadow(0 0 6px #f44336)" : "none" }}>❤️</span>
              ))}
            </div>
            {/* Wave */}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: "rgba(224,64,251,0.2)", border: "1px solid #e040fb", color: "#e040fb", fontFamily: "Manrope,sans-serif", boxShadow: "0 0 10px #e040fb44" }}>
              ⚡ Wave {waveDisplay}
            </div>
            {/* Stars earned this run */}
            <div className="absolute top-10 right-3 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(255,215,0,0.15)", border: "1px solid #ffd700", color: "#ffd700", fontFamily: "Manrope,sans-serif", marginTop: 6 }}>
              ⭐ {starsEarned}
            </div>

            {/* Touch controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4 pointer-events-auto">
              <div className="flex gap-3">
                <button
                  className="rounded-full flex items-center justify-center text-2xl font-bold select-none active:scale-95"
                  style={{ width: 64, height: 64, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.25)", color: "#fff" }}
                  onTouchStart={(e) => { e.preventDefault(); touchLeft.current = true; }}
                  onTouchEnd={() => { touchLeft.current = false; }}
                  onMouseDown={() => { touchLeft.current = true; }}
                  onMouseUp={() => { touchLeft.current = false; }}
                  onMouseLeave={() => { touchLeft.current = false; }}
                >◀</button>
                <button
                  className="rounded-full flex items-center justify-center text-2xl font-bold select-none active:scale-95"
                  style={{ width: 64, height: 64, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.25)", color: "#fff" }}
                  onTouchStart={(e) => { e.preventDefault(); touchRight.current = true; }}
                  onTouchEnd={() => { touchRight.current = false; }}
                  onMouseDown={() => { touchRight.current = true; }}
                  onMouseUp={() => { touchRight.current = false; }}
                  onMouseLeave={() => { touchRight.current = false; }}
                >▶</button>
              </div>
              <button
                className="rounded-full flex items-center justify-center text-2xl font-bold select-none active:scale-95"
                style={{ width: 72, height: 72, background: "rgba(64,196,255,0.2)", border: "2px solid #40c4ff", color: "#fff" }}
                onTouchStart={(e) => { e.preventDefault(); touchJump.current = true; }}
                onTouchEnd={() => { touchJump.current = false; }}
                onMouseDown={() => { touchJump.current = true; }}
                onMouseUp={() => { touchJump.current = false; }}
                onMouseLeave={() => { touchJump.current = false; }}
              >JUMP</button>
            </div>
          </div>
        )}

        {/* ── MENU ── */}
        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto"
            style={{ background: "rgba(4,0,26,0.88)" }}>
            <div className="flex flex-col items-center w-full max-w-md px-4 py-6 gap-5">
              {/* Title */}
              <div className="text-center">
                <div className="text-5xl mb-2" style={{ filter: "drop-shadow(0 0 18px #ffd700)" }}>⭐</div>
                <h1 style={{ fontFamily: "Fraunces,serif", fontSize: "clamp(2.2rem,9vw,3.8rem)", color: "#fff", textShadow: "0 0 40px #e040fb, 0 0 80px #40c4ff", letterSpacing: "0.04em", fontWeight: 700 }}>
                  AVOIDit
                </h1>
                <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Manrope,sans-serif", fontSize: 14 }}>
                  Dodge bombs · Catch stars · Upgrade your animal
                </p>
              </div>

              {/* Star bank */}
              <div className="px-5 py-2 rounded-full flex items-center gap-2"
                style={{ background: "rgba(255,215,0,0.12)", border: "1px solid #ffd700" }}>
                <span className="text-xl">⭐</span>
                <span style={{ color: "#ffd700", fontFamily: "Fraunces,serif", fontSize: "1.2rem", fontWeight: 700 }}>{bankStars}</span>
                <span style={{ color: "rgba(255,215,0,0.6)", fontSize: 13, fontFamily: "Manrope,sans-serif" }}>stars saved</span>
              </div>

              {/* Animal selector */}
              <div className="w-full">
                <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Manrope,sans-serif", fontSize: 12, textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Choose your animal</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANIMALS.map(a => {
                    const curTierIdx = selected.animalId === a.id ? selected.tierIdx : 0;
                    const curTier = a.tiers[curTierIdx]!;
                    const isActive = selected.animalId === a.id;
                    return (
                      <button key={a.id}
                        onClick={() => handleSelectAnimal(a.id, selected.animalId === a.id ? selected.tierIdx : 0)}
                        className="flex flex-col items-center gap-1 rounded-2xl py-3 px-2 transition-all"
                        style={{
                          background: isActive ? `rgba(${hexToRgbStr(curTier.color)},0.25)` : "rgba(255,255,255,0.06)",
                          border: isActive ? `2px solid ${curTier.color}` : "2px solid rgba(255,255,255,0.1)",
                          boxShadow: isActive ? `0 0 16px ${curTier.color}66` : "none",
                          minHeight: 80,
                        }}>
                        <span className="text-3xl">{curTier.emoji}</span>
                        <span style={{ color: "#fff", fontFamily: "Manrope,sans-serif", fontSize: 11, fontWeight: 600 }}>{a.name}</span>
                        <span style={{ color: RARITY_COLORS[curTier.tier], fontFamily: "Manrope,sans-serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {RARITY_LABELS[curTier.tier]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tier upgrades for selected animal */}
              <div className="w-full">
                <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Manrope,sans-serif", fontSize: 12, textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {animal.name} — upgrade tiers
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {animal.tiers.map((t2, idx) => {
                    const unlocked = isTierUnlocked(animal.id, idx);
                    const isSelected = selected.animalId === animal.id && selected.tierIdx === idx;
                    return (
                      <button key={idx}
                        onClick={() => {
                          if (unlocked) handleSelectAnimal(animal.id, idx);
                          else handleUnlock(animal.id, idx);
                        }}
                        className="flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl py-3 px-3 transition-all"
                        style={{
                          minWidth: 76,
                          background: isSelected ? `rgba(${hexToRgbStr(t2.color)},0.3)` : unlocked ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.4)",
                          border: isSelected ? `2px solid ${t2.color}` : `2px solid ${RARITY_COLORS[t2.tier]}55`,
                          boxShadow: isSelected ? `0 0 14px ${t2.color}66` : "none",
                          opacity: !unlocked && bankStars < t2.cost ? 0.55 : 1,
                        }}>
                        <span className="text-2xl" style={{ filter: unlocked ? "none" : "grayscale(0.6)" }}>{t2.emoji}</span>
                        <span style={{ color: RARITY_COLORS[t2.tier], fontFamily: "Manrope,sans-serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>{RARITY_LABELS[t2.tier]}</span>
                        <span style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Manrope,sans-serif", fontSize: 10 }}>{t2.label}</span>
                        {!unlocked && (
                          <span style={{ color: bankStars >= t2.cost ? "#ffd700" : "#888", fontFamily: "Manrope,sans-serif", fontSize: 11, fontWeight: 700 }}>
                            ⭐ {t2.cost}
                          </span>
                        )}
                        {unlocked && !isSelected && (
                          <span style={{ color: "#4caf50", fontSize: 10 }}>✔ Tap</span>
                        )}
                        {isSelected && (
                          <span style={{ color: t2.color, fontSize: 10, fontWeight: 700 }}>● Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Play button */}
              <button onClick={startGame}
                className="w-full py-4 rounded-2xl font-bold"
                style={{
                  fontFamily: "Fraunces,serif",
                  fontSize: "clamp(1.1rem,4vw,1.4rem)",
                  background: `linear-gradient(135deg, ${tier.color}, ${tier.aura ?? tier.color}88)`,
                  color: "#fff",
                  boxShadow: `0 0 28px ${tier.color}88`,
                  minHeight: 56, border: "none",
                }}>
                🚀 Play as {tier.emoji} {tier.label}
              </button>

              {/* How to play */}
              <div className="text-center text-sm rounded-2xl px-5 py-3 w-full"
                style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Manrope,sans-serif", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", lineHeight: 1.9 }}>
                <div>💣 Dodge falling bombs</div>
                <div>⭐ Catch falling stars to score</div>
                <div>🏃 Move left/right · Jump to dodge</div>
                <div>🌟 Stars saved = unlock rarer tiers</div>
                {highScore > 0 && <div className="mt-1" style={{ color: "#ffd700" }}>🏆 Best: {highScore.toLocaleString()}</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── GAME OVER ── */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6"
            style={{ background: "rgba(10,0,0,0.92)" }}>
            <div className="text-6xl">💥</div>
            <h2 style={{ fontFamily: "Fraunces,serif", fontSize: "clamp(2rem,8vw,3rem)", color: "#f44336", textShadow: "0 0 30px #f44336", fontWeight: 700 }}>
              GAME OVER
            </h2>

            <div className="text-center rounded-2xl px-8 py-4 w-full max-w-xs"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Manrope,sans-serif" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Score</p>
              <p style={{ color: "#ffd700", fontSize: "2rem", fontWeight: 700, fontFamily: "Fraunces,serif" }}>{score.toLocaleString()}</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Wave {waveDisplay} reached</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xl">⭐</span>
                <span style={{ color: "#ffd700", fontWeight: 700 }}>+{starsEarned} stars earned</span>
              </div>
              <p style={{ color: "rgba(255,215,0,0.6)", fontSize: 12 }}>Bank: {bankStars} total</p>
              {score >= highScore && score > 0 && <p style={{ color: "#ffd700", marginTop: 6 }}>🏆 New High Score!</p>}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button onClick={startGame}
                className="w-full py-4 rounded-2xl font-bold"
                style={{ fontFamily: "Fraunces,serif", fontSize: "1.2rem", background: "linear-gradient(135deg,#f44336,#b71c1c)", color: "#fff", boxShadow: "0 0 22px #f4433666", minHeight: 56, border: "none" }}>
                🔄 Try Again
              </button>
              <button onClick={() => setPhase("menu")}
                className="w-full py-3 rounded-2xl font-bold"
                style={{ fontFamily: "Manrope,sans-serif", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", minHeight: 48 }}>
                🏠 Menu & Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}

// tiny helper — convert hex to "r,g,b" string for rgba()
function hexToRgbStr(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
