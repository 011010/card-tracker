import { useState } from "react";

const inputStyle = {
  width: "100%", padding: "13px 14px", borderRadius: 12,
  border: "1.5px solid #E5E7EB", background: "#fff",
  fontSize: 14, color: "#111827", outline: "none",
  fontFamily: "'Sora', sans-serif", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#374151",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
};

export default function AuthView({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const fn = mode === "signin" ? onSignIn : onSignUp;
    const { error } = await fn(email, password);
    if (error) {
      setError(error.message);
    } else if (mode === "signup") {
      setSuccess("Revisa tu correo para confirmar tu cuenta.");
    }
    setLoading(false);
  }

  function switchMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setSuccess(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      `}</style>
      <div style={{
        maxWidth: 390, margin: "0 auto", minHeight: "100vh",
        background: "#F3F4F6", fontFamily: "'Sora', sans-serif",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ height: 12, background: "#111827" }} />
        <div style={{ background: "#111827", padding: "32px 24px 28px" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Card Tracker
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            {mode === "signin" ? "Inicia sesión para continuar" : "Crea tu cuenta gratis"}
          </div>
        </div>

        <div style={{ padding: 24, flex: 1 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="tu@correo.com"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Contraseña</label>
              <input
                type="password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FCA5A5",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                fontSize: 13, color: "#DC2626",
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: "#F0FDF4", border: "1px solid #BBF7D0",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                fontSize: 13, color: "#065F46",
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: 16, borderRadius: 14, border: "none",
                background: loading ? "#9CA3AF" : "#111827",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {loading ? "Cargando..." : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              {mode === "signin" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            </span>
            <button
              onClick={switchMode}
              style={{
                background: "none", border: "none", fontSize: 13,
                fontWeight: 700, color: "#3B82F6", cursor: "pointer",
              }}
            >
              {mode === "signin" ? "Regístrate" : "Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
