import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ value, size }: { value: string; size: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(value, {
      margin: 0,
      width: 420,
      color: { dark: "#07070f", light: "#ffffff" },
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div className="qr" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="Join QR code" width={size - 14} height={size - 14} /> : null}
    </div>
  );
}