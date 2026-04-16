import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Connection pool for query execution.
 * max: 10 connections by default, adjustable via DATABASE_POOL_SIZE.
 */
const client = postgres(connectionString, {
  max: Number(process.env.DATABASE_POOL_SIZE) || 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { client };
