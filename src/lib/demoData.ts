import type { Lang } from "@/lib/i18n";

export type DemoSeed = { name: string; avatar: string; a: string; b: string };

/**
 * 自动演示用的假数据：固定的一组玩家 + 两句话故事。
 * 纯前端造数据，不连 Supabase —— 演示模式的唯一目的是给第一次来的人
 * 在 15 秒内看完一整局的节奏，不需要拉人凑数。
 */
const ZH: DemoSeed[] = [
  {
    name: "李小明",
    avatar: "🦊",
    a: "我曾经在冰岛开车爆胎，被一群羊围观了两小时",
    b: "我给自己家的猫注册过一个营业执照",
  },
  {
    name: "Mia",
    avatar: "🐧",
    a: "我大学四年没进过图书馆，但拿了奖学金",
    b: "我在东京地铁上把护照弄丢又原样找回来了",
  },
  {
    name: "阿哲",
    avatar: "🐼",
    a: "我给周杰伦的演唱会做过灯光志愿者",
    b: "我用一周时间学会了倒立走路",
  },
  {
    name: "Vivian",
    avatar: "🦄",
    a: "我的第一份工作是给宠物拍证件照",
    b: "我曾在飞机上帮机组人员播过一次广播",
  },
  {
    name: "老王",
    avatar: "🐯",
    a: "我家的祖传菜谱被写进了县志",
    b: "我打过一次职业电竞比赛的资格赛",
  },
  {
    name: "Kenji",
    avatar: "🐙",
    a: "我在挪威看极光那晚睡着了，全程没看到",
    b: "我会用左手写镜像字",
  },
];

const EN: DemoSeed[] = [
  {
    name: "Alex",
    avatar: "🦊",
    a: "I once got a flat tire in Iceland and was surrounded by sheep for two hours",
    b: "I registered a business license for my cat",
  },
  {
    name: "Mia",
    avatar: "🐧",
    a: "I never set foot in the library in four years of college, but still got a scholarship",
    b: "I lost my passport on the Tokyo subway and somehow got it back",
  },
  {
    name: "Jaz",
    avatar: "🐼",
    a: "I volunteered on the lighting crew for a Jay Chou concert",
    b: "I taught myself to walk on my hands in a week",
  },
  {
    name: "Vivian",
    avatar: "🦄",
    a: "My first job was taking ID photos for pets",
    b: "I once made an in-flight announcement for the cabin crew",
  },
  {
    name: "Wayne",
    avatar: "🐯",
    a: "My family's secret recipe got written into the county archives",
    b: "I once qualified for a pro esports tournament",
  },
  {
    name: "Kenji",
    avatar: "🐙",
    a: "I fell asleep the night I went to see the northern lights in Norway",
    b: "I can write mirror-image text with my left hand",
  },
];

export const DEMO_SETS: Record<Lang, DemoSeed[]> = { zh: ZH, en: EN };
