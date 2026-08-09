import { useLang } from "@/lib/i18n";

/** 全局语言切换：固定在右上角，En / 中文 两个字样同时可见 */
export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Language / 语言"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(10,10,20,.55)",
        border: "1px solid rgba(255,255,255,.18)",
        backdropFilter: "blur(10px)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: ".02em",
          color: lang === "en" ? "#0a0a14" : "rgba(255,255,255,.75)",
          background: lang === "en" ? "#fff" : "transparent",
          transition: "background .15s, color .15s",
        }}
      >
        En
      </button>
      <span style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>/</span>
      <button
        type="button"
        onClick={() => setLang("zh")}
        aria-pressed={lang === "zh"}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: ".02em",
          color: lang === "zh" ? "#0a0a14" : "rgba(255,255,255,.75)",
          background: lang === "zh" ? "#fff" : "transparent",
          transition: "background .15s, color .15s",
        }}
      >
        中文
      </button>
    </div>
  );
}
