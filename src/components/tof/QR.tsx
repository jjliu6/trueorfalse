import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QR({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    void QRCode.toCanvas(ref.current, value, {
      margin: 0,
      width: 420,
      color: { dark: "#07070f", light: "#ffffff" },
    });
  }, [value]);
  return (
    <div className={`qr ${className ?? ""}`}>
      <canvas ref={ref} />
    </div>
  );
}