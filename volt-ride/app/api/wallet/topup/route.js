import { requireUser, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { topupSchema } from "@/lib/validation";
import { randomUUID } from "crypto";

export async function POST(request) {
  const origin=originError(request); if(origin) return origin;
  const auth=await requireUser(); if(auth.error) return auth.error;
  if (process.env.NODE_ENV === "production") return Response.json({error:"Онлайн-пополнение ещё не подключено. Настройте платёжного провайдера перед приёмом платежей."},{status:503});
  let body; try{body=await request.json()}catch{return Response.json({error:"Некорректный JSON"},{status:400})}
  const parsed=topupSchema.safeParse(body);
  if(!parsed.success) return Response.json({error:"Укажите положительную сумму пополнения (можно с копейками)."},{status:400});
  const amountCents=Math.round(parsed.data.amount*100), db=getDb(), conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    await conn.execute("UPDATE users SET balance_cents=balance_cents+? WHERE id=?",[amountCents,auth.user.id]);
    await conn.execute("INSERT INTO wallet_transactions (user_id,type,amount_cents,description,idempotency_key) VALUES (?,'topup',?,'Пополнение в локальном режиме',?)",[auth.user.id,amountCents,randomUUID()]);
    await conn.commit();
    return Response.json({ok:true,balanceCents:Number(auth.user.balance_cents)+amountCents,mode:"demo"});
  }catch(e){await conn.rollback();console.error("topup error",e);return Response.json({error:"Не удалось пополнить баланс."},{status:500})}
  finally{conn.release()}
}
