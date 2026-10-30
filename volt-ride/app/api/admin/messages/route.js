import { requireAdmin, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { messageSchema } from "@/lib/validation";

export async function POST(request) {
  const origin=originError(request);if(origin)return origin;
  const auth=await requireAdmin();if(auth.error)return auth.error;
  let body;try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  const parsed=messageSchema.safeParse(body);
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Проверьте сообщение."},{status:400});
  const {userId,title,message}=parsed.data;
  try{
    const db=getDb();
    const [users]=await db.execute("SELECT id FROM users WHERE id=? AND role='user' LIMIT 1",[userId]);
    if(!users.length)return Response.json({error:"Пользователь не найден."},{status:404});
    const [result]=await db.execute("INSERT INTO notifications (user_id,admin_id,title,message) VALUES (?,?,?,?)",[userId,auth.user.id,title,message]);
    await db.execute("INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)",[auth.user.id,"message.send","user",userId,JSON.stringify({notificationId:result.insertId,title})]);
    return Response.json({ok:true},{status:201});
  }catch(e){console.error(e);return Response.json({error:"Не удалось отправить сообщение."},{status:500})}
}
