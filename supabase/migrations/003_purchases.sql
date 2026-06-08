-- Card Tracker – compras a meses (MSI)
-- Cada compra pertenece a una tarjeta y aporta una mensualidad (amount / months)
-- al pago estimado de cada corte. Run after 002_constraints.sql

CREATE TABLE IF NOT EXISTS public.purchases (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id      UUID        REFERENCES public.cards(id)  ON DELETE CASCADE NOT NULL,
  user_id      UUID        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  description  TEXT,
  amount       NUMERIC     NOT NULL,
  months       INTEGER     NOT NULL DEFAULT 1,
  months_paid  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: cada usuario solo ve sus propias compras
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own purchases"
  ON public.purchases
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS purchases_card_id_idx ON public.purchases(card_id);
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON public.purchases(user_id);

-- Constraints de integridad
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_amount_positive
    CHECK (amount > 0),

  ADD CONSTRAINT purchases_months_range
    CHECK (months BETWEEN 1 AND 60),

  ADD CONSTRAINT purchases_months_paid_valid
    CHECK (months_paid >= 0 AND months_paid <= months),

  ADD CONSTRAINT purchases_description_length
    CHECK (description IS NULL OR char_length(description) <= 100);
