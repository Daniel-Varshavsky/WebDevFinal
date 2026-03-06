// server/src/db.ts
import { Pool } from "pg";

/**
 * Creates a PostgreSQL pool for the Express server.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});