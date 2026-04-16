"use client";

import {
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  iconColor: string;
}

const STATS: StatCard[] = [
  {
    title: "Soci Attivi",
    value: "142",
    trend: 8.2,
    trendLabel: "vs mese precedente",
    icon: Users,
    iconColor: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    title: "Quote Incassate",
    value: "\u20AC 12.450",
    trend: 12.5,
    trendLabel: "vs mese precedente",
    icon: CreditCard,
    iconColor:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    title: "Certificati in Scadenza",
    value: "8",
    trend: -15,
    trendLabel: "vs mese precedente",
    icon: AlertTriangle,
    iconColor:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    title: "Presenza Media",
    value: "78%",
    trend: 3.1,
    trendLabel: "vs mese precedente",
    icon: Activity,
    iconColor:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const isPositive = stat.trend > 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <div
            key={stat.title}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconColor}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {stat.value}
            </p>

            <div className="mt-2 flex items-center gap-1">
              <TrendIcon
                className={`h-4 w-4 ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {stat.trend}%
              </span>
              <span className="text-xs text-muted-foreground">
                {stat.trendLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
