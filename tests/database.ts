import {PGlite} from '@electric-sql/pglite';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import type {Db} from '../lib/db';

// Real PostgreSQL tests own a new schema; no application tables are truncated.
export async function createTestDatabase(){
 if(!process.env.TEST_DATABASE_URL)return new PGlite();
 const schema='test_'+randomUUID().replaceAll('-','');
 const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:1});
 await admin.query(`CREATE SCHEMA "${schema}"`);
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:10,options:`-c search_path=${schema} -c statement_timeout=20000`});
 return {
  query:(sql:string,values?:unknown[])=>pool.query(sql,values),
  exec:(sql:string)=>pool.query(sql),
  async transaction<T>(fn:(db:Db)=>Promise<T>){
   const client=await pool.connect();
   try{await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}
   catch(error){await client.query('ROLLBACK');throw error;}
   finally{client.release();}
  },
  async close(){await pool.end();try{await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{await admin.end();}}
 };
}
