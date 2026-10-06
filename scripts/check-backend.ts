import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import {Pool} from 'pg';
import {checkConfiguration} from '../lib/readiness';

const production=process.argv.includes('--production');
loadEnvConfig(process.cwd(),!production);
const checks=checkConfiguration(process.env,production);
let failed=checks.some(check=>check.level==='error');
for(const check of checks)console.log(`[${check.level.toUpperCase()}] ${check.name}: ${check.message}`);

// Dedicated read-only connection: never creates tables or changes application data.
if(process.env.DATABASE_URL&&!checks.some(c=>c.name==='DATABASE_URL'&&c.level==='error')){
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000,statement_timeout:10000,options:'-c default_transaction_read_only=on'});
 try{
  await pool.query('SELECT 1');
  console.log('[OK] Database: koneksi PostgreSQL berhasil.');
  const migrationTable=await pool.query("SELECT to_regclass('public.schema_migrations') AS name");
  const expected=(await readdir(join(process.cwd(),'db/migrations'))).filter(name=>name.endsWith('.sql')).sort();
  const applied=migrationTable.rows[0].name?(await pool.query('SELECT name FROM schema_migrations')).rows.map(row=>row.name):[];
  const pending=expected.filter(name=>!applied.includes(name));
  if(pending.length){failed=true;console.log(`[ERROR] Migrasi: ${pending.length} belum diterapkan. Jalankan npm run db:migrate.`);}
  else{
   console.log('[OK] Migrasi: seluruh migrasi tercatat.');
   const admins=await pool.query("SELECT EXISTS(SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.role='admin' AND u.verified=true) AS ready");
   if(!admins.rows[0].ready){failed=true;console.log('[ERROR] Admin: belum ada admin terverifikasi. Jalankan npm run admin:create.');}
   else console.log('[OK] Admin: akun admin tersedia.');
  }
 }catch{
  failed=true;
  // Do not print driver errors: they can contain connection strings or credentials.
  console.log('[ERROR] Database: koneksi atau pemeriksaan skema gagal. Periksa URL, akses jaringan, dan migrasi.');
 }finally{await pool.end();}
}else console.log('[INFO] Database: pemeriksaan koneksi dilewati.');
console.log(failed?'Pemeriksaan belum lolos. Mode pratinjau tetap dapat digunakan.':'Konfigurasi dasar lolos. Ini bukan verifikasi transaksi atau pengiriman email nyata.');
process.exitCode=failed?1:0;
