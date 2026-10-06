import {Pool} from 'pg';
import {attachDatabasePool} from '@vercel/functions';
export interface Db { query<T=Record<string,any>>(sql:string,values?:unknown[]):Promise<{rows:T[]}> }
type TestDatabase = Db & {transaction<T>(fn:(db:Db)=>Promise<T>):Promise<T>};
let testDatabase:TestDatabase|undefined;
export function setTestDatabase(db:TestDatabase) { if(process.env.NODE_ENV!=='test')throw new Error('Test database is test-only');testDatabase=db; }
let pool:Pool;
export function database():Db {
 if(testDatabase)return testDatabase;
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');
 if(!pool){pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});if(process.env.VERCEL)attachDatabasePool(pool);}
 return pool;
}
export async function transaction<T>(fn:(db:Db)=>Promise<T>):Promise<T> {
 if(testDatabase)return testDatabase.transaction(fn);
 database();const client=await pool.connect();
 try {await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function closeDatabase(){if(pool)await pool.end();}
