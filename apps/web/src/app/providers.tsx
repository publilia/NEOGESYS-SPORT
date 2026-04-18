"use client";

import { PaletteProvider } from "@/components/palette-provider";
import { createQueryClient, createTRPCClient, trpc } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => createQueryClient());
	const [trpcClient] = useState(() => createTRPCClient());

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange={false}
				>
					<PaletteProvider>
						{children}
						<Toaster
							position="bottom-right"
							richColors
							closeButton
							toastOptions={{
								className: "font-sans",
							}}
						/>
					</PaletteProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</trpc.Provider>
	);
}
