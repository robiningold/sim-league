import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBoardSync, useSession } from "./lib/useBoardSync";
import { uploadImage } from "./lib/boardApi";
import { configReport, isConfigured, signOut } from "./lib/supabase";

const GOLD = "#E0A83B";
const CARD = "#0f2636";
const PANEL = "#102b3f";
const STORAGE = "op-liga-ideas:v2";
const LEGACY = "op-liga-ideas:v1";

const ACCENTS = [
  { id: "gold", dot: "#E0A83B" },
  { id: "mint", dot: "#34d399" },
  { id: "sky", dot: "#38bdf8" },
  { id: "rose", dot: "#fb7185" },
  { id: "lilac", dot: "#a78bfa" },
  { id: "slate", dot: "#94a3b8" },
];
const accentOf = (id) => ACCENTS.find((a) => a.id === id) || ACCENTS[0];

const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const EL_W = 250;
const EL_H = 175;
// Feste Arbeitsfläche. Elemente können sie nicht verlassen, das Board auch nicht
// aus dem Bild gescrollt werden — nichts geht "hinter dem Rand" verloren.
const BOARD_W = 4000;
const BOARD_H = 2600;
const PAD = 60; // wie weit man über den Board-Rand hinausschauen darf

const inBounds = (el) => ({
  ...el,
  w: clamp(el.w, 180, BOARD_W),
  h: clamp(el.h, 110, BOARD_H),
  x: clamp(el.x, 0, BOARD_W - clamp(el.w, 180, BOARD_W)),
  y: clamp(el.y, 0, BOARD_H - clamp(el.h, 110, BOARD_H)),
});

/** Hält das Board im Bild: passt es rein, wird zentriert, sonst am Rand gestoppt. */
const clampView = (v, rect) => {
  const bw = BOARD_W * v.z;
  const bh = BOARD_H * v.z;
  return {
    z: v.z,
    x: bw + 2 * PAD <= rect.width ? (rect.width - bw) / 2 : clamp(v.x, rect.width - bw - PAD, PAD),
    y: bh + 2 * PAD <= rect.height ? (rect.height - bh) / 2 : clamp(v.y, rect.height - bh - PAD, PAD),
  };
};

const blank = (patch = {}) => ({
  id: uid("e"),
  x: 0,
  y: 0,
  w: EL_W,
  h: EL_H,
  title: "",
  text: "",
  bullets: [],
  images: [],
  color: ACCENTS[Math.floor(Math.random() * ACCENTS.length)].id,
  groupId: null,
  ...patch,
});

const seed = () => ({
  elements: [
    blank({ x: 80, y: 70, title: "So funktioniert das Board", text: "Element anklicken öffnet rechts die Details. Oben am Rand anfassen zum Verschieben, Ecke unten rechts zieht die Grösse.", color: "gold" }),
    blank({ x: 380, y: 70, title: "Inhalte", bullets: ["Titel und Beschreibung", "Stichpunkte für Details", "Bilder per Drag-and-drop"], color: "mint" }),
    blank({ x: 680, y: 70, title: "Struktur", text: "Mehrere Elemente mit Shift markieren und gruppieren. Der Verbinden-Modus zieht Pfeile zwischen zwei Elementen.", color: "sky" }),
  ],
  links: [],
  groups: [],
});

/** v1-Boards (Post-its) auf das neue Format heben. */
function migrate(d) {
  return (d.notes || []).map((n) => {
    const lines = (n.text || "").split("\n").filter((l) => l.trim());
    return blank({
      id: n.id,
      x: n.x,
      y: n.y,
      w: Math.max(n.w || EL_W, EL_W),
      h: Math.max(n.h || EL_H, EL_H),
      title: lines[0] ? lines[0].slice(0, 60) : "Ohne Titel",
      text: lines.slice(1).join("\n"),
      images: n.img ? [n.img] : [],
      color: accentOf(n.color).id,
      groupId: n.groupId || null,
    });
  });
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.elements)) return { elements: d.elements.map(inBounds), links: d.links || [], groups: d.groups || [] };
    }
    const old = localStorage.getItem(LEGACY);
    if (old) {
      const d = JSON.parse(old);
      if (Array.isArray(d.notes)) return { elements: migrate(d).map(inBounds), links: d.links || [], groups: d.groups || [] };
    }
  } catch {
    /* kaputter Speicher — lieber neu anfangen als abstürzen */
  }
  return seed();
}

