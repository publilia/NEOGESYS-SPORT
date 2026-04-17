"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";

type TabContabilita = "prima_nota" | "riepilogo" | "export";
type TipoMovimento = "entrata" | "uscita";

interface Movimento {
  id: string;
  data: string;
  causale: string;
  descrizione: string;
  tipo: TipoMovimento;
  importo: number;
  saldo: number;
}

const TAB_LABELS: Record<TabContabilita, string> = {
  prima_nota: "Prima Nota",
  riepilogo: "Riepilogo",
  export: "Export",
};

const CAUSALI = [
  "Quota associativa",
  "Iscrizione corso",
  "Affitto struttura",
  "Stipendio istruttore",
  "Materiale sportivo",
  "Utenze",
  "Manutenzione",
  "Sponsorizzazione",
  "Evento",
  "Altro",
];

// Sample data - replace with tRPC query
const SAMPLE_MOVIMENTI: Movimento[] = [
  { id: "1", data: "2026-04-16", causale: "Quota associativa", descrizione: "Rossi Mario - Rinnovo annuale", tipo: "entrata", importo: 120, saldo: 15420 },
  { id: "2", data: "2026-04-15", causale: "Stipendio istruttore", descrizione: "Bianchi Marco - Aprile 2026", tipo: "uscita", importo: 1200, saldo: 15300 },
  { id: "3", data: "2026-04-14", causale: "Iscrizione corso", descrizione: "Verdi Anna - Nuoto Principianti", tipo: "entrata", importo: 80, saldo: 16500 },
  { id: "4", data: "2026-04-13", causale: "Utenze", descrizione: "Bolletta energia elettrica - Marzo", tipo: "uscita", importo: 450, saldo: 16420 },
  { id: "5", data: "2026-04-12", causale: "Materiale sportivo", descrizione: "Palloni calcio x20", tipo: "uscita", importo: 300, saldo: 16870 },
  { id: "6", data: "2026-04-11", causale: "Sponsorizzazione", descrizione: "Sponsor locale - Trimestre Q2", tipo: "entrata", importo: 2000, saldo: 17170 },
  { id: "7", data: "2026-04-10", causale: "Quota associativa", descrizione: "Neri Giulia - Rinnovo annuale", tipo: "entrata", importo: 120, saldo: 15170 },
  { id: "8", data: "2026-04-09", causale: "Manutenzione", descrizione: "Riparazione rete campo tennis", tipo: "uscita", importo: 180, saldo: 15050 },
];

export default function ContabilitaPage() {
  const [activeTab, setActiveTab] = useState<TabContabilita>("prima_nota");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("tutti");
  const [causaleFilter, setCausaleFilter] = useState<string>("tutti");
  const [periodoInizio, setPeriodoInizio] = useState("");
  const [periodoFine, setPeriodoFine] = useState("");

  const totaleEntrate = useMemo(
    () => SAMPLE_MOVIMENTI.filter((m) => m.tipo === "entrata").reduce((sum, m) => sum + m.importo, 0),
    [],
  );

  const totaleUscite = useMemo(
    () => SAMPLE_MOVIMENTI.filter((m) => m.tipo === "uscita").reduce((sum, m) => sum + m.importo, 0),
    [],
  );

  const saldo = totaleEntrate - totaleUscite;

  const filteredData = useMemo(() => {
    let data = SAMPLE_MOVIMENTI;
    if (tipoFilter !== "tutti") {
      data = data.filter((m) => m.tipo === tipoFilter);
    }
    if (causaleFilter !== "tutti") {
      data = data.filter((m) => m.causale === causaleFilter);
    }
    if (periodoInizio) {
      data = data.filter((m) => m.data >= periodoInizio);
    }
    if (periodoFine) {
      data = data.filter((m) => m.data <= periodoFine);
    }
    return data;
  }, [tipoFilter, causaleFilter, periodoInizio, periodoFine]);

  const columns = useMemo<ColumnDef<Movimento>[]>(
    () => [
      {
        accessorKey: "data",
        header: "Data",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.getValue("data") as string).toLocaleDateString("it-IT")}
          </span>
        ),
      },
      {
        accessorKey: "causale",
        header: "Causale",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.getValue("causale")}</span>
        ),
      },
      {
        accessorKey: "descrizione",
        header: "Descrizione",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue("descrizione")}</span>
        ),
      },
      {
        id: "entrata",
        header: "Entrata",
        cell: ({ row }) =>
          row.original.tipo === "entrata" ? (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              +{row.original.importo.toFixed(2)} &euro;
            </span>
          ) : null,
      },
      {
        id: "uscita",
        header: "Uscita",
        cell: ({ row }) =>
          row.original.tipo === "uscita" ? (
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              -{row.original.importo.toFixed(2)} &euro;
            </span>
          ) : null,
      },
      {
        accessorKey: "saldo",
        header: "Saldo",
        cell: ({ row }) => (
          <span className="text-sm font-mono">
            {(row.getValue("saldo") as number).toFixed(2)} &euro;
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Contabilita
          </h1>
          <p className="text-muted-foreground">
            Gestisci la prima nota e i movimenti contabili
          </p>
        </div>
        {activeTab === "prima_nota" && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuovo Movimento
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totale Entrate</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {totaleEntrate.toFixed(2)} &euro;
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totale Uscite</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {totaleUscite.toFixed(2)} &euro;
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-xl font-bold text-foreground">
                {saldo.toFixed(2)} &euro;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {(Object.keys(TAB_LABELS) as TabContabilita[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Prima Nota Tab */}
      {activeTab === "prima_nota" && (
        <>
          {/* Filters bar */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per descrizione, causale..."
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="tutti">Entrate e uscite</option>
              <option value="entrata">Solo entrate</option>
              <option value="uscita">Solo uscite</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={causaleFilter}
              onChange={(e) => setCausaleFilter(e.target.value)}
            >
              <option value="tutti">Tutte le causali</option>
              {CAUSALI.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={periodoInizio}
              onChange={(e) => setPeriodoInizio(e.target.value)}
            />
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={periodoFine}
              onChange={(e) => setPeriodoFine(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-border bg-muted/50">
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nessun movimento trovato
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-sm">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} movimenti totali
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  Pagina {table.getState().pagination.pageIndex + 1} di{" "}
                  {table.getPageCount()}
                </span>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Riepilogo Tab */}
      {activeTab === "riepilogo" && (
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Grafici e statistiche</h3>
              <p className="text-sm text-muted-foreground">
                I grafici di riepilogo entrate/uscite saranno disponibili qui.
                <br />
                Andamento mensile, distribuzione per causale, confronto periodi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === "export" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Esporta dati contabili</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Scarica i movimenti contabili nel formato desiderato. I filtri attivi vengono applicati all&apos;export.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              className="flex items-center gap-4 rounded-xl border border-border bg-background p-5 text-left hover:bg-muted/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Esporta CSV</p>
                <p className="text-sm text-muted-foreground">Formato compatibile con Excel e Google Sheets</p>
              </div>
              <Download className="ml-auto h-5 w-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="flex items-center gap-4 rounded-xl border border-border bg-background p-5 text-left hover:bg-muted/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Esporta PDF</p>
                <p className="text-sm text-muted-foreground">Documento formattato per stampa e archiviazione</p>
              </div>
              <Download className="ml-auto h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
