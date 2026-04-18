"use client";

import {
	type ColumnDef,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Edit,
	Eye,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface Socio {
	id: string;
	tessera: string;
	nome: string;
	cognome: string;
	disciplina: string;
	stato: "attivo" | "scaduto" | "sospeso" | "in_attesa";
	certificato: "valido" | "scaduto" | "mancante";
}

const STATI_LABELS: Record<string, string> = {
	attivo: "Attivo",
	scaduto: "Scaduto",
	sospeso: "Sospeso",
	in_attesa: "In attesa",
};

const STATI_COLORS: Record<string, string> = {
	attivo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	scaduto: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	sospeso: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	in_attesa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const CERT_COLORS: Record<string, string> = {
	valido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	scaduto: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	mancante: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// Sample data - replace with tRPC query
const SAMPLE_SOCI: Socio[] = [
	{
		id: "1",
		tessera: "SOC-001",
		nome: "Mario",
		cognome: "Rossi",
		disciplina: "Calcio",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "2",
		tessera: "SOC-002",
		nome: "Luca",
		cognome: "Bianchi",
		disciplina: "Nuoto",
		stato: "attivo",
		certificato: "scaduto",
	},
	{
		id: "3",
		tessera: "SOC-003",
		nome: "Anna",
		cognome: "Verdi",
		disciplina: "Tennis",
		stato: "scaduto",
		certificato: "mancante",
	},
	{
		id: "4",
		tessera: "SOC-004",
		nome: "Giulia",
		cognome: "Neri",
		disciplina: "Pallavolo",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "5",
		tessera: "SOC-005",
		nome: "Paolo",
		cognome: "Gialli",
		disciplina: "Basket",
		stato: "sospeso",
		certificato: "valido",
	},
	{
		id: "6",
		tessera: "SOC-006",
		nome: "Sara",
		cognome: "Blu",
		disciplina: "Calcio",
		stato: "in_attesa",
		certificato: "mancante",
	},
];

export default function SociPage() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [statoFilter, setStatoFilter] = useState<string>("tutti");
	const [disciplinaFilter, setDisciplinaFilter] = useState<string>("tutti");
	const [openActions, setOpenActions] = useState<string | null>(null);

	const filteredData = useMemo(() => {
		let data = SAMPLE_SOCI;
		if (statoFilter !== "tutti") {
			data = data.filter((s) => s.stato === statoFilter);
		}
		if (disciplinaFilter !== "tutti") {
			data = data.filter((s) => s.disciplina === disciplinaFilter);
		}
		return data;
	}, [statoFilter, disciplinaFilter]);

	const disciplines = useMemo(() => [...new Set(SAMPLE_SOCI.map((s) => s.disciplina))], []);

	const columns = useMemo<ColumnDef<Socio>[]>(
		() => [
			{
				accessorKey: "tessera",
				header: "Tessera",
				cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("tessera")}</span>,
			},
			{
				accessorKey: "cognome",
				header: "Cognome",
				cell: ({ row }) => <span className="font-medium">{row.getValue("cognome")}</span>,
			},
			{
				accessorKey: "nome",
				header: "Nome",
			},
			{
				accessorKey: "disciplina",
				header: "Disciplina",
			},
			{
				accessorKey: "stato",
				header: "Stato",
				cell: ({ row }) => {
					const stato = row.getValue("stato") as string;
					return (
						<span
							className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATI_COLORS[stato]}`}
						>
							{STATI_LABELS[stato]}
						</span>
					);
				},
			},
			{
				accessorKey: "certificato",
				header: "Certificato",
				cell: ({ row }) => {
					const cert = row.getValue("certificato") as string;
					return (
						<span
							className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CERT_COLORS[cert]}`}
						>
							{cert}
						</span>
					);
				},
			},
			{
				id: "azioni",
				header: "Azioni",
				cell: ({ row }) => (
					<div className="relative">
						<button
							type="button"
							className="rounded-md p-1 hover:bg-muted"
							onClick={() =>
								setOpenActions(openActions === row.original.id ? null : row.original.id)
							}
						>
							<MoreHorizontal className="h-4 w-4" />
						</button>
						{openActions === row.original.id && (
							<div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-popover py-1 shadow-lg">
								<button
									type="button"
									className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
									onClick={() => setOpenActions(null)}
								>
									<Eye className="h-3.5 w-3.5" /> Visualizza
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
									onClick={() => setOpenActions(null)}
								>
									<Edit className="h-3.5 w-3.5" /> Modifica
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted"
									onClick={() => setOpenActions(null)}
								>
									<Trash2 className="h-3.5 w-3.5" /> Elimina
								</button>
							</div>
						)}
					</div>
				),
			},
		],
		[openActions],
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
					<h1 className="text-3xl font-bold tracking-tight text-foreground">Soci</h1>
					<p className="text-muted-foreground">Gestisci i soci della tua associazione</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
					<Link
						href="/soci/nuovo"
						className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />
						Nuovo Socio
					</Link>
				</div>
			</div>

			{/* Filters bar */}
			<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
				{/* Search */}
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Cerca per nome, cognome, tessera..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
					/>
				</div>

				{/* Stato filter */}
				<select
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={statoFilter}
					onChange={(e) => setStatoFilter(e.target.value)}
				>
					<option value="tutti">Tutti gli stati</option>
					<option value="attivo">Attivo</option>
					<option value="scaduto">Scaduto</option>
					<option value="sospeso">Sospeso</option>
					<option value="in_attesa">In attesa</option>
				</select>

				{/* Disciplina filter */}
				<select
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={disciplinaFilter}
					onChange={(e) => setDisciplinaFilter(e.target.value)}
				>
					<option value="tutti">Tutte le discipline</option>
					{disciplines.map((d) => (
						<option key={d} value={d}>
							{d}
						</option>
					))}
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
												: flexRender(header.column.columnDef.header, header.getContext())}
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
										Nessun socio trovato
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
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
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
						{table.getFilteredRowModel().rows.length} soci totali
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
							Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()}
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
