import React, { useState, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const GOLD = "#E0A83B";
const SEA = "#0B1F2E";
const CARD = "#0f2636";
const EMER = "#34d399";
const ROSE = "#fb7185";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const chf = (n) => "CHF " + (Math.round(n * 100) / 100).toLocaleString("de-CH");
const chf0 = (n) => "CHF " + Math.round(n).toLocaleString("de-CH");
const tk = (n) => Math.round(n).toLocaleString("de-CH") + " T";

const NumField = ({ label, value, onChange, min, max, step = 1, suffix = "" }) => (
  <div className="mb-3">
    <div className="flex items-baseline justify-between mb-1 gap-2">
      <label className="text-[13px] text-slate-300">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" value={value === null ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-right font-mono text-[13px] text-amber-300 focus:border-amber-500 focus:outline-none" />
        {suffix && <span className="text-[11px] text-slate-500 w-9">{suffix}</span>}
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value ?? min}
      onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
  </div>
);

const Cell = ({ value, onChange, w = "w-16" }) => (
  <input type="number" value={value === null ? "" : value}
    onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    className={`${w} bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-[13px] text-slate-100 focus:border-amber-500 focus:outline-none`} />
);

const Sec = ({ title, hint, children }) => (
  <div className="rounded-xl border border-slate-800 p-4 mb-4" style={{ background: CARD }}>
    <h3 className="font-serif text-slate-200 mb-1">{title}</h3>
    {hint && <p className="text-[11px] text-slate-500 mb-3">{hint}</p>}
    {children}
  </div>
);

