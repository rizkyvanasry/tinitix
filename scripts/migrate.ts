import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
loadEnvConfig(process.cwd());
const {transaction,closeDatabase}=await import('../lib/db');
try{await transaction(async db=>{await db.query("SELECT pg_advisory_xact_lock(1746001)");await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');for(const name of (await readdir(join(process.cwd(),'db/migrations'))).filter(n=>n.endsWith('.sql')).sort()){if((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rows.length)continue;await db.query(await readFile(join(process.cwd(),'db/migrations',name),'utf8'));await db.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);console.log('Applied',name);}await db.query("INSERT INTO organizations(id,name) VALUES('tinitix','tinitix') ON CONFLICT DO NOTHING");});}finally{await closeDatabase();}
