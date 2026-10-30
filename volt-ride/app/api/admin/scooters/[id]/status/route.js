import { requireAdmin, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

export async function POST(request,{params}) {
  const origin=originError(request);if(origin)return origin;
  const auth=await requireAdmin();if(auth.error)return auth.error;
  const {id}=await params,scooterId=Number(id);
  let body;try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  const parsed=z.object({status:z.enum(["available","maintenance"])}).safeParse(body);
  if(!Number.isSafeInteger(scooterId)||scooterId<1||!parsed.success)return Response.json({error:"Некорректные данные."},{status:400});
  try{
    const db=getDb();
    const [rows]=await db.execute("SELECT status FROM scooters WHERE id=?",[scooterId]);
    if(!rows.length)return Response.json({error:"Самокат не найден."},{status:404});
    if(rows[0].status==="riding")return Response.json({error:"Нельзя менять статус самоката, пока он используется."},{status:409});
    await db.execute("UPDATE scooters SET status=? WHERE id=?",[parsed.data.status,scooterId]);
    await db.execute("INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)",[auth.user.id,"scooter.status","scooter",scooterId,JSON.stringify(parsed.data)]);
    return Response.json({ok:true});
  }catch(e){console.error(e);return Response.json({error:"Не удалось обновить самокат."},{status:500})}
}
