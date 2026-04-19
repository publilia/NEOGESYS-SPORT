"use client";

import { Field, FormGrid, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	CheckCircle,
	CreditCard,
	HardDrive,
	Mail,
	Plug,
	Settings2,
	ShieldCheck,
	Sparkles,
	XCircle,
	Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TipoIntegrazione = "pagamento" | "comunicazione" | "federazione" | "storage";

interface ProviderMeta {
	provider: string;
	nome: string;
	descrizione: string;
}

interface CategorySpec {
	tipo: TipoIntegrazione;
	label: string;
	Icon: LucideIcon;
}

const CATEGORIES: CategorySpec[] = [
	{ tipo: "pagamento", label: "Pagamenti", Icon: CreditCard },
	{ tipo: "comunicazione", label: "Comunicazioni", Icon: Mail },
	{ tipo: "federazione", label: "Federazioni", Icon: Sparkles },
	{ tipo: "storage", label: "Cloud Storage", Icon: HardDrive },
];

const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
	stripe: [
		{ key: "api_key", label: "Secret Key (sk_...)", secret: true },
		{ key: "webhook_secret", label: "Webhook Secret", secret: true },
	],
	satispay: [
		{ key: "api_key", label: "API Key", secret: true },
		{ key: "key_id", label: "Key ID" },
	],
	paypal: [
		{ key: "client_id", label: "Client ID" },
		{ key: "client_secret", label: "Client Secret", secret: true },
	],
	mailgun: [
		{ key: "api_key", label: "API Key", secret: true },
		{ key: "domain", label: "Dominio mail" },
	],
	sendgrid: [{ key: "api_key", label: "API Key", secret: true }],
	whatsapp: [
		{ key: "phone_number_id", label: "Phone Number ID" },
		{ key: "access_token", label: "Access Token", secret: true },
	],
	twilio: [
		{ key: "account_sid", label: "Account SID" },
		{ key: "auth_token", label: "Auth Token", secret: true },
		{ key: "from_number", label: "Numero mittente" },
	],
	coni: [{ key: "api_key", label: "API Key CONI", secret: true }],
	asi: [{ key: "api_key", label: "API Key ASI", secret: true }],
	acsi: [{ key: "api_key", label: "API Key ACSI", secret: true }],
	s3: [
		{ key: "access_key_id", label: "Access Key ID" },
		{ key: "secret_access_key", label: "Secret Access Key", secret: true },
		{ key: "bucket", label: "Bucket" },
		{ key: "region", label: "Region" },
	],
	minio: [
		{ key: "endpoint", label: "Endpoint" },
		{ key: "access_key", label: "Access Key" },
		{ key: "secret_key", label: "Secret Key", secret: true },
		{ key: "bucket", label: "Bucket" },
	],
};

