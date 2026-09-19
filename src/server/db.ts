import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

const state = globalThis as typeof globalThis & {
  employherDb?: NodePgDatabase;
  employherPool?: Pool;
};

// Lazy singleton so every adapter (profiles, operations, users) shares one
// pool instead of each opening its own connections.
export function getDb(): NodePgDatabase {
  if (!state.employherDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured.");
    }
    state.employherPool = new Pool({
      connectionString,
      ssl:
        process.env.PGSSLMODE === "disable"
          ? undefined
          : { rejectUnauthorized: true },
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
    state.employherDb = drizzle(state.employherPool);
  }
  return state.employherDb;
}
