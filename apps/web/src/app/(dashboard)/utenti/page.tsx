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
	Search,
	Shield,
	ToggleLeft,
	ToggleRight,
	UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";

type RuoloUtente = "admin" | "segreteria" | "istruttore" | "visualizzatore";
type StatoUtente = "attivo" | "disabilitato";

interface Utente {
	id: string;
	nome: string;
	cognome: string;
	email: string;
	ruolo: RuoloUtente;
	stato: StatoUtente;
	ultimoAccesso: string;
}

const RUOLO_LABELS: Record<RuoloUtente, string> = {
	admin: "Admin",
	segreteria: "Segreteria",
	istruttore: "Istruttore",
	visualizzatore: "Visualizzatore",
};

const RUOLO_COLORS: Record<RuoloUtente, string> = {
	admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	segreteria: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	istruttore: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	visualizzatore: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATO_LABELS: Record<StatoUtente, string> = {
	attivo: "Attivo",
	disabilitato: "Disabilitato",
};

const STATO_COLORS: Record<StatoUtente, string> = {
	attivo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	disabilitato: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// Sample data - replace with tRPC query
const SAMPLE_UTENTI: Utente[] = [
	{
		id: "1",
		nome: "Marco",
		cognome: "Amministratore",
		email: "marco@associazione.it",
		ruolo: "admin",
		stato: "attivo",
		ultimoAccesso: "2026-04-17T10:30:00",
	},
	{
		id: "2",
		nome: "Laura",
		cognome: "Segretaria",
		email: "laura@associazione.it",
		ruolo: "segreteria",
		stato: "attivo",
		ultimoAccesso: "2026-04-17T09:15:00",
	},
	{
		id: "3",
		nome: "Paolo",
		cognome: "Rossi",
		email: "paolo.rossi@associazione.it",
		ruolo: "istruttore",
		stato: "attivo",
		ultimoAccesso: "2026-04-16T18:45:00",
	},
	{
		id: "4",
		nome: "Chiara",
		cognome: "Neri",
		email: "chiara.neri@associazione.it",
		ruolo: "istruttore",
		stato: "attivo",
		ultimoAccesso: "2026-04-16T17:00:00",
	},
	{
		id: "5",
		nome: "Giuseppe",
		cognome: "Verdi",
		email: "giuseppe.verdi@associazione.it",
		ruolo: "visualizzatore",
		stato: "attivo",
		ultimoAccesso: "2026-04-15T14:20:00",
	},
	{
		id: "6",
		nome: "Francesca",
		cognome: "Blu",
		email: "francesca.blu@associazione.it",
		ruolo: "istruttore",
		stato: "disabilitato",
		ultimoAccesso: "2026-03-20T11:00:00",
	},
];

export default function UtentiPage() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [ruoloFilter, setRuoloFilter] = useState<string>("tutti");
	const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
		const states: Record<string, boolean> = {};
		SAMPLE_UTENTI.forEach((u) => {
			states[u.id] = u.stato === "attivo";
		});
		return states;
	});

	const filteredData = useMemo(() => {
		let data = SAMPLE_UTENTI;
		if (ruoloFilter !== "tutti") {
			data = data.filter((u) => u.ruolo === ruoloFilter);
		}
		return data;
	}, [ruoloFilter]);

	const handleToggle = (userId: string) => {
		setToggleStates((prev) => ({ ...prev, [userId]: !prev[userId] }));
	};

	const columns = useMemo<ColumnDef<Utente>[]>(
		() => [
			{
				accessorKey: "nome",
				header: "Nome",
			},
			{
				accessorKey: "cognome",
				header: "Cognome",
				cell: ({ row }) => <span className="font-medium">{row.getValue("cognome")}</span>,
			},
			{
				accessorKey: "email",
				header: "Email",
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">{row.getValue("email")}</span>
				),
			},
			{
				accessorKey: "ruolo",
				header: "Ruolo",
				cell: ({ row }) => {
					const ruolo = row.getValue("ruolo") as RuoloUtente;
					return (
						<span
							className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${RUOLO_COLORS[ruolo]}`}
						>
							{RUOLO_LABELS[ruolo]}
						</span>
					);
				},
			},
			{
				accessorKey: "stato",
				header: "Stato",
				cell: ({ row }) => {
					const stato = row.getValue("stato") as StatoUtente;
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
				accessorKey: "ultimoAccesso",
				header: "Ultimo Accesso",
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{new Date(row.getValue("ultimoAccesso") as string).toLocaleString("it-IT", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				),
			},
			{
				id: "azioni",
				header: "Azioni",
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<select
							className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
							defaultValue={row.original.ruolo}
						>
							<option value="admin">Admin</option>
							<option value="segreteria">Segreteria</option>
							<option value="istruttore">Istruttore</option>
							<option value="visualizzatore">Visualizzatore</option>
						</select>
						<button
							type="button"
							className="inline-flex items-center"
							onClick={() => handleToggle(row.original.id)}
							title={toggleStates[row.original.id] ? "Disabilita" : "Abilita"}
						>
							{toggleStates[row.original.id] ? (
								<ToggleRight className="h-5 w-5 text-primary" />
							) : (
								<ToggleLeft className="h-5 w-5 text-muted-foreground" />
							)}
						</button>
					</div>
				),
			},
		],
		[toggleStates],
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
					<div className="mb-1 flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						<h1 className="text-3xl font-bold tracking-tight text-foreground">Utenti</h1>
					</div>
					<p className="text-muted-foreground">
						Gestisci gli utenti e i permessi di accesso alla piattaforma
					</p>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<UserPlus className="h-4 w-4" />
					Invita Utente
				</button>
			</div>

			{/* Filters bar */}
			<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Cerca per nome, cognome, email..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
					/>
				</div>
				<select
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={ruoloFilter}
					onChange={(e) => setRuoloFilter(e.target.value)}
				>
					<option value="tutti">Tutti i ruoli</option>
					<option value="admin">Admin</option>
					<option value="segreteria">Segreteria</option>
					<option value="istruttore">Istruttore</option>
					<option value="visualizzatore">Visualizzatore</option>
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
										Nessun utente trovato
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
						{table.getFilteredRowModel().rows.length} utenti totali
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
