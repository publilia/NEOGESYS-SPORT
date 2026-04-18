"use client";

import { CreditCard, FileCheck, FileText, GraduationCap, Home, Mail, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", label: "Home", icon: Home },
	{ href: "/profilo", label: "Profilo", icon: User },
	{ href: "/quote", label: "Quote", icon: CreditCard },
	{ href: "/corsi", label: "Corsi", icon: GraduationCap },
	{ href: "/certificati", label: "Certificati", icon: FileCheck },
	{ href: "/documenti", label: "Documenti", icon: FileText },
	{ href: "/comunicazioni", label: "Messaggi", icon: Mail },
] as const;

export function PortaleNav() {
	const pathname = usePathname();

	return (
		<nav className="border-b border-border bg-card">
			<div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
				<div className="flex h-11 items-center gap-1">
					{navItems.map((item) => {
						const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
									isActive
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								}`}
							>
								<Icon className="h-4 w-4" />
								<span className="hidden sm:inline">{item.label}</span>
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
