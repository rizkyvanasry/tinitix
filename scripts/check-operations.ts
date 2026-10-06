import nextEnv from '@next/env';
import {database,closeDatabase} from '../lib/db';
nextEnv.loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production');
try{
 const db=database();
 const mail=(await db.query(`SELECT
  COUNT(*) FILTER (WHERE status IN ('retry','failed') AND attempts>=8)::int AS exhausted,
  COUNT(*) FILTER (WHERE status IN ('pending','retry') AND next_attempt_at<now()-interval '5 minutes')::int AS overdue
  FROM email_jobs`)).rows[0];
 const orders=(await db.query(`SELECT
  COUNT(*) FILTER (WHERE o.status='payment_review')::int AS payment_review,
  COUNT(*) FILTER (WHERE o.status='paid' AND o.people<>(SELECT COUNT(*) FROM tickets t WHERE t.order_id=o.id))::int AS ticket_mismatch,
  COUNT(*) FILTER (WHERE o.status='pending' AND o.expires_at<now()-interval '5 minutes')::int AS overdue_expiry
  FROM orders o`)).rows[0];
 const healthy=Object.values({...mail,...orders}).every(value=>value===0);
 console.log(JSON.stringify({time:new Date().toISOString(),healthy,mail,orders}));
 process.exitCode=healthy?0:1;
}catch{console.error('Pemeriksaan operasional gagal; periksa koneksi database dan migrasi.');process.exitCode=1;}
finally{await closeDatabase();}
