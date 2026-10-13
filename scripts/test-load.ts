import {latencyProxy} from './load-latency-proxy';
import {Pool} from 'pg';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';

// Never targets an arbitrary HTTP host: creates its own isolated database schema and local server.
if(!process.env.TEST_DATABASE_URL)throw new Error('Set TEST_DATABASE_URL to a test PostgreSQL database.');
const schema='load_'+randomUUID().replaceAll('-','');
const application=schema;
const url=new URL(process.env.TEST_DATABASE_URL);
if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('This benchmark branch permits only a local test database; staging is forbidden.');
url.searchParams.set('options',`-c search_path=${schema} -c statement_timeout=20000`);
url.searchParams.set('application_name',application);
const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:1});
const fixtureUrl=new URL(url);fixtureUrl.searchParams.set('application_name',schema+'_fixture');
const db=new Pool({connectionString:fixtureUrl.toString(),max:1});
for(const pool of [admin,db])pool.on('error',()=>console.error('Load database connection interrupted'));
const port=Number(process.env.LOAD_PORT||3200);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid LOAD_PORT');
const base=`http://127.0.0.1:${port}`;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const tokens=Array.from({length:10},()=>randomBytes(32).toString('hex'));
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const percentile=(values:number[],p:number)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)]:null;
type Sample={kind:string;ms:number;status:number};
const summarize=(samples:Sample[])=>Object.fromEntries([...new Set(samples.map(s=>s.kind))].map(kind=>{const rows=samples.filter(s=>s.kind===kind);return [kind,{count:rows.length,errors:rows.filter(s=>s.status<200||s.status>=300).length,p50Ms:percentile(rows.map(s=>s.ms),.5),p95Ms:percentile(rows.map(s=>s.ms),.95),p99Ms:percentile(rows.map(s=>s.ms),.99),maxMs:Math.max(...rows.map(s=>s.ms)),statuses:rows.reduce((a,s)=>({...a,[s.status]:(a[s.status]||0)+1}),{} as Record<number,number>)}];}));
let server:ChildProcess|undefined,created=false;
let proxy:Awaited<ReturnType<typeof latencyProxy>>|undefined;
const telemetry:Record<string,number|string>[]=[];let serverOutput='';
const oneWayMs=Number(process.env.LOAD_ONE_WAY_MS||0);
const output='test-results/load/'+(process.env.LOAD_LABEL||'results').replace(/[^a-zA-Z0-9_-]/g,'_')+'.json';
const report:any={harnessVersion:2,oneWayLatencyMs:oneWayMs,label:process.env.LOAD_LABEL||'results',startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,mode:'local next start + local PostgreSQL; optional TCP latency emulation',fixture:{organizations:10,events:10,paidOrdersPerEvent:500,poolMax:3},workload:{pollIntervalMs:3000,pollMode:'fixed cadence; skip if previous request is still in flight',buyerThinkTimeMs:10000,buyerMode:'closed loop; all purchases contend on event-0',timeoutMs:15000,mailDelivery:false,payment:'simulation'},thresholds:{dashboardP95Ms:1000,checkoutStepP95Ms:2000,checkoutJourneyP95Ms:10000,errorRate:.01},stages:[]};
let serial=0;
async function request(kind:string,path:string,samples:Sample[],body?:unknown,cookie='',identity='warmup'){
 const start=performance.now();
 try{
  const response=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin:base,'content-type':'application/json',cookie,'x-forwarded-for':identity,'idempotency-key':randomUUID()},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json();samples.push({kind,ms:performance.now()-start,status:response.status});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return {data,cookie:response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
 }catch(error){if(!samples.length||samples[samples.length-1].kind!==kind||!(error instanceof Error&&error.message.startsWith('HTTP ')))samples.push({kind,ms:performance.now()-start,status:0});throw error;}
}
async function purchase(samples:Sample[],event:number){
 const started=performance.now(),buyerId=++serial,identity='198.18.'+Math.floor(buyerId/250)+'.'+(buyerId%250+1);
 try{
  const reserved=await request('reserve','orders/reserve',samples,{eventId:`event-${event}`,items:[{categoryId:`category-${event}`,quantity:1,price:100000}]},'',identity);
  await request('buyer',`orders/${reserved.data.id}/buyer`,samples,{buyerName:'Load Buyer',buyerEmail:`load-${buyerId}@example.test`,phone:'+628123456789',gender:buyerId%2?'male':'female',paymentChannel:'qris',accepted:true},reserved.cookie,identity);
  const paid=await request('simulate',`orders/${reserved.data.id}/simulate`,samples,{status:'paid'},reserved.cookie,identity);
  if(paid.data.status!=='paid')throw new Error('Payment not paid');
  samples.push({kind:'journey',ms:performance.now()-started,status:200});
 }catch{samples.push({kind:'journey',ms:performance.now()-started,status:0});}
}
async function drain(){
 const started=performance.now();let idle=0;
 while(performance.now()-started<120000){
  const row=(await admin.query("SELECT count(*)::int AS busy FROM pg_stat_activity WHERE application_name=$1 AND state<>'idle'",[application])).rows[0];
  idle=row.busy===0?idle+1:0;
  if(idle>=5)return {settled:true,ms:performance.now()-started};
  await sleep(1000);
 }
 return {settled:false,ms:performance.now()-started};
}
async function integrity(){
 const {data}=await request('reconcile','admin/live?eventId=event-0',[],undefined,'tinitix_session='+tokens[0]);
 const row=(await db.query("SELECT count(*)::int AS orders,COALESCE(sum(total),0)::bigint AS gross FROM orders WHERE event_id='event-0' AND status='paid'")).rows[0];
 const stock=(await db.query("SELECT COALESCE(sum(units),0)::int AS used FROM reservations WHERE category_id='category-0' AND (state='converted' OR (state='active' AND expires_at>now()))")).rows[0];
 const oversold=(await db.query("SELECT count(*)::int AS count FROM categories c WHERE (SELECT COALESCE(sum(units),0) FROM reservations r WHERE r.category_id=c.id AND (state='converted' OR (state='active' AND expires_at>now())))>c.quota")).rows[0];
 return {matches:data.paidOrders===row.orders&&data.revenue.gross===Number(row.gross)&&data.availablePeople===20000-stock.used,oversoldCategories:oversold.count,paidOrders:row.orders,gross:Number(row.gross)};
}
try{
 await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
 for(const file of (await readdir('db/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('db/migrations/'+file,'utf8'));
 for(let i=0;i<10;i++){
  await db.query('INSERT INTO organizations(id,name) VALUES($1,$2)',[`org-${i}`,`Load EO ${i}`]);
  await db.query('INSERT INTO users(id,email,name,password_hash,verified) VALUES($1,$2,$3,$4,true)',[`user-${i}`,`eo-${i}@example.test`,`Load EO ${i}`,'disabled-load-account']);
  await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,$2,'admin')",[`user-${i}`,`org-${i}`]);
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '2 hours')",[sha(tokens[i]),`user-${i}`]);
  await db.query('INSERT INTO events(id,organization_id,slug,data) VALUES($1,$2,$1,$3)',[`event-${i}`,`org-${i}`,JSON.stringify({name:`Load Event ${i}`,status:'published',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+86400000*2).toISOString(),timezone:'Asia/Jakarta',capacity:20000,maxPeople:10,taxPercent:10,servicePercent:3})]);
  await db.query("INSERT INTO categories(id,event_id,name,price,quota,people,starts_at,ends_at) VALUES($1,$2,'Regular',100000,20000,1,now()-interval '1 day',now()+interval '2 days')",[`category-${i}`,`event-${i}`]);
  await db.query(`INSERT INTO orders(id,event_id,buyer_name,buyer_email,phone,status,total,people,expires_at,idempotency_key,fingerprint,subtotal,tax_amount,service_amount,buyer_gender) SELECT $1||g,$2,'Fixture buyer','fixture-'||g||'@example.test','+628123456789','paid',113000,1,now()+interval '1 day',$1||g,'fixture',100000,10000,3000,CASE WHEN g%2=0 THEN 'male' ELSE 'female' END FROM generate_series(1,500) g`,[`seed-${i}-`,`event-${i}`]);
  await db.query(`INSERT INTO order_items(id,order_id,category_id,name,price,quantity,people) SELECT 'item-'||id,id,$1,'Regular',100000,1,1 FROM orders WHERE event_id=$2`,[`category-${i}`,`event-${i}`]);
  await db.query(`INSERT INTO reservations(order_id,category_id,units,state,expires_at) SELECT id,$1,1,'converted',expires_at FROM orders WHERE event_id=$2`,[`category-${i}`,`event-${i}`]);
  await db.query(`INSERT INTO payment_events(id,order_id,data) SELECT 'payment-'||id,id,'{"status":"paid"}'::jsonb FROM orders WHERE event_id=$1`,[`event-${i}`]);
 }
 await db.query('ANALYZE');
 proxy=await latencyProxy(url.toString(),oneWayMs);
 const probe=new Pool({connectionString:proxy.url,max:1});
 const roundTrips:number[]=[];
 for(let i=0;i<20;i++){const started=performance.now();await probe.query('SELECT 1');roundTrips.push(performance.now()-started);}
 await probe.end();
 report.databaseRoundTrip={samples:20,meanMs:roundTrips.reduce((a,b)=>a+b,0)/20,p95Ms:percentile(roundTrips,.95)};
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,DATABASE_URL:proxy.url,PERF_METRICS:'1',APP_URL:base,APP_SECRET:randomBytes(32).toString('hex'),PAYMENT_PROVIDER:'simulation',VERCEL_ENV:'preview',VERCEL:'',RESEND_API_KEY:'',EMAIL_FROM:'',BLOB_READ_WRITE_TOKEN:'',CRON_SECRET:randomBytes(32).toString('hex'),NODE_ENV:'production'}});
 server.on('error',()=>console.error('Load server failed to start'));
 server.stderr?.on('data',()=>{});
 // Consume stdout; avoid leaking server environment or connection details into artifacts.
 server.stdout?.on('data',chunk=>{
  serverOutput+=chunk.toString();let newline:number;
  while((newline=serverOutput.indexOf('\n'))>=0){const line=serverOutput.slice(0,newline);serverOutput=serverOutput.slice(newline+1);try{const value=JSON.parse(line);if(value.kind==='tinitix_perf')telemetry.push(value);}catch{}}
 });
 let ready=false;
 for(let n=0;n<60;n++){if(server.exitCode!==null)throw new Error('Load server exited');try{await request('warmup','admin/live?eventId=event-0',[],undefined,'tinitix_session='+tokens[0]);ready=true;break;}catch{await sleep(1000);}}
 if(!ready)throw new Error('Load server not ready');
 const warm:Sample[]=[];await purchase(warm,0);if(warm.at(-1)?.status!==200)throw new Error('Warmup checkout failed');
 report.warmup=summarize(warm);
 const stages=[{eo:1,buyers:1,seconds:30},{eo:10,buyers:2,seconds:45},{eo:25,buyers:5,seconds:45},{eo:50,buyers:10,seconds:60}];
 for(const config of stages){
  console.log('Stage '+JSON.stringify(config));
  const metricStart=telemetry.length;
  const samples:Sample[]=[],activity:any[]=[],start=performance.now(),deadline=start+config.seconds*1000;
  let skipped=0,offered=0,maxLag=0,monitorErrors=0;
  const dashboard=Array.from({length:config.eo},async(_,i)=>{
   await sleep(i*3000/config.eo);let busy=false;const jobs:Promise<void>[]=[];
   for(let tick=start+i*3000/config.eo;tick<deadline;tick+=3000){
    await sleep(Math.max(0,tick-performance.now()));offered++;maxLag=Math.max(maxLag,performance.now()-tick);
    if(busy){skipped++;continue;}busy=true;
    jobs.push(request('dashboard',`admin/live?eventId=event-${i%10}`,samples,undefined,'tinitix_session='+tokens[i%10]).then(()=>{},()=>{}).finally(()=>{busy=false;}));
   }
   await Promise.all(jobs);
  });
  const buyers=Array.from({length:config.buyers},async(_,i)=>{await sleep(i*1000);while(performance.now()<deadline){await purchase(samples,0);await sleep(Math.min(10000,Math.max(0,deadline-performance.now())));}});
  const monitor=(async()=>{while(performance.now()<deadline){try{const r=await admin.query('SELECT state,wait_event_type,wait_event FROM pg_stat_activity WHERE application_name=$1',[application]);activity.push({at:performance.now()-start,connections:r.rows.length,active:r.rows.filter(r=>r.state==='active').length,locks:r.rows.filter(r=>r.wait_event_type==='Lock').length,waits:r.rows.map(r=>r.wait_event_type+':'+r.wait_event)});}catch{monitorErrors++;}await sleep(1000);}})();
  await Promise.all([...dashboard,...buyers,monitor]);
  const stats=summarize(samples),duration=(performance.now()-start)/1000;
  const drained=await drain();const metricEnd=telemetry.length;
  const stage={...config,elapsedSeconds:duration,offeredPolls:offered,skippedPolls:skipped,maxSchedulerLagMs:maxLag,dashboardRps:(stats.dashboard?.count||0)/config.seconds,metrics:stats,database:{samples:activity.length,monitorErrors,maxConnections:Math.max(0,...activity.map(r=>r.connections)),meanActive:activity.length?activity.reduce((n,r)=>n+r.active,0)/activity.length:0,maxActive:Math.max(0,...activity.map(r=>r.active)),samplesWithLocks:activity.filter(r=>r.locks>0).length,waits:activity.flatMap(r=>r.waits).reduce((a:Record<string,number>,w:string)=>({...a,[w]:(a[w]||0)+1}),{})},drain:drained,integrity:drained.settled?await integrity():{matches:false,reason:'Server transactions still running; reconciliation inconclusive'}};
  const phaseRows=telemetry.slice(metricStart,metricEnd);
  const serverMetrics=Object.fromEntries(['dashboard','reserve','buyer','simulate'].map(route=>{
   const rows=phaseRows.filter(row=>row.route===route);
   return [route,{count:rows.length,...Object.fromEntries(['authMs','poolWaitMs','queryMs','queryCount','applicationMs','totalMs','poolWaitingMax','authPoolMs','authQueryMs','nonAuthPoolMs','nonAuthQueryMs'].map(field=>[field,{p50:percentile(rows.map(r=>Number(r[field])),.5),p95:percentile(rows.map(r=>Number(r[field])),.95),p99:percentile(rows.map(r=>Number(r[field])),.99)}]))}];
  }));
  Object.assign(stage,{serverMetrics});
  report.stages.push(stage);console.log(JSON.stringify(stage));
  await mkdir('test-results/load',{recursive:true});await writeFile(output,JSON.stringify(report,null,2));
  const http=samples.filter(s=>s.kind!=='journey');if(http.filter(s=>s.status===0||s.status>=500).length/http.length>.2){report.stoppedEarly='Over 20% timeout/5xx; higher load skipped';break;}
 }
 report.tableStats=(await db.query('SELECT relname,n_live_tup,n_tup_ins,n_tup_upd,seq_scan,idx_scan FROM pg_stat_user_tables WHERE schemaname=$1 ORDER BY relname',[schema])).rows;
 report.acceptance=report.stages.map((stage:any)=>{
  const metrics=stage.metrics;
  const http=Object.entries(metrics).filter(([kind])=>kind!=='journey').map(([,value])=>value as {count:number;errors:number});
  const errorRate=http.reduce((n,r)=>n+r.errors,0)/http.reduce((n,r)=>n+r.count,0);
  return {eo:stage.eo,buyers:stage.buyers,errorRate,pass:metrics.dashboard?.p95Ms<=1000&&metrics.journey?.p95Ms<=10000&&['reserve','buyer','simulate'].every(k=>metrics[k]?.p95Ms<=2000)&&errorRate<.01&&stage.skippedPolls===0&&stage.integrity.matches&&stage.integrity.oversoldCategories===0};
 });
 report.targetMet=report.acceptance.some((stage:any)=>stage.eo===50&&stage.buyers===10&&stage.pass);
 if(!report.targetMet)process.exitCode=2;
 report.finishedAt=new Date().toISOString();
}finally{
 if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}
 if(proxy)await proxy.close();
 await db.end();
 try{if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);report.cleanedUp=true;}finally{await admin.end();}
 await mkdir('test-results/load',{recursive:true});await writeFile(output,JSON.stringify(report,null,2));
}
