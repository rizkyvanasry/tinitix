import {database,type Db} from './db';
import {hasDatabase} from './config';
import {seedEvents} from './seed';
import type {Event,PublicEvent,Category} from './types';
import {AppError} from './security';
export function categoryFromRow(r:Record<string,any>):Category {return {id:r.id,name:r.name,price:r.price,quota:r.quota,people:r.people,starts:new Date(r.starts_at).toISOString(),ends:new Date(r.ends_at).toISOString()};}
export async function usedStock(db:Db,eventId:string,now=new Date()){
 const result=await db.query('SELECT r.category_id, SUM(r.units)::int AS units FROM reservations r JOIN categories c ON c.id=r.category_id WHERE c.event_id=$1 AND (r.state=\'converted\' OR (r.state=\'active\' AND r.expires_at>$2)) GROUP BY r.category_id',[eventId,now]);return Object.fromEntries(result.rows.map(r=>[r.category_id,r.units])) as Record<string,number>;
}
export function publicEvent(event:Event,used:Record<string,number>={},now=new Date()):PublicEvent {
 const remaining=Math.max(0,event.capacity-event.categories.reduce((s,c)=>s+(used[c.id]||0)*c.people,0));
 const categories=event.categories.map(c=>{const available=Math.max(0,Math.min(c.quota-(used[c.id]||0),Math.floor(remaining/c.people)));return {...c,available,state:(new Date(c.starts)>now?'soon':new Date(c.ends)<=now?'ended':available===0?'soldout':'available') as 'soon'|'ended'|'soldout'|'available'};});
 const cheapest=categories.filter(c=>c.state==='available').sort((a,b)=>a.price-b.price)[0];
 const saleState=event.status==='cancelled'?'Dibatalkan':event.status==='closed'?'Penjualan ditutup':new Date(event.ends)<=now?'Selesai':cheapest?'Tersedia':categories.some(c=>c.state==='soon')?'Segera dijual':'Habis';
 return {...event,categories,startingPrice:cheapest?.price??null,startingPeople:cheapest?.people??1,saleState};
}
export async function loadEvent(db:Db,key:string,lock=false):Promise<Event> {
 const result=await db.query('SELECT * FROM events WHERE id=$1 OR slug=$1'+(lock?' FOR UPDATE':''),[key]);const r=result.rows[0];if(!r)throw new AppError(404,'Event tidak ditemukan.');
 const categories=await db.query('SELECT * FROM categories WHERE event_id=$1 ORDER BY starts_at,price,id',[r.id]);return {...r.data,id:r.id,slug:r.slug,organizationId:r.organization_id,categories:categories.rows.map(categoryFromRow)};
}
export async function getEvent(key:string,includeDraft=false):Promise<PublicEvent>{
 if(!hasDatabase()){const event=seedEvents().find(e=>e.slug===key||e.id===key);if(!event)throw new AppError(404,'Event tidak ditemukan.');return publicEvent(event);}
 const db=database(),event=await loadEvent(db,key);if(event.status==='draft'&&!includeDraft)throw new AppError(404,'Event tidak ditemukan.');return publicEvent(event,await usedStock(db,event.id));
}
export async function listEvents():Promise<PublicEvent[]> {
 if(!hasDatabase())return seedEvents().map(e=>publicEvent(e)).filter(e=>e.status==='published'&&new Date(e.ends)>new Date());
 const db=database();const rows=await db.query('SELECT id FROM events WHERE data->>\'status\'=\'published\' AND (data->>\'ends\')::timestamptz>now() ORDER BY data->>\'starts\'');
 return Promise.all(rows.rows.map(async r=>{const e=await loadEvent(db,r.id);return publicEvent(e,await usedStock(db,e.id));}));
}
