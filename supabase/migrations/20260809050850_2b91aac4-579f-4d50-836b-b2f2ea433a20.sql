CREATE TABLE public.game_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_code text NOT NULL,
  title text,
  played_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_records TO authenticated;
GRANT ALL ON public.game_records TO service_role;

ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own records select" ON public.game_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own records insert" ON public.game_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own records update" ON public.game_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own records delete" ON public.game_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX game_records_user_played_idx ON public.game_records (user_id, played_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_game_records_updated_at
BEFORE UPDATE ON public.game_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();