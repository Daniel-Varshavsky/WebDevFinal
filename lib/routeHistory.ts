// lib/routeHistory.ts
import { pool } from "./db";

export type LatLng = [number, number];

export type SavedRouteDay = {
  day: number;
  distanceKm: number;
  polyline: LatLng[];
};

export type SavedRoutePlan = {
  id: number;
  title: string;
  place: string;
  kind: "bike" | "hike";
  center: LatLng;
  createdAt: string;
  days: SavedRouteDay[];
};

type SavePlanInput = {
  userId: number;
  title: string;
  place: string;
  kind: "bike" | "hike";
  center: LatLng;
  days: SavedRouteDay[];
};

/**
 * Saves one approved generated route plan and all day routes in a transaction.
 */
export async function saveRoutePlan(input: SavePlanInput): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const planRes = await client.query(
      `
      INSERT INTO route_plans (user_id, title, place, trip_kind, center_lat, center_lng)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        input.userId,
        input.title,
        input.place,
        input.kind,
        input.center[0],
        input.center[1],
      ]
    );

    const planId: number = Number(planRes.rows[0].id);

    for (const day of input.days) {
      await client.query(
        `
        INSERT INTO route_plan_days (plan_id, day_number, distance_km, polyline_json)
        VALUES ($1, $2, $3, $4::jsonb)
        `,
        [planId, day.day, day.distanceKm, JSON.stringify(day.polyline)]
      );
    }

    await client.query("COMMIT");
    return planId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Loads all saved route plans for one user, including all day routes for each plan.
 */
export async function getRoutePlansByUser(userId: number): Promise<SavedRoutePlan[]> {
  const plansRes = await pool.query(
    `
    SELECT id, title, place, trip_kind, center_lat, center_lng, created_at
    FROM route_plans
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  if (plansRes.rows.length === 0) return [];

  const planIds = plansRes.rows.map((p) => Number(p.id));

  const daysRes = await pool.query(
    `
    SELECT plan_id, day_number, distance_km, polyline_json
    FROM route_plan_days
    WHERE plan_id = ANY($1::bigint[])
    ORDER BY plan_id, day_number
    `,
    [planIds]
  );

  const daysMap = new Map<number, SavedRouteDay[]>();

  for (const row of daysRes.rows) {
    const planId = Number(row.plan_id);
    const list = daysMap.get(planId) ?? [];

    list.push({
      day: Number(row.day_number),
      distanceKm: Number(row.distance_km),
      polyline: row.polyline_json as LatLng[],
    });

    daysMap.set(planId, list);
  }

  return plansRes.rows.map((p) => ({
    id: Number(p.id),
    title: String(p.title),
    place: String(p.place),
    kind: p.trip_kind as "bike" | "hike",
    center: [Number(p.center_lat), Number(p.center_lng)],
    createdAt: new Date(p.created_at).toISOString(),
    days: daysMap.get(Number(p.id)) ?? [],
  }));
}