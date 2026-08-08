import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QR({ value, size }: { value: string; size: number }) {
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
    <div className="qr" style={{ width: size, height: size }}>
      <canvas ref={ref} />
    </div>
  );
}