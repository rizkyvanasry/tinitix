import {test} from 'node:test';
import assert from 'node:assert/strict';
import {livePollDelay} from '../lib/live-polling';
import {measureRequest,measureAuth,recordDatabase} from '../lib/performance';

test('poll jitter, slow-response backoff, failure cap and recovery',()=>{
 assert.equal(livePollDelay(100,0,()=>0),2550);
 assert.equal(livePollDelay(100,0,()=>1),3450);
 assert.equal(livePollDelay(4000,0,()=>.5),8000);
 assert.equal(livePollDelay(100,1,()=>.5),6000);
 assert.equal(livePollDelay(100,2,()=>.5),12000);
 assert.equal(livePollDelay(100,9,()=>1),30000);
 assert.equal(livePollDelay(100,0,()=>.5),3000);
});
test('request metrics contain only fixed route labels, numbers and no payload identifiers',async()=>{
 const logs:string[]=[];const original=console.log,previous=process.env.PERF_METRICS;
 console.log=(value:unknown)=>logs.push(String(value));process.env.PERF_METRICS='1';
 try{
  await Promise.all(['dashboard','reserve'].map(route=>measureRequest(route,async()=>{
   await measureAuth(async()=>{recordDatabase('pool',1,2);recordDatabase('query',2);});
   recordDatabase('query',3);return new Response(JSON.stringify({email:'private@example.test',token:'private-token',qr:'private-qr'}));
  })));
  assert.equal(logs.length,2);
  for(const line of logs){const value=JSON.parse(line);assert.equal(value.queryCount,2);assert.equal(value.poolWaitMs,1);assert.equal(value.authQueryMs,2);assert.equal(value.nonAuthQueryMs,3);assert.equal(value.poolWaitingMax,2);assert.ok(!line.includes('private'));}
 }finally{console.log=original;if(previous===undefined)delete process.env.PERF_METRICS;else process.env.PERF_METRICS=previous;}
});
