# Truth or Lie

TRUE or FALSE · 真真假假

Hackathon 破冰游戏 —— 完整搭建手册（Lovable + Supabase 版）

配套文件：true-or-false.html（离线动效原型，双击就能开，先看效果再动手）

一、这个游戏怎么玩

10 个人，每人写一真一假两个故事，其他人猜哪个是真的。

只有两种界面：主持人面前的大屏（投影），和所有人手机上的小屏。 没有第三个后台。

阶段 大屏（主持人电脑 → 投影） 手机（所有参与者） ① 故事墙 lobby 故事墙是主场：每有人提交，一张歪歪扭扭的便利贴飞上墙，上面是头像+名字+两个故事。二维码缩在右上角 填昵称 → 写两个故事（各限 40 字）→ 标哪个是真的 → 提交 ② 点名 随机点名（跑马灯扫过没讲的人，减速停下）或直接点某张贴纸 「XXX 上台了」 ③ 上台 stage 当前玩家头像浮起，A/B 两张大卡从左右滑入 「XXX 正在讲，认真听」 ④ 投票 voting 环形倒计时 20s + 滴答声，头像一个个亮起。只显示已投人数，不显示分布 两个大按钮 A / B ⑤ 揭晓 reveal 一声"咚"，假的盖 FAKE 红章+抖动变灰，真的发绿光+TRUE 章+彩带，票数条生长 「猜对了 / 被骗了」+ 本轮得分 ⑥ 回墙 讲过的人在墙上灰掉、盖绿色 ✓，一眼看出还剩谁 「等下一位」 ⑦ 榜单 board 最佳骗子 / 最佳侦探两个奖 + 排行榜条形图生长 自己的名次

游戏是一个循环：故事墙 → 点名 → 讲 → 投票 → 揭晓 → 回故事墙，直到所有贴纸都灰掉，才走最终榜单。

计分与两个特别奖

猜对一个人 → +1 分

你的假故事骗过 超过一半 的人 → +2 分（"骗术大师"）

🏆 最佳骗子 = 被骗比例最高的人（一场只有一个）

🏆 最佳侦探 = 猜对次数最多的人

"骗过半数 +2"这条很关键：它让写故事的人有动力认真编，而不是随手糊弄。两个奖则让不同性格的人都有高光 —— 会编故事的和会看人的各拿一个。

为什么故事各限 40 字？ 逼大家写钩子而不是写小作文。填表快、墙上排版整齐、读起来节奏也快。真正的细节留到上台口头讲 —— 那才是这个游戏最好玩的部分。

为什么投票时不显示分布？ 一旦看见"7 个人选了 A"，剩下的人会跟风，游戏就废了。只显示"已投 7/9"既能催人投票，又不泄露信息。

为什么一定要有音效？ 破冰游戏有声音和没声音差别巨大。倒计时最后 10 秒每秒一下滴答（最后 3 秒变高变响），揭晓时一声低沉的"咚"—— 这两个声音会让全场的注意力自动收拢，主持人不用喊"大家看这边"。

节奏（10 人约 25 分钟） 填表 4 分钟 → 每人一轮约 2 分钟（点名 5s / 讲 60s / 投票 20s / 揭晓吐槽 40s）→ 榜单 2 分钟。

二、主持人怎么操作：就在大屏上，一个按钮走到底

大屏本来就跑在主持人的电脑上，所以控制按钮直接长在大屏上，不需要另开一个后台页面。

设计成这样：

平时完全隐藏。 观众看到的是干净的画面，没有任何按钮。

鼠标一动，右下角浮出一条控制条，3.5 秒不动又自动收回（就像视频播放器）。

主按钮只有一个：「下一步」。 当前在哪个阶段，按钮就自动变成下一步该做什么：

故事墙 ──🎲 随机点名──▶ 上台 ──🗳 开启投票 20s──▶ 投票 ──✨ 揭晓答案──▶ 揭晓
   ▲                                                                    │
   └──────────────── ← 回故事墙选人 ──────────────────────────────────────┘
                                                （所有人都讲完了 → 🏆 最终榜单）


