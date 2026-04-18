"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const ISCRIZIONI_DATA = [
	{ mese: "Gen", iscrizioni: 12 },
	{ mese: "Feb", iscrizioni: 18 },
	{ mese: "Mar", iscrizioni: 25 },
	{ mese: "Apr", iscrizioni: 22 },
	{ mese: "Mag", iscrizioni: 30 },
	{ mese: "Giu", iscrizioni: 28 },
	{ mese: "Lug", iscrizioni: 15 },
	{ mese: "Ago", iscrizioni: 8 },
	{ mese: "Set", iscrizioni: 35 },
	{ mese: "Ott", iscrizioni: 32 },
	{ mese: "Nov", iscrizioni: 20 },
	{ mese: "Dic", iscrizioni: 14 },
];

const INCASSI_DATA = [
	{ mese: "Gen", importo: 3200 },
	{ mese: "Feb", importo: 4100 },
	{ mese: "Mar", importo: 5500 },
	{ mese: "Apr", importo: 4800 },
	{ mese: "Mag", importo: 6200 },
	{ mese: "Giu", importo: 5900 },
	{ mese: "Lug", importo: 3100 },
	{ mese: "Ago", importo: 1500 },
	{ mese: "Set", importo: 7800 },
	{ mese: "Ott", importo: 7200 },
	{ mese: "Nov", importo: 4500 },
	{ mese: "Dic", importo: 3800 },
];

const DISCIPLINE_DATA = [
	{ name: "Calcio", value: 45, color: "#3B82F6" },
	{ name: "Nuoto", value: 28, color: "#06B6D4" },
	{ name: "Tennis", value: 22, color: "#10B981" },
	{ name: "Pallavolo", value: 18, color: "#F59E0B" },
	{ name: "Basket", value: 15, color: "#8B5CF6" },
	{ name: "Altro", value: 14, color: "#6B7280" },
];

export function DashboardCharts() {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Trend iscrizioni */}
			<div className="rounded-xl border border-border bg-card p-5">
				<h3 className="mb-4 text-sm font-semibold text-card-foreground">Trend Iscrizioni</h3>
				<ResponsiveContainer width="100%" height={280}>
					<LineChart data={ISCRIZIONI_DATA}>
						<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis
							dataKey="mese"
							tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "hsl(var(--popover))",
								border: "1px solid hsl(var(--border))",
								borderRadius: "8px",
								fontSize: "12px",
								color: "hsl(var(--popover-foreground))",
							}}
						/>
						<Line
							type="monotone"
							dataKey="iscrizioni"
							stroke="hsl(var(--primary))"
							strokeWidth={2}
							dot={{ r: 4, fill: "hsl(var(--primary))" }}
							activeDot={{ r: 6 }}
							name="Iscrizioni"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Incassi per mese */}
			<div className="rounded-xl border border-border bg-card p-5">
				<h3 className="mb-4 text-sm font-semibold text-card-foreground">Incassi per Mese</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart data={INCASSI_DATA}>
						<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis
							dataKey="mese"
							tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `\u20AC${value / 1000}k`}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "hsl(var(--popover))",
								border: "1px solid hsl(var(--border))",
								borderRadius: "8px",
								fontSize: "12px",
								color: "hsl(var(--popover-foreground))",
							}}
							formatter={(value: number) => [`\u20AC ${value.toLocaleString("it-IT")}`, "Incasso"]}
						/>
						<Bar
							dataKey="importo"
							fill="hsl(var(--primary))"
							radius={[4, 4, 0, 0]}
							name="Importo"
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Distribuzione soci per disciplina */}
			<div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
				<h3 className="mb-4 text-sm font-semibold text-card-foreground">
					Distribuzione Soci per Disciplina
				</h3>
				<div className="flex flex-col items-center gap-6 sm:flex-row">
					<ResponsiveContainer width="100%" height={280} className="max-w-sm">
						<PieChart>
							<Pie
								data={DISCIPLINE_DATA}
								cx="50%"
								cy="50%"
								innerRadius={60}
								outerRadius={100}
								paddingAngle={4}
								dataKey="value"
							>
								{DISCIPLINE_DATA.map((entry) => (
									<Cell key={entry.name} fill={entry.color} />
								))}
							</Pie>
							<Tooltip
								contentStyle={{
									backgroundColor: "hsl(var(--popover))",
									border: "1px solid hsl(var(--border))",
									borderRadius: "8px",
									fontSize: "12px",
									color: "hsl(var(--popover-foreground))",
								}}
								formatter={(value: number) => [`${value} soci`, ""]}
							/>
						</PieChart>
					</ResponsiveContainer>

					<div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
						{DISCIPLINE_DATA.map((d) => (
							<div key={d.name} className="flex items-center gap-2">
								<div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
								<div>
									<p className="text-sm font-medium text-card-foreground">{d.name}</p>
									<p className="text-xs text-muted-foreground">{d.value} soci</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
