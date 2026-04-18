"use client";

import { usePaletteContext } from "@/components/palette-provider";
import { Building, Globe, Moon, Palette, Plug, Settings, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

const TABS = [
	{ id: "generale", label: "Generale", icon: Settings },
	{ id: "aspetto", label: "Aspetto", icon: Palette },
	{ id: "integrazioni", label: "Integrazioni", icon: Plug },
	{ id: "utenti", label: "Utenti", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ImpostazioniPage() {
	const [activeTab, setActiveTab] = useState<TabId>("generale");
	const { currentPaletteId, setPalette, palettes } = usePaletteContext();
	const { theme, setTheme } = useTheme();

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">Impostazioni</h1>
				<p className="text-muted-foreground">Configura la tua associazione e le preferenze</p>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
				{TABS.map((tab) => {
					const Icon = tab.icon;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
								activeTab === tab.id
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Tab content */}
			<div className="rounded-xl border border-border bg-card p-6">
				{/* Generale */}
				{activeTab === "generale" && (
					<div className="space-y-6">
						<h2 className="text-lg font-semibold text-foreground">Informazioni Generali</h2>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">Nome Associazione</label>
								<div className="flex items-center gap-2">
									<Building className="h-4 w-4 text-muted-foreground" />
									<input
										type="text"
										defaultValue="ASD Napoli Sport"
										className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">Codice Fiscale</label>
								<input
									type="text"
									defaultValue="80012345678"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">Sottodominio</label>
								<div className="flex items-center gap-2">
									<Globe className="h-4 w-4 text-muted-foreground" />
									<input
										type="text"
										defaultValue="asdnapoli"
										className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
										disabled
									/>
									<span className="text-sm text-muted-foreground">.gestionale.sport</span>
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">Email di contatto</label>
								<input
									type="email"
									defaultValue="info@asdnapoli.it"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
						<button
							type="button"
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Salva Modifiche
						</button>
					</div>
				)}

				{/* Aspetto */}
				{activeTab === "aspetto" && (
					<div className="space-y-6">
						<h2 className="text-lg font-semibold text-foreground">Personalizzazione Aspetto</h2>

						{/* Theme */}
						<div className="space-y-3">
							<h3 className="text-sm font-medium text-foreground">Tema</h3>
							<div className="flex gap-2">
								{[
									{ id: "light", label: "Chiaro", icon: Sun },
									{ id: "dark", label: "Scuro", icon: Moon },
									{ id: "system", label: "Sistema", icon: Settings },
								].map((t) => {
									const Icon = t.icon;
									return (
										<button
											key={t.id}
											type="button"
											onClick={() => setTheme(t.id)}
											className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
												theme === t.id
													? "border-primary bg-primary/10 text-primary"
													: "border-border text-foreground hover:bg-muted"
											}`}
										>
											<Icon className="h-4 w-4" />
											{t.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Palette */}
						<div className="space-y-3">
							<h3 className="text-sm font-medium text-foreground">Palette Colori</h3>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{palettes.map((palette) => (
									<button
										key={palette.id}
										type="button"
										onClick={() => setPalette(palette.id)}
										className={`flex items-center gap-3 rounded-lg border p-3 text-left ${
											currentPaletteId === palette.id
												? "border-primary ring-2 ring-primary/20"
												: "border-border hover:bg-muted"
										}`}
									>
										<span className="text-lg">{palette.icon}</span>
										<span className="text-sm font-medium text-foreground">{palette.name}</span>
									</button>
								))}
							</div>
						</div>

						{/* Layout */}
						<div className="space-y-3">
							<h3 className="text-sm font-medium text-foreground">Layout Menu</h3>
							<div className="flex gap-2">
								<button
									type="button"
									className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
								>
									Sidebar Laterale
								</button>
								<button
									type="button"
									className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
								>
									Barra Superiore
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Integrazioni */}
				{activeTab === "integrazioni" && (
					<div className="space-y-6">
						<h2 className="text-lg font-semibold text-foreground">Integrazioni</h2>
						<div className="space-y-4">
							{[
								{
									nome: "Stripe",
									desc: "Pagamenti online con carta di credito",
									stato: true,
								},
								{
									nome: "CONI / Sport e Salute",
									desc: "Registro nazionale affiliazioni",
									stato: false,
								},
								{
									nome: "PEC / Fatturazione",
									desc: "Invio automatico ricevute e fatture",
									stato: false,
								},
								{
									nome: "WhatsApp Business",
									desc: "Notifiche e promemoria via WhatsApp",
									stato: false,
								},
							].map((integration) => (
								<div
									key={integration.nome}
									className="flex items-center justify-between rounded-lg border border-border p-4"
								>
									<div>
										<p className="font-medium text-foreground">{integration.nome}</p>
										<p className="text-sm text-muted-foreground">{integration.desc}</p>
									</div>
									<button
										type="button"
										className={`rounded-md px-4 py-1.5 text-sm font-medium ${
											integration.stato
												? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
												: "bg-muted text-muted-foreground hover:text-foreground"
										}`}
									>
										{integration.stato ? "Connesso" : "Configura"}
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Utenti */}
				{activeTab === "utenti" && (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold text-foreground">Utenti</h2>
							<button
								type="button"
								className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								Invita Utente
							</button>
						</div>
						<div className="space-y-3">
							{[
								{
									nome: "Mario Rossi",
									email: "mario@asdnapoli.it",
									ruolo: "Amministratore",
								},
								{
									nome: "Laura Verdi",
									email: "laura@asdnapoli.it",
									ruolo: "Segreteria",
								},
								{
									nome: "Marco Bianchi",
									email: "marco@asdnapoli.it",
									ruolo: "Istruttore",
								},
							].map((user) => (
								<div
									key={user.email}
									className="flex items-center justify-between rounded-lg border border-border p-4"
								>
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
											{user.nome
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</div>
										<div>
											<p className="font-medium text-foreground">{user.nome}</p>
											<p className="text-sm text-muted-foreground">{user.email}</p>
										</div>
									</div>
									<span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
										{user.ruolo}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