点名有两种方式：按「🎲 随机点名」让跑马灯扫一圈自己停，或者直接用鼠标点墙上某张贴纸。 随机适合暖场（悬念感强），手点适合主持人想调节奏时救场 —— 比如现场气氛冷了，就点那个故事最离谱的人先上。

敲空格键 = 下一步（在故事墙阶段，空格就是随机点名），主持人可以全程不碰鼠标。左方向键 = 退回上一步。

控制条里另外四个小按钮：上一步 / 直接看榜单 / 🔊 音效开关 / 重置。

为什么不做成"手机遥控大屏"？ 也可以做，但对线下投影场景是多余的：主持人本来就站在电脑边上，敲空格比掏手机快。如果你的主持人要满场走动，再加一个 /remote/:code 页面就行 —— 逻辑跟大屏上这条控制条一模一样，只是换个地方渲染。

三、先看原型

打开 true-or-false.html，右上角切换 🖥 大屏 / 📱 手机（这个切换器只是原型用的，真实版本没有）。

在大屏视图里：

按 F —— 模拟一个人提交（连按几次，看便利贴一张张飞上墙）

按空格 —— 走下一步（在故事墙上就是随机点名，看跑马灯）

直接点某张贴纸 —— 那个人立刻上台

移动鼠标 —— 唤出控制条，里面有「⚡ 自动演示」，会自动跑完整个流程

⚠️ 记得开音量。倒计时滴答和揭晓的"咚"都在里面（浏览器规定要先点一下页面才允许出声，所以第一次进去先随便点一下）。

原型里的数据全是假的、只跑在一个浏览器页面里，多台设备之间不会同步。它的作用是让你和团队先确认视觉和节奏，也是给设计参考。

四、为什么需要一个数据库（写给新手）

你可能会想：不是一个网页就够了吗？

不够。因为这里有 11 台设备（1 台投影电脑 + 10 部手机），它们各跑各的浏览器，互相看不见对方的内存。小明在手机上提交了故事，投影那台电脑根本不知道这事发生过。

所以需要一个所有设备都能连的"中间人"：

小明手机  ──写入──▶  ┌──────────┐  ──推送──▶  投影大屏
Mia 手机  ──写入──▶  │ Supabase │  ──推送──▶  其他人手机
主持人    ──写入──▶  └──────────┘


Supabase 提供的三样东西正好是我们全部需要的：

数据库（Postgres） —— 存房间、玩家、故事、投票

Realtime（实时推送） —— 数据一变，所有连着的设备主动收到通知，不用不停地问"有更新吗"

RLS（行级安全） —— 控制"谁能看到哪些数据"，我们用它来藏住答案

五、数据库结构（整段贴进 Supabase 的 SQL Editor）

5.1 建表

-- 房间：一场活动一条记录。phase 是整个游戏的"总开关"
create table public.rooms (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,               -- 房间码，如 HACK26
  host_key          text not null,                      -- 只有主持人知道，用来决定要不要显示控制条
  phase             text not null default 'lobby',      -- lobby|stage|voting|reveal|board
  current_player_id uuid,                               -- 现在轮到谁
  voting_ends_at    timestamptz,                        -- 投票截止时间（用来算倒计时）
  created_at        timestamptz default now()
);

-- 玩家：公开可读，但这张表里【没有答案】
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  name           text not null,
  avatar         text default '🦊',
  story_a        text check (char_length(story_a) <= 40),   -- 40 字硬上限，数据库这层也拦一道
  story_b        text check (char_length(story_b) <= 40),
  submitted      boolean default false,
  score          int default 0,
  turn_done      boolean default false,   -- 讲过了没有，故事墙上灰掉的依据
  correct_count  int default 0,           -- 猜对几次 → 最佳侦探
  fooled_pct     int default 0,           -- 自己那轮骗到了百分之多少 → 最佳骗子
  revealed_truth text,          -- 只有揭晓那一刻才写入 'A' 或 'B'
  created_at     timestamptz default now()
);

