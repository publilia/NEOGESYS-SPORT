import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { tenantMiddleware } from "./middleware/tenant";
import { createTRPCContext } from "./trpc/context";
import { appRouter } from "./trpc/router";

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

// ─── Fastify Instance ────────────────────────────────────────────────────────

const app = Fastify({
	logger: {
		level: process.env.LOG_LEVEL || "info",
	},
	maxParamLength: 300,
});

// ─── Plugins ─────────────────────────────────────────────────────────────────

async function registerPlugins(): Promise<void> {
	// CORS: allow *.gestionale.sport subdomains + localhost for dev
	await app.register(cors, {
		origin: (origin, cb) => {
			if (!origin) {
				// Allow requests with no origin (e.g. curl, server-to-server)
				cb(null, true);
				return;
			}

			const allowed =
				/^https?:\/\/([a-z0-9-]+\.)?gestionale\.sport(:\d+)?$/.test(origin) ||
				/^https?:\/\/localhost(:\d+)?$/.test(origin) ||
				/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

			cb(null, allowed);
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Slug", "X-Request-Id"],
	});

	// Cookie plugin for session management
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET || "neogesys-dev-secret-change-me",
		parseOptions: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		},
	});
}

// ─── Middleware ───────────────────────────────────────────────────────────────

function registerMiddleware(): void {
	// Global tenant resolution middleware
	app.addHook("preHandler", tenantMiddleware);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

async function registerRoutes(): Promise<void> {
	// Health check endpoint (not behind tenant middleware)
	app.get("/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	}));

	app.get("/healthz", async () => ({ status: "ok" }));

	app.get("/ready", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
	}));

	// tRPC adapter
	await app.register(fastifyTRPCPlugin, {
		prefix: "/trpc",
		trpcOptions: {
			router: appRouter,
			createContext: createTRPCContext,
			onError({ error, path }: { error: { code?: string }; path?: string }) {
				if (error.code === "INTERNAL_SERVER_ERROR") {
					app.log.error({ err: error, path }, "tRPC internal error");
				}
			},
		},
	});
}

// ─── Server Startup ──────────────────────────────────────────────────────────

async function start(): Promise<void> {
	try {
		await registerPlugins();
		registerMiddleware();
		await registerRoutes();

		await app.listen({ port: PORT, host: HOST });
		app.log.info(`NEOGESYS Sport API running on http://${HOST}:${PORT}`);
		app.log.info(`tRPC endpoint: http://${HOST}:${PORT}/trpc`);
	} catch (err) {
		app.log.fatal(err, "Failed to start server");
		process.exit(1);
	}
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
	app.log.info(`Received ${signal}. Shutting down gracefully...`);

	try {
		await app.close();
		app.log.info("Server closed.");
		process.exit(0);
	} catch (err) {
		app.log.error(err, "Error during shutdown");
		process.exit(1);
	}
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (err) => {
	app.log.fatal(err, "Uncaught exception");
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	app.log.fatal({ reason }, "Unhandled rejection");
	process.exit(1);
});

start();

// Export for testing
export { app, appRouter };
export type { AppRouter } from "./trpc/router";
