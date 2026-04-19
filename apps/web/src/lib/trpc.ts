"use client";

import { QueryClient } from "@tanstack/react-query";
import {
	createTRPCReact,
	httpBatchLink,
	type CreateTRPCReact,
} from "@trpc/react-query";
import type { AppRouter } from "@neogesys/api";

/**
 * Shared tRPC React client for the NEOGESYS Sport web app.
 * Typed against the server's AppRouter for end-to-end type safety.
 * Explicit annotation avoids TS2742 on deep-inferred types.
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
	if (typeof window !== "undefined") {
		// Browser: call the API container directly on port 4000
		return "http://localhost:4000";
	}
	// Server: inside Docker, API is reachable via hostname `api`
	return process.env.API_URL ?? "http://localhost:4000";
}

/**
 * Reads current dev auth context from localStorage (set by the Zustand
 * useCurrentUser store with key "neogesys-current-user"). This lets us
 * send the active role + tenant slug as headers to the API without
 * implementing a full auth flow.
 */
function getDevHeaders(): Record<string, string> {
	if (typeof window === "undefined") {
		return {};
	}
	try {
		const raw = window.localStorage.getItem("neogesys-current-user");
		if (!raw) return {};
		const parsed = JSON.parse(raw) as {
			state?: { current?: { role?: string; tenant?: string } };
		};
		const role = parsed?.state?.current?.role;
		const tenantLabel = parsed?.state?.current?.tenant;

		const headers: Record<string, string> = {};
		if (role) headers["x-dev-role"] = role;

		// Map tenant display name to slug. All demo users belong to "demo-asd".
		// Super admin uses the platform label and no tenant slug.
		if (tenantLabel && tenantLabel !== "NEOGESYS Platform") {
			headers["x-dev-tenant-slug"] = "demo-asd";
		}
		return headers;
	} catch {
		return {};
	}
}

export function createTRPCClient(): ReturnType<typeof trpc.createClient> {
	return trpc.createClient({
		links: [
			httpBatchLink({
				url: `${getBaseUrl()}/trpc`,
				headers() {
					return {
						"x-trpc-source": "web",
						...getDevHeaders(),
					};
				},
				// Allow sending/receiving cookies for the session flow.
				fetch(input, init) {
					return fetch(input, { ...init, credentials: "include" });
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
				retry: 1,
			},
		},
	});
}
