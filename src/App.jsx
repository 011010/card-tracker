import { useAuth } from "./hooks/useAuth";
import CardTracker from "./card-tracker";
import AuthView from "./components/AuthView";
import { isCloudEnabled } from "./lib/supabase";

export default function App() {
  const { session, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#F3F4F6",
        fontFamily: "'Sora', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ color: "#6B7280", fontSize: 14 }}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session && isCloudEnabled) {
    return <AuthView onSignIn={signIn} onSignUp={signUp} />;
  }

  return <CardTracker userId={session.user.id} onSignOut={signOut} />;
}