-- 答案：单独一张表，配合 RLS 做到【任何前端都读不到】
create table public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  truth     text not null check (truth in ('A','B'))
);

-- 投票：unique 约束保证一人一票，且可以改票（用 upsert）
create table public.votes (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  target_id  uuid not null references public.players(id) on delete cascade,
  voter_id   uuid not null references public.players(id) on delete cascade,
  choice     text not null check (choice in ('A','B')),
  created_at timestamptz default now(),
  unique (target_id, voter_id)
);


5.2 打开实时推送

alter publication supabase_realtime add table public.rooms, public.players, public.votes;
-- replica identity full：让「更新」事件也带上完整行数据，前端才好用
alter table public.rooms   replica identity full;
alter table public.players replica identity full;
alter table public.votes   replica identity full;


5.3 安全策略（这段最关键）

alter table public.rooms          enable row level security;
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.votes          enable row level security;

create policy "rooms_all"    on public.rooms   for all    using (true) with check (true);
create policy "players_all"  on public.players for all    using (true) with check (true);
create policy "votes_read"   on public.votes   for select using (true);
create policy "votes_write"  on public.votes   for insert with check (true);
create policy "votes_update" on public.votes   for update using (true) with check (true);

-- player_secrets 只给「插入」权限，【一条 select 策略都不写】
-- => 提交时能写进去，但任何前端（包括打开 F12 的人）都查不出来
create policy "secrets_insert" on public.player_secrets for insert with check (true);


这一步在防什么？ 如果把答案直接存在 players 表里，任何人打开浏览器开发者工具，都能看到服务器返回的完整数据、直接拿到答案。Hackathon 现场真的会有人这么干。把答案隔离到一张"只写不读"的表，就从根上堵死了。

5.4 两个数据库函数

security definer 的意思是：这个函数以数据库管理员身份运行，可以绕过 RLS。所以只有通过它、且只在该揭晓的时候，答案才会被放出来。

