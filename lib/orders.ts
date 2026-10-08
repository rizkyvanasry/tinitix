import {z} from 'zod';
import QRCode from 'qrcode';
import {database,transaction,type Db} from './db';
import {loadEvent,publicEvent,usedStock,getEvent} from './catalog';
import {AppError,id,hash,token,sign,audit} from './security';
import {checkoutEnabled} from './config';
import {paymentAdapter,type PaymentEvent} from './payment';
import {enqueueMail,orderEmail} from './mail';
import type {User,OrderView} from './types';
export const checkoutSchema=z.object({eventId:z.string(),buyerName:z.string().trim().min(2).max(100),buyerEmail:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().max(25).regex(/^[+\d\s()-]+$/).refine(v=>v.replace(/\D/g,'').length>=8,'Nomor telepon minimal 8 digit.'),gender:z.enum(['male','female']),paymentChannel:z.enum(['qris','bank_transfer','ewallet']),accepted:z.literal(true),items:z.array(z.object({categoryId:z.string(),quantity:z.number().int().min(1).max(50),price:z.number().int().nonnegative()})).min(1).max(5)});
export async function accessGrant(db:Db,orderId:string,kind:'link'|'session'='session'){const raw=token();await db.query('INSERT INTO order_access(token_hash,order_id,expires_at,kind) VALUES($1,$2,$3,$4)',[hash(raw),orderId,new Date(Date.now()+(kind==='session'?7200000:86400000)),kind]);return raw;}
export async function createOrder(input:unknown,key:string){
 if(!checkoutEnabled())throw new AppError(503,'Checkout belum aktif. Database dan provider pembayaran harus dikonfigurasi.');
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))throw new AppError(400,'Idempotency key wajib disertakan.');
 const body=checkoutSchema.parse(input);if(new Set(body.items.map(i=>i.categoryId)).size!==body.items.length)throw new AppError(400,'Kategori tidak boleh duplikat.');
 const fingerprint=hash(JSON.stringify({...body,items:[...body.items].sort((a,b)=>a.categoryId.localeCompare(b.categoryId))}));
 return transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
  const existing=(await db.query('SELECT id,fingerprint FROM orders WHERE idempotency_key=$1',[key])).rows[0];
  if(existing){if(existing.fingerprint!==fingerprint)throw new AppError(409,'Permintaan berubah. Periksa ulang pesanan.');return {id:existing.id,access:await accessGrant(db,existing.id)};}
  const event=await loadEvent(db,body.eventId,true),now=new Date();
  if(event.status!=='published'||new Date(event.ends)<=now)throw new AppError(409,'Penjualan event ini tidak tersedia.');
  const available=publicEvent(event,await usedStock(db,event.id,now),now);
  let total=0,people=0;
  const items=body.items.map(item=>{const c=available.categories.find(c=>c.id===item.categoryId);if(!c||c.state!=='available'||item.quantity>c.available)throw new AppError(409,'Stok atau periode penjualan berubah. Periksa pilihan tiket.','STOCK_CHANGED');if(c.price!==item.price)throw new AppError(409,'Harga tiket berubah. Periksa ringkasan terbaru.','PRICE_CHANGED');total+=c.price*item.quantity;people+=c.people*item.quantity;return {...item,name:c.name,people:c.people};});
  const used=await usedStock(db,event.id,now);const reservedPeople=event.categories.reduce((s,c)=>s+(used[c.id]||0)*c.people,0);
  if(people>event.maxPeople)throw new AppError(400,`Maksimal ${event.maxPeople} orang per pesanan.`);
  if(people+reservedPeople>event.capacity)throw new AppError(409,'Kapasitas event tidak mencukupi.','STOCK_CHANGED');
  if(!Number.isSafeInteger(total)||total>2147483647)throw new AppError(400,'Nilai pesanan melebihi batas.');
  const orderId=id('TIX'),expiry=new Date(Date.now()+15*60000);
  await db.query("INSERT INTO orders(id,event_id,buyer_name,buyer_email,phone,status,total,people,expires_at,idempotency_key,fingerprint,buyer_gender,requested_payment_channel) VALUES($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12)",[orderId,event.id,body.buyerName,body.buyerEmail,body.phone,total,people,expiry,key,fingerprint,body.gender,body.paymentChannel]);
  for(const item of items){await db.query('INSERT INTO order_items(id,order_id,category_id,name,price,quantity,people) VALUES($1,$2,$3,$4,$5,$6,$7)',[id('item'),orderId,item.categoryId,item.name,item.price,item.quantity,item.people]);await db.query("INSERT INTO reservations(order_id,category_id,units,state,expires_at) VALUES($1,$2,$3,'active',$4)",[orderId,item.categoryId,item.quantity,expiry]);}
  const access=await accessGrant(db,orderId),link=await accessGrant(db,orderId,'link');
  await enqueueMail(db,body.buyerEmail,orderEmail(body.buyerName,orderId,link,event.name),orderId);
  return {id:orderId,access};
 });
}
export async function authorizeOrder(orderId:string,access?:string,user?:User|null,db:Db=database()){
 const order=(await db.query('SELECT * FROM orders WHERE id=$1',[orderId])).rows[0];if(!order)throw new AppError(404,'Pesanan tidak ditemukan.');
 if(user?.verified&&user.email===order.buyer_email)return order;
 if(access){const grants=await db.query("SELECT order_id FROM order_access WHERE order_id=$1 AND token_hash=$2 AND expires_at>now() AND kind='session'",[orderId,hash(access)]);if(grants.rows.length)return order;}
 throw new AppError(403,'Buka pesanan melalui tautan aman di email atau masuk dengan akun terverifikasi.');
}
export async function exchangeAccess(raw:string){return transaction(async db=>{const r=await db.query("DELETE FROM order_access WHERE token_hash=$1 AND kind='link' AND expires_at>now() RETURNING order_id",[hash(raw)]);if(!r.rows[0])throw new AppError(400,'Tautan telah digunakan atau kedaluwarsa. Minta tautan baru.');return {id:r.rows[0].order_id,access:await accessGrant(db,r.rows[0].order_id)};});}
export async function expireOrders(db:Db=database()){await db.query("UPDATE reservations SET state='released' WHERE state='active' AND expires_at<=now()");await db.query("UPDATE orders SET status='expired' WHERE status='pending' AND expires_at<=now()");}
export async function createPayment(orderId:string,access?:string,user?:User|null){return transaction(async db=>{await authorizeOrder(orderId,access,user,db);const order=(await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[orderId])).rows[0];if(order.status!=='pending'||new Date(order.expires_at)<=new Date())throw new AppError(409,'Pesanan tidak dapat dibayar.');const payment=await paymentAdapter().createPayment(orderId);await db.query('UPDATE orders SET payment_ref=$1 WHERE id=$2',[payment.reference,orderId]);return payment;});}
export const ticketToken=(ticketId:string)=>sign('ticket:'+ticketId);
export async function settlePayment(payment:PaymentEvent){
 return transaction(async db=>{
  const order=(await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[payment.orderId])).rows[0];
  if(!order||order.total!==payment.amount||payment.currency!=='IDR'||order.payment_ref!==payment.reference||payment.merchant!=='tinitix-simulation')throw new AppError(400,'Data pembayaran tidak sesuai.');
  const seen=(await db.query('SELECT id FROM payment_events WHERE id=$1',[payment.id])).rows[0];if(seen)return {status:order.status};
  await db.query('INSERT INTO payment_events(id,order_id,data) VALUES($1,$2,$3)',[payment.id,order.id,JSON.stringify(payment)]);
  if(order.status==='paid'||order.status==='payment_review')return {status:order.status};
  const event=await loadEvent(db,order.event_id,true);
  if(payment.status==='failed'){await db.query("UPDATE orders SET status='failed' WHERE id=$1",[order.id]);await db.query("UPDATE reservations SET state='released' WHERE order_id=$1 AND state='active'",[order.id]);return {status:'failed'};}
  const reservations=(await db.query('SELECT * FROM reservations WHERE order_id=$1',[order.id])).rows;
  const used=await usedStock(db,event.id),now=new Date();
  for(const r of reservations){if(r.state==='active'&&new Date(r.expires_at)>now)used[r.category_id]=(used[r.category_id]||0)-r.units;}
  const remainingPeople=event.capacity-event.categories.reduce((s,c)=>s+(used[c.id]||0)*c.people,0);
  const insufficient=event.status==='cancelled'||new Date(event.ends)<=now||order.people>remainingPeople||reservations.some(r=>{const c=event.categories.find(c=>c.id===r.category_id);return !c||(used[r.category_id]||0)+r.units>c.quota;});
  if(insufficient){await db.query("UPDATE orders SET status='payment_review' WHERE id=$1",[order.id]);await db.query("UPDATE reservations SET state='released' WHERE order_id=$1",[order.id]);await audit(db,'payment','payment_review',order.id,'Pembayaran sukses tanpa kapasitas tersedia.');return {status:'payment_review'};}
  await db.query("UPDATE orders SET status='paid' WHERE id=$1",[order.id]);await db.query("UPDATE reservations SET state='converted' WHERE order_id=$1",[order.id]);
  const items=(await db.query('SELECT * FROM order_items WHERE order_id=$1',[order.id])).rows;
  for(const item of items)for(let n=0;n<item.quantity*item.people;n++){const ticketId=id('ticket');await db.query('INSERT INTO tickets(id,order_id,order_item_id,event_id,name,category_name,token_hash,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[ticketId,order.id,item.id,event.id,order.buyer_name,item.name,hash(ticketToken(ticketId)),n]);}
  const link=await accessGrant(db,order.id,'link');await enqueueMail(db,order.buyer_email,orderEmail(order.buyer_name,order.id,link,event.name),order.id);await audit(db,'payment','paid',order.id);
  return {status:'paid'};
 });
}
export async function getOrder(orderId:string,access?:string,user?:User|null):Promise<OrderView>{
 await authorizeOrder(orderId,access,user);await expireOrders();const db=database(),order=(await db.query('SELECT * FROM orders WHERE id=$1',[orderId])).rows[0];
 const items=(await db.query('SELECT * FROM order_items WHERE order_id=$1',[orderId])).rows;
 const tickets=(await db.query('SELECT t.*,c.checked_at FROM tickets t LEFT JOIN check_ins c ON c.ticket_id=t.id WHERE t.order_id=$1 ORDER BY t.id',[orderId])).rows;
 const email=(await db.query('SELECT status FROM email_jobs WHERE order_id=$1 ORDER BY created_at DESC LIMIT 1',[orderId])).rows[0];
 return {id:order.id,status:order.status,buyerName:order.buyer_name,buyerEmail:order.buyer_email,phone:order.phone,gender:order.buyer_gender,paymentChannel:order.requested_payment_channel,items:items.map(i=>({id:i.id,categoryId:i.category_id,name:i.name,price:i.price,quantity:i.quantity,people:i.people})),total:order.total,people:order.people,expiresAt:new Date(order.expires_at).toISOString(),createdAt:new Date(order.created_at).toISOString(),event:await getEvent(order.event_id),emailStatus:email?.status||'pending',tickets:await Promise.all(tickets.map(async t=>({id:t.id,name:t.name,categoryName:t.category_name,status:t.status,checkedInAt:t.checked_at?new Date(t.checked_at).toISOString():null,qr:await QRCode.toDataURL(ticketToken(t.id),{width:260,margin:2})})))};
}
export async function resendOrder(orderId:string,access?:string,user?:User|null){await authorizeOrder(orderId,access,user);return transaction(async db=>{const order=(await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[orderId])).rows[0];if(order.last_email_at&&Date.now()-new Date(order.last_email_at).getTime()<60000)throw new AppError(429,'Tunggu 60 detik sebelum mengirim ulang.');const event=await loadEvent(db,order.event_id);const link=await accessGrant(db,orderId,'link');await enqueueMail(db,order.buyer_email,orderEmail(order.buyer_name,orderId,link,event.name),orderId);await db.query('UPDATE orders SET last_email_at=now() WHERE id=$1',[orderId]);return {message:'Email masuk antrean pengiriman.'};});}
export async function requestAccess(email:string){const parsed=z.string().trim().email().max(254).parse(email).toLowerCase();await transaction(async db=>{const orders=(await db.query('SELECT * FROM orders WHERE buyer_email=$1 ORDER BY created_at DESC LIMIT 10',[parsed])).rows;for(const order of orders){const link=await accessGrant(db,order.id,'link'),event=await loadEvent(db,order.event_id);await enqueueMail(db,parsed,orderEmail(order.buyer_name,order.id,link,event.name),order.id);}});return {message:'Jika email memiliki pesanan, tautan akses akan dikirim. Periksa inbox dan folder spam.'};}
