"use client";

import { trpc } from "@/lib/trpc";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const MONTH_NAMES = [
	"Gennaio",
	"Febbraio",
	"Marzo",
	"Aprile",
	"Maggio",
	"Giugno",
	"Luglio",
	"Agosto",
	"Settembre",
	"Ottobre",
	"Novembre",
	"Dicembre",
];

const DOW = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

type CalEvent = {
	id: string;
	title: string;
	kind: "corso" | "evento";
	time?: string;
};

interface Cell {
	date: Date;
	other: boolean;
	today: boolean;
}

export default function CalendarioPage() {
	const now = new Date();
	const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

	const year = calendarMonth.getFullYear();
	const month = calendarMonth.getMonth();

	const rangeStart = useMemo(() => new Date(year, month - 1, 20).toISOString(), [year, month]);
	const rangeEnd = useMemo(() => new Date(year, month + 1, 15).toISOString(), [year, month]);

	const corsiCalendar = trpc.corsi.getCalendario.useQuery({
		start: rangeStart,
		end: rangeEnd,
	});
	const eventiCalendar = trpc.eventi.getCalendario.useQuery({
		start: rangeStart,
		end: rangeEnd,
	});

	const eventsByDay = useMemo(() => {
		const byDay: Record<string, CalEvent[]> = {};
		const keyOf = (d: Date) => d.toISOString().slice(0, 10);

		for (const c of corsiCalendar.data ?? []) {
			const start = new Date(c.start as string);
			const key = keyOf(start);
			(byDay[key] ??= []).push({
				id: String(c.id),
				title: String(c.title).split(" · ")[0] ?? String(c.title),
				kind: "corso",
				time: start.toTimeString().slice(0, 5),
			});
		}
		for (const e of eventiCalendar.data ?? []) {
			const start = new Date(e.start as unknown as string);
			const key = keyOf(start);
			(byDay[key] ??= []).push({
				id: String(e.id),
				title: String(e.title),
				kind: "evento",
			});
		}
		return byDay;
	}, [corsiCalendar.data, eventiCalendar.data]);

	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startDow = (firstDay.getDay() + 6) % 7;
	const daysInMonth = lastDay.getDate();
	const today = new Date();

	const cells: Cell[] = [];
	for (let i = startDow - 1; i >= 0; i--) {
		const d = new Date(year, month, -i);
		cells.push({ date: d, other: true, today: false });
	}
	for (let i = 1; i <= daysInMonth; i++) {
		const d = new Date(year, month, i);
		cells.push({
			date: d,
			other: false,
			today:
				d.getFullYear() === today.getFullYear() &&
				d.getMonth() === today.getMonth() &&
				d.getDate() === today.getDate(),
		});
	}
	while (cells.length % 7 !== 0) {
		const last = cells[cells.length - 1];
		if (!last) break;
		const next = new Date(last.date);
		next.setDate(next.getDate() + 1);
		cells.push({ date: next, other: true, today: false });
	}

	const navMonth = (delta: number) => {
		setCalendarMonth(new Date(year, month + delta, 1));
	};
	const goToday = () => {
		const d = new Date();
		setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
	};

	const isLoading = corsiCalendar.isLoading || eventiCalendar.isLoading;

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Calendario</h1>
					<p className="page-subtitle">
						Corsi ed eventi · {corsiCalendar.data?.length ?? 0} lezioni ·{" "}
						{eventiCalendar.data?.length ?? 0} eventi nel periodo
					</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-outline btn-sm" onClick={goToday}>
						Oggi
					</button>
					<Link href="/eventi" className="btn btn-primary btn-sm">
						<CalendarPlus className="icon" /> Nuovo Evento
					</Link>
				</div>
			</div>

			<div className="card">
				<div className="card-body">
					<div className="calendar-nav">
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							onClick={() => navMonth(-1)}
						>
							<ChevronLeft className="icon" />
						</button>
						<div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
							{MONTH_NAMES[month]} {year}
						</div>
						<button
							type="button"
							className="btn btn-ghost btn-icon"
							onClick={() => navMonth(1)}
						>
							<ChevronRight className="icon" />
						</button>
					</div>

					{isLoading ? (
						<div
							style={{
								padding: "3rem",
								textAlign: "center",
								color: "hsl(var(--muted-foreground))",
							}}
						>
							Caricamento calendario...
						</div>
					) : (
						<div className="calendar-grid">
							{DOW.map((d) => (
								<div key={d} className="calendar-dow">
									{d}
								</div>
							))}
							{cells.map((c) => {
								const key = c.date.toISOString().slice(0, 10);
								const ev = eventsByDay[key] ?? [];
								return (
									<div
										key={key + (c.other ? "-o" : "")}
										className={`calendar-day${c.other ? " other-month" : ""}${
											c.today ? " today" : ""
										}`}
									>
										<span className="day-num">{c.date.getDate()}</span>
										{ev.slice(0, 3).map((e) => (
											<div key={e.id + e.title} className={`cal-event ${e.kind}`}>
												{e.time ? `${e.time} ` : ""}
												{e.title}
											</div>
										))}
										{ev.length > 3 && (
											<div
												style={{
													fontSize: "0.6875rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												+{ev.length - 3} altri
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}

					<div
						style={{
							display: "flex",
							gap: "1rem",
							marginTop: "1rem",
							fontSize: "0.75rem",
						}}
					>
						<span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
							<span
								style={{
									width: "0.75rem",
									height: "0.75rem",
									borderRadius: "0.25rem",
									background: "hsl(var(--primary) / 0.5)",
								}}
							/>{" "}
							Corso
						</span>
						<span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
							<span
								style={{
									width: "0.75rem",
									height: "0.75rem",
									borderRadius: "0.25rem",
									background: "hsl(var(--warning) / 0.5)",
								}}
							/>{" "}
							Evento
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
