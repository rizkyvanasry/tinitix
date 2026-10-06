import nextEnv from '@next/env';
import {setTimeout as delay} from 'node:timers/promises';
import {closeDatabase} from '../lib/db';
import {runMaintenance} from '../lib/maintenance';

nextEnv.loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production');
const once=process.argv.includes('--once');
const interval=Number(process.env.WORKER_INTERVAL_MS||30000);
const stop=new AbortController();
process.once('SIGINT',()=>stop.abort());
process.once('SIGTERM',()=>stop.abort());

async function main(){
 if(!process.env.DATABASE_URL||!process.env.APP_SECRET||process.env.APP_SECRET.length<32){
  console.error('Worker membutuhkan DATABASE_URL dan APP_SECRET minimal 32 karakter.');
  process.exitCode=1;return;
 }
 if(!Number.isInteger(interval)||interval<1000||interval>3600000){
  console.error('WORKER_INTERVAL_MS harus integer 1000-3600000.');
  process.exitCode=1;return;
 }
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM){
  console.warn('Email belum dikonfigurasi; worker hanya membersihkan data kedaluwarsa.');
 }
 try{
  do{
   try{
    const result=await runMaintenance();
    console.log(JSON.stringify({time:new Date().toISOString(),maintenance:'ok',...result}));
   }catch{
    // Driver/provider errors may contain secrets or buyer data.
    console.error(JSON.stringify({time:new Date().toISOString(),maintenance:'failed'}));
    if(once)process.exitCode=1;
   }
   if(once||stop.signal.aborted)break;
   try{await delay(interval,undefined,{signal:stop.signal});}catch{break;}
  }while(!stop.signal.aborted);
 }finally{await closeDatabase();}
}
main().catch(()=>{console.error('Worker berhenti karena kesalahan internal.');process.exitCode=1;});
