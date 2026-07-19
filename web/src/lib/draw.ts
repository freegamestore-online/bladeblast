import { drawGlow } from "./canvas";
import type { Player, FallingBomb, FallingStar, FallingMedicine, Particle, ShockWave } from "../types";

export function drawPlayer(
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
  if (aura) {
    const pulse = Math.sin(t * 3) * 0.5 + 0.5;
    drawGlow(ctx, 0, 0, pl.w * (1.2 + pulse * 0.4), aura);
  }
  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, pl.h / 2 + 10, pl.w * 0.45, pl.w * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawGlow(ctx, 0, 0, pl.w * 0.9, color);
  const squishY = pl.onGround ? 1.08 : 0.95;
  const squishX = pl.onGround ? 0.94 : 1.04;
  ctx.scale(squishX, squishY);
  ctx.font = `${pl.w * 0.95}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 2);
  ctx.restore();
}

export function drawBomb(ctx: CanvasRenderingContext2D, b: FallingBomb, t: number) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rotation);
  const pulse = Math.sin(t * 5 + b.pulse * Math.PI * 2) * 0.5 + 0.5;
  const glowR = b.r * (1.6 + pulse * 0.5);
  const glow = ctx.createRadialGradient(0, 0, b.r * 0.4, 0, 0, glowR);
  glow.addColorStop(0, `rgba(255,60,60,${0.35 + pulse * 0.2})`);
  glow.addColorStop(1, "rgba(255,60,60,0)");
  ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();
  const bodyGrad = ctx.createRadialGradient(-b.r * 0.2, -b.r * 0.2, 1, 0, 0, b.r);
  bodyGrad.addColorStop(0, "#555");
  bodyGrad.addColorStop(0.7, "#111");
  bodyGrad.addColorStop(1, "#000");
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad; ctx.fill();
  ctx.beginPath(); ctx.arc(-b.r * 0.28, -b.r * 0.28, b.r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();
  ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -b.r);
  ctx.bezierCurveTo(b.r * 0.5, -b.r * 1.4, -b.r * 0.2, -b.r * 1.8, b.r * 0.15, -b.r * 2.1);
  ctx.stroke();
  drawGlow(ctx, b.r * 0.15, -b.r * 2.1, 7 + pulse * 5, "#ff9800");
  ctx.beginPath(); ctx.arc(b.r * 0.15, -b.r * 2.1, 2.5 + pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,200,50,${0.7 + pulse * 0.3})`; ctx.fill();
  ctx.font = `${b.r * 0.95}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("💣", 0, 2);
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, s: FallingStar, t: number) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);
  const tw = Math.sin(t * 3 + s.twinkle * Math.PI * 2) * 0.5 + 0.5;
  ctx.scale(0.85 + tw * 0.3, 0.85 + tw * 0.3);
  drawGlow(ctx, 0, 0, s.r * 2.2, s.color);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
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

export function drawMedicine(ctx: CanvasRenderingContext2D, m: FallingMedicine, t: number) {
  ctx.save();
  ctx.translate(m.x, m.y + Math.sin(t * 4 + m.bob * Math.PI * 2) * 4);
  const pulse = Math.sin(t * 3 + m.bob * Math.PI * 2) * 0.5 + 0.5;
  drawGlow(ctx, 0, 0, m.r * 2.8, "#00e676");
  // Outer ring
  ctx.beginPath(); ctx.arc(0, 0, m.r * 1.15, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(105,240,174,${0.4 + pulse * 0.4})`; ctx.lineWidth = 2; ctx.stroke();
  // Pill background
  ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(-m.r * 0.2, -m.r * 0.2, 1, 0, 0, m.r);
  bg.addColorStop(0, "#1de9b6");
  bg.addColorStop(0.6, "#00c853");
  bg.addColorStop(1, "#007c3a");
  ctx.fillStyle = bg; ctx.fill();
  // Cross
  const arm = m.r * 0.45;
  const thick = m.r * 0.22;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff"; ctx.shadowBlur = 6;
  ctx.fillRect(-arm, -thick, arm * 2, thick * 2);
  ctx.fillRect(-thick, -arm, thick * 2, arm * 2);
  ctx.shadowBlur = 0;
  // Shine
  ctx.beginPath(); ctx.arc(-m.r * 0.25, -m.r * 0.3, m.r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();
  ctx.restore();
}

export function drawExplosion(ctx: CanvasRenderingContext2D, b: FallingBomb) {
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

export function drawShockWave(ctx: CanvasRenderingContext2D, sw: ShockWave) {
  ctx.save();
  ctx.globalAlpha = sw.life * 0.6;
  ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 3 * sw.life;
  ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.restore();
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number, t: number) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#0d0033");
  sky.addColorStop(0.5, "#1a0050");
  sky.addColorStop(1, "#2d0070");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY);
  // Background stars
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137.5 + 23) % W;
    const sy = (i * 97.3 + 11) % (groundY * 0.9);
    ctx.globalAlpha = (Math.sin(t * 1.5 + i) * 0.3 + 0.7) * 0.6;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Moon
  const moonX = W * 0.85; const moonY = H * 0.1;
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
  // Ground glow line
  ctx.save();
  ctx.shadowColor = "#7fff00"; ctx.shadowBlur = 12;
  ctx.strokeStyle = "#6abf2a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  ctx.restore();
  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  const clouds = [
    { x: (W * 0.15 + t * 12) % (W + 120) - 60, y: H * 0.12 },
    { x: (W * 0.55 + t * 7) % (W + 120) - 60, y: H * 0.18 },
    { x: (W * 0.80 + t * 15) % (W + 120) - 60, y: H * 0.08 },
  ];
  for (const c of clouds) {
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 55, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + 35, c.y + 5, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x - 30, c.y + 5, 35, 16, 0, 0, Math.PI * 2); ctx.fill();
  }
}
