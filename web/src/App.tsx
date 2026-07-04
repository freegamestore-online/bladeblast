import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGameLoop } from "./hooks/useGameLoop";
import { useHighScore } from "./hooks/useHighScore";
import { draw3DFruit, draw3DFruitHalf, drawSpike, drawKnife } from "./lib/fruitDraw";
import { drawGlow } from "./lib/canvas";
import { CustomizeMenu, KNIFE_STYLES } from "./components/CustomizeMenu";
import type {
  Fruit, Spike, FruitHalf, Particle, SliceTrail,
  FruitType, GamePhase, LevelConfig,
} from "./types";

// ─── Level configs ────────────────────────────────────────────────────────────
const LEVELS: LevelConfig[] = [
  { level: 1, name: "Fresh Start",    fruitsToSlice: 10, spawnRate: 0.8,  spikeRate: 0.15, maxMisses: 5, speedMult: 1.0, background: "linear-gradient(135deg,#1a237e,#283593)" },
  { level: 2, name: "Picking Up",     fruitsToSlice: 15, spawnRate: 1.0,  spikeRate: 0.25, maxMisses: 4, speedMult: 1.15, background: "linear-gradient(135deg,#1b5e20,#2e7d32)" },
  { level: 3, name: "Fruit Frenzy",   fruitsToSlice: 20, spawnRate: 1.3,  spikeRate: 0.4,  maxMisses: 4, speedMult: 1.3, background: "linear-gradient(135deg,#4a148c,#6a1b9a)" },
  { level: 4, name: "Blade Storm",    fruitsToSlice: 25, spawnRate: 1.6,  spikeRate: 0.55, maxMisses: 3, speedMult: 1.5, background: "linear-gradient(135deg,#b71c1c,#c62828)" },
  { level: 5, name: "Ninja Master",   fruitsToSlice: 30, spawnRate: 2.0,  spikeRate: 0.7,  maxMisses: 3, speedMult: 1.8, background: "linear-gradient(135deg,#212121,#424242)" },
];

const FRUIT_TYPES: FruitType[] = ["watermelon","orange","apple","banana","pineapple","strawberry","lemon","grape"];
const FRUIT_SCORES: Record<FruitType, number> = {
  watermelon: 10, orange: 5, apple: 5, banana: 8,
  pineapple: 15, strawberry: 7, lemon: 6, grape: 12,
};