export default function IntegrazioniPage() {
	const utils = trpc.useUtils();

	const providersQuery = trpc.integrazioni.getProviders.useQuery({});
	const listQuery = trpc.integrazioni.list.useQuery();

	const configureMut = trpc.integrazioni.configure.useMutation({
		onSuccess: () => {
			toast.success("Credenziali salvate");
			utils.integrazioni.list.invalidate();
			closeConfig();
		},
		onError: (err) => toast.error(err.message),
	});

	const testMut = trpc.integrazioni.testConnection.useMutation({
		onSuccess: (res) => {
			if (res.esito === "ok") toast.success(`Connessione OK: ${res.messaggio ?? "pronta"}`);
			else toast.error(`Connessione fallita: ${res.messaggio ?? "errore"}`);
			utils.integrazioni.list.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const enableMut = trpc.integrazioni.enable.useMutation({
		onSuccess: () => {
			toast.success("Integrazione abilitata");
			utils.integrazioni.list.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const disableMut = trpc.integrazioni.disable.useMutation({
		onSuccess: () => {
			toast.success("Integrazione disabilitata");
			utils.integrazioni.list.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const configured = useMemo(() => {
		const map: Record<string, { attivo: boolean; ultimoTestEsito?: string | null }> = {};
		for (const it of listQuery.data ?? []) {
			map[it.provider] = {
				attivo: Boolean(it.attivo),
				ultimoTestEsito: it.ultimoTestEsito as string | null,
			};
		}
		return map;
	}, [listQuery.data]);

	const [configOpen, setConfigOpen] = useState(false);
	const [configProvider, setConfigProvider] = useState<{
		provider: string;
		tipo: TipoIntegrazione;
		nome: string;
	} | null>(null);
	const [credValues, setCredValues] = useState<Record<string, string>>({});

	const openConfig = (provider: string, tipo: TipoIntegrazione, nome: string) => {
		setConfigProvider({ provider, tipo, nome });
		const fields = CREDENTIAL_FIELDS[provider] ?? [{ key: "api_key", label: "API Key", secret: true }];
		const initial: Record<string, string> = {};
		for (const f of fields) initial[f.key] = "";
		setCredValues(initial);
		setConfigOpen(true);
	};

	const closeConfig = () => {
		setConfigOpen(false);
		setConfigProvider(null);
		setCredValues({});
	};

	const submitConfig = () => {
		if (!configProvider) return;
		const fields = CREDENTIAL_FIELDS[configProvider.provider] ?? [
			{ key: "api_key", label: "API Key", secret: true },
		];
		const missing = fields.find((f) => !credValues[f.key]?.trim());
		if (missing) {
			toast.error(`Campo obbligatorio: ${missing.label}`);
			return;
		}
		configureMut.mutate({
			provider: configProvider.provider,
			tipo: configProvider.tipo,
			credentials: credValues,
		});
	};

	const providersByTipo = providersQuery.data ?? {};

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Integrazioni</h1>
					<p className="page-subtitle">
						Credenziali per tenant · Vault AES-256-GCM · No hardcoded keys
					</p>
				</div>
			</div>

			<div
				className="card"
				style={{
					marginBottom: "1.5rem",
					borderColor: "hsl(var(--primary) / 0.3)",
					background: "hsl(var(--primary) / 0.05)",
				}}
			>
				<div
					className="card-body"
					style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
				>
					<ShieldCheck
						style={{
							width: "1.5rem",
							height: "1.5rem",
							color: "hsl(var(--primary))",
							flexShrink: 0,
						}}
					/>
					<div>
						<div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
							Vault credenziali sicuro
						</div>
						<div style={{ fontSize: "0.8125rem", color: "hsl(var(--muted-foreground))" }}>
							Tutte le credenziali sono cifrate con AES-256-GCM e una chiave KMS per tenant.
							Le API key non vengono mai esposte in chiaro, nemmeno negli export. Solo il ruolo{" "}
							<code
								style={{
									background: "hsl(var(--muted))",
									padding: "0.0625rem 0.25rem",
									borderRadius: "0.25rem",
									fontSize: "0.75rem",
								}}
							>
								admin
							</code>{" "}
							può modificarle.
						</div>
					</div>
				</div>
			</div>

			{CATEGORIES.map((cat) => {
				const CatIcon = cat.Icon;
				const list = ((providersByTipo as unknown) as Record<string, ProviderMeta[]>)[cat.tipo] ?? [];
				if (list.length === 0) return null;
				return (
					<div key={cat.tipo} style={{ marginBottom: "1.5rem" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								marginBottom: "0.75rem",
							}}
						>
							<CatIcon className="icon-lg" style={{ color: "hsl(var(--primary))" }} />
							<h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
								{cat.label}
							</h2>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
								gap: "0.75rem",
							}}
						>
							{list.map((p) => {
								const conf = configured[p.provider];
								const attivo = conf?.attivo === true;
								const esito = conf?.ultimoTestEsito;
								return (
									<div key={p.provider} className="card">
										<div
											className="card-body"
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "0.75rem",
												padding: "1rem",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "flex-start",
													gap: "0.5rem",
												}}
											>
												<div style={{ minWidth: 0 }}>
													<div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
														{p.nome}
													</div>
													<div
														style={{
															fontSize: "0.8125rem",
															color: "hsl(var(--muted-foreground))",
														}}
													>
														{p.descrizione}
													</div>
												</div>
												{attivo ? (
													<span className="badge badge-success" style={{ flexShrink: 0 }}>
														<CheckCircle className="icon-sm" /> Attivo
													</span>
												) : conf ? (
													<span className="badge badge-warning" style={{ flexShrink: 0 }}>
														Configurato
													</span>
												) : (
													<span className="badge" style={{ flexShrink: 0 }}>
														Non attivo
													</span>
												)}
											</div>
											{esito === "fail" && (
												<div
													style={{
														fontSize: "0.75rem",
														color: "hsl(var(--destructive))",
														display: "flex",
														alignItems: "center",
														gap: "0.25rem",
													}}
												>
													<XCircle className="icon-sm" /> Ultimo test fallito
												</div>
											)}
											<div style={{ display: "flex", gap: "0.375rem" }}>
												{conf ? (
													<>
														<button
															type="button"
															className="btn btn-outline btn-sm"
															style={{ flex: 1 }}
															onClick={() =>
																openConfig(p.provider, cat.tipo, p.nome)
															}
														>
															<Settings2 className="icon-sm" /> Configura
														</button>
														<button
															type="button"
															className="btn btn-ghost btn-sm"
															title="Testa connessione"
															disabled={testMut.isPending}
															onClick={() =>
																testMut.mutate({ provider: p.provider })
															}
														>
															<Zap className="icon-sm" /> Test
														</button>
														{attivo ? (
															<button
																type="button"
																className="btn btn-ghost btn-sm"
																disabled={disableMut.isPending}
																onClick={() =>
																	disableMut.mutate({ provider: p.provider })
																}
															>
																Off
															</button>
														) : (
															<button
																type="button"
																className="btn btn-ghost btn-sm"
																disabled={enableMut.isPending}
																onClick={() =>
																	enableMut.mutate({ provider: p.provider })
																}
															>
																On
															</button>
														)}
													</>
												) : (
													<button
														type="button"
														className="btn btn-primary btn-sm"
														style={{ flex: 1 }}
														onClick={() => openConfig(p.provider, cat.tipo, p.nome)}
													>
														<Plug className="icon-sm" /> Collega
													</button>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				);
			})}

			{/* Configure Modal */}
			<Modal
				open={configOpen}
				onClose={closeConfig}
				title={configProvider ? `Configura ${configProvider.nome}` : "Configura"}
				subtitle="Le credenziali sono cifrate con AES-256-GCM nel vault del tenant"
				size="md"
				footer={
					<>
						<button type="button" className="btn btn-outline btn-sm" onClick={closeConfig}>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={submitConfig}
							disabled={configureMut.isPending}
						>
							Salva nel vault
						</button>
					</>
				}
			>
				{configProvider && (
					<FormGrid>
						{(CREDENTIAL_FIELDS[configProvider.provider] ?? [
							{ key: "api_key", label: "API Key", secret: true },
						]).map((f) => (
							<Field key={f.key} label={f.label} required span={2}>
								<Input
									type={f.secret ? "password" : "text"}
									value={credValues[f.key] ?? ""}
									onChange={(e) =>
										setCredValues((v) => ({ ...v, [f.key]: e.target.value }))
									}
									autoComplete="off"
								/>
							</Field>
						))}
					</FormGrid>
				)}
			</Modal>
		</div>
	);
}
