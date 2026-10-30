import { getCurrentUser, originError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getRideAccruedCost } from "@/lib/pricing";

export async function POST(request,{params}) {
  const origin=originError(request);if(origin)return origin;
  const user=await getCurrentUser({allowBlocked:true});
  if(!user)return Response.json({error:"Необходим вход в аккаунт"},{status:401});
  const {id}=await params,rideId=Number(id);
  if(!Number.isSafeInteger(rideId)||rideId<1)return Response.json({error:"Некорректная поездка."},{status:400});
  const db=getDb(),conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.execute("SELECT r.*,s.price_per_minute_cents,s.battery,u.role FROM rides r JOIN scooters s ON s.id=r.scooter_id JOIN users u ON u.id=r.user_id WHERE r.id=? AND r.user_id=? AND r.status='active' FOR UPDATE",[rideId,user.id]);
    if(!rows.length){await conn.rollback();return Response.json({error:"Активная поездка не найдена."},{status:404});}
    const ride=rows[0], elapsed=Math.max(1,Math.ceil((Date.now()-new Date(ride.started_at).getTime())/60000));
    const duration=ride.tariff_minutes?Math.min(elapsed,Number(ride.tariff_minutes)):elapsed;
    const prepaid=Number(ride.prepaid_cents||0);
    const accrued=getRideAccruedCost({pricePerMinuteCents:ride.price_per_minute_cents,tariffMinutes:ride.tariff_minutes,prepaidCents:prepaid,elapsedMinutes:duration});
    const [users]=await conn.execute("SELECT balance_cents FROM users WHERE id=? FOR UPDATE",[user.id]);
    const balance=Number(users[0].balance_cents);
    const due=ride.role==="admin"||prepaid?0:Math.min(accrued,balance);
    const refund=ride.role==="admin"?0:(prepaid?Math.max(0,prepaid-Math.min(accrued,prepaid)):0);
    if(due>0){await conn.execute("UPDATE users SET balance_cents=balance_cents-? WHERE id=?",[due,user.id]);await conn.execute("INSERT INTO wallet_transactions (user_id,ride_id,type,amount_cents,description) VALUES (?,?,'ride_charge',?,?)",[user.id,rideId,-due,`Оплата поездки #${rideId}`]);}
    if(refund>0){await conn.execute("UPDATE users SET balance_cents=balance_cents+? WHERE id=?",[refund,user.id]);await conn.execute("INSERT INTO wallet_transactions (user_id,ride_id,type,amount_cents,description) VALUES (?,?,'refund',?,?)",[user.id,rideId,refund,`Возврат за неиспользованное время поездки #${rideId}`]);}
    const depleted=Math.max(0,Number(ride.battery)-Math.floor(duration/2));
    await conn.execute("UPDATE scooters SET battery=?,status=? WHERE id=?",[depleted,depleted===0?"maintenance":"available",ride.scooter_id]);
    const total=prepaid?Math.min(accrued,prepaid):due;
    await conn.execute("UPDATE rides SET status='completed',ended_at=NOW(),duration_minutes=?,total_cents=? WHERE id=?",[duration,total,rideId]);
    await conn.commit();return Response.json({ok:true,minutes:duration,totalCents:total,refundCents:refund,battery:depleted});
  } catch(e){await conn.rollback();console.error(e);return Response.json({error:"Не удалось завершить поездку."},{status:500});}
  finally{conn.release();}
}
