import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

const STORAGE_KEY = "tof_lang";

type Dict = Record<string, string>;

/**
 * key 命名: 页面.用途
 * 带变量的用 {{name}} 占位，调用方传 vars 做替换
 */
const ZH: Dict = {
  "home.title.sub": "真 真 假 假",
  "home.desc": "每人写一个真故事、一个编的，其他人猜哪个是真的。\n输入大屏上的房间码就能加入。",
  "home.stats.rooms": "🎲 已开局 {{n}} 场",
  "home.stats.players": "🙋 已有 {{n}} 人玩过",
  "home.code.label": "房间码",
  "home.code.placeholder": "例如 TFABCD",
  "home.err.notfound": "找不到这个房间码，再看看大屏？",
  "home.err.create": "房间创建失败，再试一次",
  "home.join": "加入房间 →",
  "home.host": "🖥 我是主持人 · 开一个新房间",
  "home.host.login": "📚 主持人登录 · 保存 / 导出 / 回看记录",
  "home.demo": "🎬 先看一遍自动演示",

  "demo.banner": "🎬 自动演示 · 当前：{{phase}} · 全部是虚拟数据",
  "demo.cta": "退出演示，开一局真的 →",
  "demo.start": "▶ 点击开始演示",
  "demo.start.hint": "浏览器需要一次点击才能播放音效 —— 点一下，动效和音效就都有了。",

  "play.connecting": "正在连接房间…",
  "play.missing.title": "房间不存在",
  "play.missing.desc": "房间码 {{code}} 没找到，看看大屏上的码再试一次。",
  "play.join.title": "加入 {{code}}",
  "play.join.desc": "给自己起个名字，等下大屏上大家都看得到。",
  "play.nick.label": "昵称",
  "play.nick.placeholder": "比如：小明 / Mia",
  "play.avatar.label": "选个头像",
  "play.enter": "进入 →",
  "play.story.title": "写两个故事",
  "play.story.desc.1": "一个真的，一个编的。",
  "play.story.desc.2": "最多 40 字",
  "play.story.desc.3": "—— 写钩子就好，细节留着上台口头讲。",
  "play.storyA.label": "故事 A",
  "play.storyA.placeholder": "我曾经在冰岛开车爆胎，被一群羊围观了两小时",
  "play.storyB.label": "故事 B",
  "play.storyB.placeholder": "我给自己家的猫注册过一个营业执照",
  "play.truth.label": "哪个是真的？（只有你自己知道）",
  "play.truth.A": "A 是真的",
  "play.truth.B": "B 是真的",
  "play.err.submit": "提交失败，再试一次",
  "play.submit": "提交 ✓",
  "play.lobby.title": "已提交",
  "play.lobby.desc": "你的便利贴已经飞上大屏了。等大家都填完，主持人会开始。",
  "play.lobby.count": "已提交 {{n}} 人 · 等下一位",
  "play.stage.me.h": "该你上台了",
  "play.stage.me.p": "把两个故事都讲一遍，别露馅",
  "play.stage.other.h": "{{name}} 正在讲",
  "play.stage.someone": "有人",
  "play.stage.other.p": "认真听 —— 等下要投票",
  "play.voting.me.h": "大家正在投票",
  "play.voting.me.p": "还剩 {{n}} 秒 · 保持面无表情",
  "play.voting.title": "你觉得哪个是真的？",
  "play.voting.storyOf": "{{name}} 的故事",
  "play.err.vote": "没投上，再点一次",
  "play.countdown.timeup": "时间到，等大屏揭晓",
  "play.countdown.locked": "已锁定，可以改，但只剩 ",
  "play.countdown.left": "还剩 ",
  "play.countdown.sec": " 秒",
  "play.reveal.master.h": "骗术大师！",
  "play.reveal.busted.h": "被识破了",
  "play.reveal.fooled": "你骗过了 {{pct}}% 的人（{{n}} 人投票）",
  "play.reveal.score": "当前 {{n}} 分",
  "play.reveal.novote.h": "这轮你没投票",
  "play.reveal.novote.p": "真的是 {{t}} · 下轮记得手快点",
  "play.reveal.right.h": "猜对了！",
  "play.reveal.wrong.h": "被骗了",
  "play.reveal.truth": "{{t}} 才是真的 · 有 {{pct}}% 的人被骗",
  "play.reveal.plus1": "＋1 分 · ",
  "play.board.rank": "第 {{n}} 名",
  "play.board.summary": "共 {{score}} 分 · 猜对 {{correct}} 次 · 骗到 {{fooled}}%",
  "play.board.cta": "抬头看大屏，念奖了",
  "play.score": "{{n}} 分",

  "screen.missing": "找不到房间 {{code}}",
  "screen.connecting": "正在连接…",
  "screen.phase.lobby": "故事墙",
  "screen.phase.stage": "上台",
  "screen.phase.voting": "投票中",
  "screen.phase.reveal": "揭晓",
  "screen.phase.board": "榜单",
  "screen.main.random": "🎲 随机点名",
  "screen.status.remain": "还剩 {{n}} 人 · 或直接点一张贴纸",
  "screen.main.board": "🏆 最终榜单",
  "screen.status.alldone": "所有人都讲完了",
  "screen.status.waiting": "等待大家填表",
  "screen.main.vote": "🗳 开启投票 {{n}}s",
  "screen.status.speaking": "{{name}} 正在讲",
  "screen.main.reveal": "✨ 揭晓答案",
  "screen.status.left": "还剩 {{n}} 秒",
  "screen.main.back": "← 回故事墙选人",
  "screen.status.remainNoTalk": "还剩 {{n}} 人没讲",
  "screen.status.alldone2": "全部讲完了",
  "screen.main.over": "✔ 游戏结束",
  "screen.status.award": "念奖时间",
  "screen.hud.back": "← 上一步",
  "screen.hud.board": "🏆 直接看榜单",
  "screen.hud.muted": "🔇 已静音",
  "screen.hud.sound": "🔊 音效",
  "screen.hud.reset": "↺ 重置",
  "screen.keyhint": "按 空格 进入下一步 · 移动鼠标唤出控制条",
  "screen.reset.confirm": "重置本场：清空所有投票和分数，故事墙保留。确定？",

  "lobby.submitted": "{{n}} 人已提交",
  "lobby.scan": "扫码加入",
  "lobby.scanOrCode": "扫码加入 · 或输入房间码",
  "lobby.tips": "写一个真故事、一个编的 —— 一句话就行\n细节留着等下口头讲",
  "lobby.pickflag": "🎯 就你了！",

  "spot.hint.stage": "请讲讲这两个故事 —— 只有一个是真的",
  "spot.hint.voting": "大家正在投票，别看别人手机",
  "spot.hint.reveal": "答案揭晓",
  "spot.votecount": "{{n}} 票 · {{pct}}%",
  "spot.voted": "已投 {{n}} / {{total}}",
  "spot.master": "😈 {{name}} 骗过了 {{pct}}% 的人 —— 骗术大师 +2 分",
  "spot.detective": "🕵️ 只有 {{pct}}% 的人被骗到，{{n}} 人识破 +1 分",

  "board.title": "🏆 最终榜单",
  "board.rule": "猜对 +1 · 骗过半数 +2",
  "board.liar": "最佳骗子",
  "board.detective": "最佳侦探",
  "board.liar.meta": "骗过了 {{pct}}% 的人",
  "board.detective.meta": "猜对 {{n}} 次",

  "board.save": "💾 保存记录",
  "board.save.busy": "保存中…",
  "board.export": "🖼 导出战报图",
  "board.export.busy": "导出中…",
  "board.history": "📚 历史记录",
  "board.gate": "保存记录 / 导出战报 需要主持人登录",
  "board.login": "🔐 注册 / 登录",
  "board.save.err": "保存失败：{{msg}}",
  "board.save.ok": "已保存，可在「历史记录」里回看 ✓",
  "board.export.ok": "战报图已导出 ✓",
  "board.export.err": "导出失败，再试一次",

  "auth.title.host": "主持人",
  "auth.title.login": "登录",
  "auth.sub": "保存记录 · 导出战报 · 回看历史",
  "auth.desc.pre": "玩游戏不需要登录。只有",
  "auth.desc.bold": "保存对局记录、导出战报图、回看历史榜单",
  "auth.desc.post": "需要一个账号。",
  "auth.mode.in": "登录",
  "auth.mode.up": "注册",
  "auth.email.label": "邮箱",
  "auth.pw.label": "密码",
  "auth.pw.placeholder": "至少 6 位",
  "auth.msg.signupSent": "注册邮件已发出，点开邮箱里的确认链接就能登录。",
  "auth.submit.up": "注册并登录 →",
  "auth.submit.in": "登录 →",
  "auth.back": "← 回首页",

  "history.title.a": "历史",
  "history.title.b": "记录",
  "history.sub": "保存过的对局都在这里",
  "history.home": "首页",
  "history.signout": "退出登录",
  "history.loading": "加载中…",
  "history.empty": "还没有记录。在大屏榜单页点「保存记录」，这一场就会出现在这里。",
  "history.item.title": "房间 {{code}}",
  "history.item.meta": "{{n}} 人",
  "history.collapse": "收起",
  "history.view": "回看",
  "history.delete": "删除",
};

