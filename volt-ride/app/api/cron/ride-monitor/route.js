import {getDb} from "@/lib/db";
import {getRideAccruedCost} from "@/lib/pricing";
export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
 const db=getDb(),conn=await db.getConnection();let finished=0;
 try{
  const [active]=await conn.execute("SELECT id FROM rides WHERE status='active' ORDER BY id LIMIT 200");
  for(const item of active){
   await conn.beginTransaction();
   const [rows]=await conn.execute("SELECT r.*,s.price_per_minute_cents,s.battery,u.balance_cents,u.role FROM rides r JOIN scooters s ON s.id=r.scooter_id JOIN users u ON u.id=r.user_id WHERE r.id=? AND r.status='active' FOR UPDATE",[item.id]);
   if(!rows.length){await conn.commit();continue;}
   const r=rows[0],mins=Math.max(0,Math.floor((Date.now()-new Date(r.started_at).getTime())/60000)),elapsed=Math.max(1,mins),limit=Number(r.tariff_minutes||0),used=Math.min(elapsed,limit||elapsed),prepaid=Number(r.prepaid_cents||0),cost=getRideAccruedCost({pricePerMinuteCents:r.price_per_minute_cents,tariffMinutes:limit,prepaidCents:prepaid,elapsedMinutes:used}),battery=Math.max(0,Number(r.battery)-Math.floor(elapsed/2));
   const shouldEnd=battery<=0||(limit>0&&elapsed>=limit)||(r.role!=="admin"&&!prepaid&&cost>=Number(r.balance_cents));
   if(!shouldEnd){await conn.commit();continue;}
   const due=r.role==="admin"||prepaid?0:Math.min(cost,Number(r.balance_cents)),refund=r.role==="admin"?0:(prepaid?Math.max(0,prepaid-Math.min(cost,prepaid)):0);
   if(due){await conn.execute("UPDATE users SET balance_cents=balance_cents-? WHERE id=?",[due,r.user_id]);await conn.execute("INSERT INTO wallet_transactions(user_id,ride_id,type,amount_cents,description) VALUES (?,?,'ride_charge',?,?)",[r.user_id,r.id,-due,"Автоматическая оплата поездки"]);}
   if(refund){await conn.execute("UPDATE users SET balance_cents=balance_cents+? WHERE id=?",[refund,r.user_id]);await conn.execute("INSERT INTO wallet_transactions(user_id,ride_id,type,amount_cents,description) VALUES (?,?,'refund',?,?)",[r.user_id,r.id,refund,"Возврат за неиспользованное время"]);}
   await conn.execute("UPDATE scooters SET battery=?,status=? WHERE id=?",[battery,battery===0?"maintenance":"available",r.scooter_id]);
   await conn.execute("UPDATE rides SET status='completed',ended_at=NOW(),duration_minutes=?,total_cents=? WHERE id=?",[used,prepaid?Math.min(cost,prepaid):due,r.id]);
   await conn.execute("INSERT INTO notifications(user_id,title,message) VALUES (?,?,?)",[r.user_id,"Поездка завершена автоматически",battery===0?"Заряд самоката закончился.":limit>0&&elapsed>=limit?"Время тарифа завершилось.":"Баланс исчерпан."]);
   await conn.commit();finished++;
  }
  return Response.json({ok:true,checked:active.length,finished});
 }catch(e){await conn.rollback();console.error("cron ride monitor",e);return Response.json({error:"Ride monitor failed"},{status:500});}finally{conn.release();}
}
