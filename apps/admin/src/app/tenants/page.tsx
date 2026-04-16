"use client";

import { useState } from "react";
import Link from "next/link";
import {
	Plus,
	Search,
	Filter,
	Building2,
	MoreVertical,
	ExternalLink,
} from "lucide-react";

type TenantStato = "attivo" | "trial" | "sospeso" | "chiuso";
type Piano = "free" | "base" | "pro" | "enterprise";

interface Tenant {
	id: string;
	slug: string;
	ragioneSociale: string;
	tipoEnte: string;
	piano: Piano;
	stato: TenantStato;
	soci: number;
	createdAt: string;
}

/** Placeholder data - replace with real API calls */
const tenants: Tenant[] = [
	{
		id: "1",
		slug: "demo-asd",
		ragioneSociale: "ASD Demo Sport",
		tipoEnte: "ASD",
		piano: "pro",
		stato: "attivo",
		soci: 120,
		createdAt: "2025-09-01",
	},
	{
		id: "2",
		slug: "asd-aquila-roma",
		ragioneSociale: "ASD Aquila Roma",
		tipoEnte: "ASD",
		piano: "pro",
		stato: "attivo",
		soci: 85,
		createdAt: "2026-01-15",
	},
	{
		id: "3",
		slug: "ssd-olimpia-milano",
		ragioneSociale: "SSD Olimpia Milano",
		tipoEnte: "SSD",
		piano: "base",
		stato: "trial",
		soci: 30,
		createdAt: "2026-04-10",
	},
	{
		id: "4",
		slug: "fed-nuoto-lazio",
		ragioneSociale: "Federazione Nuoto Lazio",
		tipoEnte: "FED",
		piano: "enterprise",
		stato: "attivo",
		soci: 450,
		createdAt: "2025-06-20",
	},
	{
		id: "5",
		slug: "asd-vela-napoli",
		ragioneSociale: "ASD Vela Napoli",
		tipoEnte: "ASD",
		piano: "free",
		stato: "sospeso",
		soci: 12,
		createdAt: "2026-03-05",
	},
];

function StatoBadge({ stato }: { stato: TenantStato }) {
	const config: Record<TenantStato, { label: string; className: string }> = {
		attivo: {
			label: "Attivo",
			className: "bg-emerald-100 text-emerald-700",
		},
		trial: {
			label: "In prova",
			className: "bg-amber-100 text-amber-700",
		},
		sospeso: {
			label: "Sospeso",
			className: "bg-red-100 text-red-700",
		},
		chiuso: {
			label: "Chiuso",
			className: "bg-gray-100 text-gray-500",
		},
	};
	const c = config[stato];
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}
		>
			{c.label}
		</span>
	);
}

function PianoBadge({ piano }: { piano: Piano }) {
	const colors: Record<Piano, string> = {
		free: "bg-gray-100 text-gray-700",
		base: "bg-blue-100 text-blue-700",
		pro: "bg-purple-100 text-purple-700",
		enterprise: "bg-amber-100 text-amber-700",
	};
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[piano]}`}
		>
			{piano}
		</span>
	);
}

export default function TenantsPage() {
	const [search, setSearch] = useState("");
	const [filterStato, setFilterStato] = useState<TenantStato | "tutti">("tutti");

	const filtered = tenants.filter((t) => {
		const matchesSearch =
			t.ragioneSociale.toLowerCase().includes(search.toLowerCase()) ||
			t.slug.toLowerCase().includes(search.toLowerCase());
		const matchesStato = filterStato === "tutti" || t.stato === filterStato;
		return matchesSearch && matchesStato;
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tenant</h1>
					<p className="text-gray-500">
						Gestisci le organizzazioni registrate sulla piattaforma
					</p>
				</div>
				<Link
					href="/tenants/nuovo"
					className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
				>
					<Plus className="h-4 w-4" />
					Nuovo tenant
				</Link>
			</div>

			{/* ── Filters ─────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cerca per nome o slug..."
						className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Filter className="h-4 w-4 text-gray-400" />
					<select
						value={filterStato}
						onChange={(e) =>
							setFilterStato(e.target.value as TenantStato | "tutti")
						}
						className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					>
						<option value="tutti">Tutti gli stati</option>
						<option value="attivo">Attivo</option>
						<option value="trial">In prova</option>
						<option value="sospeso">Sospeso</option>
						<option value="chiuso">Chiuso</option>
					</select>
				</div>
			</div>

			{/* ── Table ───────────────────────────────────────────────────────── */}
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-gray-200 bg-gray-50">
						<tr>
							<th className="px-4 py-3 font-medium text-gray-500">
								Organizzazione
							</th>
							<th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
							<th className="px-4 py-3 font-medium text-gray-500">Piano</th>
							<th className="px-4 py-3 font-medium text-gray-500">Stato</th>
							<th className="px-4 py-3 font-medium text-gray-500">Soci</th>
							<th className="px-4 py-3 font-medium text-gray-500">Creato il</th>
							<th className="px-4 py-3 font-medium text-gray-500" />
						</tr>
					</thead>
					<tbody>
						{filtered.map((tenant) => (
							<tr
								key={tenant.id}
								className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
							>
								<td className="px-4 py-3">
									<Link
										href={`/tenants/${tenant.id}`}
										className="flex items-center gap-3"
									>
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
											<Building2 className="h-4 w-4 text-indigo-600" />
										</div>
										<div>
											<p className="font-medium">{tenant.ragioneSociale}</p>
											<p className="font-mono text-xs text-gray-400">
												{tenant.slug}
											</p>
										</div>
									</Link>
								</td>
								<td className="px-4 py-3 text-gray-500">{tenant.tipoEnte}</td>
								<td className="px-4 py-3">
									<PianoBadge piano={tenant.piano} />
								</td>
								<td className="px-4 py-3">
									<StatoBadge stato={tenant.stato} />
								</td>
								<td className="px-4 py-3 text-gray-500">{tenant.soci}</td>
								<td className="px-4 py-3 text-gray-500">{tenant.createdAt}</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-1">
										<a
											href={`https://${tenant.slug}.gestionale.sport`}
											target="_blank"
											rel="noopener noreferrer"
											className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
											title="Apri portale"
										>
											<ExternalLink className="h-4 w-4" />
										</a>
										<button
											type="button"
											className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
											title="Altre azioni"
										>
											<MoreVertical className="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						))}
						{filtered.length === 0 && (
							<tr>
								<td
									colSpan={7}
									className="px-4 py-12 text-center text-gray-400"
								>
									Nessun tenant trovato
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
