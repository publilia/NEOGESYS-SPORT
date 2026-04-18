"use client";

import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Flag,
	MapPin,
	Plus,
	Search,
	Star,
	Target,
	Tent,
	Trophy,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type TipoEvento = "gara" | "torneo" | "stage" | "saggio" | "raduno";
type StatoEvento = "aperto" | "chiuso" | "in_corso";

interface Evento {
	id: string;
	nome: string;
	tipo: TipoEvento;
	data: string;
	dataFine: string;
	luogo: string;
	disciplina: string;
	iscrizioniCount: number;
	maxPartecipanti: number;
	stato: StatoEvento;
	partecipanti: { nome: string; cognome: string; tessera: string }[];
}

const TIPO_LABELS: Record<TipoEvento, string> = {
	gara: "Gara",
	torneo: "Torneo",
	stage: "Stage",
	saggio: "Saggio",
	raduno: "Raduno",
};

const TIPO_ICONS: Record<TipoEvento, typeof Trophy> = {
	gara: Trophy,
	torneo: Flag,
	stage: Star,
	saggio: Target,
	raduno: Tent,
};

const STATO_LABELS: Record<StatoEvento, string> = {
	aperto: "Aperto",
	chiuso: "Chiuso",
	in_corso: "In corso",
};

const STATO_COLORS: Record<StatoEvento, string> = {
	aperto: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	chiuso: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	in_corso: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const SAMPLE_EVENTI: Evento[] = [
	{
		id: "1",
		nome: "Torneo Primavera Under 14",
		tipo: "torneo",
		data: "2026-05-10",
		dataFine: "2026-05-11",
		luogo: "Campo Sportivo Centrale",
		disciplina: "Calcio",
		iscrizioniCount: 32,
		maxPartecipanti: 48,
		stato: "aperto",
		partecipanti: [
			{ nome: "Mario", cognome: "Rossi", tessera: "SOC-001" },
			{ nome: "Luca", cognome: "Bianchi", tessera: "SOC-002" },
		],
	},
	{
		id: "2",
		nome: "Gara Regionale Nuoto",
		tipo: "gara",
		data: "2026-04-20",
		dataFine: "2026-04-20",
		luogo: "Piscina Olimpica",
		disciplina: "Nuoto",
		iscrizioniCount: 15,
		maxPartecipanti: 30,
		stato: "aperto",
		partecipanti: [{ nome: "Anna", cognome: "Verdi", tessera: "SOC-003" }],
	},
	{
		id: "3",
		nome: "Stage Tecnico Tennis",
		tipo: "stage",
		data: "2026-04-15",
		dataFine: "2026-04-17",
		luogo: "Centro Tennis",
		disciplina: "Tennis",
		iscrizioniCount: 20,
		maxPartecipanti: 20,
		stato: "chiuso",
		partecipanti: [
			{ nome: "Giulia", cognome: "Neri", tessera: "SOC-004" },
			{ nome: "Paolo", cognome: "Gialli", tessera: "SOC-005" },
		],
	},
	{
		id: "4",
		nome: "Saggio di Ginnastica Artistica",
		tipo: "saggio",
		data: "2026-06-15",
		dataFine: "2026-06-15",
		luogo: "Palestra Principale",
		disciplina: "Ginnastica",
		iscrizioniCount: 25,
		maxPartecipanti: 40,
		stato: "aperto",
		partecipanti: [],
	},
	{
		id: "5",
		nome: "Raduno Estivo Pallavolo",
		tipo: "raduno",
		data: "2026-04-16",
		dataFine: "2026-04-18",
		luogo: "Palazzetto dello Sport",
		disciplina: "Pallavolo",
		iscrizioniCount: 12,
		maxPartecipanti: 14,
		stato: "in_corso",
		partecipanti: [{ nome: "Sara", cognome: "Blu", tessera: "SOC-006" }],
	},
];

export default function EventiPage() {
	const [search, setSearch] = useState("");
	const [tipoFilter, setTipoFilter] = useState<string>("tutti");
	const [disciplinaFilter, setDisciplinaFilter] = useState<string>("tutti");
	const [dataInizio, setDataInizio] = useState("");
	const [dataFine, setDataFine] = useState("");
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const discipline = useMemo(() => [...new Set(SAMPLE_EVENTI.map((e) => e.disciplina))], []);

	const filtered = useMemo(() => {
		let data = SAMPLE_EVENTI;
		if (tipoFilter !== "tutti") {
			data = data.filter((e) => e.tipo === tipoFilter);
		}
		if (disciplinaFilter !== "tutti") {
			data = data.filter((e) => e.disciplina === disciplinaFilter);
		}
		if (dataInizio) {
			data = data.filter((e) => e.data >= dataInizio);
		}
		if (dataFine) {
			data = data.filter((e) => e.data <= dataFine);
		}
		if (search) {
			const s = search.toLowerCase();
			data = data.filter(
				(e) => e.nome.toLowerCase().includes(s) || e.luogo.toLowerCase().includes(s),
			);
		}
		return data;
	}, [search, tipoFilter, disciplinaFilter, dataInizio, dataFine]);

	return (
		<div className="space-y-6 p-6">
			{/* Page header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">Eventi</h1>
					<p className="text-muted-foreground">Gestisci gare, tornei, stage, saggi e raduni</p>
				</div>
				<Link
					href="/eventi/nuovo"
					className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					Nuovo Evento
				</Link>
			</div>

			{/* Filters bar */}
			<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:flex-wrap">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Cerca per nome, luogo..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<select
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={tipoFilter}
					onChange={(e) => setTipoFilter(e.target.value)}
				>
					<option value="tutti">Tutti i tipi</option>
					{(Object.keys(TIPO_LABELS) as TipoEvento[]).map((t) => (
						<option key={t} value={t}>
							{TIPO_LABELS[t]}
						</option>
					))}
				</select>
				<select
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={disciplinaFilter}
					onChange={(e) => setDisciplinaFilter(e.target.value)}
				>
					<option value="tutti">Tutte le discipline</option>
					{discipline.map((d) => (
						<option key={d} value={d}>
							{d}
						</option>
					))}
				</select>
				<input
					type="date"
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={dataInizio}
					onChange={(e) => setDataInizio(e.target.value)}
					placeholder="Da"
				/>
				<input
					type="date"
					className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={dataFine}
					onChange={(e) => setDataFine(e.target.value)}
					placeholder="A"
				/>
			</div>

			{/* Events list */}
			<div className="space-y-3">
				{filtered.length === 0 ? (
					<div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
						Nessun evento trovato
					</div>
				) : (
					filtered.map((evento) => {
						const TipoIcon = TIPO_ICONS[evento.tipo];
						const isExpanded = expandedId === evento.id;
						return (
							<div
								key={evento.id}
								className="rounded-xl border border-border bg-card overflow-hidden"
							>
								<div
									className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-muted/30"
									onClick={() => setExpandedId(isExpanded ? null : evento.id)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											setExpandedId(isExpanded ? null : evento.id);
										}
									}}
									role="button"
									tabIndex={0}
								>
									<div className="flex items-start gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
											<TipoIcon className="h-5 w-5" />
										</div>
										<div>
											<h3 className="font-semibold text-foreground">{evento.nome}</h3>
											<div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
												<span className="inline-flex items-center gap-1">
													<Calendar className="h-3.5 w-3.5" />
													{new Date(evento.data).toLocaleDateString("it-IT")}
													{evento.data !== evento.dataFine &&
														` - ${new Date(evento.dataFine).toLocaleDateString("it-IT")}`}
												</span>
												<span className="inline-flex items-center gap-1">
													<MapPin className="h-3.5 w-3.5" />
													{evento.luogo}
												</span>
												<span className="inline-flex items-center gap-1">
													<Users className="h-3.5 w-3.5" />
													{evento.iscrizioniCount}/{evento.maxPartecipanti} iscritti
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-3">
										<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
											{TIPO_LABELS[evento.tipo]}
										</span>
										<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
											{evento.disciplina}
										</span>
										<span
											className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATO_COLORS[evento.stato]}`}
										>
											{STATO_LABELS[evento.stato]}
										</span>
										{isExpanded ? (
											<ChevronUp className="h-4 w-4 text-muted-foreground" />
										) : (
											<ChevronDown className="h-4 w-4 text-muted-foreground" />
										)}
									</div>
								</div>

								{/* Expanded details */}
								{isExpanded && (
									<div className="border-t border-border bg-muted/20 p-5">
										<h4 className="mb-3 text-sm font-semibold text-foreground">
											Partecipanti ({evento.partecipanti.length})
										</h4>
										{evento.partecipanti.length === 0 ? (
											<p className="text-sm text-muted-foreground">Nessun partecipante iscritto</p>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full">
													<thead>
														<tr className="border-b border-border">
															<th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
																Tessera
															</th>
															<th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
																Cognome
															</th>
															<th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
																Nome
															</th>
														</tr>
													</thead>
													<tbody>
														{evento.partecipanti.map((p) => (
															<tr key={p.tessera} className="border-b border-border last:border-0">
																<td className="px-3 py-2 text-sm font-mono">{p.tessera}</td>
																<td className="px-3 py-2 text-sm font-medium">{p.cognome}</td>
																<td className="px-3 py-2 text-sm">{p.nome}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