const Row = ({ label, value, tone = "d", strong }) => {
  const c = tone === "p" ? EMER : tone === "n" ? ROSE : tone === "g" ? GOLD : "#e2e8f0";
  return (
    <div className={`flex justify-between py-1 ${strong ? "border-t border-slate-700 mt-1 pt-2" : ""}`}>
      <span className={`text-[13px] ${strong ? "text-slate-200 font-medium" : "text-slate-400"}`}>{label}</span>
      <span className="font-mono text-[13px] tabular-nums" style={{ color: c, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
};

// Displaypreise = Cardmarket-Preistrend, auf 5 CHF aufgerundet (Stand: August 2026).
// Ticket-Preise werden daraus mit dem Peg unten abgeleitet — im UI jederzeit überschreibbar.
const PEG = 2.5;      // CHF Sticker-Wert pro Ticket (= Default von V unten)
const MARKUP = 1.07;  // Wall-Aufschlag: ein Preis kostet 7 % mehr Tickets, als er wert ist
const tix = (cost) => Math.ceil((cost / PEG) * MARKUP);

const DISPLAYS = [
  ["OP-07", 230],
  ["OP-08", 180],
  ["OP-10", 180],
  ["OP-12", 220],
  ["OP-13", 400],
  ["OP-14", 160],
  ["OP-15", 220],
  ["OP-16", 170],
  ["OP-17", 400],
  ["EB-03", 250],
  ["PRB-02", 250],
];

// Katalog für Add-Product (Ticket / CHF-Kosten Defaults)
const CATALOG = {
  ...Object.fromEntries(DISPLAYS.map(([set, cost]) => [
    "Display " + set, { tickets: tix(cost), cost, digital: false },
  ])),
  "Manga Card": { tickets: 40, cost: 170, digital: false },
  "Alt Art": { tickets: 18, cost: 75, digital: false },
  "Sleeves": { tickets: tix(12), cost: 12, digital: false },
  "Playmat": { tickets: tix(30), cost: 30, digital: false },
  "Profile Icon": { tickets: 3, cost: 0, digital: true },
  "Title": { tickets: 5, cost: 0, digital: true },
  "Banner": { tickets: 8, cost: 0, digital: true },
  "Custom Produkt": { tickets: 10, cost: 0, digital: false },
};

let ID = 1;
const mk = (name, tickets, cost) => ({ id: ID++, name, tickets, cost });
const fromCatalog = (name) => mk(name, CATALOG[name].tickets, CATALOG[name].cost);

const defaultWall = () => [
  ...DISPLAYS.map(([set]) => fromCatalog("Display " + set)),
  fromCatalog("Custom Produkt"),
  fromCatalog("Sleeves"),
  fromCatalog("Playmat"),
  fromCatalog("Profile Icon"),
  fromCatalog("Title"),
  fromCatalog("Banner"),
];

export default function TicketRechner() {
  const [capacity, setCapacity] = useState(64);
  const [fill, setFill] = useState(70);
  const [tpw, setTpw] = useState(1);
  const [rounds, setRounds] = useState(5);
  const [entry, setEntry] = useState(10);
  const [V, setV] = useState(PEG);      // Ticket-Wert (Sticker)
  const [physShare, setPhysShare] = useState(80); // % der Tickets, die für physische Preise draufgehen
  const [mode, setMode] = useState("win");
  const [t1, setT1] = useState(70);
  const [t2, setT2] = useState(45);
  const [t34, setT34] = useState(28);
  const [t58, setT58] = useState(16);
  const [tPerWin, setTPerWin] = useState(1);
  const [wall, setWall] = useState(defaultWall);
  const [pick, setPick] = useState("Display OP-07");
  const [fixedM, setFixedM] = useState(110);
  const [feePct, setFeePct] = useState(3);
  const [perTk, setPerTk] = useState(0.3);
  const [team, setTeam] = useState(3);

  const setWF = (id, f, v) => setWall((w) => w.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const delRow = (id) => setWall((w) => w.filter((r) => r.id !== id));
  const addRow = () => setWall((w) => [...w, fromCatalog(pick)]);

  // Was uns ein Ticket wirklich kostet: Einkaufspreise der Wall auf ihre Tickets umgelegt.
  // Preise ohne Kosten (Icon, Title, Banner, Custom) zählen nicht mit — sie sind gratis für uns.
  const wallCostPerTicket = useMemo(() => {
    let cost = 0, tickets = 0;
    for (const r of wall) {
      if (num(r.cost) <= 0 || num(r.tickets) <= 0) continue;
      cost += num(r.cost);
      tickets += num(r.tickets);
    }
    return tickets > 0 ? cost / tickets : 0;
  }, [wall]);
  // Nur der Teil, der für physische Preise eingelöst wird, kostet uns etwas. Der Rest geht in
  // digitale Preise oder wird nie eingelöst (Breakage, Drops) — beides gratis für uns.
  const RC = wallCostPerTicket * num(physShare) / 100;

  const eventsPerMonth = num(tpw) * 4;
  const topXTickets = num(t1) + num(t2) + 2 * num(t34) + 4 * num(t58);
  const winTicketsFor = (att) => num(tPerWin) * Math.floor(att / 2) * num(rounds);

  const calc = (f, md) => {
    const att = Math.round(num(capacity) * f / 100);
    const entries = att * eventsPerMonth;
    const revenue = entries * num(entry);
    const tpe = md === "topx" ? topXTickets : winTicketsFor(att);
    const ticketsMonth = tpe * eventsPerMonth;
    const stickerMonth = ticketsMonth * num(V);
    const realCost = ticketsMonth * num(RC);
    const fees = revenue * num(feePct) / 100 + entries * num(perTk);
    const profit = revenue - realCost - fees - num(fixedM);
    return { att, entries, revenue, tpe, ticketsMonth, stickerMonth, realCost, fees, profit, pct: revenue > 0 ? realCost / revenue : 0 };
  };

  const dep = [capacity, fill, tpw, rounds, entry, V, RC, t1, t2, t34, t58, tPerWin, fixedM, feePct, perTk];
  const A = useMemo(() => calc(num(fill), mode), [...dep, mode]);
  const cTop = useMemo(() => calc(num(fill), "topx"), dep);
  const cWin = useMemo(() => calc(num(fill), "win"), dep);
  const perPersonMonth = A.profit / Math.max(1, num(team));

  const fairColor = A.pct >= 0.28 && A.pct <= 0.45 ? EMER : (A.pct > 0.45 && A.pct <= 0.60) || (A.pct >= 0.18 && A.pct < 0.28) ? GOLD : ROSE;
  const overSticker = A.stickerMonth > A.revenue;

  const earnerTop = mode === "topx" ? num(t1) : num(rounds) * num(tPerWin);
  const earnerMid = mode === "topx" ? num(t58) : Math.round(num(rounds) / 2) * num(tPerWin);

  const chartData = useMemo(() => {
    const a = [];
    for (let f = 0; f <= 100; f += 5) a.push({ fill: f, profit: Math.round(calc(f, mode).profit) });
    return a;
  }, [...dep, mode]);

  const Toggle = ({ id, label, sub }) => (
    <button onClick={() => setMode(id)} className="flex-1 rounded-lg px-3 py-2 text-left transition-colors border"
      style={{ background: mode === id ? "rgba(224,168,59,0.12)" : "transparent", borderColor: mode === id ? GOLD : "#334155" }}>
      <div className="text-[13px] font-medium" style={{ color: mode === id ? GOLD : "#cbd5e1" }}>{label}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </button>
  );

  const today = new Date().toLocaleDateString("de-CH");

  return (
    <div className="min-h-screen w-full" style={{ background: SEA }}>
      <style>{`
        input, select, textarea { font-size: 16px; }
        @media screen { .print-only { display: none; } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      {/* ================= INTERACTIVE (screen) ================= */}
      <div className="no-print p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-xs tracking-[0.25em] uppercase" style={{ color: GOLD }}>Ticket-Ökonomie</p>
              <h1 className="font-serif text-2xl sm:text-3xl text-slate-100 mt-1">OP TCG Liga — Prize-Wall-Rechner</h1>
              <p className="text-sm text-slate-400 mt-1">Monatlich ({eventsPerMonth} Events/Monat). 1 Ticket = {chf(num(V))} Sticker-Wert.</p>
            </div>
            <button onClick={() => window.print()} className="rounded-lg px-4 py-2 text-[13px] font-medium border" style={{ borderColor: GOLD, color: GOLD }}>
              Als PDF speichern
            </button>
          </div>

          <div className="flex gap-2 my-5">
            <Toggle id="topx" label="Top X" sub="nur beste Plätze bekommen Tickets" />
            <Toggle id="win" label="Ticket pro Win" sub="jeder Match-Sieg gibt ein Ticket" />
          </div>

          {/* HERO */}
          <div className="rounded-xl border p-5 mb-5" style={{ background: CARD, borderColor: A.profit >= 0 ? "#1f4a3a" : "#4a1f28" }}>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Beute / Kopf / Monat</p>
                <p className="font-mono text-2xl sm:text-3xl mt-1 tabular-nums" style={{ color: perPersonMonth >= 0 ? GOLD : ROSE }}>{chf0(perPersonMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Gewinn / Monat</p>
                <p className="font-mono text-2xl sm:text-3xl mt-1 tabular-nums" style={{ color: A.profit >= 0 ? EMER : ROSE }}>{chf0(A.profit)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Ø Spieler</p>
                <p className="font-mono text-2xl sm:text-3xl mt-1 tabular-nums text-slate-100">{A.att}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Preis-Anteil (real)</p>
                <p className="font-mono text-2xl sm:text-3xl mt-1 tabular-nums" style={{ color: fairColor }}>{Math.round(A.pct * 100)}%</p>
              </div>
            </div>
            {overSticker && (
              <p className="text-[12px] mt-3" style={{ color: GOLD }}>
                ⚠ Ausgeschütteter Sticker-Wert ({chf0(A.stickerMonth)}) &gt; Umsatz ({chf0(A.revenue)}). Nur tragbar, weil reale Kosten/Ticket ({chf(num(RC))}) tief sind (digitale Preise + Breakage).
              </p>
            )}
          </div>

          {/* COMPARISON */}
          <div className="rounded-xl border border-slate-800 p-4 mb-5" style={{ background: CARD }}>
            <h3 className="font-serif text-slate-200 mb-3">Vergleich (bei {A.att} Spielern)</h3>
            <div className="grid grid-cols-3 gap-2 text-[13px]">
              <div className="text-slate-500 text-[11px] uppercase tracking-wider self-end">Kennzahl</div>
              <div className="text-center font-medium" style={{ color: mode === "topx" ? GOLD : "#cbd5e1" }}>Top X</div>
              <div className="text-center font-medium" style={{ color: mode === "win" ? GOLD : "#cbd5e1" }}>Pro Win</div>
              <div className="text-slate-400">Tickets / Event</div>
              <div className="text-center font-mono text-slate-200">{tk(cTop.tpe)}</div>
              <div className="text-center font-mono text-slate-200">{tk(cWin.tpe)}</div>
              <div className="text-slate-400">Preis-Anteil</div>
              <div className="text-center font-mono text-slate-200">{Math.round(cTop.pct * 100)}%</div>
              <div className="text-center font-mono text-slate-200">{Math.round(cWin.pct * 100)}%</div>
              <div className="text-slate-400">Gewinn / Monat</div>
              <div className="text-center font-mono" style={{ color: EMER }}>{chf0(cTop.profit)}</div>
              <div className="text-center font-mono" style={{ color: EMER }}>{chf0(cWin.profit)}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Sec title="Turnier">
                <NumField label="Kapazität pro Event" value={capacity} min={8} max={256} step={4} onChange={setCapacity} suffix="Pl." />
                <NumField label="Auslastung" value={fill} min={10} max={100} step={5} onChange={setFill} suffix="%" />
                <NumField label="Turniere pro Woche" value={tpw} min={1} max={7} step={1} onChange={setTpw} suffix="×" />
                <NumField label="Runden pro Event" value={rounds} min={3} max={12} step={1} onChange={setRounds} suffix="Rd" />
                <NumField label="Ticketpreis (Eintritt)" value={entry} min={0} max={40} step={1} onChange={setEntry} suffix="CHF" />
              </Sec>
              <Sec title="Ticket-Werte" hint="Sticker-Wert = was ein Ticket für Spieler wert ist. Was es uns kostet, kommt aus der Prize Wall — nichts zum Raten.">
                <NumField label="Ticket-Wert (Sticker)" value={V} min={0.5} max={10} step={0.25} onChange={setV} suffix="CHF" />
                <NumField label="Tickets für physische Preise" value={physShare} min={0} max={100} step={5} onChange={setPhysShare} suffix="%" />
                <Row label="Ø Einkauf / Ticket (Wall)" value={chf(wallCostPerTicket)} />
                <Row label="Reale Kosten / Ticket" value={chf(RC)} tone="g" strong />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Ein Display für {chf(230)} zu {tix(230)} Tickets kostet uns {chf(230 / tix(230))} pro Ticket — das ist der
                  Wall-Ø. Davon zahlen wir nur den Anteil, der für physische Preise eingelöst wird; digitale Preise und
                  nie eingelöste Tickets (Breakage, Drops) kosten nichts. Break-even liegt bei {chf(A.ticketsMonth > 0 ? (A.revenue - A.fees - num(fixedM)) / A.ticketsMonth : 0)} pro Ticket.
                </p>
              </Sec>

              {mode === "topx" ? (
                <Sec title="Auszahlung: Top X (Tickets)">
                  <NumField label="1. Platz" value={t1} min={0} max={200} step={5} onChange={setT1} suffix="T" />
                  <NumField label="2. Platz" value={t2} min={0} max={150} step={5} onChange={setT2} suffix="T" />
                  <NumField label="3.–4. (je)" value={t34} min={0} max={100} step={2} onChange={setT34} suffix="T" />
                  <NumField label="5.–8. (je)" value={t58} min={0} max={80} step={2} onChange={setT58} suffix="T" />
                </Sec>
              ) : (
                <Sec title="Auszahlung: Ticket pro Win" hint={Math.floor(A.att / 2) + " Matches × " + num(rounds) + " Runden. Turniersieger = " + num(rounds) * num(tPerWin) + " T."}>
                  <NumField label="Tickets pro Match-Win" value={tPerWin} min={1} max={10} step={1} onChange={setTPerWin} suffix="T" />
                </Sec>
              )}

              <Sec title="Kosten & Team">
                <NumField label="Fixkosten pro Monat" value={fixedM} min={0} max={500} step={10} onChange={setFixedM} suffix="CHF" />
                <NumField label="Zahlungsgebühr" value={feePct} min={0} max={6} step={0.5} onChange={setFeePct} suffix="%" />
                <NumField label="Fixgebühr pro Ticket" value={perTk} min={0} max={1} step={0.05} onChange={setPerTk} suffix="CHF" />
                <NumField label="Team-Grösse" value={team} min={1} max={6} step={1} onChange={setTeam} suffix="Pers." />
              </Sec>
            </div>

            <div>
              <Sec title={"Monats-Rechnung — " + (mode === "topx" ? "Top X" : "Pro Win")}>
                <Row label="Umsatz (Eintritte)" value={chf0(A.revenue)} tone="p" />
                <Row label={"Ausgeschütteter Sticker-Wert (" + tk(A.ticketsMonth) + ")"} value={chf0(A.stickerMonth)} />
                <Row label="Reale Preiskosten" value={"− " + chf0(A.realCost)} tone="n" />
                <Row label="Zahlungsgebühren" value={"− " + chf0(A.fees)} tone="n" />
                <Row label="Fixkosten" value={"− " + chf0(num(fixedM))} tone="n" />
                <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="text-slate-200 font-medium">Netto-Gewinn / Monat</span>
                  <span className="font-mono text-xl tabular-nums" style={{ color: A.profit >= 0 ? GOLD : ROSE }}>{chf0(A.profit)}</span>
                </div>
              </Sec>

              <div className="rounded-xl border border-slate-800 p-4" style={{ background: CARD }}>
                <h3 className="font-serif text-slate-200 mb-1">Gewinn nach Auslastung</h3>
                <p className="text-[11px] text-slate-500 mb-2">Gold = aktuell ({num(fill)} %). Rot = Break-even.</p>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid stroke="#1e3547" strokeDasharray="3 3" />
                      <XAxis dataKey="fill" stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} />
                      <Tooltip contentStyle={{ background: SEA, border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#94a3b8" }} formatter={(v) => [chf0(v), "Gewinn"]} labelFormatter={(l) => l + " %"} />
                      <ReferenceLine y={0} stroke={ROSE} strokeWidth={1} />
                      <ReferenceLine x={num(fill)} stroke={GOLD} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="profit" stroke={GOLD} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* PRIZE WALL EDITOR */}
          <div className="rounded-xl border border-slate-800 p-4 mt-5" style={{ background: CARD }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h3 className="font-serif text-slate-200">Prize Wall — selbst gestalten</h3>
              <div className="flex items-center gap-2">
                <select value={pick} onChange={(e) => setPick(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-[13px] text-slate-100 focus:border-amber-500 focus:outline-none">
                  {Object.keys(CATALOG).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <button onClick={addRow} className="rounded px-3 py-1.5 text-[13px] font-medium border" style={{ borderColor: GOLD, color: GOLD }}>+ Produkt</button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Namen, Ticket-Preise und CHF-Kosten frei anpassen. „K/Ticket“ grün = nah am Sticker-Wert; die Startpreise liegen {Math.round((MARKUP - 1) * 100)} % über dem 1:1-Wert. Grind = Events als {mode === "topx" ? "1. / 5.–8." : "Sieger / 50%-Spieler"}.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left pb-1 font-normal">Preis</th>
                    <th className="text-center pb-1 font-normal">Tickets</th>
                    <th className="text-center pb-1 font-normal">Kosten CHF</th>
                    <th className="text-right pb-1 font-normal">CHF-Wert</th>
                    <th className="text-right pb-1 font-normal">K/Ticket</th>
                    <th className="text-right pb-1 font-normal">Grind</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {wall.map((r) => {
                    const cpt = num(r.tickets) > 0 ? num(r.cost) / num(r.tickets) : 0;
                    const cc = num(r.cost) <= 0 ? "#64748b"
                      : Math.abs(cpt - num(V)) <= num(V) * 0.15 ? EMER
                      : Math.abs(cpt - num(V)) <= num(V) * 0.4 ? GOLD : ROSE;
                    return (
                      <tr key={r.id} className="border-b border-slate-800">
                        <td className="py-1.5 pr-2">
                          <input type="text" value={r.name} onChange={(e) => setWF(r.id, "name", e.target.value)}
                            className="w-full min-w-[110px] bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[13px] text-slate-100 focus:border-amber-500 focus:outline-none" />
                        </td>
                        <td className="py-1.5 text-center"><Cell value={r.tickets} onChange={(v) => setWF(r.id, "tickets", v)} w="w-14" /></td>
                        <td className="py-1.5 text-center"><Cell value={r.cost} onChange={(v) => setWF(r.id, "cost", v)} w="w-16" /></td>
                        <td className="py-1.5 text-right font-mono text-slate-400">{chf0(num(r.tickets) * num(V))}</td>
                        <td className="py-1.5 text-right font-mono" style={{ color: cc }}>{chf(cpt)}</td>
                        <td className="py-1.5 text-right font-mono text-slate-400">
                          {earnerTop > 0 ? Math.ceil(num(r.tickets) / earnerTop) : "—"}/{earnerMid > 0 ? Math.ceil(num(r.tickets) / earnerMid) : "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => delRow(r.id)} className="text-slate-600 hover:text-rose-400 px-1">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between pt-3 text-[13px]">
              <span className="text-slate-400">Ø Einkauf/Ticket (physische Preise) · {wall.length} Produkte</span>
              <span className="font-mono" style={{ color: GOLD }}>{chf(wallCostPerTicket)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
            Digitale Preise (Icon, Title, Banner) kosten fast nichts und sind die margenstärksten Wall-Items — ideal fürs Spielerprofil.
            Breakage und Drops stecken im Regler „Tickets für physische Preise“: was nicht physisch eingelöst wird,
            kostet uns nichts. Wer droppt, hat den Eintritt bezahlt und holt keine Tickets mehr ab — reine Marge.
          </p>
        </div>
      </div>

      {/* ================= PRINT / PDF REPORT ================= */}
      <div className="print-only" style={{ background: "#fff", color: "#111", padding: "24px", fontFamily: "Georgia, serif" }}>
        <h1 style={{ fontSize: "22px", margin: 0 }}>OP TCG Liga — Report</h1>
        <p style={{ fontSize: "12px", color: "#555", marginTop: 4 }}>Erstellt am {today} · Modus: {mode === "topx" ? "Top X" : "Ticket pro Win"}</p>

        <h2 style={{ fontSize: "15px", marginTop: 18, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Parameter</h2>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Kapazität / Auslastung", num(capacity) + " Plätze / " + num(fill) + " %"],
              ["Ø Spieler pro Event", A.att],
              ["Turniere pro Monat", eventsPerMonth],
              ["Eintritt", chf(num(entry))],
              ["Ticket-Wert (Sticker) / reale Kosten", chf(num(V)) + " / " + chf(num(RC))],
              ["Auszahlung", mode === "topx" ? "Top 8 (" + topXTickets + " T/Event)" : num(tPerWin) + " T pro Win (" + winTicketsFor(A.att) + " T/Event)"],
            ].map(([k, v]) => (
              <tr key={k}><td style={{ padding: "3px 0", color: "#555" }}>{k}</td><td style={{ textAlign: "right", fontFamily: "monospace" }}>{v}</td></tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ fontSize: "15px", marginTop: 18, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Monats-Rechnung</h2>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Umsatz (Eintritte)", chf0(A.revenue)],
              ["Ausgeschütteter Sticker-Wert", chf0(A.stickerMonth)],
              ["Reale Preiskosten", "− " + chf0(A.realCost)],
              ["Zahlungsgebühren", "− " + chf0(A.fees)],
              ["Fixkosten", "− " + chf0(num(fixedM))],
              ["Netto-Gewinn / Monat", chf0(A.profit)],
              ["Pro Kopf / Monat (÷" + num(team) + ")", chf0(perPersonMonth)],
              ["Preis-Anteil (real)", Math.round(A.pct * 100) + " %"],
            ].map(([k, v], i) => (
              <tr key={k} style={{ fontWeight: i >= 5 ? 700 : 400 }}>
                <td style={{ padding: "3px 0", color: "#555" }}>{k}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ fontSize: "15px", marginTop: 18, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Prize Wall ({wall.length} Produkte)</h2>
        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              <th style={{ padding: "3px 0" }}>Preis</th>
              <th style={{ textAlign: "right" }}>Tickets</th>
              <th style={{ textAlign: "right" }}>CHF-Wert</th>
              <th style={{ textAlign: "right" }}>Kosten</th>
              <th style={{ textAlign: "right" }}>K/Ticket</th>
            </tr>
          </thead>
          <tbody>
            {wall.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "3px 0" }}>{r.name}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>{num(r.tickets)}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>{chf0(num(r.tickets) * num(V))}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>{chf0(num(r.cost))}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>{num(r.tickets) > 0 ? chf(num(r.cost) / num(r.tickets)) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
