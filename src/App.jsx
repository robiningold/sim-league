import React, { useState } from "react";
import TicketRechner from "./TicketRechner.jsx";
import IdeaBoard from "./IdeaBoard.jsx";
import BoardGate from "./BoardGate.jsx";
import { signOut } from "./lib/supabase";
import { useSession } from "./lib/useBoardSync";

const GOLD = "#E0A83B";
const SEA = "#0B1F2E";

const PAGES = [
  { id: "ideen", label: "Idea Dump", hint: "Ideen sammeln, verschieben, verknüpfen" },
  { id: "rechner", label: "Prize-Wall-Rechner", hint: "Ticket-Ökonomie durchrechnen" },
];

export default function App() {
  const [page, setPage] = useState("ideen");
  const { session } = useSession();
  const active = PAGES.find((p) => p.id === page);

  return (
    <div className="app-shell flex flex-col" style={{ background: SEA, height: "100dvh" }}>
      <style>{`
        input, select, textarea { font-size: 16px; }
        /* Kein Runterziehen zum Neuladen und kein Wegfedern: der Seitenkörper
           scrollt nicht, gescrollt wird nur innerhalb der Inhaltsfläche. */
        html, body, #root {
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: auto;
        }
        @media screen { .print-only { display: none; } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          html, body, #root, .app-shell, .app-main {
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <BoardGate>
        <header className="no-print shrink-0 border-b border-slate-800/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-6 sm:py-3">
            <span className="font-serif text-slate-100">OP TCG Liga</span>
            <nav className="flex gap-1">
              {PAGES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPage(p.id)}
                  title={p.hint}
                  className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors"
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
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-[11px] text-slate-500 lg:block">{active?.hint}</span>
              {session && (
                <button
                  onClick={() => void signOut()}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[12px] text-slate-400 transition-colors hover:text-slate-200"
                >
                  Abmelden
                </button>
              )}
            </div>
          </div>
        </header>

        <main
          className={`app-main min-h-0 flex-1 ${page === "rechner" ? "overflow-y-auto" : "no-print overflow-hidden"}`}
        >
          {page === "rechner" ? <TicketRechner /> : <IdeaBoard />}
        </main>
      </BoardGate>
    </div>
  );
}
