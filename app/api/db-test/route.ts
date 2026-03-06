import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Tests the PostgreSQL connection and returns the current DB time.
 */
export async function GET() {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    return NextResponse.json({ ok: true, now: result.rows[0].now });
  } catch (error: any) {
    return new NextResponse(error.message || "DB connection failed", { status: 500 });
  }
}