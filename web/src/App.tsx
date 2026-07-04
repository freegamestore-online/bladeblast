import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState } from "react";
import { useGameLoop } from "./hooks/useGameLoop";
import { useHighScore } from "./hooks/useHighScore";
import { drawGlow } from "./lib/canvas";
import type { Player, Bomb, Star, Particle, FloatText, GamePhase } from "./types";

// ─── constants ────────────────────────────────────────────────────────────────
const PLAYER_R = 18;
const GRAVITY = 0;          // top-down, no gravity
const FRICTION = 0.82;
const ACCEL = 900;
const STAR_COLORS = ["#ffd700", "#ffe066", "#fff176", "#ffca28", "#ff8f00", "#40c4ff", "#e040fb"];

let _uid = 1;
const uid = () => _uid++;

// ─── draw helpers ─────────────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, t: number) {
  // Trail
  for (let i = 0; i < p.trail.length; i++) {
    const pt = p.trail[i]!;
    const a = (i / p.trail.length) * 0.35;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, PLAYER_R * 0.7 * (i / p.trail.length), 0, Math.PI * 2);
    ctx.fillStyle = "#40c4ff";
    ctx.fill();
    ctx.restore();
  }

  // Invincibility flash
  if (p.invincible > 0 && Math.floor(t * 10) % 2 === 0) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  // Glow
  drawGlow(ctx, 0, 0, PLAYER_R * 2.5, "#40c4ff");

  // Body
  const bodyGrad = ctx.createRadialGradient(-PLAYER_R * 0.3, -PLAYER_R * 0.3, 1, 0, 0, PLAYER_R);
  bodyGrad.addColorStop(0, "#80d8ff");
  bodyGrad.addColorStop(0.5, "#0288d1");
  bodyGrad.addColorStop(1, "#01579b");
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.arc(-PLAYER_R * 0.28, -PLAYER_R * 0.3, PLAYER_R * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();

  // Face
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-5, -3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#01579b";
  ctx.beginPath(); ctx.arc(-4, -3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -3, 2, 0, Math.PI * 2); ctx.fill();
  // Smile
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D, b: Bomb, t: number) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rotation);

  const pulse = Math.sin(t * 4 + b.pulse * Math.PI * 2) * 0.5 + 0.5;

  // Danger glow
  const glowR = b.r * (1.8 + pulse * 0.6);
  const glow = ctx.createRadialGradient(0, 0, b.r * 0.5, 0, 0, glowR);
  glow.addColorStop(0, `rgba(255,50,50,${0.3 + pulse * 0.2})`);
  glow.addColorStop(1, "rgba(255,50,50,0)");
  ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(-b.r * 0.25, -b.r * 0.25, 1, 0, 0, b.r);
  bodyGrad.addColorStop(0, "#616161");
  bodyGrad.addColorStop(0.6, "#212121");
  bodyGrad.addColorStop(1, "#000");
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad; ctx.fill();

  // Shine
  ctx.beginPath(); ctx.arc(-b.r * 0.3, -b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();

  // Fuse
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -b.r);
  ctx.bezierCurveTo(b.r * 0.4, -b.r * 1.4, -b.r * 0.2, -b.r * 1.7, b.r * 0.1, -b.r * 2);
  ctx.stroke();

  // Spark at fuse tip
  const sparkAlpha = 0.6 + pulse * 0.4;
  drawGlow(ctx, b.r * 0.1, -b.r * 2, 8 + pulse * 5, "#ff9800");
  ctx.beginPath(); ctx.arc(b.r * 0.1, -b.r * 2, 3 + pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,200,50,${sparkAlpha})`; ctx.fill();

  // Skull
  ctx.font = `${b.r * 0.9}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💣", 0, 2);

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, s: Star, t: number) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);

  const tw = Math.sin(t * 3 + s.twinkle * Math.PI * 2) * 0.5 + 0.5;
  const scale = 0.85 + tw * 0.3;
  ctx.scale(scale, scale);

  // Glow
  drawGlow(ctx, 0, 0, s.r * 2.5, s.color);

  // 5-point star
  ctx.beginPath();
  const spikes = 5;
  const outerR = s.r;
  const innerR = s.r * 0.42;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r2 = i % 2 === 0 ? outerR : innerR;
    if (i === 0) ctx.moveTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
    else ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
  }
  ctx.closePath();

  const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  starGrad.addColorStop(0, "#fff");
  starGrad.addColorStop(0.4, s.color);
  starGrad.addColorStop(1, s.color + "99");
  ctx.fillStyle = starGrad;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.life;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.restore();
}

