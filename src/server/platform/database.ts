import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { ProfileError } from "../../profile/errors.ts";
export function databaseConfig(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new ProfileError(
      "DATABASE_NOT_CONFIGURED",
      503,
      "Configure the application database.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new ProfileError(
      "DATABASE_NOT_CONFIGURED",
      503,
      "Use a PostgreSQL database URL.",
    );
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const insecure = local && env.DATABASE_ALLOW_INSECURE_LOCAL === "true";
  // pg URL ssl options override ssl objects; remove them and enforce our policy.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: insecure
      ? false
      : {
          rejectUnauthorized: true,
          ...(env.DATABASE_CA_CERT
            ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n") }
            : {}),
        },
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    statement_timeout: 10000,
  };
}
export function createDatabase(
  env: Record<string, string | undefined> = process.env,
) {
  const pool = new Pool(databaseConfig(env));
  pool.on("error", () => {
    /* No raw connection errors or credentials in logs. */
  });
  return { pool, db: drizzle(pool) };
}
