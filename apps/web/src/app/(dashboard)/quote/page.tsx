"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Euro,
  Filter,
} from "lucide-react";

interface Quota {
  id: string;
  socio: string;
  tipo: string;
  importo: number;
  dataEmissione: string;
  dataScadenza: string;
  stato: "pagata" | "in_attesa" | "scaduta" | "parziale";
}

const STATI_LABELS: Record<string, string> = {
  pagata: "Pagata",
  in_attesa: "In attesa",
  scaduta: "Scaduta",
  parziale: "Parziale",
};

const STATI_COLORS: Record<string, string> = {
  pagata: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_attesa: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  scaduta: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  parziale: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const SAMPLE_QUOTE: Quota[] = [
  { id: "1", socio: "Mario Rossi", tipo: "Quota Annuale", importo: 250, dataEmissione: "2026-01-15", dataScadenza: "2026-12-31", stato: "pagata" },
  { id: "2", socio: "Luca Bianchi", tipo: "Quota Mensile", importo: 50, dataEmissione: "2026-04-01", dataScadenza: "2026-04-30", stato: "in_attesa" },
  { id: "3", socio: "Anna Verdi", tipo: "Quota Annuale", importo: 250, dataEmissione: "2025-06-01", dataScadenza: "2026-05-31", stato: "scaduta" },
  { id: "4", socio: "Giulia Neri", tipo: "Iscrizione Corso", importo: 120, dataEmissione: "2026-03-01", dataScadenza: "2026-06-30", stato: "pagata" },
  { id: "5", socio: "Paolo Gialli", tipo: "Quota Mensile", importo: 50, dataEmissione: "2026-04-01", dataScadenza: "2026-04-30", stato: "parziale" },
  { id: "6", socio: "Sara Blu", tipo: "Quota Annuale", importo: 250, dataEmissione: "2026-02-01", dataScadenza: "2027-01-31", stato: "pagata" },
];

export default function QuotePage() {
  const [search, setSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState("tutti");
  const [periodoFilter, setPeriodoFilter] = useState("tutti");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = useMemo(() => {
    let data = SAMPLE_QUOTE;
    if (statoFilter !== "tutti") {
      data = data.filter((q) => q.stato === statoFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (q) =>
          q.socio.toLowerCase().includes(s) ||
          q.tipo.toLowerCase().includes(s),
      );
    }
    return data;
  }, [search, statoFilter]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const totaleIncassato = SAMPLE_QUOTE.filter((q) => q.stato === "pagata").reduce(
    (sum, q) => sum + q.importo,
    0,
  );

  const totaleDovuto = SAMPLE_QUOTE.filter(
    (q) => q.stato === "in_attesa" || q.stato === "scaduta",
  ).reduce((sum, q) => sum + q.importo, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Quote e Pagamenti
          </h1>
          <p className="text-muted-foreground">
            Gestisci le quote associative e i pagamenti
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Totale Incassato</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            &euro; {totaleIncassato.toLocaleString("it-IT")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Da Incassare</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            &euro; {totaleDovuto.toLocaleString("it-IT")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Quote Pagate</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {SAMPLE_QUOTE.filter((q) => q.stato === "pagata").length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Quote Scadute</p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {SAMPLE_QUOTE.filter((q) => q.stato === "scaduta").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per socio o tipo..."
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={statoFilter}
          onChange={(e) => setStatoFilter(e.target.value)}
        >
          <option value="tutti">Tutti gli stati</option>
          <option value="pagata">Pagata</option>
          <option value="in_attesa">In attesa</option>
          <option value="scaduta">Scaduta</option>
          <option value="parziale">Parziale</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={periodoFilter}
          onChange={(e) => setPeriodoFilter(e.target.value)}
        >
          <option value="tutti">Tutti i periodi</option>
          <option value="mese_corrente">Mese corrente</option>
          <option value="trimestre">Ultimo trimestre</option>
          <option value="anno">Anno corrente</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Socio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Importo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Emissione
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Scadenza
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Stato
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nessuna quota trovata
                  </td>
                </tr>
              ) : (
                paged.map((quota) => (
                  <tr
                    key={quota.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {quota.socio}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {quota.tipo}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Euro className="h-3.5 w-3.5" />
                        {quota.importo.toLocaleString("it-IT")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(quota.dataEmissione).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(quota.dataScadenza).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATI_COLORS[quota.stato]}`}
                      >
                        {STATI_LABELS[quota.stato]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} quote totali
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Pagina {page + 1} di {totalPages}
            </span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
