import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const auth = await requireUser(); if (auth.error) return auth.error;
  try {
    const db=getDb(), userId=auth.user.id;
    const [uRows]=await db.execute("SELECT id,name,email,role,balance_cents,created_at FROM users WHERE id=?",[userId]);
    const [transactions]=await db.execute("SELECT id,type,amount_cents,description,created_at FROM wallet_transactions WHERE user_id=? ORDER BY id DESC LIMIT 50",[userId]);
    const [rides]=await db.execute("SELECT r.id,r.status,r.started_at,r.ended_at,r.duration_minutes,r.total_cents,r.tariff_minutes,r.prepaid_cents,s.name,s.price_per_minute_cents FROM rides r JOIN scooters s ON s.id=r.scooter_id WHERE r.user_id=? ORDER BY r.id DESC LIMIT 50",[userId]);
    const [fines]=await db.execute("SELECT id,amount_cents,reason,status,created_at FROM fines WHERE user_id=? ORDER BY id DESC LIMIT 50",[userId]);
    const [notifications]=await db.execute("SELECT id,title,message,is_read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50",[userId]);
    return Response.json({user:{...uRows[0],id:Number(uRows[0].id),balanceCents:Number(uRows[0].balance_cents)},transactions,rides,fines,notifications});
  } catch(e) {
    console.error("account error",e);
    return Response.json({error:"Не удалось загрузить личный кабинет."},{status:500});
  }
}
