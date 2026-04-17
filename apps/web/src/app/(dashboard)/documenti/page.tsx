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
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  FileText,
  FileCheck,
  Receipt,
  ClipboardList,
  ShieldCheck,
  File,
  Shield,
} from "lucide-react";
import Link from "next/link";

type TipoDocumento = "certificato" | "ricevuta" | "modulo" | "liberatoria" | "altro";

interface Documento {
  id: string;
  nome: string;
  tipo: TipoDocumento;
  socio: string;
  data: string;
  dimensione: string;
}

const TIPO_LABELS: Record<TipoDocumento, string> = {
  certificato: "Certificato",
  ricevuta: "Ricevuta",
  modulo: "Modulo",
  liberatoria: "Liberatoria",
  altro: "Altro",
};

const TIPO_COLORS: Record<TipoDocumento, string> = {
  certificato: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ricevuta: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  modulo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  liberatoria: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  altro: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const TIPO_ICONS: Record<TipoDocumento, typeof FileText> = {
  certificato: FileCheck,
  ricevuta: Receipt,
  modulo: ClipboardList,
  liberatoria: ShieldCheck,
  altro: File,
};

// Sample data - replace with tRPC query
const SAMPLE_DOCUMENTI: Documento[] = [
  { id: "1", nome: "Certificato medico - Rossi Mario", tipo: "certificato", socio: "Mario Rossi", data: "2026-04-10", dimensione: "245 KB" },
  { id: "2", nome: "Ricevuta quota associativa #2026-042", tipo: "ricevuta", socio: "Luca Bianchi", data: "2026-04-08", dimensione: "120 KB" },
  { id: "3", nome: "Modulo iscrizione Under 12", tipo: "modulo", socio: "Anna Verdi", data: "2026-04-05", dimensione: "380 KB" },
  { id: "4", nome: "Liberatoria per minore - Neri", tipo: "liberatoria", socio: "Giulia Neri", data: "2026-04-03", dimensione: "150 KB" },
  { id: "5", nome: "Certificato medico - Gialli Paolo", tipo: "certificato", socio: "Paolo Gialli", data: "2026-03-28", dimensione: "210 KB" },
  { id: "6", nome: "Documento identita - Blu Sara", tipo: "altro", socio: "Sara Blu", data: "2026-03-25", dimensione: "1.2 MB" },
  { id: "7", nome: "Ricevuta iscrizione corso nuoto", tipo: "ricevuta", socio: "Anna Verdi", data: "2026-03-20", dimensione: "95 KB" },
  { id: "8", nome: "Liberatoria utilizzo immagini", tipo: "liberatoria", socio: "Mario Rossi", data: "2026-03-18", dimensione: "180 KB" },
];

export default function DocumentiPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("tutti");

  const filteredData = useMemo(() => {
    let data = SAMPLE_DOCUMENTI;
    if (tipoFilter !== "tutti") {
      data = data.filter((d) => d.tipo === tipoFilter);
    }
    return data;
  }, [tipoFilter]);

  const columns = useMemo<ColumnDef<Documento>[]>(
    () => [
      {
        accessorKey: "nome",
        header: "Nome",
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          const Icon = TIPO_ICONS[tipo];
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{row.getValue("nome")}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.getValue("tipo") as TipoDocumento;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_COLORS[tipo]}`}
            >
              {TIPO_LABELS[tipo]}
            </span>
          );
        },
      },
      {
        accessorKey: "socio",
        header: "Socio Associato",
        cell: ({ row }) => (
          <span className="text-sm">{row.getValue("socio")}</span>
        ),
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
      {
        accessorKey: "dimensione",
        header: "Dimensione",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue("dimensione")}</span>
        ),
      },
      {
        id: "azioni",
        header: "Azioni",
        cell: () => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              title="Anteprima"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              title="Scarica"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
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
            Documenti
          </h1>
          <p className="text-muted-foreground">
            Gestisci certificati, ricevute, moduli e documenti dei soci
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Carica Documento
        </button>
      </div>

      {/* Upload drop zone */}
      <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Trascina i file qui oppure clicca per caricare
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG fino a 10 MB
            </p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per nome documento, socio..."
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
          <option value="tutti">Tutti i tipi</option>
          <option value="certificato">Certificato</option>
          <option value="ricevuta">Ricevuta</option>
          <option value="modulo">Modulo</option>
          <option value="liberatoria">Liberatoria</option>
          <option value="altro">Altro</option>
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
                    Nessun documento trovato
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
            {table.getFilteredRowModel().rows.length} documenti totali
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

      {/* GDPR Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Privacy e GDPR</h3>
            <p className="text-sm text-muted-foreground">
              Gestisci i consensi e le informative sulla privacy dei soci
            </p>
          </div>
          <Link
            href="/documenti/consensi"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            Registro Consensi
          </Link>
        </div>
      </div>
    </div>
  );
}
