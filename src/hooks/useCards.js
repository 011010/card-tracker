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

// ── Cálculos de compras a meses (MSI) ────────────────────────────────
// Cada compra aporta una mensualidad fija (monto / meses) al pago de cada
// corte, hasta que se liquidan todas sus mensualidades.
export function purchaseMonthly(p) {
  const amount = Number(p.amount) || 0;
  const months = Number(p.months) || 1;
  return amount / months;
}
export function purchaseRemainingMonths(p) {
  return Math.max(0, (Number(p.months) || 0) - (Number(p.monthsPaid) || 0));
}
export function purchaseRemaining(p) {
  return purchaseMonthly(p) * purchaseRemainingMonths(p);
}

// ── Supabase row ↔ card / purchase shape ─────────────────────────────
function dbToPurchase(row) {
  return {
    id: row.id,
    description: row.description || "",
    amount: Number(row.amount),
    months: Number(row.months),
    monthsPaid: Number(row.months_paid) || 0,
  };
}

function purchaseToDb(p, cardId, userId) {
  return {
    card_id: cardId,
    user_id: userId,
    description: p.description?.trim() ? p.description.trim() : null,
    amount: parseFloat(p.amount),
    months: parseInt(p.months, 10),
    months_paid: Number(p.monthsPaid) || 0,
    updated_at: new Date().toISOString(),
  };
}

function dbToCard(row, purchases = []) {
  return deriveCard({
    id: row.id,
    alias: row.alias,
    bank: row.bank,
    last4: row.last4 || "",
    cutDate: row.cut_date,
    payDate: row.pay_date,
    limit: row.limit_amount?.toString() || "",
    minPay: row.min_pay?.toString() || "",
    purchases: purchases.map(dbToPurchase),
  });
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
    min_pay: card.minPay ? parseFloat(card.minPay) : null,
    updated_at: new Date().toISOString(),
  };
}

// Normaliza una compra recién capturada (modo local).
function normalizePurchase(p) {
  return {
    id: crypto.randomUUID(),
    description: p.description?.trim() || "",
    amount: parseFloat(p.amount),
    months: parseInt(p.months, 10),
    monthsPaid: Number(p.monthsPaid) || 0,
  };
}

