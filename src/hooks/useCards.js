import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const LS_KEY = "card-tracker-cards";

// ── localStorage helpers ─────────────────────────────────────────────
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function lsSave(cards) {
  localStorage.setItem(LS_KEY, JSON.stringify(cards));
}

// ── Supabase row ↔ card shape ────────────────────────────────────────
function dbToCard(row) {
  return {
    id: row.id,
    alias: row.alias,
    bank: row.bank,
    last4: row.last4 || "",
    cutDate: row.cut_date,
    payDate: row.pay_date,
    limit: row.limit_amount?.toString() || "",
    balance: row.balance?.toString() || "0",
    minPay: row.min_pay?.toString() || "",
  };
}

function cardToDb(card, userId) {
  return {
    user_id: userId,
    alias: card.alias,
    bank: card.bank,
    last4: card.last4 || null,
    cut_date: card.cutDate,
    pay_date: card.payDate,
    limit_amount: card.limit ? parseFloat(card.limit) : null,
    balance: card.balance ? parseFloat(card.balance) : 0,
    min_pay: card.minPay ? parseFloat(card.minPay) : null,
    updated_at: new Date().toISOString(),
  };
}

function sortByPayDate(cards) {
  return [...cards].sort((a, b) => a.payDate.localeCompare(b.payDate));
}

export function useCards(userId) {
  const isLocal = !supabase || userId === "local";

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCards = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    if (isLocal) {
      setCards(sortByPayDate(lsLoad()));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("pay_date", { ascending: true });

    if (error) {
      setError("No se pudieron cargar las tarjetas.");
    } else {
      setCards(data.map(dbToCard));
      setError(null);
    }
    setLoading(false);
  }, [userId, isLocal]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // ── LOCAL CRUD ───────────────────────────────────────────────────────
  function lsCreate(card) {
    const next = sortByPayDate([...lsLoad(), { ...card, id: crypto.randomUUID() }]);
    lsSave(next);
    setCards(next);
    return { error: null };
  }

  function lsUpdate(id, card) {
    const next = sortByPayDate(lsLoad().map((c) => (c.id === id ? { ...card, id } : c)));
    lsSave(next);
    setCards(next);
    return { error: null };
  }

  function lsDelete(id) {
    const next = lsLoad().filter((c) => c.id !== id);
    lsSave(next);
    setCards(next);
    return { error: null };
  }

  // ── CLOUD CRUD ───────────────────────────────────────────────────────
  async function createCard(card) {
    if (isLocal) return lsCreate(card);
    const { data, error } = await supabase
      .from("cards")
      .insert(cardToDb(card, userId))
      .select()
      .single();
    if (error) return { error: "No se pudo agregar la tarjeta." };
    setCards((prev) => sortByPayDate([...prev, dbToCard(data)]));
    return { error: null };
  }

  async function updateCard(id, card) {
    if (isLocal) return lsUpdate(id, card);
    const { data, error } = await supabase
      .from("cards")
      .update(cardToDb(card, userId))
      .eq("id", id)
      .select()
      .single();
    if (error) return { error: "No se pudo actualizar la tarjeta." };
    setCards((prev) => prev.map((c) => (c.id === id ? dbToCard(data) : c)));
    return { error: null };
  }

  async function deleteCard(id) {
    if (isLocal) return lsDelete(id);
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) return { error: "No se pudo eliminar la tarjeta." };
    setCards((prev) => prev.filter((c) => c.id !== id));
    return { error: null };
  }

  async function markPaid(id) {
    const card = cards.find((c) => c.id === id);
    if (!card) return { error: "Tarjeta no encontrada" };
    // Las fechas de corte/límite avanzan solas cada mes (ver nextMonthlyDate
    // en card-tracker.jsx); marcar como pagado solo reinicia el saldo.
    return updateCard(id, { ...card, balance: "0" });
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, markPaid, refetch: fetchCards };
}
