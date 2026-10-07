import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTestDatabase} from './database';

test('PostgreSQL test schema overrides a search_path supplied in the connection URL',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const original=process.env.TEST_DATABASE_URL!;
 const url=new URL(original);url.searchParams.set('options','-c search_path=public');
 process.env.TEST_DATABASE_URL=url.toString();
 let db:Awaited<ReturnType<typeof createTestDatabase>>|undefined;
 try{
  db=await createTestDatabase();
  const result=await db.query('SELECT current_schema() AS schema');
  assert.match(String((result.rows[0] as {schema:string}).schema),/^test_[a-f0-9]{32}$/);
 }finally{process.env.TEST_DATABASE_URL=original;await db?.close();}
});
