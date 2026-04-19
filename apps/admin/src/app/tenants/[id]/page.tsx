"use client";

import {
	ArrowLeft,
	BarChart3,
	Building2,
	Calendar,
	CreditCard,
	Globe,
	Pause,
	Play,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";

type TenantStato = "attivo" | "trial" | "sospeso" | "chiuso";
type Piano = "free" | "base" | "pro" | "enterprise";

interface TenantDetail {
	id: string;
	slug: string;
	ragioneSociale: string;
	tipoEnte: string;
	piano: Piano;
	stato: TenantStato;
	maxSoci: string;
	partitaIva: string;
	codiceFiscale: string;
	createdAt: string;
	trialEnd: string | null;
	stats: {
		soci: number;
		corsi: number;
		eventiMese: number;
		quoteMese: number;
		entrateMese: number;
	};
}

/** Placeholder data - replace with real API call */
function getTenant(_id: string): TenantDetail {
	return {
		id: _id,
		slug: "demo-asd",
		ragioneSociale: "ASD Demo Sport",
		tipoEnte: "ASD",
		piano: "pro",
		stato: "attivo",
		maxSoci: "1000",
		partitaIva: "12345678901",
		codiceFiscale: "12345678901",
		createdAt: "2025-09-01",
		trialEnd: null,
		stats: {
			soci: 120,
			corsi: 8,
			eventiMese: 3,
			quoteMese: 45,
			entrateMese: 4_250,
		},
	};
}

function StatoBadge({ stato }: { stato: TenantStato }) {
	const config: Record<TenantStato, { label: string; className: string }> = {
		attivo: { label: "Attivo", className: "bg-emerald-100 text-emerald-700" },
		trial: { label: "In prova", className: "bg-amber-100 text-amber-700" },
		sospeso: { label: "Sospeso", className: "bg-red-100 text-red-700" },
		chiuso: { label: "Chiuso", className: "bg-gray-100 text-gray-500" },
	};
	const c = config[stato];
	return (
		<span
			className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${c.className}`}
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
			className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colors[piano]}`}
		>
			{piano}
		</span>
	);
}

export default function TenantDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const tenant = getTenant(id);

	const isSuspended = tenant.stato === "sospeso";

	return (
		<div className="space-y-6">
			{/* ── Header ──────────────────────────────────────────────────────── */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<Link
						href="/tenants"
						className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold tracking-tight">{tenant.ragioneSociale}</h1>
							<StatoBadge stato={tenant.stato} />
						</div>
						<div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
							<span className="font-mono">{tenant.slug}</span>
							<span>&middot;</span>
							<span>{tenant.tipoEnte}</span>
							<span>&middot;</span>
							<PianoBadge piano={tenant.piano} />
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{isSuspended ? (
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
						>
							<Play className="h-4 w-4" />
							Riattiva
						</button>
					) : (
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 transition-colors"
						>
							<Pause className="h-4 w-4" />
							Sospendi
						</button>
					)}
					<a
						href={`https://${tenant.slug}.gestionale.sport`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
					>
						<Globe className="h-4 w-4" />
						Apri portale
					</a>
				</div>
			</div>

			{/* ── Usage Stats ─────────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
				{[
					{
						label: "Soci",
						value: tenant.stats.soci,
						max: tenant.maxSoci,
						icon: Users,
					},
					{ label: "Corsi attivi", value: tenant.stats.corsi, icon: Calendar },
					{
						label: "Eventi / mese",
						value: tenant.stats.eventiMese,
						icon: BarChart3,
					},
					{
						label: "Quote / mese",
						value: tenant.stats.quoteMese,
						icon: CreditCard,
					},
					{
						label: "Entrate / mese",
						value: tenant.stats.entrateMese.toLocaleString("it-IT", {
							style: "currency",
							currency: "EUR",
						}),
						icon: CreditCard,
					},
				].map((stat) => (
					<div
						key={stat.label}
						className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
					>
						<div className="flex items-center gap-2 text-gray-500">
							<stat.icon className="h-4 w-4" />
							<span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
						</div>
						<p className="mt-2 text-2xl font-bold">
							{stat.value}
							{"max" in stat && stat.max && (
								<span className="text-sm font-normal text-gray-400"> / {stat.max}</span>
							)}
						</p>
					</div>
				))}
			</div>

			{/* ── Details Grid ────────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Overview */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Building2 className="h-5 w-5 text-gray-400" />
						<h2 className="text-lg font-semibold">Informazioni</h2>
					</div>
					<dl className="space-y-3 text-sm">
						{[
							{ label: "Ragione sociale", value: tenant.ragioneSociale },
							{ label: "Tipo ente", value: tenant.tipoEnte },
							{ label: "Partita IVA", value: tenant.partitaIva || "-" },
							{ label: "Codice fiscale", value: tenant.codiceFiscale || "-" },
							{ label: "Data creazione", value: tenant.createdAt },
							{
								label: "Fine prova",
								value: tenant.trialEnd ?? "N/A",
							},
						].map((item) => (
							<div
								key={item.label}
								className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
							>
								<dt className="text-gray-500">{item.label}</dt>
								<dd className="font-medium">{item.value}</dd>
							</div>
						))}
					</dl>
				</div>

				{/* Plan Management */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Settings className="h-5 w-5 text-gray-400" />
						<h2 className="text-lg font-semibold">Gestione piano</h2>
					</div>
					<div className="space-y-4">
						<div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4">
							<div>
								<p className="text-sm font-medium text-gray-500">Piano attuale</p>
								<p className="mt-1 text-lg font-bold capitalize">{tenant.piano}</p>
							</div>
							<PianoBadge piano={tenant.piano} />
						</div>
						<div>
							<label htmlFor="newPlan" className="block text-sm font-medium text-gray-700 mb-1">
								Cambia piano
							</label>
							<div className="flex gap-2">
								<select
									id="newPlan"
									defaultValue={tenant.piano}
									className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								>
									<option value="free">Free (max 50 soci)</option>
									<option value="base">Base (max 200 soci)</option>
									<option value="pro">Pro (max 1000 soci)</option>
									<option value="enterprise">Enterprise (illimitato)</option>
								</select>
								<button
									type="button"
									className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
								>
									Aggiorna
								</button>
							</div>
						</div>
						<div>
							<label htmlFor="maxSoci" className="block text-sm font-medium text-gray-700 mb-1">
								Limite soci personalizzato
							</label>
							<div className="flex gap-2">
								<input
									id="maxSoci"
									type="number"
									defaultValue={tenant.maxSoci}
									className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								/>
								<button
									type="button"
									className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Salva
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
