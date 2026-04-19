"use client";

import { NeogesysLogoHorizontal } from "@/components/brand/neogesys-mark";
import {
	BarChart3,
	Building2,
	CreditCard,
	LayoutDashboard,
	ScrollText,
	Server,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/tenants", label: "Tenants", icon: Building2 },
	{ href: "/piani", label: "Piani", icon: CreditCard },
	{ href: "/metriche", label: "Metriche", icon: BarChart3 },
	{ href: "/sistema", label: "Sistema", icon: Server },
	{ href: "/log", label: "Log", icon: ScrollText },
];

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
			{/* ── Brand ────────────────────────────────────────────────────── */}
			<div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
				<div className="flex h-9 items-center justify-center overflow-hidden rounded-lg bg-[#13102A] px-2.5 text-[#FFF6D9] shadow-[0_0_0_1px_rgba(139,63,229,0.25),0_0_18px_rgba(237,63,158,0.12)]">
					<NeogesysLogoHorizontal ariaHidden className="h-5 w-auto" />
				</div>
				<p className="text-xs font-medium text-gray-400">Super Admin Console</p>
			</div>

			{/* ── Navigation ──────────────────────────────────────────────── */}
			<nav className="flex-1 space-y-1 px-3 py-4">
				{navItems.map((item) => {
					const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
								isActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
							}`}
						>
							<item.icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
							{item.label}
						</Link>
					);
				})}
			</nav>

			{/* ── Footer ──────────────────────────────────────────────────── */}
			<div className="border-t border-gray-200 px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
						SA
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">Super Admin</p>
						<p className="truncate text-xs text-gray-400">admin@neogesys.sport</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
