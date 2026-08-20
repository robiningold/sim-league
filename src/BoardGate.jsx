import React, { useState } from "react";
import { configReport, isConfigured, signIn, urlProblem } from "./lib/supabase";
import { useSession } from "./lib/useBoardSync";

const GOLD = "#E0A83B";
const CARD = "#12293c";

/** Passwortschranke vor der ganzen Seite. Ohne Supabase-Keys läuft alles lokal weiter. */
export default function BoardGate({ children }) {
  const { session, ready } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!isConfigured || session) return children;

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">Verbindung wird geprüft …</div>;
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(password);
    } catch (err) {
      const msg = err.message || String(err);
      setError(
        /invalid login/i.test(msg)
          ? "Passwort stimmt nicht."
          : urlProblem() || "Anmeldung fehlgeschlagen: " + msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 p-6" style={{ background: CARD }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          OP TCG Liga
        </p>
        <h2 className="mt-1 font-serif text-xl text-slate-100">Liga-Passwort</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
          Ein Passwort für die ganze Liga. Die Anmeldung bleibt in diesem Browser gespeichert —
          du wirst also nicht bei jedem Besuch neu gefragt.
        </p>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-3 w-full rounded-lg px-4 py-2 text-[14px] font-medium transition-colors disabled:opacity-40"
          style={{ background: GOLD, color: "#0B1F2E" }}
        >
          {busy ? "Wird geprüft …" : "Öffnen"}
        </button>
        {error && <p className="mt-3 text-[13px] leading-relaxed text-rose-300">{error}</p>}
        {error && (
          <p className="mt-2 break-all text-[11px] text-slate-500">
            Angesprochen: {configReport.urlWert}/auth/v1
          </p>
        )}
      </form>
    </div>
  );
}
