import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QR({ value, size }: { value: string; size: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const px = size - 14;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void QRCode.toCanvas(el, value, {
      margin: 0,
      width: 420,
      color: { dark: "#07070f", light: "#ffffff" },
    }).then(() => {
      el.style.width = `${px}px`;
      el.style.height = `${px}px`;
      el.style.display = "block";
    });
  }, [value, px]);
  return (
    <div className="qr" style={{ width: size, height: size }}>
      <canvas ref={ref} />
    </div>
  );
}