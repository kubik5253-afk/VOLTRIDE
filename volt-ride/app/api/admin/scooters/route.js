import { requireAdmin, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

const schema=z.object({
  name:z.string().trim().min(2).max(100),
  type:z.enum(["child","adult","professional"]),
  battery:z.number().int().min(0).max(100),
  maxSpeed:z.number().int().min(1).max(100),
  rangeKm:z.number().min(1).max(200),
  price:z.number().int().min(1).max(1000),
  latitude:z.number().min(-90).max(90),
  longitude:z.number().min(-180).max(180)
});

export async function POST(request) {
  const origin=originError(request);if(origin)return origin;
  const auth=await requireAdmin();if(auth.error)return auth.error;
  let body;try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  const parsed=schema.safeParse(body);
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Проверьте характеристики самоката."},{status:400});
  const s=parsed.data;
  try{
    const db=getDb();
    const [result]=await db.execute("INSERT INTO scooters (name,type,battery,max_speed,range_km,price_per_minute_cents,latitude,longitude) VALUES (?,?,?,?,?,?,?,?)",[s.name,s.type,s.battery,s.maxSpeed,s.rangeKm,s.price*100,s.latitude,s.longitude]);
    await db.execute("INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)",[auth.user.id,"scooter.create","scooter",result.insertId,JSON.stringify(s)]);
    return Response.json({ok:true,id:result.insertId},{status:201});
  }catch(e){console.error(e);return Response.json({error:"Не удалось добавить самокат."},{status:500})}
}