function drawFloatText(ctx: CanvasRenderingContext2D, ft: FloatText) {
  ctx.save();
  ctx.globalAlpha = ft.life;
  ctx.font = `bold ${16 + (1 - ft.life) * 8}px Manrope, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ft.color;
  ctx.shadowColor = ft.color;
  ctx.shadowBlur = 12;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [highScore, updateHighScore] = useHighScore("avoidit_highscore");
  const [livesDisplay, setLivesDisplay] = useState(3);
  const [waveDisplay, setWaveDisplay] = useState(1);

  // ── mutable game state (no re-renders) ──────────────────────────────────────
  const player = useRef<Player>({ x: 0, y: 0, r: PLAYER_R, vx: 0, vy: 0, invincible: 0, trail: [] });
  const bombs = useRef<Bomb[]>([]);
  const stars = useRef<Star[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatTexts = useRef<FloatText[]>([]);
  const keys = useRef<Set<string>>(new Set());
  const pointer = useRef({ x: -999, y: -999, active: false });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const waveRef = useRef(1);
  const timeRef = useRef(0);
  const bombTimer = useRef(0);
  const starTimer = useRef(0);
  const phaseRef = useRef<GamePhase>("menu");
  const comboRef = useRef(0);
  const comboTimer = useRef(0);

  // sync phase ref
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","w","a","s","d"].includes(e.key)) e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  // ── pointer (mouse + touch) ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function pos(cx: number, cy: number) {
      const r = canvas!.getBoundingClientRect();
      return {
        x: (cx - r.left) * (canvas!.width / r.width),
        y: (cy - r.top) * (canvas!.height / r.height),
      };
    }
    const mm = (e: MouseEvent) => { const p = pos(e.clientX, e.clientY); pointer.current.x = p.x; pointer.current.y = p.y; pointer.current.active = !!(e.buttons & 1); };
    const md = (e: MouseEvent) => { const p = pos(e.clientX, e.clientY); pointer.current.x = p.x; pointer.current.y = p.y; pointer.current.active = true; };
    const mu = () => { pointer.current.active = false; };
    const tm = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; if (t) { const p = pos(t.clientX, t.clientY); pointer.current.x = p.x; pointer.current.y = p.y; pointer.current.active = true; } };
    const td = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; if (t) { const p = pos(t.clientX, t.clientY); pointer.current.x = p.x; pointer.current.y = p.y; pointer.current.active = true; } };
    const tu = () => { pointer.current.active = false; };
    canvas.addEventListener("mousemove", mm);
    canvas.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    canvas.addEventListener("touchmove", tm, { passive: false });
    canvas.addEventListener("touchstart", td, { passive: false });
    canvas.addEventListener("touchend", tu);
    return () => {
      canvas.removeEventListener("mousemove", mm);
      canvas.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      canvas.removeEventListener("touchmove", tm);
      canvas.removeEventListener("touchstart", td);
      canvas.removeEventListener("touchend", tu);
    };
  }, []);

  // ── resize ─────────────────────────────────────────────────────────────────
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

  // ── start / reset ──────────────────────────────────────────────────────────
  function startGame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width || 400;
    const H = canvas.height || 600;
    player.current = { x: W / 2, y: H / 2, r: PLAYER_R, vx: 0, vy: 0, invincible: 0, trail: [] };
    bombs.current = [];
    stars.current = [];
    particles.current = [];
    floatTexts.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    waveRef.current = 1;
    timeRef.current = 0;
    bombTimer.current = 0;
    starTimer.current = 0;
    comboRef.current = 0;
    comboTimer.current = 0;
    setScore(0);
    setLivesDisplay(3);
    setWaveDisplay(1);
    setPhase("playing");
    phaseRef.current = "playing";
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  function spawnBomb(W: number, H: number) {
    const wave = waveRef.current;
    const speed = 60 + wave * 22 + Math.random() * 40;
    // Spawn from edges
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * W; y = -30; }
    else if (edge === 1) { x = W + 30; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 30; }
    else { x = -30; y = Math.random() * H; }

    // Aim roughly at player ± spread
    const px = player.current.x, py = player.current.y;
    const baseAngle = Math.atan2(py - y, px - x);
    const spread = 0.6 - Math.min(wave * 0.04, 0.4);
    const angle = baseAngle + (Math.random() - 0.5) * spread * 2;

    bombs.current.push({
      id: uid(), x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 18 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
      pulse: Math.random(),
    });
  }

  function spawnStar(W: number, H: number) {
    const margin = 60;
    stars.current.push({
      id: uid(),
      x: margin + Math.random() * (W - margin * 2),
      y: margin + Math.random() * (H - margin * 2),
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      r: 14 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2,
      twinkle: Math.random(),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!,
    });
  }

  function boom(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 200;
      particles.current.push({
        id: uid(), x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color, life: 1,
        size: 3 + Math.random() * 5,
      });
    }
  }

  function floatPop(x: number, y: number, text: string, color: string) {
    floatTexts.current.push({ id: uid(), x, y, text, color, life: 1, vy: -60 });
  }

  // ── game loop ──────────────────────────────────────────────────────────────
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const t = timeRef.current;

    // ── Background ────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // Deep space gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#04001a");
    bg.addColorStop(0.5, "#0a0028");
    bg.addColorStop(1, "#000d1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Starfield (static dots)
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const sx = ((seed * (i * 7 + 3)) % W + (i * 137.5) % W) % W;
      const sy = ((seed * (i * 13 + 7)) % H + (i * 97.3) % H) % H;
      const sr = 0.5 + (i % 3) * 0.4;
      const twink = Math.sin(t * 2 + i) * 0.3 + 0.7;
      ctx.globalAlpha = twink * 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (phaseRef.current !== "playing") return;

    timeRef.current += dt;

    // ── Wave progression ──────────────────────────────────────────────────────
    const newWave = 1 + Math.floor(timeRef.current / 15);
    if (newWave !== waveRef.current) {
      waveRef.current = newWave;
      setWaveDisplay(newWave);
      floatPop(W / 2, H / 2 - 40, `⚡ WAVE ${newWave}!`, "#e040fb");
    }

    // ── Spawn ─────────────────────────────────────────────────────────────────
    const wave = waveRef.current;
    const bombInterval = Math.max(0.35, 1.4 - wave * 0.09);
    const starInterval = Math.max(1.2, 3.0 - wave * 0.08);
    const maxStars = Math.min(5, 2 + Math.floor(wave / 2));

    bombTimer.current += dt;
    starTimer.current += dt;

    while (bombTimer.current >= bombInterval) {
      bombTimer.current -= bombInterval;
      spawnBomb(W, H);
      // Extra bombs at higher waves
      if (wave >= 4 && Math.random() < 0.35) spawnBomb(W, H);
      if (wave >= 7 && Math.random() < 0.25) spawnBomb(W, H);
    }
    while (starTimer.current >= starInterval && stars.current.length < maxStars) {
      starTimer.current -= starInterval;
      spawnStar(W, H);
    }

    // ── Player input ──────────────────────────────────────────────────────────
    const pl = player.current;
    const k = keys.current;
    const ptr = pointer.current;

    // Keyboard / touch joystick
    let ax = 0, ay = 0;
    if (k.has("ArrowLeft") || k.has("a")) ax -= 1;
    if (k.has("ArrowRight") || k.has("d")) ax += 1;
    if (k.has("ArrowUp") || k.has("w")) ay -= 1;
    if (k.has("ArrowDown") || k.has("s")) ay += 1;

    // Touch/mouse: move toward pointer when held
    if (ptr.active && ptr.x > 0) {
      const dx = ptr.x - pl.x;
      const dy = ptr.y - pl.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        ax += dx / dist;
        ay += dy / dist;
      }
    }

    // Normalize diagonal
    const mag = Math.sqrt(ax * ax + ay * ay);
    if (mag > 0) { ax /= mag; ay /= mag; }

    pl.vx += ax * ACCEL * dt;
    pl.vy += ay * ACCEL * dt;
    pl.vx *= Math.pow(FRICTION, dt * 60);
    pl.vy *= Math.pow(FRICTION, dt * 60);

    // Clamp speed
    const speed = Math.sqrt(pl.vx * pl.vx + pl.vy * pl.vy);
    const maxSpeed = 320 + wave * 8;
    if (speed > maxSpeed) { pl.vx = (pl.vx / speed) * maxSpeed; pl.vy = (pl.vy / speed) * maxSpeed; }

    pl.x += pl.vx * dt;
    pl.y += pl.vy * dt;

    // Bounce off walls
    if (pl.x < pl.r) { pl.x = pl.r; pl.vx = Math.abs(pl.vx) * 0.5; }
    if (pl.x > W - pl.r) { pl.x = W - pl.r; pl.vx = -Math.abs(pl.vx) * 0.5; }
    if (pl.y < pl.r) { pl.y = pl.r; pl.vy = Math.abs(pl.vy) * 0.5; }
    if (pl.y > H - pl.r) { pl.y = H - pl.r; pl.vy = -Math.abs(pl.vy) * 0.5; }

    // Invincibility countdown
    if (pl.invincible > 0) pl.invincible -= dt;

    // Trail
    pl.trail.unshift({ x: pl.x, y: pl.y });
    if (pl.trail.length > 14) pl.trail.pop();

    // ── Update bombs ──────────────────────────────────────────────────────────
    for (const b of bombs.current) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rotation += b.rotSpeed * dt;

      // Bounce off walls
      if (b.x < b.r || b.x > W - b.r) { b.vx *= -1; b.x = Math.max(b.r, Math.min(W - b.r, b.x)); }
      if (b.y < b.r || b.y > H - b.r) { b.vy *= -1; b.y = Math.max(b.r, Math.min(H - b.r, b.y)); }

      // Collision with player
      if (pl.invincible <= 0) {
        const dx = pl.x - b.x;
        const dy = pl.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < pl.r + b.r - 4) {
          // Hit!
          livesRef.current--;
          setLivesDisplay(livesRef.current);
          pl.invincible = 2.0;
          comboRef.current = 0;
          comboTimer.current = 0;
          boom(b.x, b.y, "#ff5722", 24);
          boom(b.x, b.y, "#ffd700", 12);
          floatPop(pl.x, pl.y - 30, "💥 OUCH!", "#f44336");
          b.vx *= -1.2; b.vy *= -1.2; // bounce bomb away

          if (livesRef.current <= 0) {
            updateHighScore(scoreRef.current);
            setPhase("dead");
            phaseRef.current = "dead";
          }
        }
      }
    }

    // ── Update stars ──────────────────────────────────────────────────────────
    const collectedIds = new Set<number>();
    for (const s of stars.current) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rotation += s.rotSpeed * dt;

      // Soft bounce
      if (s.x < s.r || s.x > W - s.r) s.vx *= -1;
      if (s.y < s.r || s.y > H - s.r) s.vy *= -1;

      // Collect
      const dx = pl.x - s.x;
      const dy = pl.y - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < pl.r + s.r) {
        collectedIds.add(s.id);
        comboRef.current++;
        comboTimer.current = 2.5;
        const pts = 10 * Math.max(1, comboRef.current);
        scoreRef.current += pts;
        setScore(scoreRef.current);
        boom(s.x, s.y, s.color, 16);
        boom(s.x, s.y, "#fff", 8);
        const comboStr = comboRef.current >= 3 ? ` x${comboRef.current}` : "";
        floatPop(s.x, s.y - 20, `⭐ +${pts}${comboStr}`, s.color);
      }
    }
    stars.current = stars.current.filter(s => !collectedIds.has(s.id));

    // Combo decay
    if (comboTimer.current > 0) {
      comboTimer.current -= dt;
      if (comboTimer.current <= 0) comboRef.current = 0;
    }

    // ── Update particles ──────────────────────────────────────────────────────
    for (const p2 of particles.current) {
      p2.x += p2.vx * dt;
      p2.y += p2.vy * dt;
      p2.vx *= 0.96;
      p2.vy *= 0.96;
      p2.life -= dt * 1.4;
    }
    particles.current = particles.current.filter(p2 => p2.life > 0);

    // ── Update float texts ────────────────────────────────────────────────────
    for (const ft of floatTexts.current) {
      ft.y += ft.vy * dt;
      ft.life -= dt * 1.1;
    }
    floatTexts.current = floatTexts.current.filter(ft => ft.life > 0);

    // ── Draw order: stars → bombs → player → particles → texts ───────────────
    for (const s of stars.current) drawStar(ctx, s, t);
    for (const b of bombs.current) drawBomb(ctx, b, t);
    drawPlayer(ctx, pl, t);
    for (const p2 of particles.current) drawParticle(ctx, p2);
    for (const ft of floatTexts.current) drawFloatText(ctx, ft);

    // ── Danger ring when near bomb ────────────────────────────────────────────
    for (const b of bombs.current) {
      const dx = pl.x - b.x;
      const dy = pl.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const dangerZone = b.r * 3.5;
      if (d < dangerZone) {
        const intensity = 1 - d / dangerZone;
        ctx.save();
        ctx.globalAlpha = intensity * 0.5;
        ctx.strokeStyle = "#f44336";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Combo display ─────────────────────────────────────────────────────────
    if (comboRef.current >= 3) {
      ctx.save();
      ctx.font = `bold ${Math.min(W * 0.06, 28)}px Fraunces, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 20;
      ctx.fillText(`🌟 ${comboRef.current}x COMBO!`, W / 2, H * 0.15);
      ctx.restore();
    }

  }, phase !== "playing");

  const wave = waveDisplay;

  return (
    <GameShell topbar={<GameTopbar title="AVOIDit" score={score} highScore={highScore} />}>
      <div className="relative w-full h-full" style={{ cursor: "none" }}>
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* HUD */}
        {phase === "playing" && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Lives */}
            <div className="absolute top-3 left-3 flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-2xl" style={{ opacity: i < livesDisplay ? 1 : 0.15, filter: i < livesDisplay ? "drop-shadow(0 0 6px #f44336)" : "none" }}>
                  ❤️
                </span>
              ))}
            </div>

            {/* Wave badge */}
            <div
              className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold"
              style={{
                background: "rgba(224,64,251,0.25)",
                border: "1px solid #e040fb",
                color: "#e040fb",
                fontFamily: "Manrope, sans-serif",
                boxShadow: "0 0 12px #e040fb55",
              }}
            >
              ⚡ Wave {wave}
            </div>

            {/* Controls hint */}
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Manrope, sans-serif", background: "rgba(0,0,0,0.3)" }}
            >
              Arrow keys / WASD or tap to move
            </div>
          </div>
        )}

        {/* ── MENU ── */}
        {phase === "menu" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ background: "rgba(4,0,26,0.92)" }}
          >
            {/* Animated title */}
            <div className="text-center">
              <div className="text-6xl mb-3" style={{ filter: "drop-shadow(0 0 20px #ffd700)" }}>⭐</div>
              <h1
                className="font-bold mb-1"
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
                  color: "#fff",
                  textShadow: "0 0 40px #e040fb, 0 0 80px #40c4ff",
                  letterSpacing: "0.04em",
                }}
              >
                AVOIDit
              </h1>
              <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Manrope, sans-serif", fontSize: 16 }}>
                Collect stars · Dodge bombs · Survive the waves
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl font-bold"
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(1.2rem, 4vw, 1.5rem)",
                  background: "linear-gradient(135deg, #e040fb, #7b1fa2)",
                  color: "#fff",
                  boxShadow: "0 0 30px #e040fb66",
                  minHeight: 56,
                  border: "none",
                }}
              >
                🚀 Play
              </button>
            </div>

            <div
              className="text-center text-sm rounded-2xl px-5 py-3"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "Manrope, sans-serif",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                lineHeight: 1.8,
              }}
            >
              <div>⭐ Collect stars to score</div>
              <div>💣 Dodge bombs or lose a life</div>
              <div>🌟 Chain stars for combo multipliers</div>
              <div>⚡ Each wave gets faster!</div>
              {highScore > 0 && (
                <div className="mt-2" style={{ color: "#ffd700" }}>🏆 Best: {highScore.toLocaleString()}</div>
              )}
            </div>
          </div>
        )}

        {/* ── GAME OVER ── */}
        {phase === "dead" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ background: "rgba(10,0,0,0.93)" }}
          >
            <div className="text-6xl">💥</div>
            <h2
              className="font-bold"
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: "clamp(2rem, 8vw, 3rem)",
                color: "#f44336",
                textShadow: "0 0 30px #f44336",
              }}
            >
              GAME OVER
            </h2>

            <div
              className="text-center rounded-2xl px-8 py-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Manrope, sans-serif" }}
            >
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Score</p>
              <p style={{ color: "#ffd700", fontSize: "2rem", fontWeight: "bold", fontFamily: "Fraunces, serif" }}>
                {score.toLocaleString()}
              </p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Wave {waveDisplay} reached</p>
              {score >= highScore && score > 0 && (
                <p style={{ color: "#ffd700", marginTop: 8 }}>🏆 New High Score!</p>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl font-bold"
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "1.3rem",
                  background: "linear-gradient(135deg, #f44336, #b71c1c)",
                  color: "#fff",
                  boxShadow: "0 0 24px #f4433666",
                  minHeight: 56,
                  border: "none",
                }}
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => setPhase("menu")}
                className="w-full py-3 rounded-2xl font-bold"
                style={{
                  fontFamily: "Manrope, sans-serif",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  minHeight: 48,
                }}
              >
                🏠 Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
