import { useEffect, useRef } from "react";

type Piece = {
  x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; c: string;
};

const COLORS = ["#7c5cff", "#22d3ee", "#3ddc97", "#ff3b6b", "#ffcf5c", "#ffffff"];

/** 全屏彩带爆炸：约 150 片，带重力和旋转，2 秒内淡出 */
export function useConfetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const fire = (count = 150) => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: cv.width / 2 + (Math.random() - 0.5) * cv.width * 0.5,
      y: cv.height * 0.45,
      vx: (Math.random() - 0.5) * 18,
      vy: -6 - Math.random() * 15,
      r: 4 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    }));
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / 2000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (t >= 1) { raf.current = null; return; }
      ctx.globalAlpha = Math.max(0, 1 - t);
      for (const p of pieces) {
        p.vy += 0.42;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
        ctx.restore();
      }
      raf.current = requestAnimationFrame(step);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
  };

  return { fire, ref };
}

export function ConfettiCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  return <canvas id="confetti" ref={canvasRef} />;
}