/** Bild verkleinern, sonst ist der Browserspeicher nach ein paar Fotos voll. */
function readImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const Tool = ({ active, danger, children, ...props }) => (
  <button
    {...props}
    className="rounded-lg px-3 py-1.5 text-[13px] font-medium border transition-colors disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
    style={{
      borderColor: active ? GOLD : danger ? "rgba(251,113,133,0.45)" : "#2c4257",
      background: active ? "rgba(224,168,59,0.14)" : danger ? "rgba(251,113,133,0.08)" : "rgba(15,38,54,0.9)",
      color: active ? GOLD : danger ? "#fb7185" : "#cbd5e1",
    }}
  >
    {children}
  </button>
);

const Divider = () => <span className="h-5 w-px bg-slate-700 mx-0.5" />;

const SYNC_LABEL = {
  local: "lokal · Supabase nicht eingerichtet",
  off: "nicht angemeldet",
  connecting: "verbindet …",
  live: "live · alle sehen dasselbe",
  saving: "speichert …",
  error: "Sync-Fehler",
};
const SYNC_COLOR = {
  local: "#8ba0b3",
  live: "#34d399",
  saving: "#E0A83B",
  error: "#fb7185",
};

export default function IdeaBoard() {
  const initial = useRef(load()).current;
  const [elements, setElements] = useState(initial.elements);
  const [links, setLinks] = useState(initial.links);
  const [groups, setGroups] = useState(initial.groups);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [sel, setSel] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [warn, setWarn] = useState(null);
  const [hintClosed, setHintClosed] = useState(false);
  const wrap = useRef(null);
  const imgInput = useRef(null);
  const { session } = useSession();

  const setBoard = useCallback((b) => {
    setElements(b.elements.map(inBounds));
    setLinks(b.links);
    setGroups(b.groups);
  }, []);
  const sync = useBoardSync({ elements, links, groups }, setBoard, session);

  // Lokale Kopie bleibt immer bestehen — als Zwischenspeicher und für den Offline-Fall.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ elements, links, groups }));
      setWarn(null);
    } catch {
      // Mit Supabase liegen die Bilder auf dem Server, dann ist der lokale Speicher nur Beiwerk.
      setWarn(sync.remote ? null : "Speicher voll — exportiere das Board und entferne ein paar Bilder.");
    }
  }, [elements, links, groups, sync.remote]);

  const open = elements.find((e) => e.id === openId) || null;
  const selected = elements.filter((e) => sel.includes(e.id));
  const patch = (id, p) => setElements((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const toBoard = (clientX, clientY) => {
    const r = wrap.current.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z };
  };

  const addElement = (p = {}) => {
    const r = wrap.current.getBoundingClientRect();
    const c = toBoard(r.left + r.width / 2, r.top + r.height / 2);
    const el = inBounds(blank({ x: c.x - EL_W / 2 + (Math.random() * 60 - 30), y: c.y - EL_H / 2 + (Math.random() * 60 - 30), ...p }));
    setElements((es) => [...es, el]);
    setSel([el.id]);
    setOpenId(el.id);
    return el;
  };

  async function addImages(files, target) {
    const srcs = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      let src = await readImage(file);
      if (!src) continue;
      if (sync.remote) {
        try {
          src = await uploadImage(src);
        } catch (e) {
          setWarn("Bild-Upload fehlgeschlagen, es liegt vorerst nur lokal: " + (e.message || e));
        }
      }
      srcs.push(src);
    }
    if (srcs.length === 0) return null;
    if (target) {
      patch(target, { images: [...(elements.find((e) => e.id === target)?.images || []), ...srcs] });
      return null;
    }
    return addElement({ title: "Bild", images: srcs, color: "slate" });
  }

  // --- Ziehen, Grösse, Pan, Zoom -------------------------------------------
  const dragElements = (e, ids) => {
    e.stopPropagation();
    const z = view.z;
    const sx = e.clientX;
    const sy = e.clientY;
    const origin = new Map(elements.filter((n) => ids.includes(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]));
    const move = (ev) => {
      const dx = (ev.clientX - sx) / z;
      const dy = (ev.clientY - sy) / z;
      setElements((es) =>
        es.map((n) => (origin.has(n.id) ? inBounds({ ...n, x: origin.get(n.id).x + dx, y: origin.get(n.id).y + dy }) : n)),
      );
    };
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const resizeElement = (e, el) => {
    e.stopPropagation();
    const z = view.z;
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev) => {
      const w = clamp(el.w + (ev.clientX - sx) / z, 180, 640);
      const h = clamp(el.h + (ev.clientY - sy) / z, 110, 640);
      patch(el.id, { w: Math.min(w, BOARD_W - el.x), h: Math.min(h, BOARD_H - el.y) });
    };
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const panBoard = (e) => {
    if (e.button !== 0) return;
    setSel([]);
    setLinkFrom(null);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...view };
    const rect = wrap.current.getBoundingClientRect();
    const move = (ev) =>
      setView(clampView({ ...start, x: start.x + (ev.clientX - sx), y: start.y + (ev.clientY - sy) }, rect));
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const onWheel = (e) => {
    const r = wrap.current.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    setView((v) => {
      const z = clamp(v.z * (1 - e.deltaY * 0.0012), 0.3, 2.5);
      const k = z / v.z;
      return clampView({ z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }, r);
    });
  };

  // --- Auswahl, Verbinden, Gruppen -----------------------------------------
  const clickElement = (e, el) => {
    if (linkMode) {
      e.stopPropagation();
      if (!linkFrom) return setLinkFrom(el.id);
      if (linkFrom !== el.id) {
        const exists = links.some((l) => (l.from === linkFrom && l.to === el.id) || (l.from === el.id && l.to === linkFrom));
        if (!exists) setLinks((ls) => [...ls, { id: uid("l"), from: linkFrom, to: el.id }]);
      }
      return setLinkFrom(null);
    }
    if (e.shiftKey) {
      setSel((s) => (s.includes(el.id) ? s.filter((i) => i !== el.id) : [...s, el.id]));
      return;
    }
    setSel([el.id]);
    setOpenId(el.id);
  };

  const removeElements = (ids) => {
    setElements((es) => es.filter((x) => !ids.includes(x.id)));
    setLinks((l) => l.filter((x) => !ids.includes(x.from) && !ids.includes(x.to)));
    setSel([]);
    if (ids.includes(openId)) setOpenId(null);
    setConfirmDelete(null);
  };

  const groupSelection = () => {
    if (sel.length < 2) return;
    const g = { id: uid("g"), label: "Gruppe " + (groups.length + 1) };
    setGroups((gs) => [...gs, g]);
    setElements((es) => es.map((n) => (sel.includes(n.id) ? { ...n, groupId: g.id } : n)));
  };

  const ungroupSelection = () => {
    const ids = new Set(selected.filter((n) => n.groupId).map((n) => n.groupId));
    setElements((es) => es.map((n) => (ids.has(n.groupId) ? { ...n, groupId: null } : n)));
    setGroups((gs) => gs.filter((g) => !ids.has(g.id)));
  };

  const fitAll = () => {
    if (elements.length === 0) return setView({ x: 0, y: 0, z: 1 });
    const r = wrap.current.getBoundingClientRect();
    const minX = Math.min(...elements.map((n) => n.x));
    const minY = Math.min(...elements.map((n) => n.y));
    const maxX = Math.max(...elements.map((n) => n.x + n.w));
    const maxY = Math.max(...elements.map((n) => n.y + n.h));
    const z = clamp(Math.min((r.width - 120) / (maxX - minX), (r.height - 120) / (maxY - minY)), 0.3, 1.4);
    setView(clampView({ z, x: 60 - minX * z, y: 60 - minY * z }, r));
  };

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify({ elements, links, groups }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "idea-dump.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBoard = async (file) => {
    try {
      const d = JSON.parse(await file.text());
      const els = Array.isArray(d.elements) ? d.elements : Array.isArray(d.notes) ? migrate(d) : null;
      if (!els) return setWarn("Die Datei enthält kein Board.");
      if (!confirm("Aktuelles Board ersetzen?")) return;
      setElements(els);
      setLinks(d.links || []);
      setGroups(d.groups || []);
      setSel([]);
      setOpenId(null);
    } catch {
      setWarn("Die Datei konnte nicht gelesen werden.");
    }
  };

  const groupBox = (gid) => {
    const ms = elements.filter((n) => n.groupId === gid);
    if (ms.length === 0) return null;
    const pad = 18;
    const x = Math.min(...ms.map((n) => n.x)) - pad;
    const y = Math.min(...ms.map((n) => n.y)) - pad - 24;
    return {
      x,
      y,
      w: Math.max(...ms.map((n) => n.x + n.w)) + pad - x,
      h: Math.max(...ms.map((n) => n.y + n.h)) + pad - y,
      ids: ms.map((n) => n.id),
    };
  };
  const centerOf = (id) => {
    const n = elements.find((x) => x.id === id);
    return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : null;
  };

  return (
    <div className="relative h-full w-full">
      {/* ---------- Werkzeugleiste ---------- */}
      <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2">
        <Tool onClick={() => addElement()}>+ Element</Tool>
        <Tool onClick={() => imgInput.current?.click()}>+ Bild</Tool>
        <input
          ref={imgInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addImages(e.target.files, openId);
            e.target.value = "";
          }}
        />
        <Tool active={linkMode} onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}>
          {linkMode ? "Verbinden aktiv" : "Verbinden"}
        </Tool>

        {sel.length > 0 && (
          <>
            <Divider />
            <span className="text-[12px] text-slate-400 max-w-[16rem] truncate">
              {sel.length > 1 ? sel.length + " Elemente" : selected[0]?.title || "Ohne Titel"}
            </span>
            {sel.length === 1 && <Tool onClick={() => setOpenId(sel[0])}>Öffnen</Tool>}
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setElements((es) => es.map((n) => (sel.includes(n.id) ? { ...n, color: a.id } : n)))}
                className="h-5 w-5 rounded-full border border-slate-600"
                style={{ background: a.dot }}
                aria-label={"Farbe " + a.id}
              />
            ))}
            <Tool disabled={sel.length < 2} onClick={groupSelection}>Gruppieren</Tool>
            {selected.some((n) => n.groupId) && <Tool onClick={ungroupSelection}>Auflösen</Tool>}
            <Tool danger onClick={() => setConfirmDelete(sel)}>Löschen</Tool>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Tool onClick={fitAll}>Alles zeigen</Tool>
          <Tool onClick={() => setView(clampView({ x: 0, y: 0, z: 1 }, wrap.current.getBoundingClientRect()))}>100 %</Tool>
          {session && <Tool onClick={() => void signOut()}>Abmelden</Tool>}
          <Tool onClick={exportBoard}>Export</Tool>
          <label
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium border cursor-pointer whitespace-nowrap"
            style={{ borderColor: "#2c4257", background: "rgba(15,38,54,0.9)", color: "#cbd5e1" }}
          >
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importBoard(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {!isConfigured && !hintClosed && (
        <div className="absolute left-3 top-16 z-20 max-w-lg">
          <div
            className="rounded-lg border px-3 py-2 text-[12px] leading-relaxed"
            style={{ borderColor: "rgba(224,168,59,0.4)", background: "rgba(11,31,46,0.96)", color: GOLD }}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1">
                Board nur in diesem Browser — niemand sonst sieht es.{" "}
                <b>VITE_SUPABASE_URL {configReport.VITE_SUPABASE_URL}</b>,{" "}
                <b>VITE_SUPABASE_ANON_KEY {configReport.VITE_SUPABASE_ANON_KEY}</b>.
              </p>
              <button onClick={() => setHintClosed(true)} className="opacity-60 hover:opacity-100" aria-label="Hinweis schliessen">
                ✕
              </button>
            </div>
            <p className="mt-1.5 text-slate-400">
              Eigene Variablen im Build:{" "}
              {configReport.imBuild.length ? configReport.imBuild.join(" · ") : "keine"}
              {" — "}steht die gesuchte hier unter anderem Namen, ist es ein Tippfehler in Vercel.
            </p>
          </div>
        </div>
      )}

      {(linkMode || warn) && (
        <div className="pointer-events-none absolute left-3 z-20 max-w-lg" style={{ top: isConfigured || hintClosed ? "4rem" : "9.5rem" }}>
          {linkMode && (
            <p className="rounded-lg border px-3 py-1.5 text-[12px]" style={{ borderColor: "rgba(224,168,59,0.4)", background: "rgba(224,168,59,0.1)", color: GOLD }}>
              {linkFrom ? "Zweites Element anklicken." : "Erstes Element anklicken. Ein Pfeil verschwindet per Klick darauf."}
            </p>
          )}
          {warn && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[12px] text-rose-300">{warn}</p>}
        </div>
      )}

      {/* ---------- Board ---------- */}
      <div
        ref={wrap}
        onPointerDown={panBoard}
        onWheel={onWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const at = toBoard(e.clientX, e.clientY);
          void addImages(e.dataTransfer.files).then((created) => {
            if (created) patch(created.id, { x: at.x, y: at.y });
          });
        }}
        onPaste={(e) => {
          const files = [...e.clipboardData.items].map((i) => i.getAsFile()).filter(Boolean);
          if (files.length) void addImages(files, openId);
        }}
        tabIndex={0}
        className="absolute inset-0 overflow-hidden outline-none"
        style={{
          background: "#0a1c2a",
          cursor: linkMode ? "crosshair" : "grab",
        }}
      >
        <div className="absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}>
          <div
            className="absolute left-0 top-0 rounded-lg"
            style={{
              width: BOARD_W,
              height: BOARD_H,
              border: "1px solid #24405a",
              background: `${CARD} radial-gradient(circle at 1px 1px, rgba(148,163,184,0.14) 1px, transparent 0) 0 0 / 26px 26px`,
            }}
          />
          <svg className="absolute left-0 top-0 overflow-visible" style={{ width: 1, height: 1 }}>
            <defs>
              <marker id="ideaArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={GOLD} />
              </marker>
            </defs>
            {links.map((l) => {
              const a = centerOf(l.from);
              const b = centerOf(l.to);
              if (!a || !b) return null;
              return (
                <g key={l.id} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setLinks((ls) => ls.filter((x) => x.id !== l.id))}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GOLD} strokeWidth={2} markerEnd="url(#ideaArrow)" opacity={0.8} />
                </g>
              );
            })}
          </svg>

          {groups.map((g) => {
            const box = groupBox(g.id);
            if (!box) return null;
            return (
              <div key={g.id} className="absolute rounded-2xl border border-dashed" style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: "rgba(224,168,59,0.4)" }}>
                <div className="absolute -top-0.5 left-3 right-3 flex items-center gap-2">
                  <input
                    value={g.label}
                    onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, label: e.target.value } : x)))}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-[12px] font-medium outline-none"
                    style={{ color: GOLD }}
                  />
                  <button onPointerDown={(e) => dragElements(e, box.ids)} className="text-[11px] text-slate-400 cursor-move px-1" title="Gruppe verschieben">
                    ✥
                  </button>
                </div>
              </div>
            );
          })}

          {elements.map((el) => {
            const a = accentOf(el.color);
            const isSel = sel.includes(el.id);
            const isFrom = linkFrom === el.id;
            const dragIds = isSel && sel.length > 1 ? sel : [el.id];
            return (
              <div
                key={el.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => clickElement(e, el)}
                className="absolute rounded-xl overflow-hidden flex flex-col shadow-xl shadow-black/40"
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  background: "#14293b",
                  border: `1px solid ${isSel || isFrom ? a.dot : "#24405a"}`,
                  outline: isFrom ? `2px solid ${GOLD}` : isSel ? `2px solid ${a.dot}55` : "none",
                  outlineOffset: 1,
                }}
              >
                <div onPointerDown={(e) => dragElements(e, dragIds)} className="flex items-center gap-2 px-3 py-2 cursor-move border-b" style={{ borderColor: "#1d354b" }}>
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: a.dot }} />
                  <span className="flex-1 truncate text-[13px] font-medium text-slate-100">{el.title || "Ohne Titel"}</span>
                </div>

                <div className="flex-1 overflow-hidden px-3 py-2">
                  {el.images[0] && (
                    <img src={el.images[0]} alt="" draggable={false} className="mb-2 w-full rounded-md object-cover" style={{ height: Math.min(90, el.h - 90) }} />
                  )}
                  {el.text && <p className="text-[12px] leading-snug text-slate-400 whitespace-pre-wrap">{el.text}</p>}
                  {el.bullets.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {el.bullets.slice(0, 4).map((b, i) => (
                        <li key={i} className="flex gap-1.5 text-[12px] leading-snug text-slate-300">
                          <span style={{ color: a.dot }}>•</span>
                          <span className="truncate">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!el.text && el.bullets.length === 0 && !el.images.length && (
                    <p className="text-[12px] text-slate-600">Klicken zum Befüllen …</p>
                  )}
                </div>

                {(el.images.length > 0 || el.bullets.length > 4) && (
                  <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] text-slate-500 border-t" style={{ borderColor: "#1d354b" }}>
                    {el.images.length > 0 && <span>🖼 {el.images.length}</span>}
                    {el.bullets.length > 4 && <span>+{el.bullets.length - 4} Stichpunkte</span>}
                  </div>
                )}

                <div onPointerDown={(e) => resizeElement(e, el)} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize" title="Grösse ändern">
                  <div className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2" style={{ borderColor: "#3a5876" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-3 flex items-center gap-2 rounded-lg bg-black/45 px-2.5 py-1 text-[11px] text-slate-400" style={{ right: open ? "23rem" : "0.75rem" }}>
          <span>{elements.length} Elemente · {links.length} Verbindungen · {Math.round(view.z * 100)} %</span>
          <span className="h-3 w-px bg-slate-700" />
          <span style={{ color: SYNC_COLOR[sync.status] || "#8ba0b3" }} title={sync.error || ""}>
            {SYNC_LABEL[sync.status] || sync.status}
          </span>
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-[26rem] text-[11px] leading-relaxed text-slate-600">
          Kopfzeile ziehen verschiebt · Ecke unten rechts ändert die Grösse · Shift-Klick wählt mehrere · Mausrad zoomt ·
          leere Fläche ziehen verschiebt das Board · Bilder aufs Board ziehen oder mit Strg+V einfügen
        </p>
      </div>

      {/* ---------- Detailpanel ---------- */}
      {open && (
        <aside
          className="absolute right-0 top-0 bottom-0 z-30 w-[22rem] max-w-full overflow-y-auto border-l p-4"
          style={{ background: PANEL, borderColor: "#1d354b" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-serif text-slate-200">Element</h3>
            <button onClick={() => setOpenId(null)} className="text-slate-500 hover:text-slate-200 px-1" aria-label="Panel schliessen">
              ✕
            </button>
          </div>

          <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Titel</label>
          <input
            value={open.title}
            onChange={(e) => patch(open.id, { title: e.target.value })}
            placeholder="Worum geht es?"
            className="w-full mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[14px] text-slate-100 outline-none focus:border-amber-500"
          />

          <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Beschreibung</label>
          <textarea
            value={open.text}
            onChange={(e) => patch(open.id, { text: e.target.value })}
            rows={5}
            placeholder="Freitext …"
            className="w-full mb-4 resize-y rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[13px] leading-snug text-slate-200 outline-none focus:border-amber-500"
          />

          <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Stichpunkte</label>
          <div className="mb-2 space-y-1.5">
            {open.bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span style={{ color: accentOf(open.color).dot }}>•</span>
                <input
                  value={b}
                  onChange={(e) => patch(open.id, { bullets: open.bullets.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[13px] text-slate-200 outline-none focus:border-amber-500"
                />
                <button onClick={() => patch(open.id, { bullets: open.bullets.filter((_, j) => j !== i) })} className="text-slate-600 hover:text-rose-400 px-1" aria-label="Stichpunkt entfernen">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Tool onClick={() => patch(open.id, { bullets: [...open.bullets, ""] })}>+ Stichpunkt</Tool>

          <label className="mt-5 block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Bilder</label>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {open.images.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt="" className="h-20 w-full rounded-md object-cover" />
                <button
                  onClick={() => patch(open.id, { images: open.images.filter((_, j) => j !== i) })}
                  className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[11px] text-slate-200"
                  aria-label="Bild entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Tool onClick={() => imgInput.current?.click()}>+ Bild</Tool>

          <div className="mt-5 flex items-center gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => patch(open.id, { color: a.id })}
                className="h-6 w-6 rounded-full border"
                style={{ background: a.dot, borderColor: open.color === a.id ? "#e2e8f0" : "transparent" }}
                aria-label={"Farbe " + a.id}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-700 pt-4">
            <Tool
              active={linkMode && linkFrom === open.id}
              onClick={() => {
                setLinkMode(true);
                setLinkFrom(open.id);
              }}
            >
              Verbinden ab hier
            </Tool>
            <Tool danger onClick={() => setConfirmDelete([open.id])}>
              Löschen
            </Tool>
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            {links.filter((l) => l.from === open.id || l.to === open.id).length} Verbindungen
            {open.groupId ? " · " + (groups.find((g) => g.id === open.groupId)?.label || "Gruppe") : ""}
          </p>
        </aside>
      )}

      {/* ---------- Löschbestätigung ---------- */}
      {confirmDelete && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onPointerDown={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm rounded-xl border border-slate-700 p-5" style={{ background: PANEL }}>
            <h3 className="font-serif text-slate-100">
              {confirmDelete.length > 1 ? confirmDelete.length + " Elemente löschen?" : "Element löschen?"}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
              {confirmDelete.length === 1 && (
                <>
                  „{elements.find((e) => e.id === confirmDelete[0])?.title || "Ohne Titel"}“ wird entfernt.{" "}
                </>
              )}
              Verbindungen dazu verschwinden mit. Das lässt sich nicht rückgängig machen.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Tool onClick={() => setConfirmDelete(null)}>Abbrechen</Tool>
              <Tool danger onClick={() => removeElements(confirmDelete)}>
                Endgültig löschen
              </Tool>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
