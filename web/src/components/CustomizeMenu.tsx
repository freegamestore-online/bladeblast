import { KnifeStyle } from "../types";
import { drawKnife } from "../lib/fruitDraw";
import { useEffect, useRef } from "react";

const KNIFE_STYLES: KnifeStyle[] = [
  { id: "classic",   name: "Classic",   bladeColor: "#90caf9", handleColor: "#5d4037", glowColor: "#90caf9", trailColor: "#90caf9", emoji: "🔪" },
  { id: "golden",    name: "Golden",    bladeColor: "#ffd700", handleColor: "#8B6914", glowColor: "#ffd700", trailColor: "#ffd700", emoji: "✨" },
  { id: "plasma",    name: "Plasma",    bladeColor: "#e040fb", handleColor: "#4a148c", glowColor: "#e040fb", trailColor: "#e040fb", emoji: "⚡" },
  { id: "inferno",   name: "Inferno",   bladeColor: "#ff5722", handleColor: "#bf360c", glowColor: "#ff5722", trailColor: "#ff5722", emoji: "🔥" },
  { id: "frost",     name: "Frost",     bladeColor: "#80deea", handleColor: "#006064", glowColor: "#80deea", trailColor: "#80deea", emoji: "❄️" },
  { id: "shadow",    name: "Shadow",    bladeColor: "#455a64", handleColor: "#1c313a", glowColor: "#b0bec5", trailColor: "#546e7a", emoji: "🌑" },
  { id: "emerald",   name: "Emerald",   bladeColor: "#69f0ae", handleColor: "#1b5e20", glowColor: "#69f0ae", trailColor: "#69f0ae", emoji: "💚" },
  { id: "ruby",      name: "Ruby",      bladeColor: "#ff1744", handleColor: "#7f0000", glowColor: "#ff1744", trailColor: "#ff1744", emoji: "💎" },
];

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function KnifePreview({ style }: { style: KnifeStyle }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 80, 100);
    drawKnife(ctx, 40, 55, 0, style.bladeColor, style.handleColor, style.glowColor, 38);
  }, [style]);

  return <canvas ref={canvasRef} width={80} height={100} style={{ display: "block" }} />;
}

export function CustomizeMenu({ selected, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
            🔪 Choose Your Blade
          </h2>
          <button
            onClick={onClose}
            className="text-2xl w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--border)", color: "var(--ink)" }}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {KNIFE_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => { onSelect(style.id); onClose(); }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
              style={{
                background: selected === style.id ? style.glowColor + "33" : "var(--paper)",
                border: `2px solid ${selected === style.id ? style.glowColor : "var(--border)"}`,
                boxShadow: selected === style.id ? `0 0 16px ${style.glowColor}66` : "none",
                minHeight: 44,
              }}
            >
              <KnifePreview style={style} />
              <span className="text-sm font-bold" style={{ color: "var(--ink)", fontFamily: "Manrope, sans-serif" }}>
                {style.emoji} {style.name}
              </span>
              {selected === style.id && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: style.glowColor, color: "#fff" }}>
                  Equipped
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { KNIFE_STYLES };
