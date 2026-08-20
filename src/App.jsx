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
const PEG = 5;            // CHF Warenwert pro Ticket (= Default von V unten)
const MARKUP_START = 200; // % vom Einkaufspreis, die ein Spieler in Tickets bezahlt
// Ticketpreis eines Produkts: Einkaufspreis in Tickets umgerechnet, mal Aufschlag.
const ticketsFor = (cost, v, m) => Math.ceil((num(cost) / num(v)) * (num(m) / 100));
const tix = (cost) => ticketsFor(cost, PEG, MARKUP_START);

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

// Auszahlungsstufen für Top X: jede Stufe verdoppelt die Plätze.
const TIERS = [
  { label: "1. Platz", from: 1, to: 1 },
  { label: "2. Platz", from: 2, to: 2 },
  { label: "3.–4.", from: 3, to: 4 },
  { label: "5.–8.", from: 5, to: 8 },
  { label: "9.–16.", from: 9, to: 16 },
  { label: "17.–32.", from: 17, to: 32 },
  { label: "33.–64.", from: 33, to: 64 },
  { label: "65.–128.", from: 65, to: 128 },
  { label: "129.–256.", from: 129, to: 256 },
];
const TIER_START = [24, 16, 8, 6, 4, 2, 1, 1, 1];

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
  const [capacity, setCapacity] = useState(32);
  const [fill, setFill] = useState(100);
  const [tpw, setTpw] = useState(2);
  const [rounds, setRounds] = useState(5);
  const [entry, setEntry] = useState(10);
  const [V, setV] = useState(PEG);              // CHF Warenwert pro Ticket
  const [markup, setMarkup] = useState(MARKUP_START); // % vom Einkaufspreis, den der Spieler zahlt
  const [mode, setMode] = useState("win");
  // Top-8-Verteilung auf dieselbe Ticketmenge wie "pro Win" skaliert: 24 + 16 + 2×8 + 4×6 = 80
  const [payoutPct, setPayoutPct] = useState(25);       // % des Feldes, das Tickets bekommt
  const [tierTickets, setTierTickets] = useState(TIER_START);
  const [tPerWin, setTPerWin] = useState(1);
  const [winBonus, setWinBonus] = useState(10); // Extra-Tickets für den Turniersieger
  const [wall, setWall] = useState(defaultWall);
  const [pick, setPick] = useState("Display OP-07");
  const [fixedM, setFixedM] = useState(110);
  const [feePct, setFeePct] = useState(3);
  const [perTk, setPerTk] = useState(0.3);
  const [team, setTeam] = useState(3);

  const setWF = (id, f, v) => setWall((w) => w.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const delRow = (id) => setWall((w) => w.filter((r) => r.id !== id));
  const addRow = () => setWall((w) => [...w, fromCatalog(pick)]);

  // Ticket-Wert und Aufschlag bestimmen die Wall-Preise — Regler bewegen, Wall zieht nach.
  // Gratis-Preise (Icon, Title, Banner, Custom) behalten ihren Preis, sie haben keinen Einkauf.
  const repriceWall = (v, m) => {
    if (num(v) <= 0 || num(m) <= 0) return;
    setWall((w) => w.map((r) => (num(r.cost) > 0 ? { ...r, tickets: ticketsFor(r.cost, v, m) } : r)));
  };
  const changeV = (v) => { setV(v); repriceWall(v, markup); };
  const changeMarkup = (m) => { setMarkup(m); repriceWall(V, m); };

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
  // Was ein eingelöstes Ticket uns kostet. Bewusst konservativ: digitale Preise, nie eingelöste
  // Tickets und Drops kosten uns nichts und sind hier NICHT eingerechnet — reine Zusatzmarge.
  const RC = wallCostPerTicket;

  const eventsPerMonth = num(tpw) * 4;
  const setTier = (i, v) => setTierTickets((t) => t.map((x, j) => (j === i ? v : x)));
  // Wie viele Plätze im Geld sind, und wie viele davon in eine Staffel fallen.
  const paidFor = (att) => (att < 1 ? 0 : Math.max(1, Math.round(att * num(payoutPct) / 100)));
  const tierCount = (tier, paid) => Math.max(0, Math.min(tier.to, paid) - tier.from + 1);
  const topXTicketsFor = (att) => {
    const paid = paidFor(att);
    return TIERS.reduce((sum, t, i) => sum + tierCount(t, paid) * num(tierTickets[i]), 0);
  };
  const winTicketsFor = (att) =>
    att >= 2 ? num(tPerWin) * Math.floor(att / 2) * num(rounds) + num(winBonus) : 0;

  const calc = (f, md) => {
    const att = Math.round(num(capacity) * f / 100);
    const entries = att * eventsPerMonth;
    const revenue = entries * num(entry);
    const tpe = md === "topx" ? topXTicketsFor(att) : winTicketsFor(att);
    const ticketsMonth = tpe * eventsPerMonth;
    const realCost = ticketsMonth * num(RC);
    const fees = revenue * num(feePct) / 100 + entries * num(perTk);
    const profit = revenue - realCost - fees - num(fixedM);
    return { att, entries, revenue, tpe, ticketsMonth, realCost, fees, profit, pct: revenue > 0 ? realCost / revenue : 0 };
  };

  const dep = [capacity, fill, tpw, rounds, entry, V, RC, payoutPct, tierTickets, tPerWin, winBonus, fixedM, feePct, perTk];
  const A = useMemo(() => calc(num(fill), mode), [...dep, mode]);
  const cTop = useMemo(() => calc(num(fill), "topx"), dep);
  const cWin = useMemo(() => calc(num(fill), "win"), dep);
  const perPersonMonth = A.profit / Math.max(1, num(team));

  // Anteil des Umsatzes, der als Ware zurückgeht: zu tief wirkt geizig, zu hoch frisst die Marge.
  const fairColor = A.pct >= 0.5 && A.pct <= 0.7 ? EMER : (A.pct >= 0.4 && A.pct < 0.5) || (A.pct > 0.7 && A.pct <= 0.8) ? GOLD : ROSE;

  // Spieler-Sicht: was ein Ticket an Eintritt kostet, statt was es an Ware wert ist.
  const avgTicketsPerPlayer = A.att > 0 ? A.tpe / A.att : 0;
  const playerTicketCost = avgTicketsPerPlayer > 0 ? num(entry) / avgTicketsPerPlayer : 0;
  const payback = A.pct; // Anteil des Umsatzes, der als Ware zurück an die Spieler geht
  // Ab welchem Aufschlag die Liga schwarze Zahlen schreibt.
  const breakEvenRC = A.ticketsMonth > 0 ? (A.revenue - A.fees - num(fixedM)) / A.ticketsMonth : 0;
  const breakEvenMarkup = breakEvenRC > 0 ? (num(V) / breakEvenRC) * 100 : 0;
  const paybackColor = payback >= 0.6 ? EMER : payback >= 0.45 ? GOLD : ROSE;
  // Wie viel Eintritt ein Ø-Spieler für einen Preis aufwendet, gemessen am Ladenpreis.
  const effortRatio = wallCostPerTicket > 0 ? playerTicketCost / wallCostPerTicket : 0;

  const paidSeats = paidFor(A.att);
  const lastPaidTier = TIERS.reduce((last, t, i) => (tierCount(t, paidSeats) > 0 ? i : last), 0);
  const earnerTop = mode === "topx" ? num(tierTickets[0]) : num(rounds) * num(tPerWin) + num(winBonus);
  const earnerMid = mode === "topx" ? num(tierTickets[lastPaidTier]) : Math.round(num(rounds) / 2) * num(tPerWin);

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
              <p className="text-sm text-slate-400 mt-1">Monatlich ({eventsPerMonth} Events/Monat). 1 Ticket = {chf(num(V))} Warenwert, Wall-Preis {num(markup)} % vom Einkauf.</p>
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
              <Sec title="Ticket-Wert & Wall-Aufschlag" hint="Beide Regler bepreisen die Prize Wall neu — die Tabelle unten zieht sofort nach.">
                <NumField label="Ticket-Wert" value={V} min={1} max={20} step={0.5} onChange={changeV} suffix="CHF" />
                <NumField label="Spieler zahlt … vom Einkaufspreis" value={markup} min={100} max={400} step={5} onChange={changeMarkup} suffix="%" />
                <Row label="Reale Kosten / Ticket" value={chf(RC)} tone="g" strong />
                <Row
                  label="Break-even bei"
                  value={Math.round(breakEvenMarkup) + " %"}
                  tone={num(markup) >= breakEvenMarkup ? "p" : "n"}
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Bei {num(markup)} % kostet ein Display mit {chf0(230)} Einkauf den Spieler {ticketsFor(230, V, markup)} Tickets
                  — nach Ticket-Wert gerechnet {chf0(ticketsFor(230, V, markup) * num(V))}. Die Differenz ist eure Marge,
                  erspielt statt bezahlt. Ein eingelöstes Ticket kostet euch damit {chf(RC)}; ab {Math.round(breakEvenMarkup)} %
                  Aufschlag seid ihr im Plus. Digitale Preise, nie eingelöste Tickets und Drops sind nicht eingerechnet — die kommen obendrauf.
                </p>
              </Sec>

              {mode === "topx" ? (
                <Sec
                  title="Auszahlung: Top X"
                  hint={"Top " + num(payoutPct) + " % = " + paidSeats + " von " + A.att + " Spielern im Geld. Die Staffeln passen sich der Feldgrösse an."}
                >
                  <NumField label="Bezahlte Plätze" value={payoutPct} min={5} max={100} step={5} onChange={setPayoutPct} suffix="%" />
                  {TIERS.map((t, i) => {
                    const n = tierCount(t, paidSeats);
                    if (n <= 0) return null;
                    return (
                      <NumField
                        key={t.label}
                        label={t.label + (n > 1 ? " · " + n + " × je" : "")}
                        value={tierTickets[i]}
                        min={0}
                        max={200}
                        step={1}
                        onChange={(v) => setTier(i, v)}
                        suffix="T"
                      />
                    );
                  })}
                  <Row label="Summe pro Event" value={tk(A.tpe)} tone="g" strong />
                </Sec>
              ) : (
                <Sec title="Auszahlung: Ticket pro Win" hint={Math.floor(A.att / 2) + " Matches × " + num(rounds) + " Runden = " + (A.tpe - num(winBonus)) + " T, plus " + num(winBonus) + " T Siegerbonus."}>
                  <NumField label="Tickets pro Match-Win" value={tPerWin} min={1} max={10} step={1} onChange={setTPerWin} suffix="T" />
                  <NumField label="Bonus für den Turniersieger" value={winBonus} min={0} max={50} step={1} onChange={setWinBonus} suffix="T" />
                  <Row label={"Turniersieger holt (" + num(rounds) + "–0)"} value={tk(earnerTop) + " · " + chf0(earnerTop * num(V)) + " Ware"} tone="p" />
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Der Bonus geht einmal pro Event an den Erstplatzierten und kostet euch
                    {" " + chf0(num(winBonus) * eventsPerMonth * num(RC))} im Monat.
                  </p>
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
                <Row label={"Ausgegebene Tickets"} value={tk(A.ticketsMonth)} />
                <Row label="Ware (Einkauf der eingelösten Preise)" value={"− " + chf0(A.realCost)} tone="n" />
                <Row label="Zahlungsgebühren" value={"− " + chf0(A.fees)} tone="n" />
                <Row label="Fixkosten" value={"− " + chf0(num(fixedM))} tone="n" />
                <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="text-slate-200 font-medium">Netto-Gewinn / Monat</span>
                  <span className="font-mono text-xl tabular-nums" style={{ color: A.profit >= 0 ? GOLD : ROSE }}>{chf0(A.profit)}</span>
                </div>
              </Sec>

              <Sec title="Spieler-Sicht" hint="Dieselbe Rechnung von der anderen Seite des Tisches.">
                <Row label="Ø Tickets pro Spieler & Event" value={avgTicketsPerPlayer.toFixed(1) + " T"} />
                <Row label="Ticketpreis für den Ø-Spieler" value={chf(playerTicketCost)} tone="n" />
                <Row label="Ticketpreis für den Turniersieger" value={chf(earnerTop > 0 ? num(entry) / earnerTop : 0)} tone="p" />
                <Row
                  label="Ø-Spieler zahlt … × den Ladenpreis"
                  value={effortRatio.toFixed(2).replace(".", ",") + " ×"}
                  tone={effortRatio <= 1.5 ? "p" : effortRatio <= 2 ? "g" : "n"}
                />
                <Row label="Rückfluss an Spieler (Ware ÷ Umsatz)" value={Math.round(payback * 100) + " %"} strong />
                <div className="h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.min(100, payback * 100) + "%", background: paybackColor }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Ein Ticket ist {chf(num(V))} Ware wert, verdient wird es mit Eintritt: {chf(playerTicketCost)} für den
                  Schnitt, {chf(earnerTop > 0 ? num(entry) / earnerTop : 0)} für den Turniersieger. Die Lücke ist eure
                  Marge — plus der Event selbst, den der Eintritt ja auch bezahlt. Unter 45 % Rückfluss wird es für
                  Spieler unattraktiv.
                </p>
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
            <p className="text-[11px] text-slate-500 mb-3">Namen, Ticket-Preise und CHF-Kosten frei anpassen. Die Ticketpreise kommen aus Ticket-Wert und Aufschlag links; hier überschreibst du einzelne Zeilen — bis du einen der beiden Regler wieder bewegst. Grind = Events als {mode === "topx" ? "1. / letzte bezahlte Staffel" : "Sieger / 50%-Spieler"}. „Ø zahlt“ = was ein Durchschnittsspieler an Eintritt investiert, um den Preis zu holen.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-[13px]">
                <thead>
                  <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left pb-1 font-normal">Preis</th>
                    <th className="text-center pb-1 font-normal">Tickets</th>
                    <th className="text-center pb-1 font-normal">Kosten CHF</th>
                    <th className="text-right pb-1 font-normal">CHF-Wert</th>
                    <th className="text-right pb-1 font-normal">K/Ticket</th>
                    <th className="text-right pb-1 font-normal">Grind</th>
                    <th className="text-right pb-1 font-normal">Ø zahlt</th>
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
                        <td className="py-1.5 text-right font-mono text-slate-400">
                          {chf0(num(r.tickets) * playerTicketCost)}
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
              ["Ticket-Wert / reale Kosten", chf(num(V)) + " / " + chf(num(RC))],
              ["Wall-Aufschlag", num(markup) + " % vom Einkaufspreis"],
              ["Auszahlung", mode === "topx" ? "Top " + num(payoutPct) + " % = " + paidSeats + " Plätze (" + topXTicketsFor(A.att) + " T/Event)" : num(tPerWin) + " T pro Win + " + num(winBonus) + " T Siegerbonus (" + winTicketsFor(A.att) + " T/Event)"],
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
              ["Ausgegebene Tickets", tk(A.ticketsMonth)],
              ["Ware (Einkauf der eingelösten Preise)", "− " + chf0(A.realCost)],
              ["Zahlungsgebühren", "− " + chf0(A.fees)],
              ["Fixkosten", "− " + chf0(num(fixedM))],
              ["Netto-Gewinn / Monat", chf0(A.profit)],
              ["Pro Kopf / Monat (÷" + num(team) + ")", chf0(perPersonMonth)],
              ["Preis-Anteil (real)", Math.round(A.pct * 100) + " %"],
              ["Ticketpreis für den Ø-Spieler", chf(playerTicketCost)],
              ["Rückfluss an Spieler", Math.round(payback * 100) + " %"],
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
