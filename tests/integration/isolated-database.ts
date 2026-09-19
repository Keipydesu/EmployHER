import { randomUUID } from "node:crypto";
import { Pool } from "pg";
export async function isolatedDatabase(connectionString: string) {
  const admin = new Pool({ connectionString });
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
  });
  return {
    pool,
    cleanup: async () => {
      await pool.end();
      try {
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await admin.end();
      }
    },
  };
}
