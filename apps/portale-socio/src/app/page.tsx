"use client";

import {
  CreditCard,
  GraduationCap,
  FileCheck,
  CalendarDays,
  ArrowRight,
  IdCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface DashboardCard {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status?: "ok" | "warning" | "danger";
}

const cards: DashboardCard[] = [
  {
    title: "Tessera e Scadenze",
    value: "Attiva",
    description: "Tessera n. 2024-0142 - Scadenza 31/12/2026",
    icon: <IdCard className="h-5 w-5" />,
    href: "/profilo",
    status: "ok",
  },
  {
    title: "Corsi Iscritti",
    value: "3 corsi",
    description: "Prossima lezione: Lunedi 14:00 - Nuoto",
    icon: <GraduationCap className="h-5 w-5" />,
    href: "/corsi",
    status: "ok",
  },
  {
    title: "Quote da Pagare",
    value: "1 in sospeso",
    description: "Quota mensile Aprile - Scadenza 30/04",
    icon: <CreditCard className="h-5 w-5" />,
    href: "/quote",
    status: "warning",
  },
  {
    title: "Certificato Medico",
    value: "In scadenza",
    description: "Scade tra 28 giorni - Rinnovo consigliato",
    icon: <FileCheck className="h-5 w-5" />,
    href: "/certificati",
    status: "warning",
  },
];

const quickActions = [
  { label: "Paga quota", href: "/quote", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Orario corsi", href: "/corsi", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Carica certificato", href: "/certificati", icon: <FileCheck className="h-4 w-4" /> },
  { label: "I miei documenti", href: "/documenti", icon: <IdCard className="h-4 w-4" /> },
];

function StatusIcon({ status }: { status?: "ok" | "warning" | "danger" }) {
  if (status === "danger") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Benvenuto, Marco
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ecco un riepilogo della tua situazione sportiva
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {card.icon}
              </div>
              <StatusIcon status={card.status} />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Azioni rapide</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
            >
              <span className="text-primary">{action.icon}</span>
              {action.label}
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Attivita recenti
        </h2>
        <div className="mt-3 rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {[
              { text: "Presenza registrata - Nuoto Avanzato", date: "Oggi, 10:30" },
              { text: "Quota mensile Marzo pagata", date: "15 Mar 2026" },
              { text: "Certificato medico caricato", date: "10 Mar 2026" },
              { text: "Iscrizione al corso Pilates confermata", date: "01 Mar 2026" },
            ].map((activity) => (
              <div
                key={activity.text}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-sm text-foreground">{activity.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {activity.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
