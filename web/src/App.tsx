import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGameLoop } from "./hooks/useGameLoop";
import { useHighScore } from "./hooks/useHighScore";
import { ANIMALS, RARITY_COLORS, RARITY_LABELS } from "./lib/animals";
import {
  drawPlayer, drawBomb, drawStar, drawMedicine,
  drawExplosion, drawShockWave, drawParticles, drawScene,
} from "./lib/draw";
import type {
  Player, FallingBomb, FallingStar, FallingMedicine,
  Particle, FloatText, ShockWave, GamePhase,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_W = 52;
const PLAYER_H = 52;
const GRAVITY = 1800;
const JUMP_VEL = -620;
const MOVE_ACCEL = 5200;
const MOVE_FRICTION = 0.85;
const MAX_SPEED = 460;
const GROUND_Y_FRAC = 0.82;
const MAX_LIVES = 3;
const MAX_MEDICINE = 3;
const STAR_COLORS = ["#ffd700", "#ffe066", "#40c4ff", "#e040fb", "#ff8f00", "#69f0ae"];

let _uid = 1;
const uid = () => _uid++;

// ─── Persistence ──────────────────────────────────────────────────────────────
const loadStars = () => parseInt(localStorage.getItem("avoidit_stars") ?? "0", 10) || 0;
const saveStars = (n: number) => localStorage.setItem("avoidit_stars", String(n));
const loadUnlocks = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem("avoidit_unlocks") ?? "{}"); } catch { return {}; }
};
const saveUnlocks = (u: Record<string, number>) => localStorage.setItem("avoidit_unlocks", JSON.stringify(u));
const loadSelected = (): { animalId: string; tierIdx: number } => {
  try { return JSON.parse(localStorage.getItem("avoidit_selected") ?? "null") ?? { animalId: "dog", tierIdx: 0 }; }
  catch { return { animalId: "dog", tierIdx: 0 }; }
};
const saveSelected = (s: { animalId: string; tierIdx: number }) =>
  localStorage.setItem("avoidit_selected", JSON.stringify(s));

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [highScore, updateHighScore] = useHighScore("avoidit_highscore");

  // Persistent
  const [bankStars, setBankStars] = useState(loadStars);
  const [unlocks, setUnlocks] = useState(loadUnlocks);
  const [selected, setSelected] = useState(loadSelected);

  // HUD
  const [livesDisplay, setLivesDisplay] = useState(MAX_LIVES);
  const [medDisplay, setMedDisplay] = useState(0);
  const [waveDisplay, setWaveDisplay] = useState(1);
  const [starsEarned, setStarsEarned] = useState(0);
  const [useHint, setUseHint] = useState(false);

  // Mutable game state
  const player = useRef<Player>({ x: 0, y: 0, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, onGround: false, invincible: 0 });
  const bombs = useRef<FallingBomb[]>([]);
  const stars = useRef<FallingStar[]>([]);
  const meds = useRef<FallingMedicine[]>([]);
  const particles = useRef<Particle[]>([]);
  const floats = useRef<FloatText[]>([]);
  const shocks = useRef<ShockWave[]>([]);
  const keys = useRef<Set<string>>(new Set());
  const touchLeft = useRef(false);
  const touchRight = useRef(false);
  const touchJump = useRef(false);
  const touchMed = useRef(false);
  const scoreRef = useRef(0);
  const starsRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const medRef = useRef(0);
  const waveRef = useRef(1);
  const timeRef = useRef(0);
  const bombTimer = useRef(0);
  const starTimer = useRef(0);
  const medTimer = useRef(0);
  const phaseRef = useRef<GamePhase>("menu");
  const comboRef = useRef(0);
  const comboTimer = useRef(0);
  const medDebounce = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const animal = ANIMALS.find(a => a.id === selected.animalId) ?? ANIMALS[0]!;
  const tier = animal.tiers[selected.tierIdx]!;

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","w","a","s","d","e","E"].includes(e.key))
        e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const spawnBomb = useCallback((W: number) => {
    const wave = waveRef.current;
    const r = 18 + Math.random() * 9;
    bombs.current.push({
      id: uid(), x: r + Math.random() * (W - r * 2), y: -r - Math.random() * 60,
      vy: 120 + wave * 28 + Math.random() * 60, r,
      rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 4,
      pulse: Math.random(), exploded: false, explodeTimer: 0,
    });
  }, []);

  const spawnStar = useCallback((W: number) => {
    const r = 14 + Math.random() * 7;
    stars.current.push({
      id: uid(), x: r + Math.random() * (W - r * 2), y: -r - Math.random() * 40,
      vy: 80 + Math.random() * 50, r,
      rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 3,
      twinkle: Math.random(), color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!,
      collected: false,
    });
  }, []);

  const spawnMed = useCallback((W: number) => {
    const r = 18;
    meds.current.push({
      id: uid(), x: r + Math.random() * (W - r * 2), y: -r - Math.random() * 40,
      vy: 70 + Math.random() * 30, r,
      rotation: 0, rotSpeed: (Math.random() - 0.5) * 1.5,
      bob: Math.random(), collected: false,
    });
  }, []);

  const boom = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      particles.current.push({ id: uid(), x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, life: 1, size: 3 + Math.random() * 5 });
    }
  };

  const floatPop = (x: number, y: number, text: string, color: string) => {
    floats.current.push({ id: uid(), x, y, vy: -70, text, color, life: 1 });
  };

  const takeDamage = useCallback((pl: Player, bx: number, by: number) => {
    livesRef.current--;
    setLivesDisplay(livesRef.current);
    pl.invincible = 2.0;
    comboRef.current = 0;
    floatPop(pl.x + pl.w / 2, pl.y - 20, "💥 OUCH!", "#f44336");
    boom(bx, by, "#ff5722", 18);
    boom(bx, by, "#ffd700", 8);
    shocks.current.push({ id: uid(), x: bx, y: by, r: 20, maxR: 100, life: 1 });
    if (livesRef.current <= 0) {
      updateHighScore(scoreRef.current);
      const newBank = loadStars() + starsRef.current;
      saveStars(newBank);
      setBankStars(newBank);
      setPhase("dead");
      phaseRef.current = "dead";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateHighScore]);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width || 400;
    const H = canvas.height || 600;
    const groundY = H * GROUND_Y_FRAC;
    player.current = { x: W / 2 - PLAYER_W / 2, y: groundY - PLAYER_H, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, onGround: true, invincible: 0 };
    bombs.current = []; stars.current = []; meds.current = [];
    particles.current = []; floats.current = []; shocks.current = [];
    scoreRef.current = 0; starsRef.current = 0;
    livesRef.current = MAX_LIVES; medRef.current = 0;
    waveRef.current = 1; timeRef.current = 0;
    bombTimer.current = 0; starTimer.current = 0; medTimer.current = 0;
    comboRef.current = 0; comboTimer.current = 0;
    medDebounce.current = false;
    setScore(0); setStarsEarned(0); setLivesDisplay(MAX_LIVES);
    setMedDisplay(0); setWaveDisplay(1); setUseHint(false);
    setPhase("playing");
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    const groundY = H * GROUND_Y_FRAC;

    timeRef.current += phaseRef.current === "playing" ? dt : dt * 0.2;
    const t = timeRef.current;

    ctx.clearRect(0, 0, W, H);
    drawScene(ctx, W, H, groundY, t);
    if (phaseRef.current !== "playing") return;

    // Wave
    const newWave = 1 + Math.floor(t / 18);
    if (newWave !== waveRef.current) {
      waveRef.current = newWave; setWaveDisplay(newWave);
      floatPop(W / 2, groundY * 0.4, `⚡ WAVE ${newWave}!`, "#e040fb");
    }
    const wave = waveRef.current;

    // Spawn bombs
    const bombInterval = Math.max(0.3, 1.5 - wave * 0.1);
    bombTimer.current += dt;
    while (bombTimer.current >= bombInterval) {
      bombTimer.current -= bombInterval;
      spawnBomb(W);
      if (wave >= 4 && Math.random() < 0.4) spawnBomb(W);
      if (wave >= 7 && Math.random() < 0.3) spawnBomb(W);
    }

    // Spawn stars
    const starInterval = Math.max(1.5, 3.5 - wave * 0.08);
    starTimer.current += dt;
    while (starTimer.current >= starInterval && stars.current.length < Math.min(6, 2 + Math.floor(wave / 2))) {
      starTimer.current -= starInterval; spawnStar(W);
    }

    // Spawn medicine — every ~18s, only if player needs it and slot free
    const medInterval = Math.max(12, 18 - wave * 0.4);
    medTimer.current += dt;
    if (medTimer.current >= medInterval && meds.current.length === 0 && medRef.current < MAX_MEDICINE) {
      medTimer.current = 0; spawnMed(W);
    }

    // Player input
    const pl = player.current;
    const k = keys.current;
    let moveX = 0;
    if (k.has("ArrowLeft") || k.has("a") || touchLeft.current) moveX -= 1;
    if (k.has("ArrowRight") || k.has("d") || touchRight.current) moveX += 1;
    pl.vx += moveX * MOVE_ACCEL * dt;
    pl.vx *= Math.pow(MOVE_FRICTION, dt * 60);
    if (Math.abs(pl.vx) > MAX_SPEED) pl.vx = Math.sign(pl.vx) * MAX_SPEED;

    if ((k.has("ArrowUp") || k.has("w") || k.has(" ") || touchJump.current) && pl.onGround) {
      pl.vy = JUMP_VEL; pl.onGround = false;
    }

    // Use medicine: E key or touch button
    const wantsMed = k.has("e") || k.has("E") || touchMed.current;
    if (wantsMed && !medDebounce.current && medRef.current > 0 && livesRef.current < MAX_LIVES) {
      medDebounce.current = true;
      medRef.current--;
      livesRef.current = Math.min(livesRef.current + 1, MAX_LIVES);
      setMedDisplay(medRef.current);
      setLivesDisplay(livesRef.current);
      boom(pl.x + pl.w / 2, pl.y + pl.h / 2, "#00e676", 18);
      boom(pl.x + pl.w / 2, pl.y + pl.h / 2, "#fff", 8);
      floatPop(pl.x + pl.w / 2, pl.y - 30, "💊 +1 ❤️ HEALED!", "#69f0ae");
    }
    if (!wantsMed) medDebounce.current = false;

    pl.vy += GRAVITY * dt;
    pl.x += pl.vx * dt; pl.y += pl.vy * dt;
    if (pl.y + pl.h >= groundY) { pl.y = groundY - pl.h; pl.vy = 0; pl.onGround = true; }
    else pl.onGround = false;
    if (pl.x < 0) { pl.x = 0; pl.vx = 0; }
    if (pl.x + pl.w > W) { pl.x = W - pl.w; pl.vx = 0; }
    if (pl.invincible > 0) pl.invincible -= dt;

    // Update bombs
    const removeBombs = new Set<number>();
    for (const b of bombs.current) {
      if (b.exploded) {
        b.explodeTimer -= dt * 2;
        if (b.explodeTimer <= 0) removeBombs.add(b.id);
        continue;
      }
      b.y += b.vy * dt; b.rotation += b.rotSpeed * dt;
      if (b.y + b.r >= groundY) {
        b.exploded = true; b.explodeTimer = 1;
        const dx = pl.x + pl.w / 2 - b.x; const dy = pl.y + pl.h / 2 - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < b.r * 4 && pl.invincible <= 0) takeDamage(pl, b.x, groundY - b.r);
        continue;
      }
      if (pl.invincible <= 0) {
        const dx = pl.x + pl.w / 2 - b.x; const dy = pl.y + pl.h / 2 - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < pl.w * 0.48 + b.r - 4) {
          b.exploded = true; b.explodeTimer = 1; takeDamage(pl, b.x, b.y);
        }
      }
    }
    bombs.current = bombs.current.filter(b => !removeBombs.has(b.id));

    // Update stars
    const removeStars = new Set<number>();
    for (const s of stars.current) {
      s.y += s.vy * dt; s.rotation += s.rotSpeed * dt;
      if (s.y - s.r >= groundY) { removeStars.add(s.id); continue; }
      const dx = pl.x + pl.w / 2 - s.x; const dy = pl.y + pl.h / 2 - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < pl.w * 0.5 + s.r) {
        removeStars.add(s.id);
        comboRef.current++; comboTimer.current = 2.5;
        const pts = 10 * Math.max(1, comboRef.current);
        scoreRef.current += pts; starsRef.current++;
        setScore(scoreRef.current); setStarsEarned(starsRef.current);
        boom(s.x, s.y, s.color, 14); boom(s.x, s.y, "#fff", 6);
        floatPop(s.x, s.y - 20, `⭐ +${pts}${comboRef.current >= 3 ? ` x${comboRef.current}!` : ""}`, s.color);
      }
    }
    stars.current = stars.current.filter(s => !removeStars.has(s.id));

    // Update medicine pickups
    const removeMeds = new Set<number>();
    for (const m of meds.current) {
      m.y += m.vy * dt; m.rotation += m.rotSpeed * dt;
      if (m.y - m.r >= groundY) { removeMeds.add(m.id); continue; }
      const dx = pl.x + pl.w / 2 - m.x; const dy = pl.y + pl.h / 2 - m.y;
      if (Math.sqrt(dx * dx + dy * dy) < pl.w * 0.5 + m.r && medRef.current < MAX_MEDICINE) {
        removeMeds.add(m.id);
        medRef.current++;
        setMedDisplay(medRef.current);
        boom(m.x, m.y, "#00e676", 16); boom(m.x, m.y, "#fff", 8);
        floatPop(m.x, m.y - 20, "💊 Medicine collected!", "#69f0ae");
        if (medRef.current === 1) setUseHint(true);
      }
    }
    meds.current = meds.current.filter(m => !removeMeds.has(m.id));

    if (comboTimer.current > 0) { comboTimer.current -= dt; if (comboTimer.current <= 0) comboRef.current = 0; }

    // Particles & floats
    for (const p of particles.current) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.vx *= 0.97; p.life -= dt * 1.5; }
    particles.current = particles.current.filter(p => p.life > 0);
    for (const ft of floats.current) { ft.y += ft.vy * dt; ft.life -= dt * 1.1; }
    floats.current = floats.current.filter(ft => ft.life > 0);
    for (const sw of shocks.current) { sw.r += (sw.maxR - sw.r) * dt * 5; sw.life -= dt * 2.5; }
    shocks.current = shocks.current.filter(sw => sw.life > 0);

    // ── Render ────────────────────────────────────────────────────────────
    for (const sw of shocks.current) drawShockWave(ctx, sw);
    for (const s of stars.current) drawStar(ctx, s, t);
    for (const m of meds.current) drawMedicine(ctx, m, t);
    for (const b of bombs.current) b.exploded ? drawExplosion(ctx, b) : drawBomb(ctx, b, t);
    drawParticles(ctx, particles.current);
    drawPlayer(ctx, pl, tier.emoji, tier.color, tier.aura, t, pl.invincible);

    // Float texts
    for (const ft of floats.current) {
      ctx.save(); ctx.globalAlpha = ft.life;
      ctx.font = `bold ${Math.min(W * 0.045, 20)}px Manrope, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = ft.color; ctx.shadowColor = ft.color; ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    }

    // Combo
    if (comboRef.current >= 3) {
      ctx.save();
      ctx.font = `bold ${Math.min(W * 0.055, 26)}px Fraunces, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffd700"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 20;
      ctx.fillText(`🌟 ${comboRef.current}x COMBO!`, W / 2, groundY * 0.12);
      ctx.restore();
    }

    // Danger arrow for nearby bombs
    for (const b of bombs.current) {
      if (b.exploded) continue;
      if (Math.abs(b.x - (pl.x + pl.w / 2)) < 60 && b.y < pl.y) {
        const ax = b.x; const ay = Math.max(b.y + b.r + 10, pl.y - 50);
        ctx.save(); ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#ff1744"; ctx.shadowColor = "#ff1744"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 8, ay - 14); ctx.lineTo(ax + 8, ay - 14); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }, phase !== "playing");

  // ── Unlock / buy tier ─────────────────────────────────────────────────────
  const buyTier = (animalId: string, tierIdx: number, cost: number) => {
    if (bankStars < cost) return;
    const newBank = bankStars - cost;
    const key = `${animalId}_${tierIdx}`;
    const newUnlocks = { ...unlocks, [key]: 1 };
    setBankStars(newBank); saveStars(newBank);
    setUnlocks(newUnlocks); saveUnlocks(newUnlocks);
  };

  const selectAnimal = (animalId: string, tierIdx: number) => {
    const s = { animalId, tierIdx };
    setSelected(s); saveSelected(s);
  };

  const isTierUnlocked = (animalId: string, tIdx: number) =>
    tIdx === 0 || !!unlocks[`${animalId}_${tIdx}`];

  // ── Screens ───────────────────────────────────────────────────────────────
  const renderMenu = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: "linear-gradient(180deg,#0d0033 0%,#1a0050 60%,#2d5a1b 100%)" }}>
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif", color: "#ffd700", textShadow: "0 0 30px #ffd700, 0 0 60px #ff9800" }}>
          AVOIDit
        </h1>
        <p className="text-lg" style={{ color: "#c0c0ff" }}>Dodge bombs • Collect stars • Survive!</p>
      </div>
      <div className="text-6xl animate-bounce">{tier.emoji}</div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={startGame}
          className="w-full py-4 rounded-2xl text-xl font-bold"
          style={{ background: "linear-gradient(135deg,#ff6f00,#ff9800)", color: "#fff", boxShadow: "0 4px 20px rgba(255,152,0,0.5)" }}>
          🚀 Play Now
        </button>
        <button onClick={() => setPhase("select")}
          className="w-full py-3 rounded-2xl text-lg font-bold"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "2px solid rgba(255,255,255,0.2)" }}>
          🐾 Choose Animal
        </button>
      </div>
      {highScore > 0 && (
        <p style={{ color: "#ffd700" }}>🏆 Best: {highScore}</p>
      )}
      <div className="text-sm text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
        Arrow keys / WASD to move • Space to jump<br />
        <span style={{ color: "#69f0ae" }}>E to use medicine 💊</span>
      </div>
    </div>
  );

  const renderSelect = () => (
    <div className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg,#0d0033,#1a0050)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={() => setPhase("menu")} className="text-2xl">←</button>
        <h2 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#ffd700" }}>
          Choose Animal
        </h2>
        <div className="flex items-center gap-1" style={{ color: "#ffd700" }}>
          <span>⭐</span>
          <span className="font-bold">{bankStars}</span>
        </div>
      </div>
      {/* Animal grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {ANIMALS.map(a => (
          <div key={a.id} className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-base font-bold mb-2" style={{ color: "#fff" }}>{a.name}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {a.tiers.map((t2, ti) => {
                const unlocked = isTierUnlocked(a.id, ti);
                const isSelected = selected.animalId === a.id && selected.tierIdx === ti;
                const rarColor = RARITY_COLORS[t2.tier] ?? "#aaa";
                return (
                  <div key={ti} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 72 }}>
                    <button
                      onClick={() => unlocked ? selectAnimal(a.id, ti) : buyTier(a.id, ti, t2.cost)}
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center relative"
                      style={{
                        background: isSelected ? `${rarColor}33` : "rgba(255,255,255,0.07)",
                        border: `2px solid ${isSelected ? rarColor : "rgba(255,255,255,0.15)"}`,
                        boxShadow: isSelected ? `0 0 12px ${rarColor}88` : "none",
                        opacity: !unlocked && bankStars < t2.cost ? 0.5 : 1,
                      }}>
                      <span style={{ fontSize: 28 }}>{t2.emoji}</span>
                      {!unlocked && (
                        <span className="text-xs font-bold" style={{ color: "#ffd700" }}>⭐{t2.cost}</span>
                      )}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 text-xs bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                      )}
                    </button>
                    <span className="text-xs text-center leading-tight" style={{ color: rarColor, fontSize: 10 }}>
                      {RARITY_LABELS[t2.tier]}
                    </span>
                    <span className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>
                      {t2.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 shrink-0">
        <button onClick={startGame}
          className="w-full py-3 rounded-2xl text-lg font-bold"
          style={{ background: "linear-gradient(135deg,#ff6f00,#ff9800)", color: "#fff" }}>
          🚀 Play as {tier.emoji} {tier.label}
        </button>
      </div>
    </div>
  );

  const renderDead = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="text-center">
        <div className="text-5xl mb-2">💥</div>
        <h2 className="text-4xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#ff5252" }}>
          Game Over
        </h2>
        <p className="text-2xl mt-2" style={{ color: "#ffd700" }}>Score: {score}</p>
        {score >= highScore && score > 0 && (
          <p className="text-lg mt-1" style={{ color: "#69f0ae" }}>🏆 New High Score!</p>
        )}
        <p className="mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>High Score: {highScore}</p>
      </div>
      <div className="rounded-2xl px-6 py-3 text-center"
        style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>
        <p style={{ color: "#ffd700" }}>⭐ +{starsEarned} stars earned!</p>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Bank: {bankStars} total</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={startGame}
          className="w-full py-4 rounded-2xl text-xl font-bold"
          style={{ background: "linear-gradient(135deg,#ff6f00,#ff9800)", color: "#fff", boxShadow: "0 4px 20px rgba(255,152,0,0.5)" }}>
          🔄 Try Again
        </button>
        <button onClick={() => setPhase("select")}
          className="w-full py-3 rounded-2xl text-lg font-bold"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "2px solid rgba(255,255,255,0.2)" }}>
          🐾 Upgrade Animal
        </button>
        <button onClick={() => setPhase("menu")}
          className="w-full py-3 rounded-2xl text-base"
          style={{ color: "rgba(255,255,255,0.5)" }}>
          ← Menu
        </button>
      </div>
    </div>
  );

  // ── In-game HUD ───────────────────────────────────────────────────────────
  const renderHUD = () => (
    <div className="absolute inset-x-0 top-0 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        {/* Lives */}
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} style={{ fontSize: 20, opacity: i < livesDisplay ? 1 : 0.2 }}>❤️</span>
          ))}
        </div>
        {/* Wave */}
        <div className="rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: "rgba(224,64,251,0.25)", color: "#e040fb", border: "1px solid rgba(224,64,251,0.4)" }}>
          Wave {waveDisplay}
        </div>
        {/* Stars */}
        <div className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <span className="text-sm font-bold" style={{ color: "#ffd700" }}>{starsEarned}</span>
        </div>
      </div>

      {/* Medicine bar */}
      <div className="flex items-center gap-2 px-3 mt-1">
        <div className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)" }}>
          {Array.from({ length: MAX_MEDICINE }).map((_, i) => (
            <span key={i} style={{ fontSize: 18, opacity: i < medDisplay ? 1 : 0.2 }}>💊</span>
          ))}
          <span className="text-xs ml-1 font-bold" style={{ color: "#69f0ae" }}>
            {medDisplay}/{MAX_MEDICINE}
          </span>
        </div>
        {medDisplay > 0 && livesDisplay < MAX_LIVES && (
          <span className="text-xs animate-pulse" style={{ color: "#69f0ae" }}>
            Press E / 💊 to heal!
          </span>
        )}
        {useHint && medDisplay > 0 && livesDisplay === MAX_LIVES && (
          <span className="text-xs" style={{ color: "rgba(105,240,174,0.6)" }}>
            💊 saved for later
          </span>
        )}
      </div>
    </div>
  );

  // ── Touch controls ────────────────────────────────────────────────────────
  const renderTouchControls = () => (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: "22%" }}>
      <div className="flex items-center justify-between px-4 h-full pointer-events-auto">
        {/* Left */}
        <button
          onPointerDown={() => { touchLeft.current = true; }}
          onPointerUp={() => { touchLeft.current = false; }}
          onPointerCancel={() => { touchLeft.current = false; }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl select-none"
          style={{ background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)", touchAction: "none" }}>
          ◀
        </button>
        {/* Middle: jump + medicine */}
        <div className="flex flex-col items-center gap-2">
          <button
            onPointerDown={() => { touchMed.current = true; }}
            onPointerUp={() => { touchMed.current = false; }}
            onPointerCancel={() => { touchMed.current = false; }}
            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center select-none"
            style={{
              background: medDisplay > 0 && livesDisplay < MAX_LIVES
                ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.08)",
              border: `2px solid ${medDisplay > 0 && livesDisplay < MAX_LIVES ? "#00e676" : "rgba(255,255,255,0.15)"}`,
              touchAction: "none",
            }}>
            <span style={{ fontSize: 22 }}>💊</span>
            <span className="text-xs font-bold" style={{ color: "#69f0ae" }}>{medDisplay}</span>
          </button>
          <button
            onPointerDown={() => { touchJump.current = true; }}
            onPointerUp={() => { touchJump.current = false; }}
            onPointerCancel={() => { touchJump.current = false; }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl select-none"
            style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.25)", touchAction: "none" }}>
            ▲
          </button>
        </div>
        {/* Right */}
        <button
          onPointerDown={() => { touchRight.current = true; }}
          onPointerUp={() => { touchRight.current = false; }}
          onPointerCancel={() => { touchRight.current = false; }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl select-none"
          style={{ background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)", touchAction: "none" }}>
          ▶
        </button>
      </div>
    </div>
  );

  return (
    <GameShell topbar={<GameTopbar title="AVOIDit" score={score} />}>
      <div className="relative w-full h-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {phase === "menu" && renderMenu()}
        {phase === "select" && renderSelect()}
        {phase === "dead" && renderDead()}
        {phase === "playing" && renderHUD()}
        {phase === "playing" && renderTouchControls()}
      </div>
    </GameShell>
  );
}
