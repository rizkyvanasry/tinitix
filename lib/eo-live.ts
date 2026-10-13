import {database} from './db';
import {categoryFromRow,publicEvent} from './catalog';
import {AppError} from './security';
import type {User,Event} from './types';

// One statement = one PostgreSQL MVCC snapshot for every panel. No cache and no
// multi-statement read transaction holding a pool connection across network round trips.
export async function eoLive(user:User,eventId:string){
 if(user.role!=='admin'||!user.verified)throw new AppError(403,'Akses organizer diperlukan.');
 const result=await database().query(`
 WITH owned AS MATERIALIZED (
  SELECT * FROM events WHERE (id=$1 OR slug=$1) AND organization_id=$2
 ), cats AS MATERIALIZED (
  SELECT c.* FROM categories c JOIN owned e ON e.id=c.event_id
 ), paid AS MATERIALIZED (
  SELECT o.* FROM orders o JOIN owned e ON e.id=o.event_id WHERE o.status='paid'
 ), stock AS (
  SELECT r.category_id,
   COALESCE(sum(r.units) FILTER (WHERE r.state='converted' OR (r.state='active' AND r.expires_at>statement_timestamp())),0)::int AS used,
   COALESCE(sum(r.units) FILTER (WHERE r.state='active' AND r.expires_at>statement_timestamp()),0)::int AS pending
  FROM reservations r JOIN cats c ON c.id=r.category_id GROUP BY r.category_id
 ), sold AS (
  SELECT i.category_id,sum(i.quantity)::int AS units FROM order_items i JOIN paid p ON p.id=i.order_id GROUP BY i.category_id
 ), summary AS (
  SELECT count(*)::int AS orders,COALESCE(sum(people),0) AS people,COALESCE(sum(total),0) AS gross,
   COALESCE(sum(COALESCE(subtotal,total-tax_amount-service_amount)),0) AS subtotal,
   COALESCE(sum(tax_amount),0) AS tax,COALESCE(sum(service_amount),0) AS service FROM paid
 ), dated AS (
  SELECT to_char(p.paid_at AT TIME ZONE (e.data->>'timezone'),'YYYY-MM-DD') AS date,
   count(*)::int AS orders,sum(o.total) AS gross,sum(o.people) AS people,
   sum((SELECT COALESCE(sum(i.quantity),0) FROM order_items i WHERE i.order_id=o.id)) AS units
  FROM paid o JOIN owned e ON e.id=o.event_id
  LEFT JOIN LATERAL (SELECT min(created_at) AS paid_at FROM payment_events WHERE order_id=o.id AND data->>'status'='paid') p ON true
  GROUP BY 1
 ), unique_buyers AS (
  SELECT DISTINCT ON (lower(trim(buyer_email))) buyer_gender FROM paid
  ORDER BY lower(trim(buyer_email)),created_at DESC,id DESC
 ), buyers AS (
  SELECT count(*)::int AS total,
   count(*) FILTER (WHERE buyer_gender='male')::int AS male,
   count(*) FILTER (WHERE buyer_gender='female')::int AS female,
   count(*) FILTER (WHERE buyer_gender IS NULL)::int AS unknown FROM unique_buyers
 )
 SELECT e.*,statement_timestamp() AS snapshot_at,
  (SELECT to_jsonb(s) FROM summary s) AS summary,
  (SELECT to_jsonb(b) FROM buyers b) AS buyers,
  COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date) FROM dated d),'[]'::jsonb) AS daily,
  COALESCE((SELECT jsonb_agg(to_jsonb(c)||jsonb_build_object('used',COALESCE(s.used,0),'pending',COALESCE(s.pending,0),'paid',COALESCE(p.units,0)) ORDER BY c.id)
   FROM cats c LEFT JOIN stock s ON s.category_id=c.id LEFT JOIN sold p ON p.category_id=c.id),'[]'::jsonb) AS categories
 FROM owned e`,[eventId,user.organizationId]);
 const row=result.rows[0];if(!row)throw new AppError(404,'Event tidak ditemukan.');
 const categoryRows=row.categories as Record<string,any>[];
 const event:Event={...row.data,id:row.id,slug:row.slug,organizationId:row.organization_id,categories:categoryRows.map(categoryFromRow)};
 const now=new Date(row.snapshot_at),used=Object.fromEntries(categoryRows.map(c=>[c.id,Number(c.used)]));
 const catalog=publicEvent(event,used,now),summary=row.summary;
 const categories=catalog.categories.map(c=>{const counts=categoryRows.find(r=>r.id===c.id)!;return {id:c.id,name:c.name,price:c.price,capacity:c.quota,people:c.people,paid:Number(counts.paid),pending:Number(counts.pending),available:c.available,state:c.state};});
 const capacity=Math.min(event.capacity,event.categories.reduce((n,c)=>n+c.quota*c.people,0));
 const occupied=event.categories.reduce((n,c)=>n+(used[c.id]||0)*c.people,0);
 const daily=row.daily as {date:string|null;units:number;gross:number;people:number}[];
 return {eventId:event.id,timezone:event.timezone,updatedAt:now.toISOString(),today:new Intl.DateTimeFormat('en-CA',{timeZone:event.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),
  revenue:{gross:Number(summary.gross),subtotal:Number(summary.subtotal),tax:Number(summary.tax),service:Number(summary.service)},paidOrders:Number(summary.orders),paidPeople:Number(summary.people),paidUnits:categories.reduce((n,c)=>n+c.paid,0),capacity,pendingPeople:categories.reduce((n,c)=>n+c.pending*c.people,0),availablePeople:Math.max(0,capacity-occupied),categories,
  daily:daily.filter(r=>r.date).map(r=>({date:String(r.date),units:Number(r.units),gross:Number(r.gross),people:Number(r.people)})),undatedRevenue:daily.filter(r=>!r.date).reduce((n,r)=>n+Number(r.gross),0),
  buyers:{total:Number(row.buyers.total),male:Number(row.buyers.male),female:Number(row.buyers.female),unknown:Number(row.buyers.unknown)}};
}
export type EoLiveData=Awaited<ReturnType<typeof eoLive>>;
