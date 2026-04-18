"use client";

import {
	ArrowLeft,
	Calendar,
	CheckSquare,
	ClipboardCheck,
	Clock,
	MapPin,
	Settings,
	Square,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TabCorso = "iscritti" | "presenze" | "orario" | "impostazioni";

const TAB_CONFIG: Record<TabCorso, { label: string; icon: typeof Users }> = {
	iscritti: { label: "Iscritti", icon: Users },
	presenze: { label: "Presenze", icon: ClipboardCheck },
	orario: { label: "Orario", icon: Calendar },
	impostazioni: { label: "Impostazioni", icon: Settings },
};

// Sample data - replace with tRPC query
const SAMPLE_CORSO = {
	id: "1",
	nome: "Calcio Under 12",
	disciplina: "Calcio",
	istruttore: "Marco Bianchi",
	giorno: "Lunedi e Mercoledi",
	orario: "16:00 - 17:30",
	luogo: "Campo A",
	iscrittiAttuali: 18,
	capacitaMassima: 20,
	descrizione:
		"Corso di calcio per ragazzi dai 10 ai 12 anni. Allenamenti bisettimanali con focus su tecnica individuale e gioco di squadra.",
};

const SAMPLE_ISCRITTI = [
	{
		id: "1",
		tessera: "SOC-001",
		nome: "Mario",
		cognome: "Rossi",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "2",
		tessera: "SOC-002",
		nome: "Luca",
		cognome: "Bianchi",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "3",
		tessera: "SOC-003",
		nome: "Anna",
		cognome: "Verdi",
		stato: "attivo",
		certificato: "scaduto",
	},
	{
		id: "4",
		tessera: "SOC-004",
		nome: "Giulia",
		cognome: "Neri",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "5",
		tessera: "SOC-005",
		nome: "Paolo",
		cognome: "Gialli",
		stato: "attivo",
		certificato: "valido",
	},
	{
		id: "6",
		tessera: "SOC-007",
		nome: "Andrea",
		cognome: "Marroni",
		stato: "attivo",
		certificato: "valido",
	},
];

const PRESENZE_DATE = ["07/04", "09/04", "14/04", "16/04"];

const SAMPLE_PRESENZE: Record<string, Record<string, boolean>> = {
	"1": { "07/04": true, "09/04": true, "14/04": true, "16/04": false },
	"2": { "07/04": true, "09/04": false, "14/04": true, "16/04": true },
	"3": { "07/04": false, "09/04": true, "14/04": false, "16/04": true },
	"4": { "07/04": true, "09/04": true, "14/04": true, "16/04": true },
	"5": { "07/04": true, "09/04": true, "14/04": false, "16/04": false },
	"6": { "07/04": true, "09/04": true, "14/04": true, "16/04": true },
};

const ORARIO_SETTIMANALE = [
	{ giorno: "Lunedi", orario: "16:00 - 17:30", luogo: "Campo A", attivita: "Allenamento tecnico" },
	{
		giorno: "Mercoledi",
		orario: "16:00 - 17:30",
		luogo: "Campo A",
		attivita: "Partitella e tattica",
	},
];

const CERT_COLORS: Record<string, string> = {
	valido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	scaduto: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	mancante: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function CapacityBar({ current, max }: { current: number; max: number }) {
	const percentage = (current / max) * 100;
	const color =
		percentage >= 90 ? "bg-red-500" : percentage >= 70 ? "bg-yellow-500" : "bg-green-500";

	return (
		<div className="flex items-center gap-3">
			<div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
				<div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
			</div>
			<span className="text-sm font-medium text-foreground">
				{current}/{max}
			</span>
		</div>
	);
}

export default function CorsoDetailPage() {
	const [activeTab, setActiveTab] = useState<TabCorso>("iscritti");
	const [presenze, setPresenze] = useState(SAMPLE_PRESENZE);
	const corso = SAMPLE_CORSO;

	const togglePresenza = (socioId: string, data: string) => {
		setPresenze((prev) => ({
			...prev,
			[socioId]: {
				...prev[socioId],
				[data]: !prev[socioId]?.[data],
			},
		}));
	};

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link
					href="/corsi"
					className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">{corso.nome}</h1>
					<p className="text-sm text-primary">{corso.disciplina}</p>
				</div>
			</div>

			{/* Course info cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-xl border border-border bg-card p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<User className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Istruttore</p>
							<p className="text-sm font-medium text-foreground">{corso.istruttore}</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Clock className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Orario</p>
							<p className="text-sm font-medium text-foreground">{corso.giorno}</p>
							<p className="text-xs text-muted-foreground">{corso.orario}</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<MapPin className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Luogo</p>
							<p className="text-sm font-medium text-foreground">{corso.luogo}</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="mb-2 text-xs text-muted-foreground">Capacita</p>
					<CapacityBar current={corso.iscrittiAttuali} max={corso.capacitaMassima} />
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
				{(Object.keys(TAB_CONFIG) as TabCorso[]).map((tab) => {
					const config = TAB_CONFIG[tab];
					const Icon = config.icon;
					return (
						<button
							key={tab}
							type="button"
							className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === tab
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
							onClick={() => setActiveTab(tab)}
						>
							<Icon className="h-4 w-4" />
							{config.label}
						</button>
					);
				})}
			</div>

			{/* Iscritti Tab */}
			{activeTab === "iscritti" && (
				<div className="overflow-hidden rounded-lg border border-border bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border bg-muted/50">
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Tessera
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Cognome
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Nome
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Stato
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Certificato
									</th>
								</tr>
							</thead>
							<tbody>
								{SAMPLE_ISCRITTI.map((socio) => (
									<tr
										key={socio.id}
										className="border-b border-border last:border-0 hover:bg-muted/30"
									>
										<td className="px-4 py-3 text-sm font-mono">{socio.tessera}</td>
										<td className="px-4 py-3 text-sm font-medium">
											<Link href={`/soci/${socio.id}`} className="text-primary hover:underline">
												{socio.cognome}
											</Link>
										</td>
										<td className="px-4 py-3 text-sm">{socio.nome}</td>
										<td className="px-4 py-3 text-sm">
											<span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 capitalize dark:bg-green-900/30 dark:text-green-400">
												{socio.stato}
											</span>
										</td>
										<td className="px-4 py-3 text-sm">
											<span
												className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CERT_COLORS[socio.certificato]}`}
											>
												{socio.certificato}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="border-t border-border px-4 py-3">
						<p className="text-sm text-muted-foreground">
							{SAMPLE_ISCRITTI.length} iscritti su {corso.capacitaMassima} posti
						</p>
					</div>
				</div>
			)}

			{/* Presenze Tab */}
			{activeTab === "presenze" && (
				<div className="overflow-hidden rounded-lg border border-border bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border bg-muted/50">
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Socio
									</th>
									{PRESENZE_DATE.map((data) => (
										<th
											key={data}
											className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
										>
											{data}
										</th>
									))}
									<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
										%
									</th>
								</tr>
							</thead>
							<tbody>
								{SAMPLE_ISCRITTI.map((socio) => {
									const socioPresenze = presenze[socio.id] || {};
									const totalPresenze = PRESENZE_DATE.filter((d) => socioPresenze[d]).length;
									const percentuale = Math.round((totalPresenze / PRESENZE_DATE.length) * 100);
									return (
										<tr
											key={socio.id}
											className="border-b border-border last:border-0 hover:bg-muted/30"
										>
											<td className="px-4 py-3 text-sm font-medium">
												{socio.cognome} {socio.nome}
											</td>
											{PRESENZE_DATE.map((data) => (
												<td key={data} className="px-4 py-3 text-center">
													<button
														type="button"
														className="inline-flex items-center justify-center"
														onClick={() => togglePresenza(socio.id, data)}
													>
														{socioPresenze[data] ? (
															<CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
														) : (
															<Square className="h-5 w-5 text-muted-foreground" />
														)}
													</button>
												</td>
											))}
											<td className="px-4 py-3 text-center">
												<span
													className={`text-sm font-medium ${
														percentuale >= 75
															? "text-green-600 dark:text-green-400"
															: percentuale >= 50
																? "text-yellow-600 dark:text-yellow-400"
																: "text-red-600 dark:text-red-400"
													}`}
												>
													{percentuale}%
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Orario Tab */}
			{activeTab === "orario" && (
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-foreground">Programma Settimanale</h3>
					<div className="grid gap-4 sm:grid-cols-2">
						{ORARIO_SETTIMANALE.map((slot, index) => (
							<div key={index} className="rounded-xl border border-border bg-card p-5">
								<div className="mb-3 flex items-center gap-2">
									<Calendar className="h-5 w-5 text-primary" />
									<h4 className="font-semibold text-foreground">{slot.giorno}</h4>
								</div>
								<div className="space-y-2 text-sm text-muted-foreground">
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4" />
										<span>{slot.orario}</span>
									</div>
									<div className="flex items-center gap-2">
										<MapPin className="h-4 w-4" />
										<span>{slot.luogo}</span>
									</div>
									<div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
										{slot.attivita}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Impostazioni Tab */}
			{activeTab === "impostazioni" && (
				<div className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-lg font-semibold text-foreground">Impostazioni Corso</h3>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="corso-nome"
								className="mb-1.5 block text-sm font-medium text-foreground"
							>
								Nome del corso
							</label>
							<input
								id="corso-nome"
								type="text"
								defaultValue={corso.nome}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div>
							<label
								htmlFor="corso-descrizione"
								className="mb-1.5 block text-sm font-medium text-foreground"
							>
								Descrizione
							</label>
							<textarea
								id="corso-descrizione"
								rows={3}
								defaultValue={corso.descrizione}
								className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="corso-istruttore"
									className="mb-1.5 block text-sm font-medium text-foreground"
								>
									Istruttore
								</label>
								<input
									id="corso-istruttore"
									type="text"
									defaultValue={corso.istruttore}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							<div>
								<label
									htmlFor="corso-capacita"
									className="mb-1.5 block text-sm font-medium text-foreground"
								>
									Capacita massima
								</label>
								<input
									id="corso-capacita"
									type="number"
									defaultValue={corso.capacitaMassima}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="corso-luogo"
									className="mb-1.5 block text-sm font-medium text-foreground"
								>
									Luogo
								</label>
								<input
									id="corso-luogo"
									type="text"
									defaultValue={corso.luogo}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							<div>
								<label
									htmlFor="corso-disciplina"
									className="mb-1.5 block text-sm font-medium text-foreground"
								>
									Disciplina
								</label>
								<input
									id="corso-disciplina"
									type="text"
									defaultValue={corso.disciplina}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
						<div className="flex justify-end pt-4">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								Salva Modifiche
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
