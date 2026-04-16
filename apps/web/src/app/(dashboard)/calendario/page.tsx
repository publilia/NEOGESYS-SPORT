"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { it } from "date-fns/locale";

type ViewMode = "settimana" | "mese";

interface CalendarEvent {
  id: string;
  titolo: string;
  orario: string;
  corso: string;
  colore: string;
}

const SAMPLE_EVENTS: Record<string, CalendarEvent[]> = {
  "2026-04-16": [
    { id: "1", titolo: "Calcio Under 12", orario: "16:00-17:30", corso: "Calcio", colore: "bg-blue-500" },
    { id: "2", titolo: "Nuoto Principianti", orario: "14:00-15:00", corso: "Nuoto", colore: "bg-cyan-500" },
  ],
  "2026-04-17": [
    { id: "3", titolo: "Tennis Adulti", orario: "18:00-19:30", corso: "Tennis", colore: "bg-green-500" },
  ],
  "2026-04-18": [
    { id: "4", titolo: "Calcio Under 12", orario: "16:00-17:30", corso: "Calcio", colore: "bg-blue-500" },
    { id: "5", titolo: "Pallavolo Agonistica", orario: "17:00-19:00", corso: "Pallavolo", colore: "bg-orange-500" },
  ],
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("settimana");

  const navigateBack = () => {
    setCurrentDate((d) =>
      viewMode === "settimana" ? subWeeks(d, 1) : subMonths(d, 1),
    );
  };

  const navigateForward = () => {
    setCurrentDate((d) =>
      viewMode === "settimana" ? addWeeks(d, 1) : addMonths(d, 1),
    );
  };

  const goToToday = () => setCurrentDate(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad month start to Monday
  const firstDayOfMonth = monthStart.getDay();
  const padStart = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const paddedMonthDays = [
    ...Array.from({ length: padStart }, (_, i) =>
      addDays(monthStart, -(padStart - i)),
    ),
    ...monthDays,
  ];

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const key = format(date, "yyyy-MM-dd");
    return SAMPLE_EVENTS[key] ?? [];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Calendario
          </h1>
          <p className="text-muted-foreground">
            Visualizza corsi, eventi e attivita
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={navigateForward}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-2 text-lg font-semibold text-foreground capitalize">
            {viewMode === "settimana"
              ? `${format(weekDays[0], "d MMM", { locale: it })} - ${format(weekDays[6], "d MMM yyyy", { locale: it })}`
              : format(currentDate, "MMMM yyyy", { locale: it })}
          </h2>
        </div>

        <div className="flex rounded-md border border-border">
          <button
            type="button"
            onClick={() => setViewMode("settimana")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              viewMode === "settimana"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            } rounded-l-md`}
          >
            <List className="h-4 w-4" />
            Settimana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mese")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              viewMode === "mese"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            } rounded-r-md`}
          >
            <CalendarDays className="h-4 w-4" />
            Mese
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {viewMode === "settimana" ? (
          /* Weekly view */
          <div className="grid grid-cols-7">
            {/* Header */}
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`border-b border-r border-border p-3 text-center last:border-r-0 ${
                  isToday(day) ? "bg-primary/10" : "bg-muted/30"
                }`}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {WEEKDAY_LABELS[i]}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    isToday(day) ? "text-primary" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </p>
              </div>
            ))}

            {/* Content */}
            {weekDays.map((day, i) => {
              const events = getEventsForDate(day);
              return (
                <div
                  key={`content-${i}`}
                  className="min-h-[200px] border-r border-border p-2 last:border-r-0"
                >
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`mb-1 rounded-md p-2 text-xs text-white ${event.colore}`}
                    >
                      <p className="font-medium">{event.titolo}</p>
                      <p className="opacity-80">{event.orario}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* Monthly view */
          <div>
            {/* Header */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="border-r border-border p-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {paddedMonthDays.map((day, i) => {
                const events = getEventsForDate(day);
                const inMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r border-border p-1.5 last:border-r-0 ${
                      !inMonth ? "bg-muted/30" : ""
                    } ${isToday(day) ? "bg-primary/5" : ""}`}
                  >
                    <p
                      className={`mb-1 text-xs font-medium ${
                        isToday(day)
                          ? "text-primary"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </p>
                    {events.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`mb-0.5 truncate rounded px-1 py-0.5 text-[10px] text-white ${event.colore}`}
                      >
                        {event.titolo}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{events.length - 2} altri
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
