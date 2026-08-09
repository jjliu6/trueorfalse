import { useLang } from "@/lib/i18n";
import { noteStyle, wallCols, type Player } from "@/lib/tof";
import { QR } from "@/components/tof/QR";

/** 投票时长，改这里同时改倒计时圈的进度基准 */
export const VOTE_SECONDS = 20;

export const PHASE_LABEL_KEY: Record<string, string> = {
  lobby: "screen.phase.lobby",
  stage: "screen.phase.stage",
  voting: "screen.phase.voting",
  reveal: "screen.phase.reveal",
  board: "screen.phase.board",
};

/* ================= 故事墙 ================= */
export function LobbyScene({
  code,
  joinUrl,
  players,
  pickable,
  spinning,
  spotId,
  pickedId,
  onPick,
}: {
  code: string;
  joinUrl: string;
  players: Player[];
  pickable: boolean;
  spinning: boolean;
  spotId: string | null;
  pickedId: string | null;
  onPick: (id: string) => void;
}) {
  const { t } = useLang();
  const empty = players.length === 0;
  const host = joinUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  return (
    <div className="scene">
      <div className="lobby">
        <div className="lobby-top">
          <div className="wordmark">
            <span className="t">TRUE</span>
            <span className="or">or</span>
            <span className="f">FALSE</span>
          </div>
          <div className="counter">{t("lobby.submitted", { n: players.length })}</div>
          <div className="spacer" />
          {!empty && (
            <div className="joinchip">
              <QR value={joinUrl} size={86} />
              <div>
                <div className="code-label">{t("lobby.scan")}</div>
                <div className="room-code">{code}</div>
                <div className="url-hint">{host}</div>
              </div>
            </div>
          )}
        </div>

        {empty ? (
          <div className="empty-cta">
            <div className="sub-cn">{t("home.title.sub")}</div>
            <QR value={joinUrl} size={250} />
            <div style={{ textAlign: "center" }}>
              <div className="code-label" style={{ marginBottom: 6 }}>
                {t("lobby.scanOrCode")}
              </div>
              <div className="room-code">{code}</div>
              <div className="url-hint" style={{ marginTop: 8 }}>
                {host}
              </div>
            </div>
            <div className="tips" style={{ whiteSpace: "pre-line" }}>
              {t("lobby.tips")}
            </div>
          </div>
        ) : (
          <div
            className={`wall${pickable ? " pickable" : ""}${spinning ? " spinning" : ""}`}
            style={{ "--cols": wallCols(players.length) } as React.CSSProperties}
          >
            {players.map((p, i) => (
              <div
                key={p.id}
                className={[
                  "note",
                  p.turn_done ? "done" : "",
                  spotId === p.id ? "spot" : "",
                  pickedId === p.id ? "picked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-h={i % 5}
                style={noteStyle(p.id, i)}
                onClick={() => pickable && !p.turn_done && onPick(p.id)}
              >
                <div className="tape" />
                <div className="pickflag">{t("lobby.pickflag")}</div>
                <div className="donemark">✓</div>
                <div className="nhead">
                  <div className="ava">{p.avatar}</div>
                  <div className="pname">{p.name}</div>
                </div>
                <div className="nstory">
                  <i>A</i>
                  <p>{p.story_a}</p>
                </div>
                <div className="nstory">
                  <i>B</i>
                  <p>{p.story_b}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 上台 / 投票 / 揭晓 ================= */
export function SpotScene({
  phase,
  player,
  players,
  votes,
  left,
  voteSeconds = VOTE_SECONDS,
}: {
  phase: string;
  player: Player;
  players: Player[];
  votes: { voter_id: string; choice: string }[];
  left: number;
  voteSeconds?: number;
}) {
  const { t } = useLang();
  const revealed = phase === "reveal";
  const truth = player.revealed_truth;
  const total = votes.length;
  const nA = votes.filter((v) => v.choice === "A").length;
  const nB = total - nA;
  const rightN = truth === "A" ? nA : nB;
  const fooledPct = total ? Math.round(((total - rightN) / total) * 100) : 0;
  const voters = players.filter((p) => p.id !== player.id);
  const votedIds = new Set(votes.map((v) => v.voter_id));
  const pct = left > 0 ? Math.min(100, (left / voteSeconds) * 100) : 0;

  const cardClass = (k: "A" | "B") => {
    if (!revealed || !truth) return "";
    return truth === k ? " is-true revealed" : " is-fake revealed";
  };

  return (
    <div className="scene">
      <div className="spot-scene">
        <div className="spot-head">
          <div className="spot-ava">{player.avatar}</div>
          <div>
            <div className="spot-name">{player.name}</div>
            <div className="spot-hint">
              {phase === "stage"
                ? t("spot.hint.stage")
                : phase === "voting"
                  ? t("spot.hint.voting")
                  : t("spot.hint.reveal")}
            </div>
          </div>
        </div>

        <div className="cards">
          {(["A", "B"] as const).map((k) => {
            const n = k === "A" ? nA : nB;
            const isTrue = truth === k;
            return (
              <div key={k} className={`story ${k === "A" ? "left" : "right"}${cardClass(k)}`}>
                <div className="glow" />
                <div className="chead">
                  <div className="badge">{k}</div>
                  <div className="votecount">
                    {t("spot.votecount", { n, pct: total ? Math.round((n / total) * 100) : 0 })}
                  </div>
                </div>
                <div className="txt">{k === "A" ? player.story_a : player.story_b}</div>
                <div className="stampslot">
                  {revealed && truth && (
                    <div className={`stamp show ${isTrue ? "true" : "fake"}`}>
                      {isTrue ? "TRUE" : "FAKE"}
                    </div>
                  )}
                </div>
                <div className="tally">
                  <i style={{ width: revealed && total ? `${(n / total) * 100}%` : 0 }} />
                </div>
              </div>
            );
          })}
        </div>

        {phase === "voting" && (
          <div className="votebar">
            <div className="ring" style={{ "--p": pct } as React.CSSProperties}>
              <span>{left}</span>
            </div>
            <div className="dots">
              {voters.map((v) => (
                <div key={v.id} className={`dot${votedIds.has(v.id) ? " done" : ""}`}>
                  {v.avatar}
                </div>
              ))}
            </div>
            <div className="votestat">{t("spot.voted", { n: total, total: voters.length })}</div>
          </div>
        )}

        {revealed && (
          <div className="verdict">
            {fooledPct > 50
              ? t("spot.master", { name: player.name, pct: fooledPct })
              : t("spot.detective", { pct: fooledPct, n: rightN })}
          </div>
        )}
      </div>
    </div>
  );
}
