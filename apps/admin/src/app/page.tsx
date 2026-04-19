import {
	AlertTriangle,
	Ban,
	Building2,
	CheckCircle2,
	Clock,
	CreditCard,
	TrendingUp,
	Users,
} from "lucide-react";

/** Placeholder data - replace with real API calls */
const stats = {
	totalTenants: 47,
	active: 32,
	trial: 12,
	suspended: 3,
	monthlyRevenue: 8_450,
	mrr: 8_450,
};

const recentSignups = [
	{
		slug: "asd-aquila-roma",
		ragioneSociale: "ASD Aquila Roma",
		piano: "pro",
		createdAt: "2026-04-15",
	},
	{
		slug: "ssd-olimpia-milano",
		ragioneSociale: "SSD Olimpia Milano",
		piano: "base",
		createdAt: "2026-04-14",
	},
	{
		slug: "asd-vela-napoli",
		ragioneSociale: "ASD Vela Napoli",
		piano: "free",
		createdAt: "2026-04-12",
	},
	{
		slug: "fed-nuoto-lazio",
		ragioneSociale: "Federazione Nuoto Lazio",
		piano: "enterprise",
		createdAt: "2026-04-10",
	},
];

const systemHealth = [
	{ name: "API", status: "ok" as const },
	{ name: "Database", status: "ok" as const },
	{ name: "Redis", status: "ok" as const },
	{ name: "MinIO", status: "ok" as const },
	{ name: "Typesense", status: "ok" as const },
];

function StatCard({
	label,
	value,
	icon: Icon,
	color,
}: {
	label: string;
	value: string | number;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-gray-500">{label}</p>
					<p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
				</div>
				<div className={`rounded-lg p-3 ${color}`}>
					<Icon className="h-6 w-6 text-white" />
				</div>
			</div>
		</div>
	);
}

function PianoBadge({ piano }: { piano: string }) {
	const colors: Record<string, string> = {
		free: "bg-gray-100 text-gray-700",
		base: "bg-blue-100 text-blue-700",
		pro: "bg-purple-100 text-purple-700",
		enterprise: "bg-amber-100 text-amber-700",
	};
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[piano] ?? "bg-gray-100 text-gray-700"}`}
		>
			{piano}
		</span>
	);
}

export default function AdminDashboard() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-gray-500">Panoramica della piattaforma NEOGESYS Sport</p>
			</div>

			{/* ── Stat Cards ──────────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Tenant totali"
					value={stats.totalTenants}
					icon={Building2}
					color="bg-indigo-500"
				/>
				<StatCard label="Attivi" value={stats.active} icon={CheckCircle2} color="bg-emerald-500" />
				<StatCard label="In prova" value={stats.trial} icon={Clock} color="bg-amber-500" />
				<StatCard label="Sospesi" value={stats.suspended} icon={Ban} color="bg-red-500" />
			</div>

			{/* ── Revenue Overview ────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2">
						<CreditCard className="h-5 w-5 text-gray-400" />
						<h2 className="text-lg font-semibold">Ricavi</h2>
					</div>
					<div className="mt-4 space-y-3">
						<div className="flex items-center justify-between border-b border-gray-100 pb-3">
							<span className="text-sm text-gray-500">MRR</span>
							<span className="text-xl font-bold">
								{stats.mrr.toLocaleString("it-IT", {
									style: "currency",
									currency: "EUR",
								})}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-500">Entrate mese corrente</span>
							<span className="text-xl font-bold">
								{stats.monthlyRevenue.toLocaleString("it-IT", {
									style: "currency",
									currency: "EUR",
								})}
							</span>
						</div>
					</div>
				</div>

				{/* ── System Health ──────────────────────────────────────────── */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-gray-400" />
						<h2 className="text-lg font-semibold">Stato del sistema</h2>
					</div>
					<div className="mt-4 space-y-3">
						{systemHealth.map((service) => (
							<div
								key={service.name}
								className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
							>
								<span className="text-sm">{service.name}</span>
								{service.status === "ok" ? (
									<span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
										<CheckCircle2 className="h-4 w-4" />
										Operativo
									</span>
								) : (
									<span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
										<AlertTriangle className="h-4 w-4" />
										Errore
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ── Recent Signups ──────────────────────────────────────────────── */}
			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-gray-400" />
					<h2 className="text-lg font-semibold">Registrazioni recenti</h2>
				</div>
				<div className="mt-4 overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gray-200 text-gray-500">
								<th className="pb-3 pr-4 font-medium">Organizzazione</th>
								<th className="pb-3 pr-4 font-medium">Slug</th>
								<th className="pb-3 pr-4 font-medium">Piano</th>
								<th className="pb-3 font-medium">Data</th>
							</tr>
						</thead>
						<tbody>
							{recentSignups.map((tenant) => (
								<tr key={tenant.slug} className="border-b border-gray-100 last:border-0">
									<td className="py-3 pr-4 font-medium">{tenant.ragioneSociale}</td>
									<td className="py-3 pr-4 font-mono text-xs text-gray-500">{tenant.slug}</td>
									<td className="py-3 pr-4">
										<PianoBadge piano={tenant.piano} />
									</td>
									<td className="py-3 text-gray-500">{tenant.createdAt}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
