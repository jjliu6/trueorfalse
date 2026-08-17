-- 投票倒计时的 bug：voting_ends_at 是大屏设备用自己的 Date.now() 算出来的，
-- 每个手机再各自拿自己的 Date.now() 去跟这个时间戳比——
-- 谁的系统时钟比大屏快，谁的倒计时就会提前归零，投票按钮跟着提前变灰，
-- 而且没有任何报错提示，看起来就是"点了没反应"。
-- 加一个只读的服务器时间函数，客户端用它测一次时钟偏移量，再拿偏移量校正本地时间。
create or replace function public.server_now()
returns timestamptz
language sql stable as $$
  select now();
$$;

grant execute on function public.server_now() to anon, authenticated;
