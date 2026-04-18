"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Inserisci un indirizzo email valido"),
	password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
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
			// Simulated login
			localStorage.setItem("neogesys-token", "placeholder-token");
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
				{/* Tenant branding */}
				<div className="flex flex-col items-center space-y-3">
					<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
						<span className="text-2xl font-bold">NS</span>
					</div>
					<h1 className="text-2xl font-bold text-foreground">NeoGesys Sport</h1>
					<p className="text-sm text-muted-foreground">Accedi al tuo gestionale sportivo</p>
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
									Accedi
								</>
							)}
						</button>
					</form>

					{/* Forgot password */}
					<div className="mt-4 text-center">
						<Link href="/forgot-password" className="text-sm text-primary hover:underline">
							Password dimenticata?
						</Link>
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-xs text-muted-foreground">
					&copy; {new Date().getFullYear()} NeoGesys Sport. Tutti i diritti riservati.
				</p>
			</div>
		</div>
	);
}
