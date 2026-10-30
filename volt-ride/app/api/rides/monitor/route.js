import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getRideAccruedCost } from "@/lib/pricing";
export async function POST(){
 const user=await getCurrentUser({allowBlocked:true}); if(!user)return Response.json({ok:false},{status:401});
 const db=getDb(),conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  const [rows]=await conn.execute("SELECT r.*,s.price_per_minute_cents,s.battery,u.role FROM rides r JOIN scooters s ON s.id=r.scooter_id JOIN users u ON u.id=r.user_id WHERE r.user_id=? AND r.status='active' FOR UPDATE",[user.id]);
  if(!rows.length){await conn.commit();return Response.json({active:false});}
  const r=rows[0],minutes=Math.max(0,Math.floor((Date.now()-new Date(r.started_at).getTime())/60000));
  const elapsed=Math.max(1,minutes),prepaid=Number(r.prepaid_cents||0),limit=Number(r.tariff_minutes||0);
  const used=Math.min(elapsed,limit||elapsed),cost=getRideAccruedCost({pricePerMinuteCents:r.price_per_minute_cents,tariffMinutes:limit,prepaidCents:prepaid,elapsedMinutes:used});
  const [u]=await conn.execute("SELECT balance_cents FROM users WHERE id=? FOR UPDATE",[user.id]);
  const battery=Math.max(0,Number(r.battery)-Math.floor(elapsed/2));
  const depleted=battery<=0,expired=limit>0&&elapsed>=limit,insufficient=r.role!=="admin"&&!prepaid&&cost>=Number(u[0].balance_cents);
  if(depleted||expired||insufficient){
   const due=r.role==="admin"||prepaid?0:Math.min(cost,Number(u[0].balance_cents));
   const refund=prepaid?Math.max(0,prepaid-Math.min(cost,prepaid)):0;
   if(due){await conn.execute("UPDATE users SET balance_cents=balance_cents-? WHERE id=?",[due,user.id]);await conn.execute("INSERT INTO wallet_transactions (user_id,ride_id,type,amount_cents,description) VALUES (?,?,'ride_charge',?,?)",[user.id,r.id,-due,"Автоматическая оплата поездки"]);}
   if(refund){await conn.execute("UPDATE users SET balance_cents=balance_cents+? WHERE id=?",[refund,user.id]);await conn.execute("INSERT INTO wallet_transactions (user_id,ride_id,type,amount_cents,description) VALUES (?,?,'refund',?,?)",[user.id,r.id,refund,"Возврат за неиспользованное время"]);}
   const finalBattery=depleted?0:battery;
   await conn.execute("UPDATE scooters SET battery=?,status=? WHERE id=?",[finalBattery,finalBattery===0?"maintenance":"available",r.scooter_id]);
   await conn.execute("UPDATE rides SET status='completed',ended_at=NOW(),duration_minutes=?,total_cents=? WHERE id=?",[used,prepaid?Math.min(cost,prepaid):due,r.id]);
   await conn.commit();return Response.json({active:false,finished:true,reason:depleted?"battery":expired?"tariff":"balance",refundCents:refund});
  }
  await conn.commit();return Response.json({active:true});
 }catch(e){await conn.rollback();console.error("ride monitor",e);return Response.json({error:"Не удалось проверить поездку."},{status:500});}finally{conn.release();}
}
