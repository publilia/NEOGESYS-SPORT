"use client";

import { useUIStore } from "@/lib/store";
import { Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";

export default function AIPage() {
	const { setAiDrawerOpen } = useUIStore();

	useEffect(() => {
		// Auto-open the AI drawer when visiting this page
		setAiDrawerOpen(true);
	}, [setAiDrawerOpen]);

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">AI Assistente</h1>
					<p className="page-subtitle">
						Usa il pannello laterale (⌘J) per chiedere assistenza all'AI
					</p>
				</div>
				<button type="button" className="btn btn-primary" onClick={() => setAiDrawerOpen(true)}>
					<Sparkles className="icon" />
					Apri AI Drawer
				</button>
			</div>

			<div className="card mt-6">
				<div className="card-body">
					<div className="flex items-start gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Zap className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-lg font-semibold">Suggerimenti rapidi</h3>
							<p className="text-sm text-muted-foreground mt-1">
								L'AI può aiutarti con analisi dati, invio comunicazioni, generazione report e
								automazioni varie. Premi{" "}
								<kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘J</kbd> in
								qualsiasi momento.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
