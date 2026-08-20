import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Gemeinsames Liga-Konto — die Adresse ist fix, das Passwort tippt ihr. */
export const TEAM_EMAIL = import.meta.env.VITE_TEAM_EMAIL || "team@sim-league.app";
export const BOARD_ID = "main";

/** Ohne Keys läuft die App wie bisher rein lokal weiter. */
export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;

/**
 * Die Project URL muss die blanke Projektadresse sein. Hängt ein Pfad dran —
 * etwa weil die Dashboard-Adresse kopiert wurde — verlängert der Client ihn
 * einfach und die Anmeldung landet im Nichts.
 */
export function urlProblem() {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return `„${url}" ist keine gültige URL.`;
  }
  // Hostname zuerst: bei einer Dashboard-Adresse wäre der Pfad-Hinweis irreführend,
  // denn „nur den Pfad weglassen" führt dort auf supabase.com statt aufs Projekt.
  if (!/\.supabase\.(co|in)$/.test(parsed.hostname)) {
    return `„${parsed.hostname}" ist keine Supabase-Projektadresse. Erwartet wird <projekt-id>.supabase.co — zu finden unter Project Settings → API → Project URL. Die Adresse aus der Browserzeile des Dashboards ist es nicht.`;
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return `Die Project URL darf keinen Pfad enthalten. Eingetragen ist „${url}", erwartet wird nur „${parsed.origin}".`;
  }
  return null;
}

/** Welche Variablen im Build angekommen sind — ohne den Key selbst zu zeigen. */
export const configReport = {
  VITE_SUPABASE_URL: url ? "gesetzt" : "fehlt",
  VITE_SUPABASE_ANON_KEY: key ? "gesetzt" : "fehlt",
  VITE_TEAM_EMAIL: TEAM_EMAIL,
  urlWert: url || null,
  bereit: isConfigured,
  // Eigene VITE_-Variablen, die Vite tatsächlich eingebaut hat. Deckt Tippfehler
  // im Namen auf: fehlt eine erwartete, steht hier, wie sie wirklich heisst.
  // VITE_VERCEL_* spendiert Vercel von selbst und sagt nichts über die Konfiguration.
  imBuild: Object.keys(import.meta.env)
    .filter((k) => k.startsWith("VITE_") && !k.startsWith("VITE_VERCEL_"))
    .sort(),
};

// Damit man im Browser mit einem Wort nachsehen kann: window.liga
if (typeof window !== "undefined") window.liga = configReport;

export async function signIn(password) {
  const { error } = await supabase.auth.signInWithPassword({ email: TEAM_EMAIL, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
