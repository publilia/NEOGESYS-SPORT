"use client";

import {
	ArrowUpRight,
	CheckCircle2,
	CreditCard,
	Infinity as InfinityIcon,
	Sparkles,
	TrendingUp,
	Users,
} from "lucide-react";

/**
 * Admin · Gestione piani (overview statico)
 * ─────────────────────────────────────────────────────────────────
 * Questa pagina mostra i 5 tier canonici del catalogo abbonamenti
 * (trial/free/base/pro/enterprise) con prezzi e limiti operativi,
 * così da avere un riferimento visivo immediato del listino piatta-
 * forma.
 *
 * Il CRUD "live" (modifica prezzo, features, limiti) è nell'app web
 * su `/billing` lato super_admin: legge da `piattaforma.piani.listAll`
 * e salva su `piani.update` / `piani.create` / `piani.disable`. Qui
 * manteniamo solo la preview statica per evitare di duplicare la
 * catena tRPC in admin (che è ancora senza client wired).
 */

type Piano = {
	id: string;
	label: string;
	priceEur: number | "custom";
	maxSoci: number | "∞";
	maxUtenti: number | "∞";
	description: string;
	color: string;
	features: string[];
	highlight?: boolean;
};

const piani: Piano[] = [
	{
		id: "trial",
		label: "Trial",
		priceEur: 0,
		maxSoci: 50,
		maxUtenti: 3,
		description: "30 giorni con tutte le funzioni Pro. Nessuna carta richiesta.",
		color: "#F59E0B",
		features: ["Tutte le feature Pro", "50 soci", "3 utenti", "Supporto email"],
	},
	{
		id: "free",
		label: "Free",
		priceEur: 0,
		maxSoci: 20,
		maxUtenti: 1,
		description: "Per volontariato, prove, piccole realtà.",
		color: "#6B7280",
		features: ["20 soci", "1 utente", "Feature CORE", "Community support"],
	},
	{
		id: "base",
		label: "Base",
		priceEur: 29,
		maxSoci: 200,
		maxUtenti: 5,
		description: "Feature CORE per ASD medie. Ottimo per partire.",
		color: "#0EA5E9",
		features: [
			"200 soci",
			"5 utenti",
			"Gestione corsi & eventi",
			"Tesseramenti FSN",
			"Export CSV/PDF",
		],
	},
	{
		id: "pro",
		label: "Pro",
		priceEur: 79,
		maxSoci: 2000,
		maxUtenti: 25,
		description: "Tutte le feature + AI assistant. La scelta più popolare.",
		color: "#8B3FE5",
		highlight: true,
		features: [
			"2.000 soci",
			"25 utenti",
			"AI assistant",
			"Fatturazione SDI",
			"Google & Microsoft 365",
			"Custom palette",
		],
	},
	{
		id: "enterprise",
		label: "Enterprise",
		priceEur: "custom",
		maxSoci: "∞",
		maxUtenti: "∞",
		description: "White label, SLA, API illimitate, onboarding dedicato.",
		color: "#ED3F9E",
		features: [
			"Soci illimitati",
			"Utenti illimitati",
			"White label",
			"SLA 99.9%",
			"Custom domain",
			"Onboarding & training",
			"Account manager",
		],
	},
];

