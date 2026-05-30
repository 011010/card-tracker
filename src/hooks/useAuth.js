import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const LOCAL_SESSION = { user: { id: "local" } };

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(LOCAL_SESSION);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password) {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async function signOut() {
    if (!supabase) { return; }
    await supabase.auth.signOut();
  }

  return { session, loading, signIn, signUp, signOut };
}
