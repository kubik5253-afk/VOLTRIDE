import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const auth=await requireAdmin();if(auth.error)return auth.error;
  try{
    const db=getDb();
    const [users]=await db.execute("SELECT id,name,email,role,is_blocked,balance_cents,created_at FROM users ORDER BY id DESC LIMIT 500");
    const [scooters]=await db.execute("SELECT id,name,type,battery,max_speed,range_km,price_per_minute_cents,latitude,longitude,status,is_active FROM scooters ORDER BY id DESC");
    const [rides]=await db.execute("SELECT r.id,r.user_id,r.scooter_id,r.started_at,u.name AS user_name,u.email,s.name AS scooter_name FROM rides r JOIN users u ON u.id=r.user_id JOIN scooters s ON s.id=r.scooter_id WHERE r.status='active' ORDER BY r.started_at DESC");
    return Response.json({users,scooters,rides,activeRides:rides.length});
  }catch(e){console.error(e);return Response.json({error:"Не удалось загрузить админ-панель."},{status:500})}
}
