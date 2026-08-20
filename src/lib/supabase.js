import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Gemeinsames Liga-Konto — die Adresse ist fix, das Passwort tippt ihr. */
export const TEAM_EMAIL = import.meta.env.VITE_TEAM_EMAIL || "team@sim-league.app";
export const BOARD_ID = "main";

/** Ohne Keys läuft die App wie bisher rein lokal weiter. */
export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;

export async function signIn(password) {
  const { error } = await supabase.auth.signInWithPassword({ email: TEAM_EMAIL, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
