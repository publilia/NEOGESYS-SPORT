"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, Upload } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

const eventoSchema = z
	.object({
		nome: z.string().min(1, "Il nome e obbligatorio"),
		tipo: z.enum(["gara", "torneo", "stage", "saggio", "raduno"], {
			required_error: "Seleziona un tipo",
		}),
		descrizione: z.string().optional(),
		dataInizio: z.string().min(1, "La data di inizio e obbligatoria"),
		dataFine: z.string().min(1, "La data di fine e obbligatoria"),
		luogo: z.string().min(1, "Il luogo e obbligatorio"),
		disciplina: z.string().min(1, "La disciplina e obbligatoria"),
		categoria: z.string().optional(),
		quotaIscrizione: z.coerce.number().min(0, "La quota non puo essere negativa").optional(),
		maxPartecipanti: z.coerce.number().int().min(1, "Minimo 1 partecipante").optional(),
		deadlineIscrizione: z.string().optional(),
	})
	.refine((data) => !data.dataFine || data.dataFine >= data.dataInizio, {
		message: "La data di fine deve essere successiva alla data di inizio",
		path: ["dataFine"],
	});

type EventoFormData = z.infer<typeof eventoSchema>;

export default function NuovoEventoPage() {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<EventoFormData>({
		resolver: zodResolver(eventoSchema),
	});

	const onSubmit = async (_data: EventoFormData) => {};

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					href="/eventi"
					className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">Nuovo Evento</h1>
					<p className="text-muted-foreground">Crea un nuovo evento sportivo</p>
				</div>
			</div>

			{/* Form */}
			<form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
				<div className="rounded-xl border border-border bg-card p-6 space-y-5">
					{/* Nome */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Nome evento *</label>
						<input
							type="text"
							{...register("nome")}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Es. Torneo Primavera Under 14"
						/>
						{errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
					</div>

					{/* Tipo */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Tipo *</label>
						<select
							{...register("tipo")}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">Seleziona tipo...</option>
							<option value="gara">Gara</option>
							<option value="torneo">Torneo</option>
							<option value="stage">Stage</option>
							<option value="saggio">Saggio</option>
							<option value="raduno">Raduno</option>
						</select>
						{errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
					</div>

					{/* Descrizione */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Descrizione</label>
						<textarea
							{...register("descrizione")}
							rows={3}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Descrizione dell'evento..."
						/>
					</div>

					{/* Date */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Data inizio *</label>
							<div className="relative">
								<CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<input
									type="date"
									{...register("dataInizio")}
									className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							{errors.dataInizio && (
								<p className="text-xs text-destructive">{errors.dataInizio.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Data fine *</label>
							<div className="relative">
								<CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<input
									type="date"
									{...register("dataFine")}
									className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							{errors.dataFine && (
								<p className="text-xs text-destructive">{errors.dataFine.message}</p>
							)}
						</div>
					</div>

					{/* Luogo */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Luogo *</label>
						<input
							type="text"
							{...register("luogo")}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Es. Campo Sportivo Centrale"
						/>
						{errors.luogo && <p className="text-xs text-destructive">{errors.luogo.message}</p>}
					</div>

					{/* Disciplina + Categoria */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Disciplina *</label>
							<input
								type="text"
								{...register("disciplina")}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="Es. Calcio"
							/>
							{errors.disciplina && (
								<p className="text-xs text-destructive">{errors.disciplina.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Categoria</label>
							<input
								type="text"
								{...register("categoria")}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="Es. Under 14"
							/>
						</div>
					</div>

					{/* Quota + Max partecipanti */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Quota iscrizione (EUR)</label>
							<input
								type="number"
								step="0.01"
								{...register("quotaIscrizione")}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="0.00"
							/>
							{errors.quotaIscrizione && (
								<p className="text-xs text-destructive">{errors.quotaIscrizione.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">Max partecipanti</label>
							<input
								type="number"
								{...register("maxPartecipanti")}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="Es. 50"
							/>
							{errors.maxPartecipanti && (
								<p className="text-xs text-destructive">{errors.maxPartecipanti.message}</p>
							)}
						</div>
					</div>

					{/* Deadline iscrizione */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Deadline iscrizione</label>
						<input
							type="date"
							{...register("deadlineIscrizione")}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					{/* Regolamento upload */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground">Regolamento (PDF)</label>
						<div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6">
							<div className="text-center">
								<Upload className="mx-auto h-8 w-8 text-muted-foreground" />
								<p className="mt-2 text-sm text-muted-foreground">
									Trascina qui il file o{" "}
									<span className="font-medium text-primary cursor-pointer">sfoglia</span>
								</p>
								<p className="mt-1 text-xs text-muted-foreground">PDF, max 10MB</p>
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 justify-end">
					<Link
						href="/eventi"
						className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
					>
						Annulla
					</Link>
					<button
						type="submit"
						disabled={isSubmitting}
						className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{isSubmitting ? "Salvataggio..." : "Crea Evento"}
					</button>
				</div>
			</form>
		</div>
	);
}
