import { useLang } from "@/lib/i18n";

/** 全局语言切换：固定在右上角，En / 中文 两个字样同时可见 */
export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="lang-toggle" role="group" aria-label="Language / 语言">
      <button
        type="button"
        className={lang === "en" ? "sel" : ""}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >
        En
      </button>
      <span className="divider">/</span>
      <button
        type="button"
        className={lang === "zh" ? "sel" : ""}
        onClick={() => setLang("zh")}
        aria-pressed={lang === "zh"}
      >
        中文
      </button>
    </div>
  );
}
