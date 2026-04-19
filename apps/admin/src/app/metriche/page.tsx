"use client";

import { Activity, BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";

/**
 * Admin · Metriche piattaforma
 * ─────────────────────────────────────────────────────────────────
 * Dashboard di metriche cross-tenant: MRR, ARR, churn, growth,
 * utilizzo AI, uptime.
 *
 * Stato: placeholder con valori demo. Implementazione live richiede
 * router `piattaforma.metriche.*` (superAdminProcedure).
 */

const kpis = [
	{ label: "MRR", value: "€ 8.450", trend: "+12%", icon: DollarSign, color: "text-emerald-600" },
	{ label: "ARR", value: "€ 101.400", trend: "+15%", icon: TrendingUp, color: "text-indigo-600" },
	{ label: "Tenant attivi", value: "32", trend: "+3", icon: Users, color: "text-blue-600" },
	{ label: "Uptime", value: "99.97%", trend: "stabile", icon: Activity, color: "text-teal-600" },
];

export default function MetrichePage() {
	return (
		<div className="p-8">
			<div className="mb-6">
				<h1 className="flex items-center gap-2 text-2xl font-bold">
					<BarChart3 className="h-6 w-6 text-indigo-600" /> Metriche piattaforma
				</h1>
				<p className="mt-1 text-sm text-gray-500">
					KPI cross-tenant in real-time. Revenue, churn, engagement, utilizzo AI.
				</p>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{kpis.map((k) => (
					<div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium uppercase tracking-wide text-gray-500">
								{k.label}
							</span>
							<k.icon className={`h-4 w-4 ${k.color}`} />
						</div>
						<div className="text-2xl font-bold">{k.value}</div>
						<div className={`mt-1 text-xs ${k.color}`}>{k.trend}</div>
					</div>
				))}
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-6">
				<h3 className="mb-4 font-semibold">Grafici dettagliati</h3>
				<div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
					<div className="text-center">
						<BarChart3 className="mx-auto mb-2 h-10 w-10" />
						<div className="text-sm">Grafici recharts in arrivo</div>
						<div className="text-xs">MRR trend, churn rate, tenant per piano, feature adoption</div>
					</div>
				</div>
			</div>
		</div>
	);
}
