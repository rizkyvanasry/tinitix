import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkConfiguration} from '../lib/readiness';
const configured={DATABASE_URL:'postgresql://user:private-password@localhost:5432/tinitix',APP_URL:'http://127.0.0.1:3000',APP_SECRET:'private-secret-1234567890123456789012345',PAYMENT_PROVIDER:'simulation'};
test('local setup allows simulation and reports optional services without blocking',()=>{
 const checks=checkConfiguration(configured);
 assert.equal(checks.some(c=>c.level==='error'),false);
 assert.equal(checks.find(c=>c.name==='Email')?.level,'warn');
});
test('missing configuration fails without throwing or exposing secrets',()=>{
 assert.ok(checkConfiguration({}).filter(c=>c.level==='error').length>=4);
 const result=JSON.stringify(checkConfiguration(configured));
 assert.ok(!result.includes('private-password'));
 assert.ok(!result.includes(configured.APP_SECRET));
});
test('production never reports readiness for simulation, missing email or insecure URL',()=>{
 for(const env of [{...configured,VERCEL_ENV:'production'},{...configured,NODE_ENV:'production'}]){
  const checks=checkConfiguration(env);
  for(const name of ['Pembayaran','Email','APP_URL','Maintenance'])assert.equal(checks.find(c=>c.name===name)?.level,'error');
 }
});
test('explicit production check overrides preview settings',()=>{
 assert.equal(checkConfiguration({...configured,VERCEL_ENV:'preview'},true).find(c=>c.name==='Pembayaran')?.level,'error');
 assert.equal(checkConfiguration({...configured,VERCEL_ENV:'preview',NODE_ENV:'production'}).find(c=>c.name==='Pembayaran')?.level,'ok');
});
test('malformed database URLs, short secrets and invalid app origins fail',()=>{
 for(const DATABASE_URL of ['https://database.example/tinitix','postgresql://localhost/','invalid'])assert.equal(checkConfiguration({...configured,DATABASE_URL}).find(c=>c.name==='DATABASE_URL')?.level,'error');
 for(const APP_URL of ['javascript:alert(1)','https://example.test/path','https://example.test/?secret=value','https://user:pass@example.test'])assert.equal(checkConfiguration({...configured,APP_URL}).find(c=>c.name==='APP_URL')?.level,'error');
 assert.equal(checkConfiguration({...configured,APP_SECRET:' '.repeat(32)}).find(c=>c.name==='APP_SECRET')?.level,'error');
});
