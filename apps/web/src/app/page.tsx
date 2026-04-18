"use client";

import { DashboardCharts } from "@/components/dashboard/charts";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		// Check authentication status
		// Replace with actual auth check (e.g., session cookie, JWT)
		const token = localStorage.getItem("neogesys-token");
		setIsAuthenticated(!!token);
	}, []);

	if (isAuthenticated === null) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!isAuthenticated) {
		redirect("/login");
	}

	return (
		<main className="flex-1 space-y-6 p-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
				<p className="text-muted-foreground">Panoramica della tua associazione sportiva</p>
			</div>

			<StatsCards />

			<DashboardCharts />
		</main>
	);
}
