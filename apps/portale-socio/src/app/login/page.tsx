"use client";

import { NeogesysLogoFull } from "@/components/brand/neogesys-mark";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Inserisci un indirizzo email valido"),
	password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function PortaleLoginPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (_data: LoginFormData) => {
		setIsLoading(true);
		try {
			localStorage.setItem("portale-socio-token", "placeholder-token");
			window.location.href = "/";
		} catch {
			// Handle error
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-md space-y-8">
				{/* Brand — quasar NEOGESYS Universal Suite + pill "PORTALE SOCIO".
				    Riusa il trattamento visivo del web app (cosmic panel
				    #13102A + glow magenta/viola + tagline "Universal Suite"
				    leggibile a 48px). Sotto il logo compare una pill che
				    identifica l'app "Portale Socio" invece della classica
				    "Sport" — mette i soci nel contesto giusto senza confondere
				    con il gestionale operativo. */}
				<div className="flex flex-col items-center space-y-3">
					<div
						style={{
							background: "#13102A",
							color: "#FFF6D9",
							borderRadius: "0.875rem",
							padding: "1.25rem 1.75rem",
							boxShadow: "0 0 0 1px rgba(139, 63, 229, 0.25), 0 0 32px rgba(237, 63, 158, 0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<NeogesysLogoFull size={220} />
					</div>
					<span
						style={{
							display: "inline-block",
							padding: "0.25rem 0.75rem",
							borderRadius: "9999px",
							fontSize: "0.6875rem",
							fontWeight: 800,
							letterSpacing: "0.08em",
							textTransform: "uppercase",
							color: "#FFF6D9",
							background: "linear-gradient(135deg, #8B3FE5 0%, #ED3F9E 100%)",
							boxShadow: "0 0 12px rgba(237, 63, 158, 0.35)",
						}}
					>
						Portale Socio
					</span>
					<p className="text-sm text-muted-foreground">Accedi alla tua area personale</p>
				</div>

				{/* Login form */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						{/* Email */}
						<div className="space-y-2">
							<label htmlFor="email" className="text-sm font-medium text-foreground">
								Email
							</label>
							<input
								id="email"
								type="email"
								placeholder="mario.rossi@esempio.it"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								{...register("email")}
							/>
							{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
						</div>

						{/* Password */}
						<div className="space-y-2">
							<label htmlFor="password" className="text-sm font-medium text-foreground">
								Password
							</label>
							<div className="relative">
								<input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="La tua password"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									{...register("password")}
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									onClick={() => setShowPassword(!showPassword)}
									tabIndex={-1}
								>
									{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
							{errors.password && (
								<p className="text-xs text-destructive">{errors.password.message}</p>
							)}
						</div>

						{/* Remember me */}
						<div className="flex items-center gap-2">
							<input
								id="remember"
								type="checkbox"
								className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
							/>
							<label htmlFor="remember" className="text-sm text-muted-foreground">
								Ricordami su questo dispositivo
							</label>
						</div>

						{/* Submit */}
						<button
							type="submit"
							disabled={isLoading}
							className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
							) : (
								<>
									<LogIn className="h-4 w-4" />
									Accedi al Portale
								</>
							)}
						</button>
					</form>

					{/* Forgot password */}
					<div className="mt-4 text-center">
						<button
							type="button"
							className="text-sm text-primary hover:underline"
							onClick={() => alert("Contatta la segreteria per il reset della password.")}
						>
							Password dimenticata?
						</button>
					</div>
				</div>

				{/* Help text */}
				<p className="text-center text-xs text-muted-foreground">
					Le credenziali di accesso ti sono state fornite dalla segreteria della tua associazione
					sportiva.
				</p>
			</div>
		</div>
	);
}
