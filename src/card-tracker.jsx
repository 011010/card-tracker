import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Settings, Plus, CreditCard, Check, Pencil, Trash2,
  AlertCircle, AlertTriangle, Clock, CheckCircle2, Loader2,
  Lightbulb, LogOut,
} from "lucide-react";
import { useCards } from "./hooks/useCards";

const BANKS = [
  { id: "bbva",       name: "BBVA",       color: "#004481", accent: "#1464A0" },
  { id: "banamex",    name: "Banamex",    color: "#CC0000", accent: "#E53333" },
  { id: "santander",  name: "Santander",  color: "#EC0000", accent: "#FF3333" },
  { id: "hsbc",       name: "HSBC",       color: "#DB0011", accent: "#FF1A1A" },
  { id: "banorte",    name: "Banorte",    color: "#E31837", accent: "#FF2244" },
  { id: "scotiabank", name: "Scotiabank", color: "#EC111A", accent: "#C8102E" },
  { id: "inbursa",    name: "Inbursa",    color: "#005A9C", accent: "#0070BD" },
  { id: "otro",       name: "Otro",       color: "#374151", accent: "#6B7280" },
];

const URGENCY = {
  expired:  { label: "Vencida",      color: "#EF4444", bg: "#FEF2F2", ring: "#FCA5A5" },
  today:    { label: "Hoy",          color: "#DC2626", bg: "#FEF2F2", ring: "#F87171" },
  tomorrow: { label: "Mañana",       color: "#EA580C", bg: "#FFF7ED", ring: "#FB923C" },
  soon:     { label: "Pronto",       color: "#D97706", bg: "#FFFBEB", ring: "#FCD34D" },
  upcoming: { label: "Próxima",      color: "#059669", bg: "#F0FDF4", ring: "#6EE7B7" },
  ok:       { label: "Al corriente", color: "#0EA5E9", bg: "#F0F9FF", ring: "#7DD3FC" },
};

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getUrgencyKey(d) {
  if (d < 0)  return "expired";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 5)  return "soon";
  if (d <= 15) return "upcoming";
  return "ok";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
}

