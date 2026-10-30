import { requireAdmin, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request,{params}) {
  const origin=originError(request);if(origin)return origin;
  const auth=await requireAdmin();if(auth.error)return auth.error;
  const {id}=await params,userId=Number(id);
  let body;try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  if(!Number.isSafeInteger(userId)||userId<1||typeof body.blocked!=="boolean")return Response.json({error:"Некорректные данные."},{status:400});
  if(userId===Number(auth.user.id))return Response.json({error:"Нельзя блокировать собственный аккаунт."},{status:400});
  const db=getDb(),conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.execute("SELECT id,role FROM users WHERE id=? FOR UPDATE",[userId]);
    if(!rows.length){await conn.rollback();return Response.json({error:"Пользователь не найден."},{status:404})}
    if(rows[0].role==="admin"){await conn.rollback();return Response.json({error:"Нельзя блокировать администратора через эту форму."},{status:400})}
    await conn.execute("UPDATE users SET is_blocked=? WHERE id=?",[body.blocked,userId]);
    await conn.execute("INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)",[auth.user.id,body.blocked?"user.block":"user.unblock","user",userId,JSON.stringify({blocked:body.blocked})]);
    await conn.commit();return Response.json({ok:true});
  }catch(e){await conn.rollback();console.error(e);return Response.json({error:"Не удалось изменить статус пользователя."},{status:500})}
  finally{conn.release()}
}