-- 揭晓：把答案从密室搬到公开表
create or replace function public.reveal_truth(p_player uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select truth into t from player_secrets where player_id = p_player;
  update players set revealed_truth = t where id = p_player;
  return t;
end; $$;

-- 结算：算分（猜对 +1；骗过半数 +2）
create or replace function public.settle_round(p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t text; total int; right_n int;
begin
  select revealed_truth into t from players where id = p_player;
  if t is null then return; end if;

  select count(*) into total   from votes where target_id = p_player;
  select count(*) into right_n from votes where target_id = p_player and choice = t;

  -- 猜对的人：+1 分，并且「猜对次数」+1（用来评最佳侦探）
  update players set score = score + 1, correct_count = correct_count + 1
   where id in (select voter_id from votes where target_id = p_player and choice = t);

  -- 当事人：记录自己骗到了多少比例（用来评最佳骗子），骗过半数额外 +2
  update players
     set turn_done  = true,
         fooled_pct = case when total > 0
                           then round((total - right_n)::numeric / total * 100)::int else 0 end,
         score      = score + case when total > 0 and right_n::numeric / total < 0.5
                                   then 2 else 0 end
   where id = p_player;
end; $$;

grant execute on function public.reveal_truth(uuid) to anon;
grant execute on function public.settle_round(uuid) to anon;


六、页面结构（只有三个路由）

路由 谁打开 干什么 / 参与者 输房间码 → 跳到 /play/:code /play/:code 参与者手机 一个状态机，跟着 room.phase 自动切界面 /screen/:code?k=xxx 主持人电脑 → 投影 大屏 + 隐藏式控制条

控制条什么时候显示？ URL 里的 ?k= 要等于 rooms.host_key 才渲染控制条。没有这个参数的人，即使打开了 /screen/HACK26，看到的也只是一块只读的大屏 —— 按空格没反应。这样万一有人把大屏链接投到自己手机上，也点不坏你的流程。

参与者身份怎么认？ 不做登录。第一次提交后把 player.id 存进浏览器 localStorage，之后刷新页面也认得出是谁。10 人的破冰游戏，够用了。

七、提示词（分三轮，逐轮粘贴）

为什么分三轮？ 一次做太多事容易做偏。先搭骨架 → 再接数据 → 最后加动效，每轮都能验证，出问题也好回退。 强烈建议：第三轮之前，把原型的截图（故事墙 / 揭晓 / 榜单 三张）上传，说"照这个视觉做"，效果会好非常多。

第 1 轮 · 搭骨架

做一个线下 Hackathon 破冰游戏「TRUE or FALSE 真真假假」，React + Tailwind，全中文界面。

只有三个路由（不要做额外的管理后台）：
/                    参与者输房间码加入
/play/:code          参与者手机端，竖屏优先
/screen/:code?k=xxx  投影大屏，16:9 横屏，字要大，深色背景；主持人的控制按钮直接做在这个页面里

视觉方向：深色 #07070f 打底，背景三团缓慢漂移的模糊光斑（紫 #7c5cff / 青 #22d3ee / 玫红 #ff3b6b），
毛玻璃卡片，圆角 28px。真=薄荷绿 #3ddc97，假=玫红 #ff3b6b，金色 #ffcf5c 用于第一名。
中文字体 PingFang SC / Noto Sans SC。

这一轮先用写死的假数据把静态布局做出来，不接数据库：

【/screen 大厅页】—— 主角是「故事墙」，不是二维码
- 顶部一行：左边 logo「TRUE or FALSE」，旁边一个胶囊显示「7 / 10 已提交」，
  最右边一个小小的加入卡片（约 86px 的二维码 + 房间码 + 网址），它是配角，不要占大位置
- 中间整片区域是故事墙：每个已提交的人是一张「便利贴」，上面有
  头像 + 名字 + 故事A + 故事B（两个故事都要显示出来，不要只显示名字）
  每张贴纸顶部有一小条半透明「胶带」
  贴纸是 5 种半透明彩色轮流用（紫/青/粉/黄/绿），不要全是灰的
  【重要】贴纸要东倒西歪、不要排得整整齐齐：每张随机旋转 -4.5°~+4.5°，
  再随机上下错位 -14px~+14px，看起来像人手贴上去的
- 列数按人数自动算：cols = min(5, max(2, ceil(人数/2)))，这样 10 人以内永远只有两行，卡片能大一些
- 已经讲过的人，贴纸整体降到 26% 透明度 + 灰度 0.9，右上角盖一个绿色圆形 ✓ 徽章
- 一个人都还没提交时，二维码放大到 250px 站在正中间，加一句
  「写一个真故事、一个编的 —— 一句话就行，细节留着等下口头讲」；
  第一个人提交后，二维码缩回右上角，故事墙展开

【/screen 上台页】顶部当前玩家头像+名字，下面左右两张大故事卡（标 A / B），底部留一条空的状态栏
【/screen 榜单页】顶部一行：左边「🏆 最终榜单」标题，右边并排两个特别奖卡片
  （😈 最佳骗子 / 🕵️ 最佳侦探，各显示头像+名字+一行说明）；下面 10 行排行榜，
  每行 [名次][奖牌][头像][名字][进度条][分数]。整页要在 16:9 一屏内放得下，不许出现滚动条
【/play】昵称页 / 写两个故事页 / 等待页 / 投票页 / 结果页，五个步骤
  写故事页两个输入框都是 maxlength=40，label 右侧实时显示「23/40」，
  ≥30 字变黄、满 40 变红


第 2 轮 · 接 Supabase + 主持人控制条

连接 Supabase，按下面的表结构接真实数据（SQL 我已经跑过了，表已存在）：
rooms(id, code, host_key, phase, current_player_id, voting_ends_at)
players(id, room_id, name, avatar, story_a, story_b, submitted, score, turn_done, revealed_truth)
player_secrets(player_id, truth)   -- 只能 insert，前端读不到，不要尝试 select 它
votes(id, room_id, target_id, voter_id, choice)   -- (target_id, voter_id) 唯一

数据行为：
1. 参与者提交故事时：先 insert players（不带答案），拿到 id 后再 insert player_secrets(player_id, truth)。
   把 player.id 存进 localStorage，key 用 `tof_player_<code>`。
2. 两个页面都用 Supabase Realtime 订阅 rooms / players / votes 的变化，收到事件就更新 state。不要轮询。
3. room.phase 是唯一的真相来源，/play 和 /screen 都根据它自动切界面，永远不会不同步：
   lobby → 填表 / 故事墙
   stage → "XXX 正在讲" / 两张故事卡
   voting → A|B 投票按钮 / 倒计时 + 已投人数
   reveal → 猜对猜错 / 盖章揭晓
   board  → 我的名次 / 排行榜
4. 投票用 upsert 写 votes，冲突键 (target_id, voter_id)，这样改票是覆盖而不是报错。
5. 【非常重要】phase 变成 reveal 之前，任何页面都不许显示投票分布，
   大屏只能显示「已投 N / M」这个数字。揭晓后才显示 A/B 各多少票。

主持人控制条（做在 /screen 页面里，不要单独开后台）：
- 只有当 URL 参数 ?k= 等于 rooms.host_key 时才渲染这条控制条，否则大屏是纯只读的
- 平时完全隐藏；监听 mousemove 时滑出（右下角，从下往上滑入），3.5 秒无操作自动收回
- 主按钮只有一个，文案随当前 phase 自动变，点一下执行对应动作：
    phase=lobby  → 还有人没讲：按钮「🎲 随机点名」→ 在 turn_done=false 的人里随机挑一个
                   所有人都讲完：按钮「🏆 最终榜单」→ phase='board'
    phase=stage  → 按钮「🗳 开启投票 20s」→ phase='voting'，voting_ends_at = now() + 20 秒
    phase=voting → 按钮「✨ 揭晓答案」→ 依次 rpc('reveal_truth') → rpc('settle_round') → phase='reveal'
    phase=reveal → 还有人没讲：按钮「← 回故事墙选人」→ phase='lobby'，current_player_id=null
                   都讲完了：按钮「🏆 最终榜单」→ phase='board'
    phase=board  → 按钮禁用，显示「✔ 游戏结束」
  按钮旁边用小字显示当前阶段和一句状态（例如「故事墙 · 还剩 7 人 · 或直接点一张贴纸」）
- 【点名的第二种方式】phase=lobby 且是主持人时，故事墙上 turn_done=false 的贴纸可以直接点击，
  点谁谁上台（设 current_player_id，phase='stage'）。鼠标悬停时贴纸加青色描边和光晕。
- 键盘快捷键：空格 / → = 下一步（在 lobby 就是随机点名），← = 退回上一步
  输入框获得焦点时不响应快捷键
- 控制条里另外四个小按钮：上一步 / 直接看榜单 / 🔊 音效开关 / 重置
- 控制条隐藏时，右下角留一行极淡的小字「按 空格 进入下一步」

倒计时的做法：不要各端各起一个计时器，全部读 voting_ends_at 这个时间戳自己算剩余秒数，
这样 10 台手机和大屏的倒计时是一致的，不会各飘各的。

榜单的两个特别奖（读 players 表算，不用新表）：
- 😈 最佳骗子 = turn_done=true 的人里 fooled_pct 最高的
- 🕵️ 最佳侦探 = correct_count 最高的


第 3 轮 · 加动效

现在给大屏加动效，用 framer-motion。参考我上传的截图。

故事墙（大厅）：
- 新贴纸进场：从下方 80px 处、缩放 0.62、旋转角度放大 5 倍的状态，
  弹性回弹到它自己的静止角度，缓动 cubic-bezier(.16,1.15,.3,1)，0.75s
- 多张同时进场时 stagger 85ms 依次飞上墙
- 进场结束后每张贴纸进入 7 秒周期的极缓慢「呼吸」：上浮 7px、旋转角度收敛到 45%，无限循环
  （注意：呼吸动画的关键帧里必须带上这张贴纸自己的旋转角，否则会被摆正）
- 刚提交的那张额外有一圈青色描边向外扩散消失，1.3s
- 房间码用紫→青渐变文字，渐变位置循环流动
- 空场时的大二维码，每 3 秒扩散一圈紫色光晕

随机点名的跑马灯（这段是重点，做出转盘减速的手感）：
- 开始时给故事墙加一个 spinning 状态：所有贴纸压到 28% 透明度 + 灰度 0.6
- 用 setTimeout 递归，每次高亮一张（青色 4px 描边 + 80px 外发光 + 亮度 1.35），
  同时播一声短促的电子音；初始间隔 55ms，每跳一次乘以 1.14 逐渐变慢，
  间隔超过 300ms 就停下，落在预先随机好的那个人身上
- 停下时那张换成金色描边 + 120px 金色外发光，头顶弹出一个金色小旗「🎯 就你了！」，
  播一声"叮"，停留 0.9 秒再切到上台页
- 【重要】这些高亮全部用 box-shadow / filter / opacity 实现，不要用 transform，
  否则会跟贴纸的呼吸动画抢同一个属性，动画会打架

上台：玩家头像上下浮动（3.4s 循环）；A 卡从左带 24deg 的 Y 轴旋转滑入，B 卡从右滑入，延迟 120ms

投票：底部胶囊状态栏 —— 左边 conic-gradient 环形倒计时（读 voting_ends_at 算百分比），
中间所有人的头像点，谁投过票谁就从 35% 透明度弹跳变亮，右边「已投 4 / 9」

揭晓（全场高潮，做足）：
- 假的那张：变灰变暗、缩到 0.94、左右抖动 0.5s，盖下红色 FAKE 印章
  （从 2.6 倍缩放砸下来，-9deg 倾斜，弹性缓动）
- 真的那张：边框变绿、外发光、放大到 1.035，盖绿色 TRUE 章
- 全屏 canvas 彩带爆炸（约 150 片，带重力和旋转，2 秒内淡出）
- 两张卡底部各生长一条票数比例条，右上角「5 票 · 56%」
- 底部一行结论：骗过半数显示「😈 XXX 骗过了 56% 的人 —— 骗术大师 +2 分」，
  否则「🕵️ 只有 44% 的人被骗到，5 人识破 +1 分」
- 注意：这行结论文字要留出底部 66px 的安全距离，别被主持人控制条压住

榜单：每行从左滑入 stagger 90ms；分数条从 0 生长 1 秒；第一名整行金色渐变 + 金色进度条；
两个特别奖卡片延迟 0.35s / 0.55s 从下方弹入（缩放 0.8 → 1，弹性缓动）；进场放两次彩带 + 一段上行音阶

手机端也要反馈：点选项缩放到 0.98，选中态青色描边 + 光晕；揭晓时「猜对了」用 emoji 弹跳进场。


第 4 轮 · 音效

音效单独一轮，因为它容易被前面几轮冲掉。

给大屏加音效。【不要加载任何音频文件】，全部用 Web Audio API 现场合成 —— 这样投影电脑断网也有声音。

写一个 useSound Hook，里面几个方法：
- tick(strong)  倒计时滴答：square 波，普通 900Hz / 强调 1500Hz，时长 45ms，音量 0.06 / 0.14
- ding()        选中/提交：triangle 波 1568Hz + 2349Hz 叠一层，时长 160ms
- join()        有人提交上墙：sine 波 880Hz 滑到 1320Hz，时长 160ms，音量 0.07
- boom()        揭晓的"咚"：sine 160Hz 指数下滑到 46Hz（550ms）+ sine 80→36Hz（700ms）
                再叠一段 300ms 的低通白噪声（截止 700Hz，音量递减），像鼓槌落下
- chime()       真相亮起：523/659/784/1046Hz 四个 sine，每个错开 75ms
- roll()        跑马灯每跳一格：square 波 600~1100Hz 随机，35ms，很轻
- fanfare()     最终榜单：523/659/784/1046/1319Hz 依次，每个错开 110ms

关键实现细节：
1. 每个音的音量包络必须是「8ms 线性起音 → 指数衰减到 0.0001」，
   不能直接开关振荡器，否则会有"啪"的爆音，在音箱上特别难听
2. 浏览器规定必须有用户手势才能出声：在第一次 pointerdown / keydown 时
   创建 AudioContext 并 resume()，用 {once:true}
3. 控制条里放一个 🔊/🔇 开关，静音后所有方法直接 return

什么时候响：
- 有人提交上墙 → join()
- 跑马灯每跳一格 → roll()，停下选中 → ding()
- 投票倒计时：剩余整秒数变化时，≤10 秒每秒 tick(false)，≤3 秒 tick(true)，归零再 tick(true)
- 点「揭晓」→ boom()，260ms 后 chime()
- 进最终榜单 → fanfare()


八、活动当天怎么跑

提前 10 分钟

主持人电脑打开 /screen/HACK26?k=你的host_key，按 F11 全屏，浏览器缩放 100%

接音箱、开音量、点一下页面（浏览器要有一次点击才允许出声）。按空格听一下有没有声

自己用手机扫一次二维码，确认能进、能提交 —— 这一步一定要做

确认键盘能用（空格 = 下一步）

开场

大屏停在故事墙页，二维码在正中间。开口说：

"两个故事，一真一假，每个限 40 字。写钩子就行，别写小作文 —— 细节留着等下上台口头讲，讲得越具体越像真的，也越容易骗到人。"

第一个人提交后二维码缩到角落，故事墙展开。贴纸一张张歪歪扭扭飞上墙，这本身就是最好的暖场 —— 大家会开始读别人的故事、互相起哄，气氛自然就起来了

每一轮（按空格推进）

空格 →「🎲 随机点名」→ 跑马灯扫过还没讲的人，减速停下，金色小旗弹出。 想调节奏就别按空格，直接用鼠标点墙上某张贴纸 —— 比如现场有点冷，就先点那个故事最离谱的人

当事人上台，口头讲这两个故事（全场最有意思的部分，别省）

空格 →「开启投票」→ 20 秒。最后 10 秒滴答声会自己响起来，你不用喊

空格 →「揭晓」→ 一声"咚" + 彩带炸开 → 让当事人展开讲那个真故事的完整版

空格 →「回故事墙」→ 讲过的人灰掉盖 ✓，一眼看出还剩谁。回到第 7 步

收尾

所有贴纸都灰了之后，空格 →「🏆 最终榜单」。 先念最佳骗子和最佳侦探（这两个奖比总分更有梗），再看总榜，给第一名一个小奖

几个容易踩的坑

音效一定要提前试。 浏览器要有一次点击才允许出声，如果开场直接按空格可能第一声是哑的

会场 WiFi 不稳的话，让大家用 4G/5G

二维码在故事墙模式下会缩小到角落，所以开场那 4 分钟别急着往下走，让还没扫的人扫完

有人迟到？故事墙一直开着，随时能加，他的贴纸会飞上墙，之后照样能被点到

别把 ?k= 那串东西念出来或投到屏幕上

备用方案：万一网络挂了，主持人直接口头念故事、大家举手投票 —— 游戏本身不依赖技术

九、还能再加的（都不是必须）

加法 为什么值得 成本 故事墙上显示实时票型热力 揭晓后，墙上那张贴纸留下"被骗了 67%"的小标记，最后一屏看下来很有故事感 小 上一轮回放 榜单前放一个 15 秒快闪，把每轮的 TRUE/FAKE 卡快速刷一遍 中 第二局"反向局" 第二轮改成"猜哪个是假的"，同一批人玩两次不腻 小

明确不做的两个（你已经砍掉了，记在这里免得下次又被提）：

~~"改主意"按钮~~ —— 会让投票节奏拖沓，20 秒的紧张感是这个游戏的核心

~~匿名模式~~ —— 破冰游戏的目的就是让大家记住名字，藏起来是反着来的

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
