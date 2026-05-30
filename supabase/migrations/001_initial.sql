-- Card Tracker – initial schema
-- Run this in the Supabase SQL editor or via `supabase db push`

CREATE TABLE IF NOT EXISTS public.cards (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alias         TEXT        NOT NULL,
  bank          TEXT        NOT NULL DEFAULT 'otro',
  last4         TEXT,
  cut_date      DATE        NOT NULL,
  pay_date      DATE        NOT NULL,
  limit_amount  NUMERIC,
  balance       NUMERIC     DEFAULT 0,
  min_pay       NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: each user only sees their own cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cards"
  ON public.cards
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS cards_pay_date_idx ON public.cards(pay_date);
