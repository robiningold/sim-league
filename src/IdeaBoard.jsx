import React, { useEffect, useRef, useState } from "react";

const GOLD = "#E0A83B";
const CARD = "#0f2636";
const STORAGE = "op-liga-ideas:v1";

const COLORS = [
  { id: "gold", bg: "#f2d38a", ink: "#2b1f05" },
  { id: "mint", bg: "#a3e3c6", ink: "#06281a" },
  { id: "sky", bg: "#a3cbef", ink: "#05203a" },
  { id: "rose", bg: "#f4a9b7", ink: "#3a0713" },
  { id: "lilac", bg: "#c6b4ef", ink: "#210a3a" },
  { id: "sand", bg: "#e7e0cf", ink: "#2b2519" },
];
const colorOf = (id) => COLORS.find((c) => c.id === id) || COLORS[0];

const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const NOTE_W = 210;
const NOTE_H = 150;

const seed = () => ({
  notes: [
    { id: uid("n"), x: 60, y: 60, w: NOTE_W, h: NOTE_H, text: "Doppelklick zum Schreiben.\nOben am Rand anfassen und verschieben.", color: "gold", img: null, groupId: null },
    { id: uid("n"), x: 320, y: 60, w: NOTE_W, h: NOTE_H, text: "Bilder: einfach aufs Board ziehen oder mit Strg+V einfügen.", color: "mint", img: null, groupId: null },
    { id: uid("n"), x: 580, y: 60, w: NOTE_W, h: NOTE_H, text: "Zwei Notizen markieren → Gruppieren. Verbinden-Modus zieht Pfeile.", color: "sky", img: null, groupId: null },
  ],
  links: [],
  groups: [],
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return seed();
    const d = JSON.parse(raw);
    if (!Array.isArray(d.notes)) return seed();
    return { notes: d.notes, links: d.links || [], groups: d.groups || [] };
  } catch {
    return seed();
  }
}

/** Bild verkleinern, sonst ist der localStorage nach drei Fotos voll. */
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
        resolve({ src: c.toDataURL("image/jpeg", 0.8), ratio: c.width / c.height });
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
    className="rounded-lg px-3 py-1.5 text-[13px] font-medium border transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
    style={{
      borderColor: active ? GOLD : danger ? "rgba(251,113,133,0.4)" : "#334155",
      background: active ? "rgba(224,168,59,0.14)" : "transparent",
      color: active ? GOLD : danger ? "#fb7185" : "#cbd5e1",
    }}
  >
    {children}
  </button>
);

