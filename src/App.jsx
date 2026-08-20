import React, { useState } from "react";
import TicketRechner from "./TicketRechner.jsx";
import IdeaBoard from "./IdeaBoard.jsx";

const GOLD = "#E0A83B";
const SEA = "#0B1F2E";

const PAGES = [
  { id: "rechner", label: "Prize-Wall-Rechner", hint: "Ticket-Ökonomie durchrechnen" },
  { id: "ideen", label: "Idea Dump", hint: "Ideen sammeln, verschieben, verknüpfen" },
];

export default function App() {
  const [page, setPage] = useState("rechner");
  const active = PAGES.find((p) => p.id === page);

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

      <header className="no-print border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-serif text-slate-100">OP TCG Liga</span>
          <nav className="flex gap-1">
            {PAGES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPage(p.id)}
                title={p.hint}
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium border transition-colors"
                style={{
                  borderColor: page === p.id ? GOLD : "transparent",
                  background: page === p.id ? "rgba(224,168,59,0.12)" : "transparent",
                  color: page === p.id ? GOLD : "#94a3b8",
                }}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <span className="ml-auto text-[11px] text-slate-500 hidden sm:block">{active?.hint}</span>
        </div>
      </header>

      <div className={page === "rechner" ? "" : "no-print"}>
        {page === "rechner" ? (
          <TicketRechner />
        ) : (
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <IdeaBoard />
          </div>
        )}
      </div>
    </div>
  );
}
