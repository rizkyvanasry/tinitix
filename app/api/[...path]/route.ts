import {runMaintenance} from '@/lib/maintenance';
import {NextRequest,NextResponse,after} from 'next/server';
import {ZodError} from 'zod';
import {currentUser,requireRole,login,register,requestAuthEmail,confirmAuth} from '@/lib/auth';
import {listEvents,getEvent,loadEvent} from '@/lib/catalog';
import {createOrder,getOrder,createPayment,authorizeOrder,exchangeAccess,requestAccess,resendOrder,settlePayment} from '@/lib/orders';
import {adminOverview,saveEvent,staffEvents,checkIn,assignStaff,cancelTicket} from '@/lib/admin';
import {database} from '@/lib/db';
import {hasDatabase,simulationEnabled,isProduction,appUrl} from '@/lib/config';
import {AppError,hash,rateLimit,sign,safeEqual} from '@/lib/security';
import {paymentAdapter} from '@/lib/payment';
import {processMailJobs,previewOutbox} from '@/lib/mail';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const sessionOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:86400};
async function handle(req:NextRequest){
 try{
 const route=req.nextUrl.pathname.replace('/api/',''),method=req.method;
 if(method==='GET'&&route==='events')return json(await listEvents());
 if(method==='GET'&&route.startsWith('events/'))return json(await getEvent(route.split('/')[1]));
 if(!hasDatabase())throw new AppError(503,'Mode pratinjau. Hubungkan PostgreSQL di Vercel untuk mengaktifkan fitur ini.');
 if(route==='cron/maintenance'){
  if(!process.env.CRON_SECRET||!safeEqual(req.headers.get('authorization')||'','Bearer '+process.env.CRON_SECRET))throw new AppError(401,'Tidak diizinkan.');
  return json(await runMaintenance());
 }
 if(method==='POST'&&route==='payments/webhook'){const raw=await req.text();if(raw.length>16000)throw new AppError(413,'Payload terlalu besar.');const payment=paymentAdapter().verifyWebhook(raw,req.headers.get('x-payment-signature')||'');const result=await settlePayment(payment);after(processMailJobs);return json(result);}
 if(method==='POST'){const origin=req.headers.get('origin');if(!origin||origin!==req.nextUrl.origin)throw new AppError(403,'Origin tidak valid.');}
 const sid=req.cookies.get('tinitix_session')?.value;
 const user=await currentUser(sid);
 if(method==='GET'&&route==='auth/me')return json({user});
 if(method==='GET'&&route==='account/orders'){
  if(!user?.verified)throw new AppError(403,'Verifikasi email untuk melihat pesanan.');
  return json((await database().query('SELECT o.id,o.status,o.total,o.created_at,e.data->>\'name\' AS event_name FROM orders o JOIN events e ON e.id=o.event_id WHERE o.buyer_email=$1 ORDER BY o.created_at DESC',[user.email])).rows);
 }
 if(method==='GET'&&route==='admin/events'){const admin=await requireRole(sid,['admin']);return json(await adminOverview(admin));}
 if(method==='GET'&&route==='admin/staff-events'){const staff=await requireRole(sid,['admin','staff']);return json(await staffEvents(staff));}
 if(method==='GET'&&route==='admin/outbox'){await requireRole(sid,['admin']);return json(await previewOutbox());}
 if(method==='GET'&&route==='admin/orders/export'){
  const admin=await requireRole(sid,['admin']);const {orders}=await adminOverview(admin);
  const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';
  const csv=['id,event,buyer,email,status,total_idr,people',...orders.map(o=>[o.id,o.event_id,o.buyer_name,o.buyer_email,o.status,o.total,o.people].map(cell).join(','))].join('\r\n');
  return new NextResponse('\uFEFF'+csv,{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="tinitix-orders.csv"','Cache-Control':'no-store'}});
 }
 const match=route.match(/^orders\/([^/]+)(?:\/(payment|simulate|resend))?$/);
 if(method==='GET'&&match)return json(await getOrder(match[1],req.cookies.get('order_'+match[1])?.value,user));
 if(method==='POST'&&route==='admin/poster'){
  await requireRole(sid,['admin']);if(!process.env.BLOB_READ_WRITE_TOKEN)throw new AppError(503,'Vercel Blob belum terhubung.');
  if(Number(req.headers.get('content-length')||0)>2500000)throw new AppError(413,'Ukuran poster maksimal 2 MB.');
  const data=await req.formData(),file=data.get('file');if(!(file instanceof File)||file.size>2*1024*1024)throw new AppError(400,'Pilih gambar maksimal 2 MB.');
  const bytes=Buffer.from(await file.arrayBuffer());const valid=(file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||(file.type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(file.type==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
  if(!valid)throw new AppError(400,'Gunakan gambar JPEG, PNG, atau WebP yang valid.');
  const {put}=await import('@vercel/blob');const result=await put('posters/'+crypto.randomUUID()+'.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]),bytes,{access:'public',contentType:file.type,addRandomSuffix:true});return json({url:result.url});
 }
 if(method!=='POST')throw new AppError(404,'Endpoint tidak ditemukan.');
 const raw=await req.text();if(raw.length>50000)throw new AppError(413,'Payload terlalu besar.');
 let body:any;try{body=raw?JSON.parse(raw):{};}catch{throw new AppError(400,'JSON tidak valid.');}
 const ip=req.headers.get('x-vercel-forwarded-for')||req.headers.get('x-forwarded-for')||'local';
 await rateLimit('ip:'+ip,100,60);
 if(route.startsWith('auth/')||route==='orders/access-link')await rateLimit(route+':'+String(body.email||ip).toLowerCase(),5,300);
 if(route==='auth/login'){const result=await login(body);const response=json({message:'Berhasil masuk.'});response.cookies.set('tinitix_session',result.session,sessionOptions);return response;}
 if(route==='auth/logout'){if(sid)await database().query('DELETE FROM sessions WHERE token_hash=$1',[hash(sid)]);const response=json({message:'Keluar.'});response.cookies.delete('tinitix_session');return response;}
 if(route==='auth/register'){const result=await register(body);after(processMailJobs);return json(result);}
 if(route==='auth/email'){const result=await requestAuthEmail(body);after(processMailJobs);return json(result);}
 if(route==='auth/confirm')return json(await confirmAuth(body));
 if(route==='orders/access-link'){const result=await requestAccess(body.email);after(processMailJobs);return json(result);}
 if(route==='orders/exchange'){const result=await exchangeAccess(String(body.token||''));const response=json({id:result.id});response.cookies.set('order_'+result.id,result.access,{...sessionOptions,maxAge:7200});return response;}
 if(route==='orders'){const result=await createOrder(body,req.headers.get('idempotency-key')||'');const response=json({id:result.id},201);response.cookies.set('order_'+result.id,result.access,{...sessionOptions,maxAge:7200});after(processMailJobs);return response;}
 if(match){
  const orderId=match[1],access=req.cookies.get('order_'+orderId)?.value;
  if(match[2]==='payment')return json(await createPayment(orderId,access,user));
  if(match[2]==='resend'){const result=await resendOrder(orderId,access,user);after(processMailJobs);return json(result);}
  if(match[2]==='simulate'){
   if(!simulationEnabled())throw new AppError(404,'Tidak tersedia.');
   const order=await authorizeOrder(orderId,access,user);const session=await createPayment(orderId,access,user);
   const event={id:'sim-'+orderId+'-'+(body.status==='failed'?'failed':'paid'),orderId,reference:session.reference,merchant:'tinitix-simulation',amount:order.total,currency:'IDR',status:body.status==='failed'?'failed':'paid'};
   const payload=JSON.stringify(event);const result=await settlePayment(paymentAdapter().verifyWebhook(payload,sign('webhook:'+payload)));after(processMailJobs);return json(result);
  }
 }
 if(route.startsWith('admin/')){
  const actor=await requireRole(sid,route==='admin/check-ins'?['admin','staff']:['admin']);
  if(route==='admin/check-ins')return json(await checkIn(body,actor));
  if(route==='admin/events')return json(await saveEvent(body,actor));
  if(route==='admin/staff')return json(await assignStaff(body,actor));
  if(route==='admin/tickets/cancel')return json(await cancelTicket(body,actor));
  if(route==='admin/orders/resend'){
   const order=(await database().query('SELECT * FROM orders WHERE id=$1',[String(body.orderId)])).rows[0];if(!order)throw new AppError(404,'Pesanan tidak ditemukan.');const event=await loadEvent(database(),order.event_id);if(event.organizationId!==actor.organizationId)throw new AppError(403,'Akses ditolak.');const result=await resendOrder(order.id,undefined,{...actor,email:order.buyer_email});after(processMailJobs);return json(result);
  }
 }
 throw new AppError(404,'Endpoint tidak ditemukan.');
 }catch(error){
  if(error instanceof AppError)return json({error:error.message,code:error.code},error.status);
  if(error instanceof ZodError)return json({error:error.issues[0]?.message||'Data tidak valid.',fields:error.flatten().fieldErrors},400);
  if((error as {code?:string}).code==='23505')return json({error:'Data sudah terdaftar. Gunakan nilai lain.'},409);
  console.error('tinitix request failed',error instanceof Error?error.name:'unknown');
  return json({error:'Layanan sedang mengalami kendala. Silakan coba lagi.'},500);
 }
}
export const GET=handle;
export const POST=handle;
