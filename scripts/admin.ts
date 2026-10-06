import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const {z}=await import('zod');
const email=z.string().email().parse(process.argv[2]).toLowerCase(),password=z.string().min(14).max(128).parse(process.env.ADMIN_PASSWORD);
const {id,passwordHash,audit}=await import('../lib/security');
const {transaction,closeDatabase}=await import('../lib/db');
try{await transaction(async db=>{const userId=id('admin');await db.query('INSERT INTO users(id,email,name,password_hash,verified) VALUES($1,$2,$3,$4,true)',[userId,email,process.argv[3]||'Admin tinitix',passwordHash(password)]);await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,'tinitix','admin')",[userId]);await audit(db,'bootstrap','admin_created',userId);});console.log('Admin created. No password was printed.');}finally{await closeDatabase();}
