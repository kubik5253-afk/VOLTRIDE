import { requireAdmin, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fineSchema } from "@/lib/validation";

export async function POST(request) {
  const origin=originError(request);if(origin)return origin;
  const auth=await requireAdmin();if(auth.error)return auth.error;
  let body;try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  const parsed=fineSchema.safeParse(body);
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Проверьте данные штрафа."},{status:400});
  const {userId,amount,reason}=parsed.data;
  try{
    const db=getDb();
    const [users]=await db.execute("SELECT id,role FROM users WHERE id=? LIMIT 1",[userId]);
    if(!users.length||users[0].role==="admin")return Response.json({error:"Пользователь не найден или является администратором."},{status:404});
    const [result]=await db.execute("INSERT INTO fines (user_id,admin_id,amount_cents,reason) VALUES (?,?,?,?)",[userId,auth.user.id,amount*100,reason]);
    await db.execute("INSERT INTO notifications (user_id,admin_id,title,message) VALUES (?,?,?,?)",[userId,auth.user.id,"Назначен штраф",`Штраф ${amount} ₽. Причина: ${reason}`]);
    await db.execute("INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)",[auth.user.id,"fine.create","fine",result.insertId,JSON.stringify({userId,amount,reason})]);
    return Response.json({ok:true,fineId:result.insertId},{status:201});
  }catch(e){console.error(e);return Response.json({error:"Не удалось выписать штраф."},{status:500})}
}
