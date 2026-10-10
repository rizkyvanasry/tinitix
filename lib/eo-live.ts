import {transaction} from './db';
import {loadEvent,usedStock,publicEvent} from './catalog';
import {AppError} from './security';
import type {User} from './types';

export async function eoLive(user:User,eventId:string){
 if(user.role!=='admin'||!user.verified)throw new AppError(403,'Akses organizer diperlukan.');
 return transaction(async db=>{
  await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const event=await loadEvent(db,eventId);
  if(event.organizationId!==user.organizationId)throw new AppError(404,'Event tidak ditemukan.');
  const now=new Date();
  const used=await usedStock(db,event.id,now),catalog=publicEvent(event,used,now);
  const summary=(await db.query(`SELECT count(*)::int AS orders,COALESCE(sum(people),0)::bigint AS people,COALESCE(sum(total),0)::bigint AS gross,COALESCE(sum(COALESCE(subtotal,total-tax_amount-service_amount)),0)::bigint AS subtotal,COALESCE(sum(tax_amount),0)::bigint AS tax,COALESCE(sum(service_amount),0)::bigint AS service FROM orders WHERE event_id=$1 AND status='paid'`,[event.id])).rows[0];
  const sold=(await db.query(`SELECT i.category_id,COALESCE(sum(i.quantity),0)::int AS units FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.event_id=$1 AND o.status='paid' GROUP BY i.category_id`,[event.id])).rows;
  const reserved=(await db.query(`SELECT r.category_id,sum(r.units)::int AS units FROM reservations r JOIN categories c ON c.id=r.category_id WHERE c.event_id=$1 AND r.state='active' AND r.expires_at>$2 GROUP BY r.category_id`,[event.id,now])).rows;
  const categories=catalog.categories.map(c=>({id:c.id,name:c.name,price:c.price,capacity:c.quota,people:c.people,paid:Number(sold.find(r=>r.category_id===c.id)?.units||0),pending:Number(reserved.find(r=>r.category_id===c.id)?.units||0),available:c.available,state:c.state}));
  const occupied=event.categories.reduce((n,c)=>n+(used[c.id]||0)*c.people,0);
  const capacity=Math.min(event.capacity,event.categories.reduce((n,c)=>n+c.quota*c.people,0));
  const daily=(await db.query(`SELECT to_char(p.paid_at AT TIME ZONE $2,'YYYY-MM-DD') AS date,count(*)::int AS orders,sum(o.total)::bigint AS gross,sum(o.people)::bigint AS people,sum((SELECT COALESCE(sum(i.quantity),0) FROM order_items i WHERE i.order_id=o.id))::bigint AS units FROM orders o LEFT JOIN LATERAL (SELECT min(created_at) AS paid_at FROM payment_events WHERE order_id=o.id AND data->>'status'='paid') p ON true WHERE o.event_id=$1 AND o.status='paid' GROUP BY 1 ORDER BY 1`,[event.id,event.timezone])).rows;
  const buyers=(await db.query(`SELECT buyer_gender,count(*)::int AS count FROM (SELECT DISTINCT ON (lower(trim(buyer_email))) buyer_gender FROM orders WHERE event_id=$1 AND status='paid' ORDER BY lower(trim(buyer_email)),created_at DESC,id DESC) b GROUP BY buyer_gender`,[event.id])).rows;
  return {eventId:event.id,timezone:event.timezone,updatedAt:now.toISOString(),today:new Intl.DateTimeFormat('en-CA',{timeZone:event.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),
   revenue:{gross:Number(summary.gross),subtotal:Number(summary.subtotal),tax:Number(summary.tax),service:Number(summary.service)},paidOrders:Number(summary.orders),paidPeople:Number(summary.people),paidUnits:categories.reduce((n,c)=>n+c.paid,0),capacity,pendingPeople:categories.reduce((n,c)=>n+c.pending*c.people,0),availablePeople:Math.max(0,capacity-occupied),categories,
   daily:daily.filter(r=>r.date).map(r=>({date:String(r.date),units:Number(r.units),gross:Number(r.gross),people:Number(r.people)})),undatedRevenue:daily.filter(r=>!r.date).reduce((n,r)=>n+Number(r.gross),0),
   buyers:{total:buyers.reduce((n,r)=>n+Number(r.count),0),male:Number(buyers.find(r=>r.buyer_gender==='male')?.count||0),female:Number(buyers.find(r=>r.buyer_gender==='female')?.count||0),unknown:Number(buyers.find(r=>r.buyer_gender==null)?.count||0)}};
 });
}
export type EoLiveData=Awaited<ReturnType<typeof eoLive>>;
