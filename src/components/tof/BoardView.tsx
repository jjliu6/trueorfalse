import { forwardRef } from "react";
import type { RecordPlayer } from "@/lib/records";

const MEDALS = ["🥇", "🥈", "🥉"];

/** 榜单展示：大屏结算和历史回看共用同一套排版 */
export const BoardView = forwardRef<HTMLDivElement, { players: RecordPlayer[]; caption?: string }>(
  function BoardView({ players, caption }, ref) {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const max = Math.max(1, ...ranked.map((p) => p.score));
    const liar = [...players].sort((a, b) => b.fooled_pct - a.fooled_pct)[0];
    const detective = [...players].sort((a, b) => b.correct_count - a.correct_count)[0];

    return (
      <div className="board" ref={ref}>
        <div className="board-head">
          <div>
            <div className="wordmark" style={{ fontSize: "clamp(22px,2.8vw,40px)" }}>
              🏆 最终榜单
            </div>
            <div className="sub-cn" style={{ fontSize: 11, letterSpacing: ".28em", marginTop: 4 }}>
              {caption ?? "猜对 +1 · 骗过半数 +2"}
            </div>
          </div>
          <div className="awards">
            <div className="award">
              <div className="icon">😈</div>
              <div>
                <div className="lab">最佳骗子</div>
                <div className="who">{liar ? `${liar.avatar ?? ""} ${liar.name}` : "—"}</div>
                <div className="meta">骗过了 {liar?.fooled_pct ?? 0}% 的人</div>
              </div>
            </div>
            <div className="award">
              <div className="icon">🕵️</div>
              <div>
                <div className="lab">最佳侦探</div>
                <div className="who">
                  {detective ? `${detective.avatar ?? ""} ${detective.name}` : "—"}
                </div>
                <div className="meta">猜对 {detective?.correct_count ?? 0} 次</div>
              </div>
            </div>
          </div>
        </div>
        <div className="rows">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`row${i === 0 ? " top1" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="rank">{i + 1}</div>
              <div className="medal">{MEDALS[i] ?? ""}</div>
              <div className="ava">{p.avatar}</div>
              <div className="rname">{p.name}</div>
              <div className="barwrap">
                <i style={{ width: `${(p.score / max) * 100}%` }} />
              </div>
              <div className="score">{p.score}</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);