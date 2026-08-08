import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 全部用 Web Audio API 现场合成，不加载任何音频文件 ——
 * 这样投影电脑断网也有声音。
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  useEffect(() => {
    const unlock = () => {
      if (!ctxRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) ctxRef.current = new Ctor();
      }
      void ctxRef.current?.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const ctx = () => {
    if (mutedRef.current) return null;
    return ctxRef.current;
  };

  /** 8ms 线性起音 → 指数衰减到 0.0001，避免爆音 */
  const tone = useCallback(
    (
      type: OscillatorType,
      freq: number,
      dur: number,
      vol: number,
      delay = 0,
      slideTo?: number,
    ) => {
      const ac = ctx();
      if (!ac) return;
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    [],
  );

  const tick = useCallback(
    (strong = false) => tone("square", strong ? 1500 : 900, 0.045, strong ? 0.14 : 0.06),
    [tone],
  );

  const ding = useCallback(() => {
    tone("triangle", 1568, 0.16, 0.1);
    tone("triangle", 2349, 0.16, 0.05);
  }, [tone]);

  const join = useCallback(() => tone("sine", 880, 0.16, 0.07, 0, 1320), [tone]);

  const roll = useCallback(
    () => tone("square", 600 + Math.random() * 500, 0.035, 0.035),
    [tone],
  );

  const chime = useCallback(() => {
    [523, 659, 784, 1046].forEach((f, i) => tone("sine", f, 0.42, 0.09, i * 0.075));
  }, [tone]);

  const fanfare = useCallback(() => {
    [523, 659, 784, 1046, 1319].forEach((f, i) => tone("sine", f, 0.5, 0.1, i * 0.11));
  }, [tone]);

  const boom = useCallback(() => {
    const ac = ctx();
    if (!ac) return;
    tone("sine", 160, 0.55, 0.5, 0, 46);
    tone("sine", 80, 0.7, 0.35, 0, 36);
    // 一段 300ms 的低通白噪声，像鼓槌落下
    const len = Math.floor(ac.sampleRate * 0.3);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.3, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
    src.connect(lp).connect(g).connect(ac.destination);
    src.start();
  }, [tone]);

  return { muted, setMuted, tick, ding, join, roll, chime, fanfare, boom };
}