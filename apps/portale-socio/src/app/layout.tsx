import { PortaleHeader } from "@/components/portale-header";
import { PortaleNav } from "@/components/portale-nav";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Portale Socio - NeoGesys Sport",
	description: "Portale personale per i soci delle associazioni sportive dilettantistiche",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="it" suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange={false}
				>
					<div className="flex min-h-screen flex-col">
						<PortaleHeader />
						<PortaleNav />
						<main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
							{children}
						</main>
						<footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
							&copy; {new Date().getFullYear()} NeoGesys Sport. Tutti i diritti riservati.
						</footer>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
