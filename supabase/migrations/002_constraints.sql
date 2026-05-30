-- Security constraints: enforce data integrity at the DB layer
-- Run after 001_initial.sql

ALTER TABLE public.cards
  ADD CONSTRAINT cards_alias_length
    CHECK (char_length(alias) BETWEEN 1 AND 100),

  ADD CONSTRAINT cards_bank_valid
    CHECK (bank IN ('bbva','banamex','santander','hsbc','banorte','scotiabank','inbursa','otro')),

  ADD CONSTRAINT cards_last4_format
    CHECK (last4 IS NULL OR last4 ~ '^\d{4}$'),

  ADD CONSTRAINT cards_balance_non_negative
    CHECK (balance >= 0),

  ADD CONSTRAINT cards_limit_positive
    CHECK (limit_amount IS NULL OR limit_amount > 0),

  ADD CONSTRAINT cards_min_pay_non_negative
    CHECK (min_pay IS NULL OR min_pay >= 0),

  ADD CONSTRAINT cards_pay_after_cut
    CHECK (pay_date >= cut_date);
