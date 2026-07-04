// 3D-style fruit and spike drawing helpers

export function draw3DFruit(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  z: number, // 0..1 depth
  alpha: number = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // 3D scale effect based on depth
  const depthScale = 0.7 + z * 0.3;
  ctx.scale(depthScale, depthScale);

  switch (type) {
    case "watermelon": drawWatermelon(ctx, radius); break;
    case "orange": drawOrange(ctx, radius); break;
    case "apple": drawApple(ctx, radius); break;
    case "banana": drawBanana(ctx, radius); break;
    case "pineapple": drawPineapple(ctx, radius); break;
    case "strawberry": drawStrawberry(ctx, radius); break;
    case "lemon": drawLemon(ctx, radius); break;
    case "grape": drawGrape(ctx, radius); break;
    default: drawOrange(ctx, radius);
  }

  ctx.restore();
}

export function draw3DFruitHalf(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  side: "left" | "right",
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Clip to half
  ctx.beginPath();
  if (side === "left") {
    ctx.rect(-radius * 2, -radius * 2, radius * 2, radius * 4);
  } else {
    ctx.rect(0, -radius * 2, radius * 2, radius * 4);
  }
  ctx.clip();

  switch (type) {
    case "watermelon": drawWatermelonHalf(ctx, radius); break;
    case "orange": drawOrangeHalf(ctx, radius); break;
    case "apple": drawAppleHalf(ctx, radius); break;
    case "banana": drawBananaHalf(ctx, radius); break;
    case "pineapple": drawPineappleHalf(ctx, radius); break;
    case "strawberry": drawStrawberryHalf(ctx, radius); break;
    case "lemon": drawLemonHalf(ctx, radius); break;
    case "grape": drawGrapeHalf(ctx, radius); break;
    default: drawOrangeHalf(ctx, radius);
  }

  ctx.restore();
}

function sphere3D(ctx: CanvasRenderingContext2D, r: number, base: string, highlight: string, shadow: string): void {
  // Shadow
  const shadowGrad = ctx.createRadialGradient(r * 0.1, r * 0.1, r * 0.5, 0, 0, r);
  shadowGrad.addColorStop(0, base);
  shadowGrad.addColorStop(1, shadow);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // Highlight
  const hlGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, -r * 0.2, -r * 0.25, r * 0.6);
  hlGrad.addColorStop(0, highlight);
  hlGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();
}

function drawWatermelon(ctx: CanvasRenderingContext2D, r: number): void {
  sphere3D(ctx, r, "#4caf50", "rgba(255,255,255,0.7)", "#1b5e20");
  // Stripes
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = r * 0.12;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(i * r * 0.35, -r); ctx.lineTo(i * r * 0.35 + r * 0.2, r); ctx.stroke();
  }
  ctx.restore();
}

function drawWatermelonHalf(ctx: CanvasRenderingContext2D, r: number): void {
  // Red flesh
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#ff5252"); grad.addColorStop(0.8, "#e53935"); grad.addColorStop(1, "#4caf50");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
  // Seeds
  ctx.fillStyle = "#1a1a1a";
  const seeds = [[-r*0.2, -r*0.1], [r*0.1, -r*0.3], [-r*0.3, r*0.2], [r*0.2, r*0.1], [0, r*0.3]];
  for (const [sx, sy] of seeds) {
    ctx.beginPath(); ctx.ellipse(sx!, sy!, r*0.04, r*0.07, 0.3, 0, Math.PI*2); ctx.fill();
  }
  // Rind line
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#4caf50"; ctx.lineWidth = r * 0.12; ctx.stroke();
}

function drawOrange(ctx: CanvasRenderingContext2D, r: number): void {
  sphere3D(ctx, r, "#ff9800", "rgba(255,255,255,0.7)", "#e65100");
  // Navel
  ctx.beginPath(); ctx.arc(r*0.1, r*0.1, r*0.12, 0, Math.PI*2);
  ctx.strokeStyle = "#e65100"; ctx.lineWidth = 2; ctx.stroke();
}

function drawOrangeHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fff9c4"); grad.addColorStop(0.3, "#ffcc02"); grad.addColorStop(1, "#ff9800");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  // Segments
  ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 3; ctx.stroke();
}

function drawApple(ctx: CanvasRenderingContext2D, r: number): void {
  sphere3D(ctx, r, "#f44336", "rgba(255,255,255,0.8)", "#b71c1c");
  // Stem
  ctx.strokeStyle = "#5d4037"; ctx.lineWidth = r*0.08;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r*0.3, -r*1.3, r*0.1, -r*1.5); ctx.stroke();
  // Leaf
  ctx.fillStyle = "#4caf50";
  ctx.beginPath(); ctx.ellipse(r*0.25, -r*1.25, r*0.25, r*0.12, -0.5, 0, Math.PI*2); ctx.fill();
}

function drawAppleHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fffde7"); grad.addColorStop(0.7, "#fff9c4"); grad.addColorStop(1, "#f44336");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.fillStyle = "#4e342e";
  ctx.beginPath(); ctx.ellipse(0, r*0.1, r*0.06, r*0.14, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#f44336"; ctx.lineWidth = 3; ctx.stroke();
}

function drawBanana(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = "#ffeb3b";
  ctx.save();
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.4, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  const hl = ctx.createLinearGradient(-r, -r*0.3, r, r*0.3);
  hl.addColorStop(0, "rgba(255,255,255,0.5)"); hl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.ellipse(0, 0, r*1.4, r*0.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#f9a825"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, r*1.4, r*0.5, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

function drawBananaHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fff9c4"); grad.addColorStop(1, "#ffeb3b");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#ffeb3b"; ctx.lineWidth = 3; ctx.stroke();
}

function drawPineapple(ctx: CanvasRenderingContext2D, r: number): void {
  // Body
  const grad = ctx.createRadialGradient(-r*0.2, -r*0.2, 0, 0, 0, r);
  grad.addColorStop(0, "#ffcc02"); grad.addColorStop(1, "#e65100");
  ctx.beginPath(); ctx.ellipse(0, r*0.1, r*0.7, r, 0, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  // Diamond pattern
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, r*0.1, r*0.7, r, 0, 0, Math.PI*2); ctx.clip();
  ctx.strokeStyle = "#bf360c"; ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(i*r*0.35, -r); ctx.lineTo(i*r*0.35+r*0.5, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i*r*0.35, -r); ctx.lineTo(i*r*0.35-r*0.5, r); ctx.stroke();
  }
  ctx.restore();
  // Crown
  ctx.fillStyle = "#388e3c";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i*r*0.2, -r*0.7); ctx.lineTo(i*r*0.2-r*0.15, -r*1.4); ctx.lineTo(i*r*0.2+r*0.15, -r*1.4); ctx.closePath(); ctx.fill();
  }
}

function drawPineappleHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fff9c4"); grad.addColorStop(1, "#ffcc02");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 3; ctx.stroke();
}

