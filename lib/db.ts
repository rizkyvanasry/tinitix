import {Pool,type PoolClient} from 'pg';
import {performance} from 'node:perf_hooks';
import {recordDatabase} from './performance';
import {attachDatabasePool} from '@vercel/functions';
export interface Db { query<T=Record<string,any>>(sql:string,values?:unknown[]):Promise<{rows:T[]}> }
type TestDatabase = Db & {transaction<T>(fn:(db:Db)=>Promise<T>):Promise<T>};
let testDatabase:TestDatabase|undefined;
export function setTestDatabase(db:TestDatabase) { if(process.env.NODE_ENV!=='test')throw new Error('Test database is test-only');testDatabase=db; }
let pool:Pool;
export function database():Db {
 if(testDatabase)return testDatabase;
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');
 if(!pool){pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});pool.on('error',()=>console.error('database idle connection failed'));if(process.env.VERCEL)attachDatabasePool(pool);}
 return {query:async(sql,values)=>{const client=await acquire();try{return await measured(client).query(sql,values);}finally{client.release();}}};
}
export async function transaction<T>(fn:(db:Db)=>Promise<T>):Promise<T> {
 if(testDatabase)return testDatabase.transaction(fn);
 database();const client=await acquire();const db=measured(client);
 try {await db.query('BEGIN');const value=await fn(db);await db.query('COMMIT');return value;}
 catch(error){await db.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function closeDatabase(){if(pool)await pool.end();}

async function acquire(){
 const started=performance.now(),waiting=pool.waitingCount;
 try{return await pool.connect();}finally{recordDatabase('pool',performance.now()-started,waiting);}
}
function measured(client:PoolClient):Db{return {query:async<T=Record<string,any>>(sql:string,values?:unknown[])=>{
 const started=performance.now();try{return await client.query(sql,values) as unknown as {rows:T[]};}finally{recordDatabase('query',performance.now()-started);}
}};}