const EN: Dict = {
  "home.title.sub": "TRUTH · LIE",
  "home.desc":
    "Everyone writes one true story and one fake one, others guess which is real.\nEnter the room code shown on the big screen to join.",
  "home.stats.rooms": "🎲 {{n}} games hosted",
  "home.stats.players": "🙋 {{n}} people have played",
  "home.code.label": "Room code",
  "home.code.placeholder": "e.g. TFABCD",
  "home.err.notfound": "Couldn't find that room — check the big screen?",
  "home.err.create": "Couldn't create the room, try again",
  "home.join": "Join room →",
  "home.host": "🖥 I'm the host · start a new room",
  "home.host.login": "📚 Host login · save / export / view history",
  "home.demo": "🎬 Watch the auto-demo first",

  "demo.banner": "🎬 Auto demo · now: {{phase}} · all data is fake",
  "demo.cta": "Exit demo, start a real game →",
  "demo.start": "▶ Click to start the demo",
  "demo.start.hint":
    "Browsers require a click before they'll play sound — tap once to get the full effect.",

  "play.connecting": "Connecting to the room…",
  "play.missing.title": "Room not found",
  "play.missing.desc": "Room {{code}} doesn't exist — double check the code on the big screen.",
  "play.join.title": "Join {{code}}",
  "play.join.desc": "Pick a name — everyone will see it on the big screen.",
  "play.nick.label": "Nickname",
  "play.nick.placeholder": "e.g. Alex / Mia",
  "play.avatar.label": "Pick an avatar",
  "play.enter": "Continue →",
  "play.story.title": "Write two stories",
  "play.story.desc.1": "One true, one made up.",
  "play.story.desc.2": "40 characters max",
  "play.story.desc.3": "— just write the hook, save the details for when you speak.",
  "play.storyA.label": "Story A",
  "play.storyA.placeholder":
    "I once got a flat tire in Iceland and was surrounded by sheep for two hours",
  "play.storyB.label": "Story B",
  "play.storyB.placeholder": "I registered a business license for my cat",
  "play.truth.label": "Which one is true? (only you know)",
  "play.truth.A": "A is true",
  "play.truth.B": "B is true",
  "play.err.submit": "Failed to submit, try again",
  "play.submit": "Submit ✓",
  "play.lobby.title": "Submitted",
  "play.lobby.desc":
    "Your note is up on the big screen. Once everyone's done, the host will begin.",
  "play.lobby.count": "{{n}} people submitted · waiting for the next round",
  "play.stage.me.h": "You're up",
  "play.stage.me.p": "Tell both stories — don't give it away",
  "play.stage.other.h": "{{name}} is speaking",
  "play.stage.someone": "Someone",
  "play.stage.other.p": "Listen closely — you'll vote next",
  "play.voting.me.h": "Everyone's voting",
  "play.voting.me.p": "{{n}} seconds left · keep a straight face",
  "play.voting.title": "Which one do you think is true?",
  "play.voting.storyOf": "{{name}}'s stories",
  "play.err.vote": "Vote didn't go through, tap again",
  "play.countdown.timeup": "Time's up, waiting for the reveal",
  "play.countdown.locked": "Locked in, you can still change it, but only ",
  "play.countdown.left": "",
  "play.countdown.sec": " seconds left",
  "play.reveal.master.h": "Master of deception!",
  "play.reveal.busted.h": "Busted",
  "play.reveal.fooled": "You fooled {{pct}}% of voters ({{n}} votes)",
  "play.reveal.score": "Current score: {{n}}",
  "play.reveal.novote.h": "You didn't vote this round",
  "play.reveal.novote.p": "The truth was {{t}} · be quicker next time",
  "play.reveal.right.h": "You got it right!",
  "play.reveal.wrong.h": "Fooled",
  "play.reveal.truth": "{{t}} was true · {{pct}}% of people were fooled",
  "play.reveal.plus1": "+1 · ",
  "play.board.rank": "#{{n}}",
  "play.board.summary": "{{score}} pts · {{correct}} correct guesses · fooled {{fooled}}%",
  "play.board.cta": "Look up at the big screen, awards time",
  "play.score": "{{n}} pts",

  "screen.missing": "Room {{code}} not found",
  "screen.connecting": "Connecting…",
  "screen.phase.lobby": "Story wall",
  "screen.phase.stage": "On stage",
  "screen.phase.voting": "Voting",
  "screen.phase.reveal": "Reveal",
  "screen.phase.board": "Leaderboard",
  "screen.main.random": "🎲 Pick a player",
  "screen.status.remain": "{{n}} left · or click a note directly",
  "screen.main.board": "🏆 Final leaderboard",
  "screen.status.alldone": "Everyone has gone",
  "screen.status.waiting": "Waiting for everyone to submit",
  "screen.main.vote": "🗳 Start voting {{n}}s",
  "screen.status.speaking": "{{name}} is speaking",
  "screen.main.reveal": "✨ Reveal answer",
  "screen.status.left": "{{n}} seconds left",
  "screen.main.back": "← Back to story wall",
  "screen.status.remainNoTalk": "{{n}} people haven't gone",
  "screen.status.alldone2": "Everyone has gone",
  "screen.main.over": "✔ Game over",
  "screen.status.award": "Award time",
  "screen.hud.back": "← Back",
  "screen.hud.board": "🏆 Jump to leaderboard",
  "screen.hud.muted": "🔇 Muted",
  "screen.hud.sound": "🔊 Sound",
  "screen.hud.reset": "↺ Reset",
  "screen.keyhint": "Press Space for next · move mouse to show controls",
  "screen.reset.confirm":
    "Reset this game: clears all votes and scores, keeps the story wall. Are you sure?",

  "lobby.submitted": "{{n}} submitted",
  "lobby.scan": "Scan to join",
  "lobby.scanOrCode": "Scan to join · or enter the room code",
  "lobby.tips":
    "Write one true story and one fake one — a sentence is enough\nSave the details for when you speak",
  "lobby.pickflag": "🎯 It's you!",

  "spot.hint.stage": "Tell both stories — only one is true",
  "spot.hint.voting": "Everyone's voting, don't peek at other phones",
  "spot.hint.reveal": "Answer revealed",
  "spot.votecount": "{{n}} votes · {{pct}}%",
  "spot.voted": "{{n}} / {{total}} voted",
  "spot.master": "😈 {{name}} fooled {{pct}}% of people — master of deception +2",
  "spot.detective": "🕵️ Only {{pct}}% were fooled, {{n}} saw through it +1",

  "board.title": "🏆 Final leaderboard",
  "board.rule": "Correct guess +1 · fool half +2",
  "board.liar": "Best liar",
  "board.detective": "Best detective",
  "board.liar.meta": "Fooled {{pct}}% of people",
  "board.detective.meta": "{{n}} correct guesses",

  "board.save": "💾 Save record",
  "board.save.busy": "Saving…",
  "board.export": "🖼 Export recap image",
  "board.export.busy": "Exporting…",
  "board.history": "📚 History",
  "board.gate": "Host login required to save / export",
  "board.login": "🔐 Sign up / log in",
  "board.save.err": "Save failed: {{msg}}",
  "board.save.ok": 'Saved — you can view it under "History" ✓',
  "board.export.ok": "Recap image exported ✓",
  "board.export.err": "Export failed, try again",

  "auth.title.host": "Host",
  "auth.title.login": "Login",
  "auth.sub": "Save records · export recaps · view history",
  "auth.desc.pre": "You don't need an account to play. An account is only needed to ",
  "auth.desc.bold": "save game records, export recap images, or view past leaderboards",
  "auth.desc.post": ".",
  "auth.mode.in": "Log in",
  "auth.mode.up": "Sign up",
  "auth.email.label": "Email",
  "auth.pw.label": "Password",
  "auth.pw.placeholder": "At least 6 characters",
  "auth.msg.signupSent": "Confirmation email sent — click the link inside to finish logging in.",
  "auth.submit.up": "Sign up & log in →",
  "auth.submit.in": "Log in →",
  "auth.back": "← Back home",

  "history.title.a": "Game",
  "history.title.b": "history",
  "history.sub": "Every saved game shows up here",
  "history.home": "Home",
  "history.signout": "Log out",
  "history.loading": "Loading…",
  "history.empty": 'No records yet. Click "Save record" on the leaderboard screen to add one here.',
  "history.item.title": "Room {{code}}",
  "history.item.meta": "{{n}} people",
  "history.collapse": "Collapse",
  "history.view": "View",
  "history.delete": "Delete",
};

const DICTS: Record<Lang, Dict> = { zh: ZH, en: EN };

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => interpolate(DICTS[lang][key] ?? DICTS.zh[key] ?? key, vars),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