// El saldo y el pago estimado se DERIVAN de las compras registradas: ya no se
// captura un saldo manual; sumamos las mensualidades activas para anticipar lo
// que cobrará el banco en el próximo corte.
function deriveCard(card) {
  const purchases = (card.purchases || []).map((p) => ({
    id: p.id,
    description: p.description || "",
    amount: Number(p.amount),
    months: Number(p.months),
    monthsPaid: Number(p.monthsPaid) || 0,
  }));
  const active = purchases.filter((p) => purchaseRemainingMonths(p) > 0);
  const estimatedPayment = active.reduce((s, p) => s + purchaseMonthly(p), 0);
  const balance = active.reduce((s, p) => s + purchaseRemaining(p), 0);
  return { ...card, purchases, estimatedPayment, balance };
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
      setCards(sortByPayDate(lsLoad()).map(deriveCard));
      setLoading(false);
      return;
    }

    const [cardsRes, purchasesRes] = await Promise.all([
      supabase.from("cards").select("*").order("pay_date", { ascending: true }),
      supabase.from("purchases").select("*").order("created_at", { ascending: true }),
    ]);

    if (cardsRes.error || purchasesRes.error) {
      setError("No se pudieron cargar las tarjetas.");
    } else {
      const byCard = {};
      for (const row of purchasesRes.data) {
        (byCard[row.card_id] ||= []).push(row);
      }
      setCards(cardsRes.data.map((row) => dbToCard(row, byCard[row.id] || [])));
      setError(null);
    }
    setLoading(false);
  }, [userId, isLocal]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // ── LOCAL helpers ────────────────────────────────────────────────────
  // Guarda el arreglo crudo en localStorage y publica los derivados al estado.
  function lsCommit(rawCards) {
    const sorted = sortByPayDate(rawCards);
    lsSave(sorted);
    setCards(sorted.map(deriveCard));
    return { error: null };
  }
  function lsMutatePurchases(cardId, fn) {
    return lsCommit(
      lsLoad().map((c) =>
        c.id === cardId ? { ...c, purchases: fn(c.purchases || []) } : c
      )
    );
  }

  // ── CARD CRUD ─────────────────────────────────────────────────────────
  async function createCard(card) {
    if (isLocal) {
      return lsCommit([...lsLoad(), { ...card, id: crypto.randomUUID(), purchases: [] }]);
    }
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
    if (isLocal) {
      return lsCommit(
        lsLoad().map((c) => (c.id === id ? { ...c, ...card, id, purchases: c.purchases || [] } : c))
      );
    }
    const { data, error } = await supabase
      .from("cards")
      .update(cardToDb(card, userId))
      .eq("id", id)
      .select()
      .single();
    if (error) return { error: "No se pudo actualizar la tarjeta." };
    setCards((prev) =>
      prev.map((c) => (c.id === id ? deriveCard({ ...dbToCard(data), purchases: c.purchases }) : c))
    );
    return { error: null };
  }

  async function deleteCard(id) {
    if (isLocal) return lsCommit(lsLoad().filter((c) => c.id !== id));
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) return { error: "No se pudo eliminar la tarjeta." };
    setCards((prev) => prev.filter((c) => c.id !== id));
    return { error: null };
  }

  // ── PURCHASE CRUD ─────────────────────────────────────────────────────
  async function addPurchase(cardId, purchase) {
    if (isLocal) {
      return lsMutatePurchases(cardId, (list) => [...list, normalizePurchase(purchase)]);
    }
    const { data, error } = await supabase
      .from("purchases")
      .insert(purchaseToDb(purchase, cardId, userId))
      .select()
      .single();
    if (error) return { error: "No se pudo agregar la compra." };
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? deriveCard({ ...c, purchases: [...c.purchases, dbToPurchase(data)] }) : c
      )
    );
    return { error: null };
  }

  // Edita concepto/monto/meses de una compra. No toca months_paid (las
  // mensualidades ya cubiertas se conservan); el llamador valida months >= pagadas.
  async function updatePurchase(cardId, purchaseId, patch) {
    if (isLocal) {
      return lsMutatePurchases(cardId, (list) =>
        list.map((p) =>
          p.id === purchaseId
            ? {
                ...p,
                description: patch.description?.trim() || "",
                amount: parseFloat(patch.amount),
                months: parseInt(patch.months, 10),
              }
            : p
        )
      );
    }
    const { data, error } = await supabase
      .from("purchases")
      .update({
        description: patch.description?.trim() ? patch.description.trim() : null,
        amount: parseFloat(patch.amount),
        months: parseInt(patch.months, 10),
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseId)
      .select()
      .single();
    if (error) return { error: "No se pudo actualizar la compra." };
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? deriveCard({ ...c, purchases: c.purchases.map((p) => (p.id === purchaseId ? dbToPurchase(data) : p)) })
          : c
      )
    );
    return { error: null };
  }

  async function deletePurchase(cardId, purchaseId) {
    if (isLocal) {
      return lsMutatePurchases(cardId, (list) => list.filter((p) => p.id !== purchaseId));
    }
    const { error } = await supabase.from("purchases").delete().eq("id", purchaseId);
    if (error) return { error: "No se pudo eliminar la compra." };
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? deriveCard({ ...c, purchases: c.purchases.filter((p) => p.id !== purchaseId) }) : c
      )
    );
    return { error: null };
  }

  // ── REGISTRAR PAGO DE CORTE ───────────────────────────────────────────
  // Avanza una mensualidad en cada compra activa; las que quedan liquidadas
  // (months_paid === months) se eliminan para que "desaparezcan solas".
  async function markPaid(cardId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return { error: "Tarjeta no encontrada" };
    const active = (card.purchases || []).filter((p) => purchaseRemainingMonths(p) > 0);
    if (active.length === 0) return { error: "No hay compras activas que pagar." };

    if (isLocal) {
      return lsMutatePurchases(cardId, (list) =>
        list
          .map((p) => ({ ...p, monthsPaid: (Number(p.monthsPaid) || 0) + 1 }))
          .filter((p) => purchaseRemainingMonths(p) > 0)
      );
    }

    const advanced = active.map((p) => ({ ...p, monthsPaid: p.monthsPaid + 1 }));
    const remaining = advanced.filter((p) => purchaseRemainingMonths(p) > 0);
    const finished = advanced.filter((p) => purchaseRemainingMonths(p) === 0);

    const ops = remaining.map((p) =>
      supabase
        .from("purchases")
        .update({ months_paid: p.monthsPaid, updated_at: new Date().toISOString() })
        .eq("id", p.id)
    );
    if (finished.length) {
      ops.push(supabase.from("purchases").delete().in("id", finished.map((p) => p.id)));
    }
    const results = await Promise.all(ops);
    if (results.some((r) => r.error)) return { error: "No se pudo registrar el pago." };

    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? deriveCard({ ...c, purchases: remaining }) : c))
    );
    return { error: null };
  }

  return {
    cards, loading, error,
    createCard, updateCard, deleteCard,
    addPurchase, updatePurchase, deletePurchase,
    markPaid, refetch: fetchCards,
  };
}