let nextId = 1;
function uid() { return nextId++; }

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [slicedCount, setSlicedCount] = useState(0);
  const [misses, setMisses] = useState(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [knifeStyleId, setKnifeStyleId] = useState("classic");
  const [highScore, updateHighScore] = useHighScore("bladeblast_highscore");
  const [combo, setCombo] = useState(0);
  const [comboDisplay, setComboDisplay] = useState<{ text: string; x: number; y: number; t: number } | null>(null);

  // Game state refs (mutable, no re-render needed)
  const fruits = useRef<Fruit[]>([]);
  const spikes = useRef<Spike[]>([]);
  const halves = useRef<FruitHalf[]>([]);
  const particles = useRef<Particle[]>([]);
  const trail = useRef<SliceTrail>({ points: [] });
  const pointer = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, down: false });
  const spawnTimer = useRef(0);
  const spikeTimer = useRef(0);
  const scoreRef = useRef(0);
  const slicedRef = useRef(0);
  const missRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimer = useRef(0);
  const phaseRef = useRef<GamePhase>("menu");
  const levelRef = useRef(0);
  const knifeRef = useRef("classic");
  const lastFrameTime = useRef(0);

  // Sync refs
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = levelIdx; }, [levelIdx]);
  useEffect(() => { knifeRef.current = knifeStyleId; }, [knifeStyleId]);

  // ─── Input handling ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getPos(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas!.width / rect.width),
        y: (clientY - rect.top) * (canvas!.height / rect.height),
      };
    }

    function onMove(cx: number, cy: number) {
      const pos = getPos(cx, cy);
      pointer.current.prevX = pointer.current.x;
      pointer.current.prevY = pointer.current.y;
      pointer.current.x = pos.x;
      pointer.current.y = pos.y;
    }

    function onDown(cx: number, cy: number) {
      const pos = getPos(cx, cy);
      pointer.current.prevX = pos.x;
      pointer.current.prevY = pos.y;
      pointer.current.x = pos.x;
      pointer.current.y = pos.y;
      pointer.current.down = true;
    }

    function onUp() { pointer.current.down = false; }

    const mm = (e: MouseEvent) => { if (e.buttons & 1) onMove(e.clientX, e.clientY); };
    const md = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const mu = () => onUp();
    const tm = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); };
    const td = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; if (t) onDown(t.clientX, t.clientY); };
    const tu = () => onUp();

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

  // ─── Resize canvas ─────────────────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ─── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback((lvl: number) => {
    fruits.current = [];
    spikes.current = [];
    halves.current = [];
    particles.current = [];
    trail.current = { points: [] };
    spawnTimer.current = 0;
    spikeTimer.current = 0;
    scoreRef.current = 0;
    slicedRef.current = 0;
    missRef.current = 0;
    comboRef.current = 0;
    comboTimer.current = 0;
    setScore(0);
    setSlicedCount(0);
    setMisses(0);
    setCombo(0);
    setComboDisplay(null);
    setLevelIdx(lvl);
    setPhase("playing");
  }, []);

  // ─── Spawn helpers ─────────────────────────────────────────────────────────
  function spawnFruit(canvas: HTMLCanvasElement, speedMult: number) {
    const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)]!;
    const x = canvas.width * (0.1 + Math.random() * 0.8);
    const y = canvas.height + 60;
    const speed = (300 + Math.random() * 200) * speedMult;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    fruits.current.push({
      id: uid(), x, y,
      z: 0.3 + Math.random() * 0.7,
      vx: Math.cos(angle) * speed * 0.3,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      type, radius: 32 + Math.random() * 16,
      sliced: false, missed: false, spawnTime: performance.now(),
    });
  }

  function spawnSpike(canvas: HTMLCanvasElement, speedMult: number) {
    const x = canvas.width * (0.1 + Math.random() * 0.8);
    const y = canvas.height + 60;
    const speed = (280 + Math.random() * 180) * speedMult;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    spikes.current.push({
      id: uid(), x, y,
      z: 0.3 + Math.random() * 0.7,
      vx: Math.cos(angle) * speed * 0.3,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 5,
      radius: 22 + Math.random() * 12,
      hit: false, spawnTime: performance.now(),
    });
  }

  // ─── Slice detection ────────────────────────────────────────────────────────
  function checkSlice(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, r: number,
  ): boolean {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
    const nx = ax + t * dx - cx;
    const ny = ay + t * dy - cy;
    return nx * nx + ny * ny < r * r;
  }

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      particles.current.push({
        id: uid(), x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color, life: 1, maxLife: 1,
        size: 3 + Math.random() * 6,
      });
    }
  }

  function spawnHalves(fruit: Fruit) {
    for (const side of ["left", "right"] as const) {
      const vx = side === "left" ? -120 - Math.random() * 80 : 120 + Math.random() * 80;
      halves.current.push({
        id: uid(), x: fruit.x, y: fruit.y,
        vx, vy: -100 - Math.random() * 80,
        rotation: fruit.rotation,
        rotSpeed: (Math.random() - 0.5) * 6,
        type: fruit.type, side,
        alpha: 1, scale: 1,
      });
    }
  }

  // ─── Game loop ─────────────────────────────────────────────────────────────
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const p = pointer.current;
    const currentPhase = phaseRef.current;
    const lvl = levelRef.current;
    const level = LEVELS[lvl] ?? LEVELS[LEVELS.length - 1]!;

    // ── Draw background ──────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // Gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    const bgColors = level.background.match(/#[0-9a-f]{6}/gi) ?? ["#1a237e", "#283593"];
    bgGrad.addColorStop(0, bgColors[0] ?? "#1a237e");
    bgGrad.addColorStop(1, bgColors[1] ?? "#283593");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    if (currentPhase !== "playing") return;

    const GRAVITY = 420;

    // ── Spawn ────────────────────────────────────────────────────────────────
    spawnTimer.current += dt;
    spikeTimer.current += dt;
    const spawnInterval = 1 / level.spawnRate;
    const spikeInterval = 1 / level.spikeRate;

    while (spawnTimer.current >= spawnInterval) {
      spawnTimer.current -= spawnInterval;
      spawnFruit(canvas, level.speedMult);
    }
    while (spikeTimer.current >= spikeInterval) {
      spikeTimer.current -= spikeInterval;
      spawnSpike(canvas, level.speedMult);
    }

    // ── Update trail ─────────────────────────────────────────────────────────
    const now = performance.now();
    if (p.down) {
      trail.current.points.push({ x: p.x, y: p.y, t: now });
    }
    trail.current.points = trail.current.points.filter(pt => now - pt.t < 200);

    // ── Slice detection ───────────────────────────────────────────────────────
    const sliceActive = p.down && (Math.abs(p.x - p.prevX) + Math.abs(p.y - p.prevY)) > 4;

    if (sliceActive) {
      // Check fruits
      for (const fruit of fruits.current) {
        if (fruit.sliced || fruit.missed) continue;
        if (checkSlice(p.prevX, p.prevY, p.x, p.y, fruit.x, fruit.y, fruit.radius)) {
          fruit.sliced = true;
          slicedRef.current++;
          comboRef.current++;
          comboTimer.current = 1.2;

          const baseScore = FRUIT_SCORES[fruit.type] ?? 5;
          const multiplier = Math.max(1, comboRef.current);
          const pts = baseScore * multiplier;
          scoreRef.current += pts;
          setScore(scoreRef.current);
          setSlicedCount(slicedRef.current);
          setCombo(comboRef.current);

          if (comboRef.current >= 2) {
            setComboDisplay({ text: `${comboRef.current}x COMBO! +${pts}`, x: fruit.x, y: fruit.y - 30, t: now });
          }

          const colors: Record<string, string> = {
            watermelon: "#f44336", orange: "#ff9800", apple: "#f44336",
            banana: "#ffeb3b", pineapple: "#ff9800", strawberry: "#e91e63",
            lemon: "#ffee58", grape: "#9c27b0",
          };
          spawnParticles(fruit.x, fruit.y, colors[fruit.type] ?? "#fff", 18);
          spawnHalves(fruit);
        }
      }

      // Check spikes
      for (const spike of spikes.current) {
        if (spike.hit) continue;
        if (checkSlice(p.prevX, p.prevY, p.x, p.y, spike.x, spike.y, spike.radius * 1.3)) {
          spike.hit = true;
          missRef.current++;
          comboRef.current = 0;
          comboTimer.current = 0;
          setMisses(missRef.current);
          setCombo(0);
          spawnParticles(spike.x, spike.y, "#f44336", 12);
          setComboDisplay({ text: "💀 SPIKE!", x: spike.x, y: spike.y - 30, t: now });

          if (missRef.current >= level.maxMisses) {
            updateHighScore(scoreRef.current);
            setPhase("gameOver");
            phaseRef.current = "gameOver";
          }
        }
      }
    }

    // Combo decay
    if (comboTimer.current > 0) {
      comboTimer.current -= dt;
      if (comboTimer.current <= 0) {
        comboRef.current = 0;
        setCombo(0);
      }
    }

    // ── Check level complete ──────────────────────────────────────────────────
    if (slicedRef.current >= level.fruitsToSlice && currentPhase === "playing") {
      updateHighScore(scoreRef.current);
      if (lvl >= LEVELS.length - 1) {
        setPhase("gameOver");
        phaseRef.current = "gameOver";
      } else {
        setPhase("levelComplete");
        phaseRef.current = "levelComplete";
      }
    }

    // ── Update fruits ─────────────────────────────────────────────────────────
    for (const fruit of fruits.current) {
      if (fruit.sliced) continue;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;
      fruit.vy += GRAVITY * dt;
      fruit.z = Math.max(0, Math.min(1, fruit.z + fruit.vz * dt));
      fruit.rotation += fruit.rotSpeed * dt;

      if (fruit.y > H + 80 && !fruit.missed) {
        fruit.missed = true;
        missRef.current++;
        setMisses(missRef.current);
        comboRef.current = 0;
        comboTimer.current = 0;
        setCombo(0);
        if (missRef.current >= level.maxMisses) {
          updateHighScore(scoreRef.current);
          setPhase("gameOver");
          phaseRef.current = "gameOver";
        }
      }
    }
    fruits.current = fruits.current.filter(f => f.y < H + 120 || f.sliced);

    // ── Update spikes ─────────────────────────────────────────────────────────
    for (const spike of spikes.current) {
      spike.x += spike.vx * dt;
      spike.y += spike.vy * dt;
      spike.vy += GRAVITY * dt;
      spike.z = Math.max(0, Math.min(1, spike.z + spike.vz * dt));
      spike.rotation += spike.rotSpeed * dt;
    }
    spikes.current = spikes.current.filter(s => s.y < H + 120);

    // ── Update halves ─────────────────────────────────────────────────────────
    for (const half of halves.current) {
      half.x += half.vx * dt;
      half.y += half.vy * dt;
      half.vy += GRAVITY * dt;
      half.rotation += half.rotSpeed * dt;
      half.alpha -= dt * 0.8;
    }
    halves.current = halves.current.filter(h => h.alpha > 0 && h.y < H + 120);

    // ── Update particles ──────────────────────────────────────────────────────
    for (const p2 of particles.current) {
      p2.x += p2.vx * dt;
      p2.y += p2.vy * dt;
      p2.vy += GRAVITY * 0.5 * dt;
      p2.life -= dt * 1.5;
    }
    particles.current = particles.current.filter(p2 => p2.life > 0);

    // ── Draw by depth (sort z) ────────────────────────────────────────────────
    const allObjects = [
      ...fruits.current.filter(f => !f.sliced && !f.missed).map(f => ({ z: f.z, type: "fruit" as const, obj: f })),
      ...spikes.current.filter(s => !s.hit).map(s => ({ z: s.z, type: "spike" as const, obj: s })),
    ].sort((a, b) => a.z - b.z);

    for (const item of allObjects) {
      if (item.type === "fruit") {
        const f = item.obj as Fruit;
        draw3DFruit(ctx, f.type, f.x, f.y, f.radius, f.rotation, f.z);
      } else {
        const s = item.obj as Spike;
        drawSpike(ctx, s.x, s.y, s.radius, s.rotation, s.z);
      }
    }

    // Draw halves
    for (const half of halves.current) {
      draw3DFruitHalf(ctx, half.type, half.x, half.y, 30, half.rotation, half.side, half.alpha);
    }

    // Draw particles
    for (const p2 of particles.current) {
      ctx.save();
      ctx.globalAlpha = p2.life;
      ctx.fillStyle = p2.color;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.size * p2.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Draw trail ────────────────────────────────────────────────────────────
    const knifeStyle = KNIFE_STYLES.find(k => k.id === knifeRef.current) ?? KNIFE_STYLES[0]!;
    const pts = trail.current.points;
    if (pts.length > 1) {
      ctx.save();
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]!;
        const curr = pts[i]!;
        const age = (now - curr.t) / 200;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = knifeStyle.trailColor;
        ctx.lineWidth = (1 - age) * 6;
        ctx.globalAlpha = (1 - age) * 0.8;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.restore();

      // Glow at tip
      if (pts.length > 0) {
        const tip = pts[pts.length - 1]!;
        drawGlow(ctx, tip.x, tip.y, 20, knifeStyle.glowColor);
      }
    }

    // ── Draw knife cursor ─────────────────────────────────────────────────────
    if (pts.length >= 2) {
      const last = pts[pts.length - 1]!;
      const prev = pts[pts.length - 2]!;
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x) + Math.PI / 2;
      drawKnife(ctx, p.x, p.y, angle, knifeStyle.bladeColor, knifeStyle.handleColor, knifeStyle.glowColor, 44);
    } else {
      drawKnife(ctx, p.x, p.y, 0, knifeStyle.bladeColor, knifeStyle.handleColor, knifeStyle.glowColor, 44);
    }

    lastFrameTime.current = now;
  }, phase !== "playing");

  // ─── HUD values ────────────────────────────────────────────────────────────
  const level = LEVELS[levelIdx] ?? LEVELS[0]!;
  const progress = Math.min(1, slicedCount / level.fruitsToSlice);

  return (
    <GameShell topbar={
      <GameTopbar
        title="BLADE BLAST"
        score={score}
        highScore={highScore}
      />
    }>
      {/* Customize overlay */}
      {showCustomize && (
        <CustomizeMenu
          selected={knifeStyleId}
          onSelect={setKnifeStyleId}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {/* Main canvas */}
      <div className="relative w-full h-full" style={{ cursor: "none" }}>
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* HUD overlay */}
        {phase === "playing" && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top HUD bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center gap-3">
              {/* Level */}
              <div className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", fontFamily: "Manrope, sans-serif" }}>
                Lvl {levelIdx + 1}: {level.name}
              </div>

              {/* Progress bar */}
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress * 100}%`,
                    background: "linear-gradient(90deg, #69f0ae, #00e676)",
                    boxShadow: "0 0 8px #69f0ae",
                  }}
                />
              </div>

              {/* Sliced count */}
              <div className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: "rgba(0,0,0,0.5)", color: "#69f0ae", fontFamily: "Manrope, sans-serif" }}>
                🍉 {slicedCount}/{level.fruitsToSlice}
              </div>
            </div>

            {/* Misses (hearts) */}
            <div className="absolute top-12 left-3 flex gap-1">
              {Array.from({ length: level.maxMisses }).map((_, i) => (
                <span key={i} className="text-xl" style={{ opacity: i < misses ? 0.2 : 1 }}>
                  {i < misses ? "🖤" : "❤️"}
                </span>
              ))}
            </div>

            {/* Combo display */}
            {combo >= 2 && (
              <div
                className="absolute text-center font-bold"
                style={{
                  top: "30%", left: "50%", transform: "translateX(-50%)",
                  color: "#ffd700", fontFamily: "Fraunces, serif",
                  fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                  textShadow: "0 0 20px #ffd700, 0 2px 4px rgba(0,0,0,0.8)",
                  pointerEvents: "none",
                }}
              >
                ⚡ {combo}x COMBO!
              </div>
            )}

            {/* Combo popup */}
            {comboDisplay && now() - comboDisplay.t < 1200 && (
              <div
                className="absolute font-bold text-sm pointer-events-none"
                style={{
                  left: comboDisplay.x, top: comboDisplay.y,
                  transform: "translate(-50%, -50%)",
                  color: "#ffd700",
                  textShadow: "0 0 10px #ffd700",
                  fontFamily: "Manrope, sans-serif",
                  animation: "floatUp 1.2s ease-out forwards",
                }}
              >
                {comboDisplay.text}
              </div>
            )}

            {/* Customize button */}
            <button
              className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
              style={{
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontFamily: "Manrope, sans-serif",
                minHeight: 44,
              }}
              onClick={() => setShowCustomize(true)}
            >
              🔪 Blade
            </button>
          </div>
        )}

        {/* ── MENU ── */}
        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ background: "linear-gradient(135deg, rgba(10,10,40,0.95), rgba(30,10,60,0.95))" }}>
            <div className="text-center">
              <div className="text-6xl mb-2">🔪</div>
              <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif", color: "#fff", textShadow: "0 0 30px #e040fb" }}>
                BLADE BLAST
              </h1>
              <p className="text-lg" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Manrope, sans-serif" }}>
                Slice fruits • Dodge spikes • Master combos
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => startGame(0)}
                className="w-full py-4 rounded-2xl font-bold text-xl"
                style={{
                  background: "linear-gradient(135deg, #e040fb, #7b1fa2)",
                  color: "#fff", fontFamily: "Fraunces, serif",
                  boxShadow: "0 0 30px #e040fb66",
                  minHeight: 56,
                }}
              >
                🎮 Play Now
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="w-full py-3 rounded-2xl font-bold text-lg"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff", fontFamily: "Manrope, sans-serif",
                  border: "1px solid rgba(255,255,255,0.2)",
                  minHeight: 48,
                }}
              >
                🔪 Customize Blade
              </button>
            </div>

            <div className="text-center" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Manrope, sans-serif", fontSize: 14 }}>
              <div>🍉 Slice fruits to score • 💀 Avoid spikes</div>
              <div>⚡ Chain slices for combos • ❤️ 3-5 lives per level</div>
              {highScore > 0 && <div className="mt-2" style={{ color: "#ffd700" }}>🏆 Best: {highScore}</div>}
            </div>
          </div>
        )}

        {/* ── LEVEL COMPLETE ── */}
        {phase === "levelComplete" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ background: "rgba(0,20,0,0.92)" }}>
            <div className="text-6xl">🎉</div>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#69f0ae", textShadow: "0 0 20px #69f0ae" }}>
              Level Complete!
            </h2>
            <p className="text-xl" style={{ color: "#fff", fontFamily: "Manrope, sans-serif" }}>
              Score: <strong style={{ color: "#ffd700" }}>{score}</strong>
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Manrope, sans-serif" }}>
              Next: <strong style={{ color: "#fff" }}>{LEVELS[levelIdx + 1]?.name ?? "Final Level"}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => startGame(levelIdx + 1)}
                className="px-8 py-4 rounded-2xl font-bold text-xl"
                style={{
                  background: "linear-gradient(135deg, #69f0ae, #00c853)",
                  color: "#000", fontFamily: "Fraunces, serif",
                  minHeight: 56,
                }}
              >
                Next Level →
              </button>
            </div>
          </div>
        )}

        {/* ── GAME OVER ── */}
        {phase === "gameOver" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ background: "rgba(20,0,0,0.93)" }}>
            <div className="text-6xl">{slicedCount >= level.fruitsToSlice ? "🏆" : "💀"}</div>
            <h2 className="text-4xl font-bold" style={{
              fontFamily: "Fraunces, serif",
              color: slicedCount >= level.fruitsToSlice ? "#ffd700" : "#f44336",
              textShadow: `0 0 20px ${slicedCount >= level.fruitsToSlice ? "#ffd700" : "#f44336"}`,
            }}>
              {slicedCount >= level.fruitsToSlice ? "You Win!" : "Game Over"}
            </h2>
            <div className="text-center" style={{ fontFamily: "Manrope, sans-serif" }}>
              <p className="text-2xl" style={{ color: "#fff" }}>Score: <strong style={{ color: "#ffd700" }}>{score}</strong></p>
              <p style={{ color: "rgba(255,255,255,0.6)" }}>Level reached: {levelIdx + 1}</p>
              {score >= highScore && score > 0 && (
                <p style={{ color: "#ffd700" }}>🏆 New High Score!</p>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => startGame(0)}
                className="w-full py-4 rounded-2xl font-bold text-xl"
                style={{
                  background: "linear-gradient(135deg, #f44336, #b71c1c)",
                  color: "#fff", fontFamily: "Fraunces, serif",
                  minHeight: 56,
                }}
              >
                🔄 Play Again
              </button>
              <button
                onClick={() => setPhase("menu")}
                className="w-full py-3 rounded-2xl font-bold"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff", fontFamily: "Manrope, sans-serif",
                  border: "1px solid rgba(255,255,255,0.2)",
                  minHeight: 48,
                }}
              >
                🏠 Main Menu
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -120%) scale(1.3); opacity: 0; }
        }
      `}</style>
    </GameShell>
  );
}

function now() { return performance.now(); }
