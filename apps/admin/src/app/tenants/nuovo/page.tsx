"use client";

import { ArrowLeft, Building2, Globe, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TipoEnte = "ASD" | "SSD" | "FED";
type Piano = "free" | "base" | "pro" | "enterprise";

interface FormData {
	slug: string;
	ragioneSociale: string;
	tipoEnte: TipoEnte;
	piano: Piano;
	adminEmail: string;
	adminNome: string;
	adminCognome: string;
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 50);
}

export default function NuovoTenantPage() {
	const [form, setForm] = useState<FormData>({
		slug: "",
		ragioneSociale: "",
		tipoEnte: "ASD",
		piano: "base",
		adminEmail: "",
		adminNome: "",
		adminCognome: "",
	});

	const [slugManual, setSlugManual] = useState(false);

	function handleRagioneSocialeChange(value: string) {
		setForm((prev) => ({
			...prev,
			ragioneSociale: value,
			slug: slugManual ? prev.slug : slugify(value),
		}));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// TODO: wire to API - POST /api/admin/tenants
		// biome-ignore lint/suspicious/noConsoleLog: placeholder
		console.log("Creating tenant:", form);
	}

	const subdomainPreview = form.slug ? `${form.slug}.gestionale.sport` : "slug.gestionale.sport";

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link
					href="/tenants"
					className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
				>
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Nuovo tenant</h1>
					<p className="text-gray-500">Crea una nuova organizzazione sulla piattaforma</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
				{/* ── Dati organizzazione ────────────────────────────────────── */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2 mb-5">
						<Building2 className="h-5 w-5 text-indigo-500" />
						<h2 className="text-lg font-semibold">Dati organizzazione</h2>
					</div>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="ragioneSociale"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Ragione sociale *
							</label>
							<input
								id="ragioneSociale"
								type="text"
								required
								value={form.ragioneSociale}
								onChange={(e) => handleRagioneSocialeChange(e.target.value)}
								placeholder="es. ASD Polisportiva Roma"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>

						<div>
							<label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
								Slug *
							</label>
							<input
								id="slug"
								type="text"
								required
								value={form.slug}
								onChange={(e) => {
									setSlugManual(true);
									setForm((prev) => ({
										...prev,
										slug: slugify(e.target.value),
									}));
								}}
								placeholder="asd-polisportiva-roma"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
							<p className="mt-1 text-xs text-gray-400">
								Usato come sottodominio per l&apos;accesso
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label htmlFor="tipoEnte" className="block text-sm font-medium text-gray-700 mb-1">
									Tipo ente *
								</label>
								<select
									id="tipoEnte"
									value={form.tipoEnte}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											tipoEnte: e.target.value as TipoEnte,
										}))
									}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								>
									<option value="ASD">ASD - Associazione Sportiva Dilettantistica</option>
									<option value="SSD">SSD - Societa&apos; Sportiva Dilettantistica</option>
									<option value="FED">FED - Federazione</option>
								</select>
							</div>

							<div>
								<label htmlFor="piano" className="block text-sm font-medium text-gray-700 mb-1">
									Piano *
								</label>
								<select
									id="piano"
									value={form.piano}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											piano: e.target.value as Piano,
										}))
									}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								>
									<option value="free">Free (max 50 soci)</option>
									<option value="base">Base (max 200 soci)</option>
									<option value="pro">Pro (max 1000 soci)</option>
									<option value="enterprise">Enterprise (illimitato)</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				{/* ── Subdomain Preview ──────────────────────────────────────── */}
				<div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
					<div className="flex items-center gap-2">
						<Globe className="h-4 w-4 text-indigo-500" />
						<span className="text-sm font-medium text-indigo-700">Anteprima URL</span>
					</div>
					<p className="mt-1 font-mono text-sm text-indigo-900">https://{subdomainPreview}</p>
				</div>

				{/* ── Admin utente iniziale ──────────────────────────────────── */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center gap-2 mb-5">
						<User className="h-5 w-5 text-indigo-500" />
						<h2 className="text-lg font-semibold">Amministratore iniziale</h2>
					</div>
					<p className="text-sm text-gray-500 mb-4">
						Verra&apos; creato automaticamente un utente admin per questa organizzazione.
					</p>

					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label htmlFor="adminNome" className="block text-sm font-medium text-gray-700 mb-1">
									Nome *
								</label>
								<input
									id="adminNome"
									type="text"
									required
									value={form.adminNome}
									onChange={(e) => setForm((prev) => ({ ...prev, adminNome: e.target.value }))}
									placeholder="Mario"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label
									htmlFor="adminCognome"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Cognome *
								</label>
								<input
									id="adminCognome"
									type="text"
									required
									value={form.adminCognome}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											adminCognome: e.target.value,
										}))
									}
									placeholder="Rossi"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
								/>
							</div>
						</div>
						<div>
							<label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
								Email *
							</label>
							<input
								id="adminEmail"
								type="email"
								required
								value={form.adminEmail}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										adminEmail: e.target.value,
									}))
								}
								placeholder="admin@organizzazione.it"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							/>
						</div>
					</div>
				</div>

				{/* ── Actions ────────────────────────────────────────────────── */}
				<div className="flex items-center gap-3">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
					>
						<Sparkles className="h-4 w-4" />
						Crea tenant
					</button>
					<Link
						href="/tenants"
						className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
					>
						Annulla
					</Link>
				</div>
			</form>
		</div>
	);
}
