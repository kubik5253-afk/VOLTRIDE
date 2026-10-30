import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { publicScooter } from "@/lib/format";

export async function GET() {
  try {
    const db = getDb();
    const viewer = await getCurrentUser();
    const isAdmin = viewer?.role === "admin";
    const [rows] = await db.execute(
      `SELECT id,name,type,battery,max_speed,range_km,price_per_minute_cents,latitude,longitude,status FROM scooters WHERE is_active=TRUE ${isAdmin ? "" : "AND status='available' AND battery>0"} ORDER BY id DESC`
    );
    return Response.json({scooters:rows.map(publicScooter)});
  } catch (e) {
    console.error("scooters error",e);
    return Response.json({error:"Не удалось загрузить парк самокатов."},{status:500});
  }
}
