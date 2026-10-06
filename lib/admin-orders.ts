import {database} from './db';
import type {User} from './types';

const columns='o.id,o.event_id,o.buyer_name,o.buyer_email,o.status,o.total,o.people,o.created_at,o.created_at::text AS cursor_created_at';
const searchWhere="e.organization_id=$1 AND ($2='' OR strpos(lower(o.id),$2)>0 OR strpos(lower(o.buyer_name),$2)>0 OR strpos(lower(o.buyer_email),$2)>0 OR strpos(lower(o.status),$2)>0)";
const from='FROM orders o JOIN events e ON e.id=o.event_id';
export const orderPageSize=50;
export type AdminOrder={id:string;event_id:string;buyer_name:string;buyer_email:string;status:string;total:number;people:number;created_at:Date;cursor_created_at:string};

export function orderSearch(value:string){return value.trim().toLowerCase().slice(0,100);}

export async function adminOrderPage(user:User,query:string,page:number){
 const search=orderSearch(query),safePage=Number.isSafeInteger(page)&&page>0?Math.min(page,100000):1;
 const db=database();
 const count=await db.query<{total:number}>(`SELECT COUNT(*)::int AS total ${from} WHERE ${searchWhere}`,[user.organizationId,search]);
 const orders=await db.query<AdminOrder>(`SELECT ${columns} ${from} WHERE ${searchWhere} ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`,[user.organizationId,search,orderPageSize,(safePage-1)*orderPageSize]);
 return {orders:orders.rows,total:count.rows[0].total,page:safePage,pageSize:orderPageSize};
}

export async function adminOrderExportBatch(user:User,query:string,cursor?:{createdAt:string;id:string}){
 const search=orderSearch(query);
 const result=await database().query<AdminOrder>(`SELECT ${columns} ${from} WHERE ${searchWhere} AND ($3::timestamptz IS NULL OR (o.created_at,o.id)<($3::timestamptz,$4::text)) ORDER BY o.created_at DESC,o.id DESC LIMIT 500`,[user.organizationId,search,cursor?.createdAt??null,cursor?.id??null]);
 return result.rows;
}

export function csvCell(value:unknown){
 const raw=String(value??'');
 const safe=/^\s*[=+@-]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
