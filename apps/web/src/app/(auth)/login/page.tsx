"use client";

import { NeogesysLogoFull } from "@/components/brand/neogesys-mark";
import { ROLES, type UserRole, useCurrentUser } from "@/lib/current-user";
import { APP_VERSION, formatReleaseDateTime } from "@/lib/version";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email("Inserisci un indirizzo email valido"),
	password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const ROLE_ORDER: UserRole[] = [
	"super_admin",
	"admin_tenant",
	"coordinatore",
	"operatore",
	"tesoriere",
	"istruttore",
	"user",
];

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const setRole = useCurrentUser((s) => s.setRole);

	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	// Auto-login via query param: /login?role=admin_tenant
	useEffect(() => {
		const roleParam = searchParams.get("role") as UserRole | null;
		if (roleParam && ROLES[roleParam]) {
			localStorage.setItem("neogesys-token", "placeholder-token");
			setRole(roleParam);
			router.replace("/");
		}
	}, [searchParams, setRole, router]);

	const onSubmit = async (_data: LoginFormData) => {
		setIsLoading(true);
		try {
			localStorage.setItem("neogesys-token", "placeholder-token");
			// Default: admin_tenant se non specificato diversamente
			setRole("admin_tenant");
			router.replace("/");
		} finally {
			setIsLoading(false);
		}
	};

	const quickLogin = (role: UserRole) => {
		localStorage.setItem("neogesys-token", "placeholder-token");
		setRole(role);
		router.replace("/");
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
			<div className="w-full max-w-md space-y-6">
				{/* Brand — logo NEOGESYS Universal Suite + sector pill SPORT.
				    Il container è un "cosmic panel" #13102A con glow magenta/viola:
				    stesso trattamento visivo usato nel .logo-horizontal-wrap
				    dell'AppHeader. La tagline "Universal Suite" è leggibile
				    perché qui il logo è renderizzato a 48px di altezza, dove
				    il font ~9.88 unit viene a ~10px e resta leggibile. */}
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
					<div className="flex items-center gap-2">
						<span
							style={{
								display: "inline-block",
								padding: "0.25rem 0.625rem",
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
							Sport
						</span>
					</div>
					<p className="text-sm text-muted-foreground">Accedi al tuo gestionale sportivo</p>
				</div>

				{/* Login form */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

					<div className="mt-4 text-center">
						<Link href="/forgot-password" className="text-sm text-primary hover:underline">
							Password dimenticata?
						</Link>
					</div>
				</div>

				{/* Quick login per ruolo (dev) */}
				<div className="rounded-xl border border-border bg-card p-4">
					<div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
						<Zap className="h-4 w-4 text-primary" />
						Accesso rapido per ruolo (dev)
					</div>
					<div className="grid grid-cols-2 gap-2">
						{ROLE_ORDER.map((r) => {
							const info = ROLES[r];
							return (
								<button
									key={r}
									type="button"
									onClick={() => quickLogin(r)}
									className="group flex flex-col items-start gap-1 rounded-md border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary hover:bg-primary/5"
								>
									<span className="font-semibold text-foreground group-hover:text-primary">
										{info.label}
									</span>
									<code className="text-[10px] text-muted-foreground">{info.id}</code>
								</button>
							);
						})}
					</div>
					<p className="mt-3 text-[11px] text-muted-foreground">
						Puoi anche aprire direttamente:{" "}
						<code className="rounded bg-muted px-1 py-0.5 text-[10px]">
							/login?role=admin_tenant
						</code>
					</p>
				</div>

				<p className="text-center text-xs text-muted-foreground">
					&copy; {new Date().getFullYear()} NEOGESYS Sport. Tutti i diritti riservati.
				</p>
				<p
					className="text-center text-[10px] text-muted-foreground"
					title={`Release ${APP_VERSION} · ${formatReleaseDateTime()}`}
					style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.02em" }}
				>
					<span style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>v{APP_VERSION}</span>
					{" · "}
					{formatReleaseDateTime()}
					{" · "}
					<span
						style={{
							color: "hsl(var(--accent))",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
						}}
					>
						dev
					</span>
				</p>
			</div>
		</div>
	);
}
