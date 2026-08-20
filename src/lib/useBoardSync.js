import { useEffect, useRef, useState } from "react";
import { isConfigured, supabase } from "./supabase";
import { fetchBoard, pushBoard, subscribeBoard } from "./boardApi";

const snap = (b) => JSON.stringify({ elements: b.elements, links: b.links, groups: b.groups });
const EMPTY = { elements: [], links: [], groups: [] };

/**
 * Hält das Board mit Supabase im Gleichstand. Ohne Keys oder ohne Anmeldung
 * passiert nichts — die Komponente speichert dann weiter nur lokal.
 */
export function useBoardSync(board, setBoard, session) {
  const [status, setStatus] = useState(isConfigured ? "off" : "local");
  const [error, setError] = useState(null);
  const boardRef = useRef(board);
  const lastRemote = useRef(null);
  const ready = useRef(false);
  const timer = useRef(null);
  const pullAgain = useRef(false);
  const puller = useRef(null);
  boardRef.current = board;

  const active = isConfigured && Boolean(session);

  // Laden und auf Änderungen der anderen hören
  useEffect(() => {
    if (!active) {
      ready.current = false;
      lastRemote.current = null;
      setStatus(isConfigured ? "off" : "local");
      return;
    }
    let alive = true;
    let firstPull = true;

    const pull = async () => {
      // Eigene, noch nicht hochgeladene Änderungen dürfen nicht überschrieben werden —
      // sonst verliert man den Zug, den man gerade macht, sobald jemand anders etwas ändert.
      if (ready.current && snap(boardRef.current) !== lastRemote.current) {
        pullAgain.current = true;
        return;
      }
      try {
        const remote = await fetchBoard();
        if (!alive) return;
        // Erststart: ein volles lokales Board nicht durch einen leeren Server ersetzen,
        // sondern hochladen. So wandert euer bisheriges Board einmalig mit.
        if (firstPull && remote.elements.length === 0 && boardRef.current.elements.length > 0) {
          await pushBoard(EMPTY, boardRef.current);
          lastRemote.current = snap(boardRef.current);
        } else {
          lastRemote.current = snap(remote);
          setBoard(remote);
        }
        firstPull = false;
        ready.current = true;
        setError(null);
        setStatus("live");
      } catch (e) {
        if (!alive) return;
        setError(e.message || String(e));
        setStatus("error");
      }
    };

    setStatus("connecting");
    puller.current = pull;
    void pull();
    const off = subscribeBoard(() => void pull());
    return () => {
      alive = false;
      puller.current = null;
      off();
    };
  }, [active, setBoard]);

  // Eigene Änderungen hochschicken
  useEffect(() => {
    if (!active || !ready.current) return;
    if (snap(board) === lastRemote.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const target = boardRef.current;
      try {
        setStatus("saving");
        await pushBoard(JSON.parse(lastRemote.current), target);
        lastRemote.current = snap(target);
        setError(null);
        setStatus("live");
        // Während des Hochladens eingetroffene fremde Änderungen jetzt nachholen.
        if (pullAgain.current) {
          pullAgain.current = false;
          await puller.current?.();
        }
      } catch (e) {
        setError(e.message || String(e));
        setStatus("error");
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [board, active]);

  return { status, error, remote: active };
}

/** Aktuelle Anmeldung, oder null wenn Supabase nicht eingerichtet ist. */
export function useSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!isConfigured);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}
