import { AdminSidebar } from "@/components/admin-sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "NEOGESYS Sport - Super Admin",
	description: "Pannello di amministrazione della piattaforma NEOGESYS Sport",
};

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="it">
			<body className="bg-gray-50 text-gray-900 antialiased">
				<div className="flex h-screen overflow-hidden">
					<AdminSidebar />
					<main className="flex-1 overflow-y-auto">
						<div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
					</main>
				</div>
			</body>
		</html>
	);
}
