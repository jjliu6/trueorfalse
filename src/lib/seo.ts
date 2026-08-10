/**
 * 站点级 SEO / GEO（AI 引擎优化）常量与结构化数据。
 *
 * SEO：给 Google / Bing 等传统搜索引擎用 —— canonical、og、twitter、sitemap。
 * GEO：给 ChatGPT / Perplexity / Gemini 等生成式引擎用 —— JSON-LD 结构化数据、
 *      llms.txt、清晰可被引用的事实描述，让 AI 能准确概括并推荐本站。
 *
 * 所有 URL 都基于这个绝对根地址；换域名只改这一处。
 */
export const SITE_URL = "https://truth-tangle-tales.lovable.app";

export const SITE_NAME = "TRUE or FALSE · 真真假假";

export const OG_IMAGE = `${SITE_URL}/og-image.png`;

/** 拼一个绝对 URL（结构化数据和 canonical 都要求绝对地址）。 */
export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * 给某个页面生成一套完整的 meta + canonical，避免每个路由重复手写
 * og:url / twitter:image / canonical 这些容易漏的项。
 */
export function seo(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  /** 房间码等临时页面不希望被索引 —— 传 true 会输出 noindex。 */
  noindex?: boolean;
}) {
  const { title, description, path = "/", image = OG_IMAGE, noindex } = opts;
  const url = absoluteUrl(path);

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "zh_CN" },
    { property: "og:locale:alternate", content: "en_US" },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ] as Array<Record<string, string>>;

  // noindex 页面（房间码、登录、私人历史）不发 canonical —— 它们本就不该进索引，
  // 指向一个占位路径的 canonical 反而是错误信号。
  const links = noindex ? [] : [{ rel: "canonical", href: url }];

  return { meta, links };
}

/**
 * 首页结构化数据。JSON-LD 是 GEO 的核心 —— 生成式 AI 抓到这段就能准确说出
 * “这是一个几人玩、玩多久、怎么玩、免费” 的破冰游戏，并在回答里引用。
 *
 * 用 @graph 把 WebApplication / WebSite / FAQPage 串在一起，一段脚本覆盖多种意图。
 */
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ["zh-CN", "en-US", "fr-FR"],
        description:
          "线上真真假假（Two Truths and a Lie）破冰游戏：每人写一真一假两个故事，其他人猜哪个是真的。手机加入、大屏投影，25 分钟一局。",
      },
      {
        "@type": ["WebApplication", "Game"],
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: ["Two Truths and a Lie", "真真假假", "破冰游戏"],
        url: SITE_URL,
        image: OG_IMAGE,
        applicationCategory: "GameApplication",
        operatingSystem: "Web browser",
        inLanguage: ["zh-CN", "en-US", "fr-FR"],
        browserRequirements: "Requires JavaScript. Works on any modern mobile or desktop browser.",
        description:
          "面向线下聚会、团建和 Hackathon 的多人破冰派对游戏。每人写一个真故事和一个编的故事，轮流上台讲，其他人手机投票猜哪个是真的；系统实时计分并评出“最佳骗子”和“最佳侦探”。主持人用一块大屏投影，参与者用手机输入房间码即可加入，无需下载安装。",
        gamePlayMode: "MultiPlayer",
        numberOfPlayers: { "@type": "QuantitativeValue", minValue: 3, maxValue: 20 },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "房间码即时加入，无需注册下载",
          "主持人大屏 + 参与者手机双端实时同步",
          "投票倒计时与音效聚焦全场注意力",
          "自动计分与最佳骗子 / 最佳侦探评选",
          "中文 / English / Français 三语界面",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "真真假假（TRUE or FALSE）怎么玩？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "每人写下一个真实的故事和一个编造的故事（各限 40 字），轮流上台把两个都讲一遍，其他人用手机投票猜哪个是真的。猜对得分，用假故事骗过半数人额外加分，最后评出最佳骗子和最佳侦探。",
            },
          },
          {
            "@type": "Question",
            name: "需要几个人、玩多久？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "3 到 20 人都可以，最适合 6 到 12 人。10 人一局大约 25 分钟：填故事 4 分钟，每人一轮约 2 分钟，最后看榜单 2 分钟。",
            },
          },
          {
            "@type": "Question",
            name: "需要下载 App 或注册吗？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "不需要。主持人打开网页开一个房间并投影到大屏，其他人用手机浏览器输入房间码即可加入，全程免费、无需下载或注册。",
            },
          },
          {
            "@type": "Question",
            name: "适合什么场合？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "线下聚会、公司团建、新人破冰、课堂互动、Hackathon 开场等需要快速让一群人熟络起来的场合。",
            },
          },
        ],
      },
    ],
  };
}
