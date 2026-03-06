import { Pool } from "pg";

/**
 * Creates a shared PostgreSQL connection pool for server-side queries.
 */
export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (!globalThis.__pgPool) {
  globalThis.__pgPool = pool;
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}