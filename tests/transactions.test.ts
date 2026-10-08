import {runMaintenance} from '../lib/maintenance';
import {describe,it,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTestDatabase} from './database';
import {adminOrderPage,adminOrderExportBatch,csvCell} from '../lib/admin-orders';
import {setTestDatabase,type Db} from '../lib/db';
import {seedEvents} from '../lib/seed';
import {saveEvent,checkIn,assignStaff} from '../lib/admin';
import {createOrder,createPayment,settlePayment,getOrder,authorizeOrder,expireOrders,ticketToken,requestAccess,resendOrder,exchangeAccess} from '../lib/orders';
import {sign,decrypt,hash,passwordHash} from '../lib/security';
import {paymentAdapter} from '../lib/payment';
import {checkoutEnabled,simulationEnabled} from '../lib/config';
import {getEvent,listEvents} from '../lib/catalog';
import {processMailJobs} from '../lib/mail';
import {register,login,confirmAuth,currentUser,requestAuthEmail} from '../lib/auth';
import type {Event,User} from '../lib/types';
Object.assign(process.env,{NODE_ENV:'test'});
process.env.DATABASE_URL='postgresql://test-only';
process.env.APP_SECRET='test-secret-only-not-for-production-123456789012345';
process.env.PAYMENT_PROVIDER='simulation';
process.env.APP_URL='https://preview.example.test';
delete process.env.VERCEL_ENV;
delete process.env.RESEND_API_KEY;
const pg=await createTestDatabase();
const db:Db={query:async(sql,values)=>(await pg.query(sql,values)) as any};
setTestDatabase({...db,transaction:fn=>pg.transaction(tx=>fn({query:async(sql,values)=>(await tx.query(sql,values)) as any}))});
const admin:User={id:'admin-test',name:'Admin',email:'admin@example.test',verified:true,role:'admin',organizationId:'tinitix'};
let event:Event;
const key=()=>crypto.randomUUID();
const purchase=(items?:{categoryId:string;quantity:number;price:number}[])=>({eventId:event.id,buyerName:'Dina Test',buyerEmail:'dina@example.test',confirmEmail:'dina@example.test',phone:'',accepted:true,items:items||[{categoryId:event.categories[0].id,quantity:1,price:event.categories[0].price}]});
async function pay(order:{id:string;access:string},eventId=key()){
 const p=await createPayment(order.id,order.access);const o=await authorizeOrder(order.id,order.access);
 const payload={id:eventId,orderId:order.id,reference:p.reference,merchant:'tinitix-simulation' as const,amount:o.total,currency:'IDR' as const,status:'paid' as const};
 return {payload,result:await settlePayment(payload)};
}
before(async()=>{await pg.exec(await readFile(new URL('../db/migrations/001_initial.sql',import.meta.url),'utf8'));});
after(async()=>{await pg.close();});
beforeEach(async()=>{
 Object.assign(process.env,{NODE_ENV:'test'});delete process.env.VERCEL_ENV;delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;
 await pg.exec('TRUNCATE organizations,users,email_jobs,audit_logs,rate_limits CASCADE');
 await db.query("INSERT INTO organizations(id,name) VALUES('tinitix','tinitix')");
 await db.query('INSERT INTO users(id,email,name,password_hash,verified) VALUES($1,$2,$3,$4,true)',[admin.id,admin.email,admin.name,passwordHash('admin-test-password')]);
 await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,'tinitix','admin')",[admin.id]);
 const seed=seedEvents()[0],start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+2*86400000).toISOString();
 event=await saveEvent({...seed,id:undefined,starts:start,ends:end,categories:seed.categories.map(c=>({...c,starts:new Date(Date.now()-86400000).toISOString(),ends:start}))},admin);
});
describe('PRD transactional acceptance',()=>{
 it('event category slots survive price and sale-date changes when reopening and saving the editor',async()=>{
  const prices=[10001,20001,35001,25001,45001];
  const edited=await saveEvent({...event,categories:event.categories.map((c,i)=>({...c,price:prices[i],starts:new Date(Date.now()-(i+1)*3600000).toISOString()}))},admin);
  const reopened=await getEvent(edited.id);
  assert.deepEqual(reopened.categories.map(c=>c.id),edited.categories.map(c=>c.id));
  assert.deepEqual(reopened.categories.map(c=>c.people),[1,1,2,1,2]);
  assert.equal((await saveEvent({...reopened,venue:'Edited venue'},admin)).venue,'Edited venue');
 });
 it('AC01 only publishes future public events with current starting prices',async()=>{assert.equal((await listEvents()).length,1);await saveEvent({...event,status:'draft'},admin);assert.equal((await listEvents()).length,0);});
 it('AC02 guest checkout validates email confirmation and consent',async()=>{await assert.rejects(createOrder({...purchase(),confirmEmail:'other@example.test'},key()));await assert.rejects(createOrder({...purchase(),accepted:false},key()));const o=await createOrder(purchase(),key());assert.equal((await getOrder(o.id,o.access)).status,'pending');});
 it('AC03 single + couple creates three distinct QR tickets with package prices',async()=>{const single=event.categories[1],couple=event.categories[2];const o=await createOrder(purchase([{categoryId:single.id,quantity:1,price:single.price},{categoryId:couple.id,quantity:1,price:couple.price}]),key());await pay(o);const view=await getOrder(o.id,o.access);assert.equal(view.people,3);assert.equal(view.total,single.price+couple.price);assert.equal(view.tickets.length,3);assert.equal(new Set(view.tickets.map(t=>t.qr)).size,3);});
 it('AC04 direct API refuses future, expired, sold-out, and stale prices',async()=>{const c=event.categories[0];await db.query("UPDATE categories SET starts_at=now()+interval '1 hour' WHERE id=$1",[c.id]);await assert.rejects(createOrder(purchase(),key()),/periode/);await db.query("UPDATE categories SET starts_at=now()-interval '1 day',ends_at=now()-interval '1 hour' WHERE id=$1",[c.id]);await assert.rejects(createOrder(purchase(),key()),/periode/);await db.query("UPDATE categories SET ends_at=now()+interval '1 day',quota=0 WHERE id=$1",[c.id]);await assert.rejects(createOrder(purchase(),key()),/Stok/);await db.query('UPDATE categories SET quota=10,price=price+1 WHERE id=$1',[c.id]);await assert.rejects(createOrder(purchase(),key()),/Harga/);});
 it('AC05 concurrent requests for the final unit have exactly one winner',async()=>{await db.query('UPDATE categories SET quota=1 WHERE id=$1',[event.categories[0].id]);const results=await Promise.allSettled([createOrder(purchase(),key()),createOrder(purchase(),key())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await getEvent(event.id)).categories.find(c=>c.id===event.categories[0].id)?.available,0);});
 it('capacity is counted in people across categories and mixed quantities',async()=>{event=await saveEvent({...event,capacity:2},admin);const c=event.categories[2];await assert.rejects(createOrder(purchase([{categoryId:event.categories[0].id,quantity:1,price:event.categories[0].price},{categoryId:c.id,quantity:1,price:c.price}]),key()),/Kapasitas/);});
 it('AC06 repeated checkout and payment creation reuse their identities',async()=>{const k=key();const [a,b]=await Promise.all([createOrder(purchase(),k),createOrder(purchase(),k)]);assert.equal(a.id,b.id);assert.deepEqual(await createPayment(a.id,a.access),await createPayment(b.id,b.access));assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n,1);await assert.rejects(createOrder({...purchase(),buyerName:'Changed'},k),/berubah/);});
 it('AC07 duplicate webhook creates tickets once; fake signature and wrong amounts rejected',async()=>{const o=await createOrder(purchase(),key());const {payload}=await pay(o);await settlePayment(payload);await settlePayment({...payload,id:key()});assert.equal((await getOrder(o.id,o.access)).tickets.length,1);const body=JSON.stringify(payload);assert.throws(()=>paymentAdapter().verifyWebhook(body,'fake'),/Signature/);assert.deepEqual(paymentAdapter().verifyWebhook(body,sign('webhook:'+body)),payload);await assert.rejects(settlePayment({...payload,id:key(),amount:1}),/tidak sesuai/);});
 it('AC08 expired stock releases once and late payment without stock enters review',async()=>{await db.query('UPDATE categories SET quota=1 WHERE id=$1',[event.categories[0].id]);const a=await createOrder(purchase(),key());const p=await createPayment(a.id,a.access);await db.query("UPDATE orders SET expires_at=now()-interval '1 minute' WHERE id=$1",[a.id]);await db.query("UPDATE reservations SET expires_at=now()-interval '1 minute' WHERE order_id=$1",[a.id]);await expireOrders();await expireOrders();const b=await createOrder(purchase(),key());await pay(b);await settlePayment({id:key(),orderId:a.id,reference:p.reference,merchant:'tinitix-simulation',amount:event.categories[0].price,currency:'IDR',status:'paid'});const view=await getOrder(a.id,a.access);assert.equal(view.status,'payment_review');assert.equal(view.tickets.length,0);});
 it('late payment with remaining capacity can still issue exactly one ticket',async()=>{const a=await createOrder(purchase(),key());const p=await createPayment(a.id,a.access);await db.query("UPDATE orders SET expires_at=now()-interval '1 minute' WHERE id=$1",[a.id]);await db.query("UPDATE reservations SET expires_at=now()-interval '1 minute' WHERE order_id=$1",[a.id]);await expireOrders();await settlePayment({id:key(),orderId:a.id,reference:p.reference,merchant:'tinitix-simulation',amount:event.categories[0].price,currency:'IDR',status:'paid'});assert.equal((await getOrder(a.id,a.access)).tickets.length,1);});
 it('AC09 simultaneous scans have one winner and wrong event is rejected',async()=>{const o=await createOrder(purchase(),key());await pay(o);const t=(await getOrder(o.id,o.access)).tickets[0],raw=ticketToken(t.id);const results=await Promise.all([checkIn({eventId:event.id,token:raw},admin),checkIn({eventId:event.id,token:raw},admin)]);assert.equal(results.filter(r=>r.result==='valid').length,1);assert.equal(results.filter(r=>r.result==='already_used').length,1);const other=await saveEvent({...event,id:undefined,slug:'other-event'},admin);assert.equal((await checkIn({eventId:other.id,token:raw},admin)).result,'wrong_event');});
 it('AC10 email retries do not reissue tickets and access response does not reveal orders',async()=>{const o=await createOrder(purchase(),key());await pay(o);const first=await getOrder(o.id,o.access);await resendOrder(o.id,o.access);await assert.rejects(resendOrder(o.id,o.access),/60 detik/);assert.equal((await getOrder(o.id,o.access)).tickets.length,first.tickets.length);assert.deepEqual(await requestAccess('dina@example.test'),await requestAccess('unknown@example.test'));process.env.RESEND_API_KEY='test-no-network';process.env.EMAIL_FROM='test@example.test';const original=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:500});try{await processMailJobs();}finally{globalThis.fetch=original;}assert.equal((await getOrder(o.id,o.access)).status,'paid');assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM email_jobs WHERE status='retry'")).rows[0].n>0,true);});
 it('AC11 order IDs do not grant access; only matching verified emails do',async()=>{const o=await createOrder(purchase(),key());await assert.rejects(getOrder(o.id),/tautan aman/);await assert.rejects(getOrder(o.id,undefined,{...admin,role:'buyer',email:'other@example.test'}),/tautan aman/);await assert.rejects(getOrder(o.id,undefined,{...admin,role:'buyer',email:'dina@example.test',verified:false}),/tautan aman/);assert.equal((await getOrder(o.id,undefined,{...admin,role:'buyer',email:'dina@example.test'})).id,o.id);await assert.rejects(checkIn({eventId:event.id,token:'not-a-real-token-but-valid-length'},{...admin,role:'staff'}),/ditugaskan/);});
 it('email access links are single-use and exchanged for expiring sessions',async()=>{const o=await createOrder(purchase(),key());const job=(await db.query('SELECT payload FROM email_jobs WHERE order_id=$1',[o.id])).rows[0];const message=JSON.parse(decrypt(job.payload));const raw=message.text.match(/#token=([^\s]+)/)[1];await assert.rejects(authorizeOrder(o.id,raw),/tautan aman/);const grant=await exchangeAccess(raw);assert.equal((await authorizeOrder(o.id,grant.access)).id,o.id);await assert.rejects(exchangeAccess(raw),/kedaluwarsa/);});
 it('AC13 production cannot use simulation or checkout without a real provider',async()=>{process.env.VERCEL_ENV='production';assert.equal(simulationEnabled(),false);assert.equal(checkoutEnabled(),false);assert.throws(()=>paymentAdapter());await assert.rejects(createOrder(purchase(),key()),/belum aktif/);delete process.env.VERCEL_ENV;});
 it('optional accounts require verification; password reset revokes old sessions',async()=>{await register({email:'new@example.test',name:'New Buyer',password:'long-enough-password'});const first=await login({email:'new@example.test',password:'long-enough-password'});assert.equal((await currentUser(first.session))?.verified,false);let mail=JSON.parse(decrypt((await db.query("SELECT payload FROM email_jobs WHERE recipient='new@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0].payload));await confirmAuth({token:mail.text.match(/#token=([^&\s]+)/)[1]});assert.equal((await currentUser(first.session))?.verified,true);await requestAuthEmail({email:'new@example.test',kind:'reset'});mail=JSON.parse(decrypt((await db.query("SELECT payload FROM email_jobs WHERE recipient='new@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0].payload));await confirmAuth({token:mail.text.match(/#token=([^&\s]+)/)[1],password:'different-long-password'});assert.equal(await currentUser(first.session),null);await assert.rejects(login({email:'new@example.test',password:'long-enough-password'}));});
});

it('maintenance releases expired reservations without web traffic and preserves live auth tokens',async()=>{
 const order=await createOrder(purchase(),key());
 await db.query("UPDATE orders SET expires_at=now()-interval '1 minute' WHERE id=$1",[order.id]);
 await db.query("UPDATE reservations SET expires_at=now()-interval '1 minute' WHERE order_id=$1",[order.id]);
 await db.query("INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at) VALUES('old',$1,'verify',now()-interval '1 minute'),('live',$1,'verify',now()+interval '1 hour')",[admin.id]);
 const result=await runMaintenance();
 assert.equal(result.configured,false);
 assert.equal((await db.query('SELECT status FROM orders WHERE id=$1',[order.id])).rows[0].status,'expired');
 assert.equal((await db.query('SELECT state FROM reservations WHERE order_id=$1',[order.id])).rows[0].state,'released');
 assert.deepEqual((await db.query('SELECT token_hash FROM auth_tokens')).rows.map(r=>r.token_hash),['live']);
 await runMaintenance();
 assert.equal((await db.query('SELECT state FROM reservations WHERE order_id=$1',[order.id])).rows[0].state,'released');
});

it('search and CSV batches include over 500 orders and stay scoped to the organization',async()=>{
 await db.query(`INSERT INTO orders(id,event_id,buyer_name,buyer_email,status,total,people,expires_at,idempotency_key,fingerprint,created_at)
 SELECT 'bulk-'||lpad(n::text,4,'0'),$1,'Buyer '||n,'buyer'||n||'@example.test','pending',100,1,now()+interval '1 hour','bulk-key-'||n,'fixture',date_trunc('second',now())+n*interval '1 microsecond' FROM generate_series(1,1205) n`,[event.id]);
 const first=await adminOrderPage(admin,'',1),last=await adminOrderPage(admin,'',25);
 assert.equal(first.total,1205);assert.equal(first.orders.length,50);assert.equal(last.orders.length,5);
 const found=await adminOrderPage(admin,'BUYER1@EXAMPLE.TEST',1);
 assert.equal(found.total,1);assert.equal(found.orders[0].id,'bulk-0001');
 assert.equal((await adminOrderPage(admin,'%',1)).total,0);
 assert.equal((await adminOrderPage({...admin,organizationId:'other'},'',1)).total,0);
 const ids:string[]=[];let cursor:{createdAt:string;id:string}|undefined;
 for(;;){const rows=await adminOrderExportBatch(admin,'',cursor);ids.push(...rows.map(o=>o.id));if(rows.length<500)break;const last=rows[rows.length-1];cursor={createdAt:last.cursor_created_at,id:last.id};}
 assert.equal(ids.length,1205);assert.equal(new Set(ids).size,1205);assert.ok(ids.includes('bulk-0001'));
 assert.equal((await adminOrderExportBatch(admin,'buyer1@example.test')).length,1);
 assert.equal((await adminOrderExportBatch({...admin,organizationId:'other'},'')).length,0);
 assert.equal(csvCell(' =HYPERLINK("bad")'),'"\' =HYPERLINK(""bad"")"');
});

it('checkout, duplicate settlement and expiry racing preserve one unit and one ticket',async()=>{
 await db.query('UPDATE categories SET quota=1 WHERE id=$1',[event.categories[0].id]);
 const order=await createOrder(purchase(),key()),payment=await createPayment(order.id,order.access);
 await db.query("UPDATE orders SET expires_at=now()-interval '1 second' WHERE id=$1",[order.id]);
 await db.query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE order_id=$1",[order.id]);
 const payload={id:key(),orderId:order.id,reference:payment.reference,merchant:'tinitix-simulation' as const,amount:event.categories[0].price,currency:'IDR' as const,status:'paid' as const};
 const outcomes=await Promise.allSettled([settlePayment(payload),settlePayment(payload),expireOrders(),createOrder(purchase(),key())]);
 for(const outcome of outcomes.slice(0,3))assert.equal(outcome.status,'fulfilled');
 const view=await getOrder(order.id,order.access);
 assert.ok(['paid','payment_review'].includes(view.status));
 assert.equal(view.tickets.length,view.status==='paid'?1:0);
 const stock=(await db.query("SELECT COALESCE(SUM(units),0)::int AS n FROM reservations WHERE state='converted' OR (state='active' AND expires_at>now())")).rows[0].n;
 assert.equal(stock,1);
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM payment_events WHERE id=$1',[payload.id])).rows[0].n,1);
});