const WEB_BILLING_URL =
	process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export default function PianiPage() {
	return (
		<div>
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-2xl font-bold">
						<CreditCard className="h-6 w-6 text-indigo-600" /> Gestione piani
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Listino abbonamenti piattaforma. I prezzi e le feature sono modificabili dall&apos;app
						web lato super_admin su <code className="text-gray-700">/billing</code>.
					</p>
				</div>
				<a
					href={`${WEB_BILLING_URL}/billing`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
				>
					<Sparkles className="h-4 w-4" />
					Apri editor piani (live)
					<ArrowUpRight className="h-4 w-4" />
				</a>
			</div>

			{/* ═══════════ Catalogo piani ═══════════════════════════════════
			    5 tier canonici: trial / free / base / pro / enterprise. Il
			    card "pro" è evidenziato come "più venduto". */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				{piani.map((p) => (
					<div
						key={p.id}
						className={`flex flex-col rounded-xl border p-4 transition-shadow hover:shadow-md ${
							p.highlight
								? "border-indigo-300 bg-gradient-to-b from-indigo-50/50 to-white shadow-sm ring-1 ring-indigo-100"
								: "border-gray-200 bg-white"
						}`}
					>
						<div className="mb-3 flex items-center justify-between">
							<span
								className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
								style={{ background: p.color }}
							>
								{p.label}
							</span>
							{p.highlight ? (
								<span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
									<Sparkles className="h-3 w-3" /> Più scelto
								</span>
							) : null}
						</div>

						<div className="mb-2 flex items-baseline gap-1">
							{p.priceEur === "custom" ? (
								<span className="text-2xl font-bold">Custom</span>
							) : (
								<>
									<span className="text-3xl font-bold">€{p.priceEur}</span>
									{p.priceEur > 0 ? <span className="text-xs text-gray-500">/mese</span> : null}
								</>
							)}
						</div>

						<p className="mb-3 min-h-[3rem] text-xs text-gray-600">{p.description}</p>

						<div className="mb-3 grid grid-cols-2 gap-1.5 text-[0.7rem] text-gray-500">
							<div className="rounded bg-gray-50 px-2 py-1">
								<div className="font-medium text-gray-400">Soci</div>
								<div className="flex items-center gap-0.5 font-semibold text-gray-800">
									{p.maxSoci === "∞" ? (
										<InfinityIcon className="h-3.5 w-3.5" />
									) : (
										p.maxSoci.toLocaleString("it-IT")
									)}
								</div>
							</div>
							<div className="rounded bg-gray-50 px-2 py-1">
								<div className="font-medium text-gray-400">Utenti</div>
								<div className="flex items-center gap-0.5 font-semibold text-gray-800">
									{p.maxUtenti === "∞" ? (
										<InfinityIcon className="h-3.5 w-3.5" />
									) : (
										p.maxUtenti.toLocaleString("it-IT")
									)}
								</div>
							</div>
						</div>

						<ul className="flex flex-1 flex-col gap-1.5 text-xs text-gray-700">
							{p.features.map((f) => (
								<li key={f} className="flex items-start gap-1.5">
									<CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
									<span>{f}</span>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			{/* ═══════════ Gestione live pointer ════════════════════════════
			    La modifica prezzi/features/limiti è sull'app web perché lì
			    è già wirata la catena tRPC al `piattaforma.piani` router
			    (listAll/create/update/disable). Evitiamo di duplicare qui. */}
			<div className="mt-8 rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
				<div className="flex gap-4">
					<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
						<Sparkles className="h-5 w-5" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-gray-900">Modifica prezzi & features</h3>
						<p className="mt-1 text-sm text-gray-600">
							L&apos;editor live dei piani è integrato su <code>/billing</code> nell&apos;app web.
							Lì puoi modificare prezzi, toggle delle feature (AI, SDI, custom domain, supporto
							prioritario…), limiti di soci/utenti e disattivare piani obsoleti — con persistenza su
							Postgres via <code>piattaforma.piani.*</code>.
						</p>
						<a
							href={`${WEB_BILLING_URL}/billing`}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
						>
							Vai all&apos;editor
							<ArrowUpRight className="h-3.5 w-3.5" />
						</a>
					</div>
				</div>
			</div>

			{/* ═══════════ Distribuzione tenant ═════════════════════════════
			    Questi numeri sono demo: la query live cross-tenant arriverà
			    con `piattaforma.piani.stats` (ancora da scrivere). */}
			<div className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
				<h3 className="mb-3 flex items-center gap-2 font-semibold">
					<Users className="h-4 w-4 text-gray-500" />
					Distribuzione tenant per piano
					<span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
						<TrendingUp className="h-3 w-3" />
						demo
					</span>
				</h3>
				<div className="space-y-2">
					{[
						{ piano: "Trial", count: 12, pct: 26, color: "#F59E0B" },
						{ piano: "Free", count: 18, pct: 38, color: "#6B7280" },
						{ piano: "Base", count: 10, pct: 21, color: "#0EA5E9" },
						{ piano: "Pro", count: 5, pct: 11, color: "#8B3FE5" },
						{ piano: "Enterprise", count: 2, pct: 4, color: "#ED3F9E" },
					].map((row) => (
						<div key={row.piano} className="flex items-center gap-3 text-sm">
							<span className="w-20 font-medium">{row.piano}</span>
							<div className="flex-1 overflow-hidden rounded-full bg-gray-100">
								<div
									className="h-2 rounded-full"
									style={{ width: `${row.pct}%`, background: row.color }}
								/>
							</div>
							<span className="w-20 text-right text-xs text-gray-500">
								{row.count} ({row.pct}%)
							</span>
						</div>
					))}
				</div>
				<p className="mt-3 text-xs text-gray-400">
					La query live cross-tenant arriverà con <code>piattaforma.piani.stats</code>.
				</p>
			</div>
		</div>
	);
}
