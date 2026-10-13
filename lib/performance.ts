import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';

type Metrics={authMs:number;poolWaitMs:number;queryMs:number;queryCount:number;authPoolMs:number;authQueryMs:number;poolWaitingMax:number};
const scope=new AsyncLocalStorage<{metrics:Metrics;phase:'auth'|'app'}>();
export function recordDatabase(kind:'pool'|'query',ms:number,waiting=0){
 const context=scope.getStore();if(!context)return;
 const m=context.metrics;
 if(kind==='pool'){m.poolWaitMs+=ms;m.poolWaitingMax=Math.max(m.poolWaitingMax,waiting);if(context.phase==='auth')m.authPoolMs+=ms;}
 else{m.queryMs+=ms;m.queryCount++;if(context.phase==='auth')m.authQueryMs+=ms;}
}
export async function measureAuth<T>(fn:()=>Promise<T>):Promise<T>{
 const context=scope.getStore();if(!context)return fn();
 const started=performance.now();
 try{return await scope.run({...context,phase:'auth'},fn);}finally{context.metrics.authMs+=performance.now()-started;}
}
// Only fixed route labels and numeric durations leave this scope. No SQL, URL, identifiers or payloads.
export async function measureRequest<T extends Response>(route:string,fn:()=>Promise<T>):Promise<T>{
 if(process.env.PERF_METRICS!=='1')return fn();
 const metrics:Metrics={authMs:0,poolWaitMs:0,queryMs:0,queryCount:0,authPoolMs:0,authQueryMs:0,poolWaitingMax:0};
 return scope.run({metrics,phase:'app'},async()=>{
  const started=performance.now();const response=await fn();const totalMs=performance.now()-started;
  const result={kind:'tinitix_perf',route,status:response.status,...metrics,totalMs,applicationMs:Math.max(0,totalMs-metrics.poolWaitMs-metrics.queryMs),nonAuthPoolMs:Math.max(0,metrics.poolWaitMs-metrics.authPoolMs),nonAuthQueryMs:Math.max(0,metrics.queryMs-metrics.authQueryMs)};
  response.headers.set('Server-Timing',`auth;dur=${metrics.authMs.toFixed(2)},pool;dur=${metrics.poolWaitMs.toFixed(2)},sql;dur=${metrics.queryMs.toFixed(2)},app;dur=${result.applicationMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);
  console.log(JSON.stringify(result));return response;
 });
}
