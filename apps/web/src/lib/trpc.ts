"use client";

import { QueryClient } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

// The AppRouter type will be imported from the API package once available.
// For now we use `any` as a placeholder to avoid circular deps.
// Replace with: import type { AppRouter } from "@neogesys/api";
// biome-ignore lint/suspicious/noExplicitAny: placeholder until API types are available
type AppRouter = any;

// biome-ignore lint/suspicious/noExplicitAny: tRPC v11 strict type checking fails on AppRouter = any placeholder
export const trpc: any = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
	if (typeof window !== "undefined") {
		return "";
	}
	return process.env.API_URL ?? "http://localhost:4000";
}

export function createTRPCClient() {
	return trpc.createClient({
		links: [
			httpBatchLink({
				url: `${getBaseUrl()}/api/trpc`,
				headers() {
					return {
						"x-trpc-source": "web",
					};
				},
			}),
		],
	});
}

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30 * 1000,
				refetchOnWindowFocus: false,
			},
		},
	});
}