function drawStrawberry(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = "#f44336";
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(r*1.1, r*0.5, r*1.1, -r*0.5, 0, -r*0.5);
  ctx.bezierCurveTo(-r*1.1, -r*0.5, -r*1.1, r*0.5, 0, r);
  ctx.fill();
  // Highlight
  const hl = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
  hl.addColorStop(0, "rgba(255,255,255,0.6)"); hl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.moveTo(0, r); ctx.bezierCurveTo(r*1.1, r*0.5, r*1.1, -r*0.5, 0, -r*0.5);
  ctx.bezierCurveTo(-r*1.1, -r*0.5, -r*1.1, r*0.5, 0, r); ctx.fill();
  // Seeds
  ctx.fillStyle = "#ffeb3b";
  for (let i = 0; i < 8; i++) {
    const a = (i/8)*Math.PI*2, d = r*0.55;
    ctx.beginPath(); ctx.ellipse(Math.cos(a)*d, Math.sin(a)*d*0.7+r*0.1, r*0.04, r*0.07, a, 0, Math.PI*2); ctx.fill();
  }
  // Leaves
  ctx.fillStyle = "#4caf50";
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate((i/4)*Math.PI*2);
    ctx.beginPath(); ctx.ellipse(0, -r*0.7, r*0.12, r*0.35, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function drawStrawberryHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#ffcdd2"); grad.addColorStop(1, "#f44336");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#f44336"; ctx.lineWidth = 3; ctx.stroke();
}

function drawLemon(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
  grad.addColorStop(0, "#fff9c4"); grad.addColorStop(0.6, "#ffee58"); grad.addColorStop(1, "#f9a825");
  ctx.beginPath(); ctx.ellipse(0, 0, r*1.2, r*0.85, 0, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  // Bumps at ends
  ctx.fillStyle = "#f9a825";
  ctx.beginPath(); ctx.arc(-r*1.1, 0, r*0.18, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(r*1.1, 0, r*0.18, 0, Math.PI*2); ctx.fill();
  // Highlight
  const hl = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
  hl.addColorStop(0, "rgba(255,255,255,0.6)"); hl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.ellipse(0, 0, r*1.2, r*0.85, 0, 0, Math.PI*2); ctx.fill();
}

function drawLemonHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fffde7"); grad.addColorStop(0.5, "#fff9c4"); grad.addColorStop(1, "#ffee58");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "#f9a825"; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i/6)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#ffee58"; ctx.lineWidth = 3; ctx.stroke();
}

function drawGrape(ctx: CanvasRenderingContext2D, r: number): void {
  const positions = [
    [0, 0], [-r*0.45, -r*0.3], [r*0.45, -r*0.3],
    [-r*0.7, r*0.2], [r*0.7, r*0.2], [0, r*0.5],
    [-r*0.35, r*0.65], [r*0.35, r*0.65],
  ];
  const gr = r * 0.42;
  for (const [gx, gy] of positions) {
    const g = ctx.createRadialGradient(gx!-gr*0.3, gy!-gr*0.3, 0, gx!, gy!, gr);
    g.addColorStop(0, "#ce93d8"); g.addColorStop(0.6, "#9c27b0"); g.addColorStop(1, "#4a148c");
    ctx.beginPath(); ctx.arc(gx!, gy!, gr, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
  }
  // Stem
  ctx.strokeStyle = "#795548"; ctx.lineWidth = r*0.08;
  ctx.beginPath(); ctx.moveTo(0, -r*0.5); ctx.lineTo(0, -r); ctx.stroke();
}

function drawGrapeHalf(ctx: CanvasRenderingContext2D, r: number): void {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#f3e5f5"); grad.addColorStop(1, "#9c27b0");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.strokeStyle = "#9c27b0"; ctx.lineWidth = 3; ctx.stroke();
}

export function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number, z: number, alpha: number = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = 0.7 + z * 0.3;
  ctx.scale(s, s);

  // Body (dark metal sphere)
  const grad = ctx.createRadialGradient(-r*0.2, -r*0.2, 0, 0, 0, r);
  grad.addColorStop(0, "#78909c"); grad.addColorStop(0.5, "#37474f"); grad.addColorStop(1, "#102027");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

  // Spikes
  ctx.fillStyle = "#b0bec5";
  const tips = 8;
  for (let i = 0; i < tips; i++) {
    const a = (i / tips) * Math.PI * 2;
    const bx = Math.cos(a) * r * 0.8;
    const by = Math.sin(a) * r * 0.8;
    const tx = Math.cos(a) * r * 1.7;
    const ty = Math.sin(a) * r * 1.7;
    const la = a + Math.PI / 2;
    const w = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx + Math.cos(la)*w, by + Math.sin(la)*w);
    ctx.lineTo(bx - Math.cos(la)*w, by - Math.sin(la)*w);
    ctx.closePath();
    ctx.fill();
  }

  // Red warning glow
  const glow = ctx.createRadialGradient(0, 0, r*0.5, 0, 0, r*2);
  glow.addColorStop(0, "rgba(244,67,54,0.3)"); glow.addColorStop(1, "rgba(244,67,54,0)");
  ctx.beginPath(); ctx.arc(0, 0, r*2, 0, Math.PI*2); ctx.fillStyle = glow; ctx.fill();

  // Skull symbol
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `${r * 0.9}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💀", 0, 0);

  ctx.restore();
}

export function drawKnife(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  bladeColor: string,
  handleColor: string,
  glowColor: string,
  size: number = 60,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
  glow.addColorStop(0, glowColor + "55");
  glow.addColorStop(1, glowColor + "00");
  ctx.beginPath(); ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();

  // Handle
  const handleGrad = ctx.createLinearGradient(-size * 0.15, size * 0.1, size * 0.15, size * 0.5);
  handleGrad.addColorStop(0, lighten(handleColor, 40));
  handleGrad.addColorStop(1, darken(handleColor, 40));
  ctx.beginPath();
  ctx.roundRect(-size * 0.12, size * 0.05, size * 0.24, size * 0.55, size * 0.06);
  ctx.fillStyle = handleGrad;
  ctx.fill();

  // Handle grip lines
  ctx.strokeStyle = darken(handleColor, 60) + "88";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const gy = size * 0.15 + i * size * 0.13;
    ctx.beginPath(); ctx.moveTo(-size*0.1, gy); ctx.lineTo(size*0.1, gy); ctx.stroke();
  }

  // Guard
  const guardGrad = ctx.createLinearGradient(-size*0.22, 0, size*0.22, size*0.08);
  guardGrad.addColorStop(0, "#aaa"); guardGrad.addColorStop(0.5, "#fff"); guardGrad.addColorStop(1, "#888");
  ctx.beginPath();
  ctx.roundRect(-size * 0.22, size * 0.02, size * 0.44, size * 0.1, size * 0.03);
  ctx.fillStyle = guardGrad;
  ctx.fill();

  // Blade
  const bladeGrad = ctx.createLinearGradient(-size*0.1, -size, size*0.1, 0);
  bladeGrad.addColorStop(0, lighten(bladeColor, 60));
  bladeGrad.addColorStop(0.4, bladeColor);
  bladeGrad.addColorStop(1, darken(bladeColor, 30));
  ctx.beginPath();
  ctx.moveTo(-size * 0.1, size * 0.02);
  ctx.lineTo(size * 0.1, size * 0.02);
  ctx.lineTo(size * 0.02, -size);
  ctx.lineTo(-size * 0.02, -size);
  ctx.closePath();
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Blade edge shimmer
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.02, -size);
  ctx.lineTo(-size * 0.08, size * 0.02);
  ctx.stroke();

  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}
function darken(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}
function adjustColor(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = Math.min(255, Math.max(0, parseInt(c.substring(0,2),16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(c.substring(2,4),16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(c.substring(4,6),16) + amount));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}
