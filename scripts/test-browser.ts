import {Pool} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {passwordHash} from '../lib/security';

if(!process.env.TEST_DATABASE_URL)throw new Error('Set TEST_DATABASE_URL to a PostgreSQL test server.');
const schema='browser_'+randomUUID().replaceAll('-','');
const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:1});
const url=new URL(process.env.TEST_DATABASE_URL);
url.searchParams.set('options','-c search_path='+schema);
const db=new Pool({connectionString:url.toString(),max:1});
try{
 await admin.query(`CREATE SCHEMA "${schema}"`);
 for(const name of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort())await db.query(await readFile('db/migrations/'+name,'utf8'));
 await db.query("INSERT INTO organizations(id,name) VALUES('tinitix','Browser test')");
 await db.query("INSERT INTO users(id,email,name,password_hash,verified) VALUES('browser-admin','admin@example.test','Browser Admin',$1,true)",[passwordHash('Browser-test-password-123')]);
 await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES('browser-admin','tinitix','admin')");
 // Explicit values override .env.local; no real emails or cloud uploads in CI.
 const env:NodeJS.ProcessEnv={...process.env,DATABASE_URL:url.toString(),APP_URL:'http://127.0.0.1:3100',APP_SECRET:randomBytes(32).toString('hex'),PAYMENT_PROVIDER:'simulation',VERCEL_ENV:'preview',RESEND_API_KEY:'',EMAIL_FROM:'',BLOB_READ_WRITE_TOKEN:'',CRON_SECRET:randomBytes(32).toString('hex'),NODE_ENV:'development'};
 process.exitCode=await new Promise<number>((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.database.config.ts'],{env,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>resolve(code??1));
 });
}finally{
 await db.end();
 try{await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await admin.end();}
}