const emptyForm = {
  alias: "", bank: "bbva", last4: "", cutDate: "", payDate: "",
  limit: "", balance: "", minPay: "",
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#374151",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
};
const inputStyle = {
  width: "100%", padding: "13px 14px", borderRadius: 12,
  border: "1.5px solid #E5E7EB", background: "#fff",
  fontSize: 14, color: "#111827", outline: "none",
  fontFamily: "'Sora', sans-serif", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function getBank(id) {
  return BANKS.find((b) => b.id === id) || BANKS[BANKS.length - 1];
}

function AlertIcon({ days }) {
  if (days < 0)  return <AlertCircle  size={22} />;
  if (days <= 1) return <AlertTriangle size={22} />;
  if (days <= 5) return <Clock         size={22} />;
  return               <CheckCircle2  size={22} />;
}

// ── CARD CHIP ────────────────────────────────────────────────────────
function CardChip({ card, onSelect }) {
  const b        = getBank(card.bank);
  const payDays  = getDaysUntil(card.payDate);
  const cutDays  = getDaysUntil(card.cutDate);
  const urgency  = URGENCY[getUrgencyKey(payDays)];
  const usagePct = card.limit
    ? Math.min(100, (parseFloat(card.balance) / parseFloat(card.limit)) * 100)
    : 0;

  return (
    <div
      onClick={() => onSelect(card)}
      className="pp-card"
      style={{
        background: "#fff", borderRadius: 20, padding: "20px",
        cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        border: `1.5px solid ${urgency.ring}`,
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: b.color, borderRadius: "20px 0 0 20px" }} />
      <div style={{ marginLeft: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: "#111827" }}>{card.alias}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>
              {getBank(card.bank).name} •••• {card.last4 || "****"}
            </div>
          </div>
          <span style={{
            background: urgency.bg, color: urgency.color,
            fontSize: 11, fontWeight: 700, padding: "4px 10px",
            borderRadius: 20, letterSpacing: "0.03em", whiteSpace: "nowrap",
          }}>
            {payDays < 0 ? `${Math.abs(payDays)}d vencida` : payDays === 0 ? "Hoy" : `${payDays}d para pagar`}
          </span>
        </div>

        <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Corte</div>
            <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginTop: 2 }}>
              {formatDate(card.cutDate)}
              {cutDays >= 0 && <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 11 }}> ({cutDays}d)</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pago límite</div>
            <div style={{ fontSize: 13, color: urgency.color, fontWeight: 700, marginTop: 2 }}>{formatDate(card.payDate)}</div>
          </div>
        </div>

        {card.limit && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Uso del crédito</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: usagePct > 80 ? "#EF4444" : usagePct > 60 ? "#F59E0B" : "#10B981" }}>
                {usagePct.toFixed(0)}%
              </span>
            </div>
            <div style={{ background: "#F3F4F6", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${usagePct}%`, height: "100%",
                background: usagePct > 80 ? "#EF4444" : usagePct > 60 ? "#F59E0B" : b.color,
                borderRadius: 99, transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{formatCurrency(card.balance)}</span>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>de {formatCurrency(card.limit)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DETAIL VIEW ──────────────────────────────────────────────────────
function DetailView({ card, onMarkPaid, onEdit, onDeleteRequest }) {
  const b        = getBank(card.bank);
  const payDays  = getDaysUntil(card.payDate);
  const cutDays  = getDaysUntil(card.cutDate);
  const urgency  = URGENCY[getUrgencyKey(payDays)];
  const usagePct = card.limit
    ? Math.min(100, (parseFloat(card.balance) / parseFloat(card.limit)) * 100)
    : 0;

  return (
    <div className="pp-panel">
      <div style={{
        background: `linear-gradient(135deg, ${b.color}, ${b.accent})`,
        borderRadius: 20, padding: "28px 24px", color: "#fff",
        marginBottom: 20, position: "relative", overflow: "hidden",
        boxShadow: `0 8px 32px ${b.color}55`,
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{b.name}</div>
        <div style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: "0.15em", marginBottom: 16 }}>
          •••• •••• •••• {card.last4 || "••••"}
        </div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 22 }}>{card.alias}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Límite: {formatCurrency(card.limit)}</div>
      </div>

      <div style={{
        background: urgency.bg, border: `1px solid ${urgency.ring}`,
        borderRadius: 14, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
      }}>
        <span style={{ color: urgency.color, flexShrink: 0 }}>
          <AlertIcon days={payDays} />
        </span>
        <div>
          <div style={{ fontWeight: 700, color: urgency.color, fontSize: 14 }}>
            {payDays < 0 ? `Pago vencido hace ${Math.abs(payDays)} día(s)` :
             payDays === 0 ? "El pago vence hoy" :
             payDays === 1 ? "El pago vence mañana" :
             `${payDays} días para el pago límite`}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            Fecha límite: {formatDate(card.payDate)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Fecha de corte",     value: formatDate(card.cutDate),   sub: cutDays >= 0 ? `en ${cutDays} días` : `hace ${Math.abs(cutDays)} días` },
          { label: "Pago mínimo",        value: formatCurrency(card.minPay), sub: "este período" },
          { label: "Saldo actual",       value: formatCurrency(card.balance), sub: `${usagePct.toFixed(0)}% del límite` },
          { label: "Crédito disponible", value: formatCurrency((parseFloat(card.limit) || 0) - (parseFloat(card.balance) || 0)), sub: "disponible" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "#F9FAFB", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: "#111827" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {card.limit && (
        <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Uso del crédito</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: usagePct > 80 ? "#EF4444" : "#10B981" }}>{usagePct.toFixed(1)}%</span>
          </div>
          <div style={{ background: "#E5E7EB", borderRadius: 99, height: 10, overflow: "hidden" }}>
            <div style={{ width: `${usagePct}%`, height: "100%", background: usagePct > 80 ? "#EF4444" : usagePct > 60 ? "#F59E0B" : b.color, borderRadius: 99 }} />
          </div>
        </div>
      )}

      <button
        onClick={() => onMarkPaid(card.id)}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${b.color}, ${b.accent})`,
          color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
          marginBottom: 10, fontFamily: "'Sora', sans-serif",
          boxShadow: `0 4px 14px ${b.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Check size={18} /> Marcar como Pagado
      </button>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onEdit(card)}
          style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Pencil size={14} /> Editar
        </button>
        <button
          onClick={() => onDeleteRequest(card.id)}
          style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #FEE2E2", background: "#FFF5F5", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Trash2 size={14} /> Eliminar
        </button>
      </div>
    </div>
  );
}

// ── FORM VIEW ────────────────────────────────────────────────────────
function FormView({ form, setForm, editId, onSave }) {
  const b = getBank(form.bank);

  return (
    <div className="pp-panel">
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
        {editId ? "Edita los datos de tu tarjeta." : "Ingresa los datos de tu tarjeta de crédito."}
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Banco</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {BANKS.map((bank) => (
            <button
              key={bank.id}
              onClick={() => setForm((f) => ({ ...f, bank: bank.id }))}
              style={{
                padding: "10px 4px", borderRadius: 12,
                border: `2px solid ${form.bank === bank.id ? bank.color : "#E5E7EB"}`,
                background: form.bank === bank.id ? bank.color + "15" : "#fff",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                color: form.bank === bank.id ? bank.color : "#6B7280",
                transition: "all 0.15s",
              }}
            >{bank.name}</button>
          ))}
        </div>
      </div>

      {[
        { key: "alias",   label: "Nombre / Alias",         placeholder: "ej. BBVA Platino", type: "text",   maxLength: 100 },
        { key: "last4",   label: "Últimos 4 dígitos",       placeholder: "1234",             type: "text",   maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" },
        { key: "cutDate", label: "Fecha de corte *",         placeholder: "",                 type: "date" },
        { key: "payDate", label: "Fecha límite de pago *",   placeholder: "",                 type: "date" },
        { key: "limit",   label: "Límite de crédito (MXN)",  placeholder: "25000",            type: "number", step: "0.01", min: "0.01" },
        { key: "balance", label: "Saldo actual (MXN)",        placeholder: "0",               type: "number", step: "0.01", min: "0" },
        { key: "minPay",  label: "Pago mínimo (MXN)",         placeholder: "0",               type: "number", step: "0.01", min: "0" },
      ].map(({ key, label, placeholder, type, maxLength, step, min, pattern, inputMode }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{label}</label>
          <input
            type={type}
            maxLength={maxLength}
            step={step}
            min={min}
            pattern={pattern}
            inputMode={inputMode}
            placeholder={placeholder}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            style={inputStyle}
          />
        </div>
      ))}

      <button
        onClick={onSave}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${b.color}, ${b.accent})`,
          color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
          marginTop: 8, fontFamily: "'Sora', sans-serif",
          boxShadow: `0 4px 14px ${b.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Check size={18} />
        {editId ? "Guardar cambios" : "Agregar tarjeta"}
      </button>
    </div>
  );
}

// ── SETTINGS VIEW ────────────────────────────────────────────────────
function SettingsView({ notifEnabled, setNotifEnabled, notifDays, setNotifDays, onSignOut }) {
  return (
    <div className="pp-panel">
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
        Configura cómo y cuándo recibir alertas de vencimiento.
      </p>

      <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Notificaciones activas</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Recibir alertas de pagos próximos</div>
          </div>
          <div
            onClick={() => setNotifEnabled((e) => !e)}
            style={{
              width: 48, height: 28, borderRadius: 99, cursor: "pointer",
              background: notifEnabled ? "#10B981" : "#D1D5DB",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: notifEnabled ? 23 : 3, transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
        </div>
      </div>

      {notifEnabled && (
        <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>
            Alertar con anticipación de:
          </div>
          {[1, 3, 5, 7, 10].map((day) => (
            <label key={day} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={notifDays.includes(day)}
                onChange={() => setNotifDays((prev) =>
                  prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
                )}
                style={{ width: 18, height: 18, accentColor: "#10B981" }}
              />
              <span style={{ fontSize: 14, color: "#374151" }}>
                {day === 1 ? "1 día antes" : `${day} días antes`}
              </span>
            </label>
          ))}
        </div>
      )}

      <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>Cuenta</div>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", padding: "12px", borderRadius: 12,
            border: "1.5px solid #FEE2E2", background: "#FFF5F5",
            fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#EF4444",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#065F46", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Lightbulb size={14} /> Próximas funciones
        </div>
        <ul style={{ fontSize: 12, color: "#047857", margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
          <li>Notificaciones push nativas (iOS/Android)</li>
          <li>Sincronización automática con banco</li>
          <li>Recordatorios por WhatsApp / SMS</li>
          <li>Historial de pagos</li>
          <li>Exportar a PDF / Excel</li>
        </ul>
      </div>
    </div>
  );
}

export default function CardTracker({ userId, onSignOut }) {
  const { cards, loading, createCard, updateCard, deleteCard, markPaid } = useCards(userId);

  const [view, setView]                   = useState("home");
  const [form, setForm]                   = useState(emptyForm);
  const [editId, setEditId]               = useState(null);
  const [selectedCard, setSelectedCard]   = useState(null);
  const [notifEnabled, setNotifEnabled]   = useState(true);
  const [notifDays, setNotifDays]         = useState([1, 3, 7]);
  const [toast, setToast]                 = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterUrgency, setFilterUrgency] = useState("all");

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!notifEnabled || cards.length === 0) return;
    const urgent = cards.filter((c) => { const d = getDaysUntil(c.payDate); return d >= 0 && d <= 3; });
    if (urgent.length > 0)
      setTimeout(() => showToast(`${urgent.length} tarjeta(s) con pago próximo`, "warning"), 800);
  }, [cards.length, notifEnabled, showToast]);

  const sortedCards   = [...cards].sort((a, b) => getDaysUntil(a.payDate) - getDaysUntil(b.payDate));
  const filteredCards = filterUrgency === "all"
    ? sortedCards
    : sortedCards.filter((c) => getUrgencyKey(getDaysUntil(c.payDate)) === filterUrgency);

  const alertCards   = cards.filter((c) => { const d = getDaysUntil(c.payDate); return d >= 0 && d <= 5; });
  const totalBalance = cards.reduce((s, c) => s + (parseFloat(c.balance) || 0), 0);
  const totalLimit   = cards.reduce((s, c) => s + (parseFloat(c.limit)   || 0), 0);

  function goHome() {
    setView("home"); setEditId(null); setForm(emptyForm); setSelectedCard(null);
  }

  const VALID_BANKS = new Set(BANKS.map((b) => b.id));
  const DATE_RE     = /^\d{4}-\d{2}-\d{2}$/;

  async function handleSave() {
    if (!form.alias.trim() || !form.cutDate || !form.payDate) {
      showToast("Alias, fecha de corte y fecha de pago son requeridos", "error");
      return;
    }
    if (form.alias.trim().length > 100) {
      showToast("El alias no puede superar los 100 caracteres", "error");
      return;
    }
    if (!VALID_BANKS.has(form.bank)) {
      showToast("Banco no válido", "error");
      return;
    }
    if (form.last4 && !/^\d{4}$/.test(form.last4)) {
      showToast("Los últimos 4 dígitos deben ser exactamente 4 números", "error");
      return;
    }
    if (!DATE_RE.test(form.cutDate) || !DATE_RE.test(form.payDate)) {
      showToast("Formato de fecha inválido", "error");
      return;
    }
    if (form.limit !== "" && (isNaN(parseFloat(form.limit)) || parseFloat(form.limit) <= 0)) {
      showToast("El límite de crédito debe ser mayor a 0", "error");
      return;
    }
    if (form.balance !== "" && (isNaN(parseFloat(form.balance)) || parseFloat(form.balance) < 0)) {
      showToast("El saldo no puede ser negativo", "error");
      return;
    }
    if (form.minPay !== "" && (isNaN(parseFloat(form.minPay)) || parseFloat(form.minPay) < 0)) {
      showToast("El pago mínimo no puede ser negativo", "error");
      return;
    }
    if (editId) {
      const { error } = await updateCard(editId, form);
      if (error) { showToast("Error al actualizar: " + error, "error"); return; }
      showToast("Tarjeta actualizada");
    } else {
      const { error } = await createCard(form);
      if (error) { showToast("Error al agregar: " + error, "error"); return; }
      showToast("Tarjeta agregada");
    }
    setForm(emptyForm); setEditId(null); setView("home");
  }

  function handleEdit(card) { setForm({ ...card }); setEditId(card.id); setView("add"); }

  async function handleDelete(id) {
    const { error } = await deleteCard(id);
    if (error) { showToast("Error al eliminar", "error"); return; }
    setDeleteConfirm(null); setView("home"); showToast("Tarjeta eliminada");
  }

  async function handleMarkPaid(id) {
    const { error } = await markPaid(id);
    if (error) { showToast("Error al registrar pago", "error"); return; }
    showToast("Pago registrado"); setView("home");
  }

  function handleCardSelect(card) {
    setSelectedCard(card);
    setView("detail");
  }

  // ── RENDER ───────────────────────────────────────────────────────────
  const viewTitle = {
    home:     "PayPinga",
    add:      editId ? "Editar tarjeta" : "Nueva tarjeta",
    detail:   selectedCard?.alias,
    settings: "Configuración",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-root {
          min-height: 100vh;
          background: #F3F4F6;
          font-family: 'Sora', sans-serif;
        }

        /* Mobile status bar sim + safe area for notch/Dynamic Island */
        .pp-statusbar { height: env(safe-area-inset-top, 12px); background: #111827; }

        .pp-header {
          background: #111827;
          padding: 16px 20px 20px;
          color: #fff;
        }
        .pp-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pp-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pp-summary {
          margin-top: 16px;
          background: rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px;
        }

        .pp-content {
          padding: 16px;
        }

        /* Cards: single column mobile */
        .pp-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Detail / Form / Settings panel */
        .pp-panel {
          padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
        }

        /* Filters row */
        .pp-filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 4px;
        }
        .pp-filters::-webkit-scrollbar { display: none; }

        /* Card hover — pointer devices only to avoid stuck state on touch */
        @media (hover: hover) {
          .pp-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.12) !important;
          }
        }
        .pp-card:active { opacity: 0.9; }

        /* Icon buttons */
        .pp-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .pp-icon-btn:hover { opacity: 0.8; }

        /* --- Desktop overrides --- */
        @media (min-width: 768px) {
          .pp-statusbar { display: none; }

          .pp-header {
            padding: 20px 40px 24px;
          }

          .pp-header-title {
            font-size: 24px !important;
          }

          .pp-summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 32px;
          }

          .pp-summary-amount {
            font-size: 32px !important;
          }

          .pp-content {
            padding: 24px 40px;
            max-width: 1280px;
            margin: 0 auto;
          }

          /* 2-column card grid on desktop */
          .pp-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          /* Card: reset bottom margin on desktop (gap handles it) */
          .pp-card { margin-bottom: 0 !important; }

          /* Detail/form centered panel on desktop */
          .pp-panel {
            max-width: 680px;
            margin: 0 auto;
            padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
          }
        }

        @media (min-width: 1200px) {
          .pp-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .pp-spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="pp-root">
        <div className="pp-statusbar" />

        {/* Header */}
        <div className="pp-header">
          <div className="pp-header-inner">
            <div className="pp-header-left">
              {view !== "home" && (
                <button
                  onClick={goHome}
                  className="pp-icon-btn"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#fff", width: 36, height: 36, borderRadius: "50%" }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <span className="pp-header-title" style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
                {viewTitle[view]}
              </span>
            </div>

            {view === "home" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setView("settings")}
                  className="pp-icon-btn"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#fff", width: 36, height: 36, borderRadius: "50%" }}
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => { setForm(emptyForm); setEditId(null); setView("add"); }}
                  className="pp-icon-btn"
                  style={{ background: "#3B82F6", color: "#fff", width: 36, height: 36, borderRadius: "50%" }}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>

          {view === "home" && (
            <div className="pp-summary">
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Deuda total · {cards.length} tarjeta{cards.length !== 1 ? "s" : ""}
                </div>
                <div className="pp-summary-amount" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
                  {formatCurrency(totalBalance)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 0 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  de {formatCurrency(totalLimit)} en límites
                </span>
                {alertCards.length > 0 && (
                  <span style={{ background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>
                    {alertCards.length} pago{alertCards.length > 1 ? "s" : ""} urgente{alertCards.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pp-content">
          {view === "home" && (
            <>
              <div className="pp-filters">
                {[["all","Todas"],["expired","Vencidas"],["today","Hoy"],["tomorrow","Mañana"],["soon","Pronto"],["ok","Al corriente"]].map(([key, lbl]) => (
                  <button
                    key={key}
                    onClick={() => setFilterUrgency(key)}
                    style={{
                      whiteSpace: "nowrap", padding: "7px 16px", borderRadius: 99,
                      border: "none",
                      background: filterUrgency === key ? "#111827" : "#fff",
                      color: filterUrgency === key ? "#fff" : "#6B7280",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      boxShadow: filterUrgency === key ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
                      transition: "all 0.15s",
                    }}
                  >{lbl}</button>
                ))}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF" }}>
                  <div className="pp-spin" style={{ display: "inline-flex", marginBottom: 12, color: "#D1D5DB" }}>
                    <Loader2 size={32} />
                  </div>
                  <div style={{ fontSize: 14, color: "#6B7280" }}>Cargando tarjetas...</div>
                </div>
              ) : filteredCards.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ display: "inline-flex", marginBottom: 16, color: "#D1D5DB" }}>
                    <CreditCard size={52} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                    {cards.length === 0 ? "Sin tarjetas registradas" : "Sin resultados en este filtro"}
                  </div>
                  {cards.length === 0 && (
                    <button
                      onClick={() => setView("add")}
                      style={{
                        marginTop: 16, padding: "12px 24px", borderRadius: 12,
                        border: "none", background: "#111827", color: "#fff",
                        fontWeight: 700, cursor: "pointer", fontSize: 14,
                        display: "inline-flex", alignItems: "center", gap: 8,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      <Plus size={16} /> Agregar tarjeta
                    </button>
                  )}
                </div>
              ) : (
                <div className="pp-grid">
                  {filteredCards.map((card) => (
                    <CardChip key={card.id} card={card} onSelect={handleCardSelect} />
                  ))}
                </div>
              )}
            </>
          )}

          {view === "add" && (
            <FormView
              form={form}
              setForm={setForm}
              editId={editId}
              onSave={handleSave}
            />
          )}
          {view === "detail" && selectedCard && (
            <DetailView
              card={selectedCard}
              onMarkPaid={handleMarkPaid}
              onEdit={handleEdit}
              onDeleteRequest={setDeleteConfirm}
            />
          )}
          {view === "settings" && (
            <SettingsView
              notifEnabled={notifEnabled}
              setNotifEnabled={setNotifEnabled}
              notifDays={notifDays}
              setNotifDays={setNotifDays}
              onSignOut={onSignOut}
            />
          )}
        </div>

        {/* Delete modal */}
        {deleteConfirm && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 100, padding: 16,
          }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480 }}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>¿Eliminar tarjeta?</div>
              <div style={{ color: "#6B7280", fontSize: 14, marginBottom: 20 }}>Esta acción no se puede deshacer.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'Sora', sans-serif" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "#EF4444", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'Sora', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={15} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
            background: toast.type === "error" ? "#EF4444" : toast.type === "warning" ? "#F59E0B" : "#111827",
            color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 200,
            animation: "fadeUp 0.25s ease",
            maxWidth: "calc(100vw - 32px)", whiteSpace: "normal", textAlign: "center",
          }}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