export default function IdeaBoard() {
  const initial = useRef(load()).current;
  const [notes, setNotes] = useState(initial.notes);
  const [links, setLinks] = useState(initial.links);
  const [groups, setGroups] = useState(initial.groups);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [sel, setSel] = useState([]);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);
  const [warn, setWarn] = useState(null);
  const wrap = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ notes, links, groups }));
      setWarn(null);
    } catch {
      setWarn("Speicher voll — exportiere das Board und lösche ein paar Bilder.");
    }
  }, [notes, links, groups]);

  /** Bildschirm- zu Board-Koordinaten. */
  const toBoard = (clientX, clientY) => {
    const r = wrap.current.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z };
  };

  const addNote = (patch = {}) => {
    const r = wrap.current.getBoundingClientRect();
    const c = toBoard(r.left + r.width / 2, r.top + r.height / 3);
    const note = {
      id: uid("n"),
      x: c.x - NOTE_W / 2 + (Math.random() * 40 - 20),
      y: c.y - NOTE_H / 2 + (Math.random() * 40 - 20),
      w: NOTE_W,
      h: NOTE_H,
      text: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)].id,
      img: null,
      groupId: null,
      ...patch,
    };
    setNotes((n) => [...n, note]);
    setSel([note.id]);
    return note;
  };

  async function addImages(files, at) {
    let i = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const res = await readImage(file);
      if (!res) continue;
      const w = 240;
      addNote({
        x: (at ? at.x : 0) + i * 24,
        y: (at ? at.y : 0) + i * 24,
        w,
        h: Math.round(w / res.ratio) + 34,
        img: res.src,
        color: "sand",
      });
      i += 1;
    }
  }

  // --- Ziehen ---------------------------------------------------------------
  const dragNotes = (e, ids) => {
    e.stopPropagation();
    const z = view.z;
    const sx = e.clientX;
    const sy = e.clientY;
    const origin = new Map(notes.filter((n) => ids.includes(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]));
    const move = (ev) => {
      const dx = (ev.clientX - sx) / z;
      const dy = (ev.clientY - sy) / z;
      setNotes((ns) =>
        ns.map((n) => (origin.has(n.id) ? { ...n, x: origin.get(n.id).x + dx, y: origin.get(n.id).y + dy } : n)),
      );
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
    const move = (ev) => setView({ ...start, x: start.x + (ev.clientX - sx), y: start.y + (ev.clientY - sy) });
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
      return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  };

  // --- Auswahl, Verbinden, Gruppen -----------------------------------------
  const clickNote = (e, note) => {
    if (linkMode) {
      e.stopPropagation();
      if (!linkFrom) return setLinkFrom(note.id);
      if (linkFrom !== note.id) {
        const exists = links.some(
          (l) => (l.from === linkFrom && l.to === note.id) || (l.from === note.id && l.to === linkFrom),
        );
        if (!exists) setLinks((ls) => [...ls, { id: uid("l"), from: linkFrom, to: note.id }]);
      }
      return setLinkFrom(null);
    }
    setSel((s) => (e.shiftKey ? (s.includes(note.id) ? s.filter((i) => i !== note.id) : [...s, note.id]) : [note.id]));
  };

  const removeNotes = (ids) => {
    setNotes((n) => n.filter((x) => !ids.includes(x.id)));
    setLinks((l) => l.filter((x) => !ids.includes(x.from) && !ids.includes(x.to)));
    setSel([]);
  };

  const groupSelection = () => {
    if (sel.length < 2) return;
    const g = { id: uid("g"), label: "Gruppe " + (groups.length + 1) };
    setGroups((gs) => [...gs, g]);
    setNotes((ns) => ns.map((n) => (sel.includes(n.id) ? { ...n, groupId: g.id } : n)));
  };

  const ungroupSelection = () => {
    const ids = new Set(notes.filter((n) => sel.includes(n.id) && n.groupId).map((n) => n.groupId));
    setNotes((ns) => ns.map((n) => (ids.has(n.groupId) ? { ...n, groupId: null } : n)));
    setGroups((gs) => gs.filter((g) => !ids.has(g.id)));
  };

  const fitAll = () => {
    if (notes.length === 0) return setView({ x: 0, y: 0, z: 1 });
    const r = wrap.current.getBoundingClientRect();
    const minX = Math.min(...notes.map((n) => n.x));
    const minY = Math.min(...notes.map((n) => n.y));
    const maxX = Math.max(...notes.map((n) => n.x + n.w));
    const maxY = Math.max(...notes.map((n) => n.y + n.h));
    const z = clamp(Math.min((r.width - 80) / (maxX - minX), (r.height - 80) / (maxY - minY)), 0.3, 1.4);
    setView({ z, x: 40 - minX * z, y: 40 - minY * z });
  };

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify({ notes, links, groups }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "idea-dump.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBoard = async (file) => {
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.notes)) return setWarn("Die Datei enthält kein Board.");
      if (!confirm("Aktuelles Board ersetzen?")) return;
      setNotes(d.notes);
      setLinks(d.links || []);
      setGroups(d.groups || []);
      setSel([]);
    } catch {
      setWarn("Die Datei konnte nicht gelesen werden.");
    }
  };

  // --- Geometrie für Gruppenrahmen und Pfeile -------------------------------
  const groupBox = (gid) => {
    const ms = notes.filter((n) => n.groupId === gid);
    if (ms.length === 0) return null;
    const pad = 16;
    const x = Math.min(...ms.map((n) => n.x)) - pad;
    const y = Math.min(...ms.map((n) => n.y)) - pad - 26;
    const w = Math.max(...ms.map((n) => n.x + n.w)) + pad - x;
    const h = Math.max(...ms.map((n) => n.y + n.h)) + pad - y;
    return { x, y, w, h, ids: ms.map((n) => n.id) };
  };
  const centerOf = (id) => {
    const n = notes.find((x) => x.id === id);
    return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : null;
  };

  const selectedNotes = notes.filter((n) => sel.includes(n.id));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tool onClick={() => addNote()}>+ Notiz</Tool>
        <Tool onClick={() => fileInput.current?.click()}>+ Bild</Tool>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const r = wrap.current.getBoundingClientRect();
            void addImages(e.target.files, toBoard(r.left + r.width / 2 - 120, r.top + r.height / 3));
            e.target.value = "";
          }}
        />
        <Tool
          active={linkMode}
          onClick={() => {
            setLinkMode(!linkMode);
            setLinkFrom(null);
          }}
        >
          {linkMode ? "Verbinden aktiv" : "Verbinden"}
        </Tool>
        <Tool disabled={sel.length < 2} onClick={groupSelection}>
          Gruppieren
        </Tool>
        <Tool disabled={!selectedNotes.some((n) => n.groupId)} onClick={ungroupSelection}>
          Auflösen
        </Tool>
        <span className="mx-1 h-5 w-px bg-slate-700" />
        {COLORS.map((c) => (
          <button
            key={c.id}
            disabled={sel.length === 0}
            onClick={() => setNotes((ns) => ns.map((n) => (sel.includes(n.id) ? { ...n, color: c.id } : n)))}
            className="h-6 w-6 rounded-full border border-slate-600 disabled:opacity-30"
            style={{ background: c.bg }}
            aria-label={"Farbe " + c.id}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <Tool disabled={sel.length === 0} danger onClick={() => removeNotes(sel)}>
          Löschen
        </Tool>
        <div className="ml-auto flex items-center gap-2">
          <Tool onClick={fitAll}>Alles zeigen</Tool>
          <Tool onClick={() => setView({ x: 0, y: 0, z: 1 })}>100 %</Tool>
          <Tool onClick={exportBoard}>Export</Tool>
          <label className="rounded-lg px-3 py-1.5 text-[13px] font-medium border border-slate-700 text-slate-300 cursor-pointer">
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

      <p className="text-[11px] text-slate-500 mb-2">
        {linkMode
          ? linkFrom
            ? "Zweite Notiz anklicken, um die Verbindung zu setzen."
            : "Erste Notiz anklicken. Pfeil anklicken löscht ihn wieder."
          : "Notiz am oberen Rand ziehen · Text direkt tippen · Bilder aufs Board ziehen oder einfügen · Shift-Klick für Mehrfachauswahl · Mausrad zoomt, leere Fläche ziehen verschiebt."}
        {" "}Alles bleibt in diesem Browser gespeichert.
      </p>

      {warn && (
        <p className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">{warn}</p>
      )}

      <div
        ref={wrap}
        onPointerDown={panBoard}
        onWheel={onWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addImages(e.dataTransfer.files, toBoard(e.clientX, e.clientY));
        }}
        onPaste={(e) => {
          const files = [...e.clipboardData.items].map((i) => i.getAsFile()).filter(Boolean);
          if (files.length) {
            const r = wrap.current.getBoundingClientRect();
            void addImages(files, toBoard(r.left + r.width / 2 - 120, r.top + r.height / 3));
          }
        }}
        tabIndex={0}
        className="relative overflow-hidden rounded-xl border border-slate-800 outline-none"
        style={{
          height: "calc(100vh - 230px)",
          minHeight: 420,
          background: `${CARD} radial-gradient(circle at 1px 1px, rgba(148,163,184,0.16) 1px, transparent 0) 0 0 / ${24 * view.z}px ${24 * view.z}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
          cursor: linkMode ? "crosshair" : "grab",
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}
        >
          <svg className="absolute left-0 top-0 overflow-visible" style={{ width: 1, height: 1 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={GOLD} />
              </marker>
            </defs>
            {links.map((l) => {
              const a = centerOf(l.from);
              const b = centerOf(l.to);
              if (!a || !b) return null;
              return (
                <g key={l.id} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setLinks((ls) => ls.filter((x) => x.id !== l.id))}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GOLD} strokeWidth={2} markerEnd="url(#arrow)" opacity={0.85} />
                </g>
              );
            })}
          </svg>

          {groups.map((g) => {
            const box = groupBox(g.id);
            if (!box) return null;
            return (
              <div
                key={g.id}
                className="absolute rounded-2xl border-2 border-dashed"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: "rgba(224,168,59,0.45)" }}
              >
                <input
                  value={g.label}
                  onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, label: e.target.value } : x)))}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-1 left-3 bg-transparent text-[13px] font-medium outline-none"
                  style={{ color: GOLD, width: box.w - 90 }}
                />
                <button
                  onPointerDown={(e) => dragNotes(e, box.ids)}
                  className="absolute -top-1 right-8 text-[11px] text-slate-400 cursor-move px-1"
                  title="Gruppe verschieben"
                >
                  ✥ ziehen
                </button>
              </div>
            );
          })}

          {notes.map((n) => {
            const c = colorOf(n.color);
            const selected = sel.includes(n.id);
            const isFrom = linkFrom === n.id;
            const dragIds = selected && sel.length > 1 ? sel : [n.id];
            return (
              <div
                key={n.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => clickNote(e, n)}
                className="absolute rounded-lg shadow-lg flex flex-col overflow-hidden"
                style={{
                  left: n.x,
                  top: n.y,
                  width: n.w,
                  height: n.h,
                  background: c.bg,
                  color: c.ink,
                  outline: isFrom ? `2px solid ${GOLD}` : selected ? "2px solid #38bdf8" : "none",
                  outlineOffset: 2,
                }}
              >
                <div
                  onPointerDown={(e) => dragNotes(e, dragIds)}
                  className="flex items-center justify-between px-2 py-1 cursor-move"
                  style={{ background: "rgba(0,0,0,0.09)" }}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-60">
                    {n.groupId ? groups.find((g) => g.id === n.groupId)?.label || "Gruppe" : "Notiz"}
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotes([n.id]);
                    }}
                    className="text-[13px] leading-none opacity-45 hover:opacity-100 px-1"
                    aria-label="Notiz löschen"
                  >
                    ✕
                  </button>
                </div>
                {n.img && <img src={n.img} alt="" className="w-full object-cover" style={{ height: n.h - 34 }} draggable={false} />}
                {!n.img && (
                  <textarea
                    value={n.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)))}
                    placeholder="Idee …"
                    className="flex-1 w-full resize-none bg-transparent px-2.5 py-2 text-[13px] leading-snug outline-none placeholder:opacity-40"
                    style={{ color: c.ink }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-2 right-3 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-slate-400">
          {notes.length} Notizen · {links.length} Verbindungen · {Math.round(view.z * 100)} %
        </div>
      </div>
    </div>
  );
}
