import { requireUser, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTariffPrice } from "@/lib/pricing";

export async function POST(request) {
  const origin=originError(request); if(origin) return origin;
  const auth=await requireUser(); if(auth.error) return auth.error;
  let body; try { body=await request.json(); } catch { return Response.json({error:"Некорректный запрос."},{status:400}); }
  const scooterId=Number(body.scooterId), tariff=String(body.tariff||"minute");
  const tariffMinutes=tariff==="half_hour"?30:tariff==="hour"?60:0;
  if(!Number.isSafeInteger(scooterId)||scooterId<1||!(["minute","half_hour","hour"].includes(tariff))) return Response.json({error:"Выберите самокат и тариф."},{status:400});
  const isAdmin=auth.user.role==="admin", db=getDb(), conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [users]=await conn.execute("SELECT id,balance_cents,is_blocked,accepted_rules_at FROM users WHERE id=? FOR UPDATE",[auth.user.id]);
    const u=users[0];
    if(!u||u.is_blocked){await conn.rollback();return Response.json({error:"Аккаунт недоступен."},{status:403});}
    if(!u.accepted_rules_at){await conn.rollback();return Response.json({error:"Сначала подтвердите правила аренды."},{status:400});}
    const [active]=await conn.execute("SELECT id FROM rides WHERE user_id=? AND status='active' LIMIT 1 FOR UPDATE",[auth.user.id]);
    if(active.length){await conn.rollback();return Response.json({error:"У вас уже есть активная поездка."},{status:409});}
    const [scooters]=await conn.execute("SELECT * FROM scooters WHERE id=? AND is_active=1 FOR UPDATE",[scooterId]);
    const scooter=scooters[0];
    if(!scooter||scooter.status!=="available"||Number(scooter.battery)<=0){await conn.rollback();return Response.json({error:"Самокат сейчас недоступен."},{status:409});}
    const price=Number(scooter.price_per_minute_cents);
    const prepaid=tariffMinutes?getTariffPrice(price,tariffMinutes):0;
    if(!isAdmin && Number(u.balance_cents)<(prepaid||price)){await conn.rollback();return Response.json({error:"Недостаточно средств для выбранного тарифа."},{status:402});}
    const [ride]=await conn.execute("INSERT INTO rides (user_id,scooter_id,status,started_at,tariff_minutes,prepaid_cents) VALUES (?,?,'active',NOW(),?,?)",[auth.user.id,scooterId,tariffMinutes,isAdmin?0:prepaid]);
    if(prepaid>0&&!isAdmin){
      await conn.execute("UPDATE users SET balance_cents=balance_cents-? WHERE id=?",[prepaid,auth.user.id]);
      await conn.execute("INSERT INTO wallet_transactions (user_id,ride_id,type,amount_cents,description) VALUES (?,?,'ride_charge',?,?)",[auth.user.id,ride.insertId,-prepaid,`Предоплата тарифа на ${tariffMinutes} минут`]);
    }
    await conn.execute("UPDATE scooters SET status='riding' WHERE id=?",[scooterId]);
    await conn.commit();
    return Response.json({ok:true,rideId:Number(ride.insertId),balanceCents:Number(u.balance_cents)-(isAdmin?0:prepaid),prepaidCents:isAdmin?0:prepaid});
  } catch(e) { await conn.rollback(); console.error("ride start error",e); return Response.json({error:"Не удалось начать поездку."},{status:500}); }
  finally {conn.release();}
}
