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
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

type TipoComunicazione = "email" | "sms" | "whatsapp";
type StatoComunicazione = "inviata" | "bozza" | "in_corso" | "errore" | "programmata";
type TabComunicazione = "inviate" | "bozze" | "programmate";

interface Comunicazione {
  id: string;
  oggetto: string;
  tipo: TipoComunicazione;
  destinatariCount: number;
  stato: StatoComunicazione;
  data: string;
}

const TIPO_ICONS: Record<TipoComunicazione, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageSquare,
};

const TIPO_LABELS: Record<TipoComunicazione, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const STATO_LABELS: Record<StatoComunicazione, string> = {
  inviata: "Inviata",
  bozza: "Bozza",
  in_corso: "In corso",
  errore: "Errore",
  programmata: "Programmata",
};

const STATO_COLORS: Record<StatoComunicazione, string> = {
  inviata: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  bozza: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  in_corso: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  errore: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  programmata: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const TAB_LABELS: Record<TabComunicazione, string> = {
  inviate: "Inviate",
  bozze: "Bozze",
  programmate: "Programmate",
};

// Sample data - replace with tRPC query
const SAMPLE_COMUNICAZIONI: Comunicazione[] = [
  { id: "1", oggetto: "Rinnovo tessera stagione 2026/2027", tipo: "email", destinatariCount: 150, stato: "inviata", data: "2026-04-15" },
  { id: "2", oggetto: "Promemoria allenamento sabato", tipo: "sms", destinatariCount: 24, stato: "inviata", data: "2026-04-14" },
  { id: "3", oggetto: "Convocazione assemblea soci", tipo: "email", destinatariCount: 200, stato: "programmata", data: "2026-04-20" },
  { id: "4", oggetto: "Auguri di Pasqua", tipo: "whatsapp", destinatariCount: 180, stato: "bozza", data: "2026-04-10" },
  { id: "5", oggetto: "Chiusura estiva impianti", tipo: "email", destinatariCount: 200, stato: "in_corso", data: "2026-04-16" },
  { id: "6", oggetto: "Variazione orario corsi", tipo: "sms", destinatariCount: 45, stato: "errore", data: "2026-04-12" },
  { id: "7", oggetto: "Nuovo corso di pilates", tipo: "email", destinatariCount: 0, stato: "bozza", data: "2026-04-11" },
  { id: "8", oggetto: "Reminder quota associativa", tipo: "whatsapp", destinatariCount: 30, stato: "programmata", data: "2026-04-25" },
];

export default function ComunicazioniPage() {
  const [activeTab, setActiveTab] = useState<TabComunicazione>("inviate");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("tutti");

  const filteredData = useMemo(() => {
    let data = SAMPLE_COMUNICAZIONI;

    // Filter by tab
    if (activeTab === "inviate") {
      data = data.filter((c) => c.stato === "inviata" || c.stato === "in_corso" || c.stato === "errore");
    } else if (activeTab === "bozze") {
      data = data.filter((c) => c.stato === "bozza");
    } else if (activeTab === "programmate") {
      data = data.filter((c) => c.stato === "programmata");
    }

    if (tipoFilter !== "tutti") {
      data = data.filter((c) => c.tipo === tipoFilter);
    }

    return data;
  }, [activeTab, tipoFilter]);

  const columns = useMemo<ColumnDef<Comunicazione>[]>(
    () => [
      {
        accessorKey: "oggetto",
        header: "Oggetto",
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("oggetto")}</span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.getValue("tipo") as TipoComunicazione;
          const Icon = TIPO_ICONS[tipo];
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {TIPO_LABELS[tipo]}
            </span>
          );
        },
      },
      {
        accessorKey: "destinatariCount",
        header: "Destinatari",
        cell: ({ row }) => (
          <span className="text-sm">{row.getValue("destinatariCount")}</span>
        ),
      },
      {
        accessorKey: "stato",
        header: "Stato",
        cell: ({ row }) => {
          const stato = row.getValue("stato") as StatoComunicazione;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATO_COLORS[stato]}`}
            >
              {STATO_LABELS[stato]}
            </span>
          );
        },
      },
      {
        accessorKey: "data",
        header: "Data",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.getValue("data") as string).toLocaleDateString("it-IT")}
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
            Comunicazioni
          </h1>
          <p className="text-muted-foreground">
            Invia email, SMS e messaggi WhatsApp ai tuoi soci
          </p>
        </div>
        <Link
          href="/comunicazioni/nuova"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuova Comunicazione
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {(Object.keys(TAB_LABELS) as TabComunicazione[]).map((tab) => (
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

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per oggetto..."
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
          <option value="tutti">Tutti i canali</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
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
                    Nessuna comunicazione trovata
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
            {table.getFilteredRowModel().rows.length} comunicazioni totali
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
    </div>
  );
}
