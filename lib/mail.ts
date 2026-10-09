import {database,transaction,type Db} from './db';
import {encrypt,decrypt,id} from './security';
import {appUrl,isProduction} from './config';
export type MailPayload={subject:string;text:string};
export async function enqueueMail(db:Db,email:string,payload:MailPayload,orderId:string|null=null){await db.query('INSERT INTO email_jobs(id,order_id,recipient,payload) VALUES($1,$2,$3,$4)',[id('mail'),orderId,email,encrypt(JSON.stringify(payload))]);}
export async function processMailJobs(){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {sent:0,configured:false};
 let sent=0;
 for(let i=0;i<10;i++){
  const job=await transaction(async db=>{const r=await db.query("SELECT * FROM email_jobs WHERE status IN ('pending','retry') AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now()) AND attempts<8 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");if(!r.rows[0])return null;await db.query("UPDATE email_jobs SET locked_until=now()+interval '2 minutes',attempts=attempts+1 WHERE id=$1",[r.rows[0].id]);return r.rows[0];});
  if(!job)break;
  try{
   const payload=JSON.parse(decrypt(job.payload)) as MailPayload;
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from:process.env.EMAIL_FROM,to:job.recipient,subject:payload.subject,text:payload.text}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('EMAIL_PROVIDER_ERROR');
   await database().query("UPDATE email_jobs SET status='sent',locked_until=NULL WHERE id=$1",[job.id]);sent++;
  }catch{await database().query("UPDATE email_jobs SET status='retry',locked_until=NULL,next_attempt_at=$2 WHERE id=$1",[job.id,new Date(Date.now()+Math.min(3600000,60000*2**job.attempts))]);}
 }
 return {sent,configured:true};
}
export async function previewOutbox(organizationId:string){if(isProduction())return [];const r=await database().query('SELECT j.id,j.recipient,j.payload,j.status,j.attempts FROM email_jobs j JOIN orders o ON o.id=j.order_id JOIN events e ON e.id=o.event_id WHERE e.organization_id=$1 ORDER BY j.created_at DESC LIMIT 30',[organizationId]);return r.rows.map(j=>({...j,payload:JSON.parse(decrypt(j.payload))}));}
export const orderEmail=(name:string,orderId:string,accessToken:string,eventName:string)=>({subject:'Tiket dan pesanan '+eventName+' — tinitix',text:`Halo ${name},\n\nBuka pesanan ${orderId} untuk melihat status pembayaran dan e-ticket beserta QR setiap orang.\n\n${appUrl()}/access#token=${accessToken}\n\nTautan berlaku 24 jam. Jangan bagikan tautan atau QR. Jika pembayaran belum terverifikasi, tiket belum diterbitkan.\n\ntinitix`});
