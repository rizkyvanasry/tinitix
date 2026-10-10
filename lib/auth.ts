import {z} from 'zod';
import {database,transaction,type Db} from './db';
import {AppError,id,token,hash,passwordHash,passwordValid,audit} from './security';
import {enqueueMail} from './mail';
import {appUrl} from './config';
import type {User} from './types';
const emailSchema=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
const passwordSchema=z.string().min(10,'Password minimal 10 karakter.').max(128);
const organizerProfileSchema=z.object({
 firstName:z.string().trim().min(1,'Isi nama depan.').max(50),
 lastName:z.string().trim().min(1,'Isi nama belakang.').max(49),
 phone:z.string().trim().regex(/^\+[1-9]\d{7,14}$/,'Nomor telepon harus memakai kode negara dan 8–15 digit.'),
 birthDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Isi tanggal lahir yang valid.').refine(value=>{
  const date=new Date(value+'T00:00:00Z');
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value&&value<=new Date().toISOString().slice(0,10);
 },'Tanggal lahir tidak valid atau berada di masa depan.'),
 gender:z.enum(['male','female'],{message:'Pilih jenis kelamin.'})
});
export async function currentUser(session?:string):Promise<User|null>{
 if(!session)return null;
 const r=await database().query('SELECT u.id,u.email,u.name,u.verified,m.role,m.organization_id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(session)]);const u=r.rows[0];return u?{id:u.id,email:u.email,name:u.name,verified:u.verified,role:u.role,organizationId:u.organization_id}:null;
}
export async function requireRole(session:string|undefined,roles:User['role'][]){const u=await currentUser(session);if(!u||!u.verified||!roles.includes(u.role))throw new AppError(403,'Akses tidak diizinkan. Silakan masuk dengan akun yang sesuai.');return u;}
export async function newSession(db:Db,userId:string){const raw=token();await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hash(raw),userId,new Date(Date.now()+86400000)]);return raw;}
export async function login(input:unknown){const body=z.object({email:emailSchema,password:z.string().max(128)}).parse(input);const r=await database().query('SELECT * FROM users WHERE email=$1',[body.email]);const user=r.rows[0];const valid=passwordValid(body.password,user?.password_hash||passwordHash('dummy-invalid-password'));if(!user||!valid)throw new AppError(401,'Email atau password tidak sesuai.');return {session:await newSession(database(),user.id)};}
export async function register(input:unknown){const body=z.object({name:z.string().trim().min(2).max(100),email:emailSchema,password:passwordSchema}).parse(input);await transaction(async db=>{const u=id('user');const result=await db.query('INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id',[u,body.email,body.name,passwordHash(body.password)]);if(!result.rows[0])return;await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,'tinitix','buyer')",[u]);await authEmail(db,u,body.email,'verify');});return {message:'Jika email belum terdaftar, tautan verifikasi akan dikirim. Jika sudah punya akun, pendaftaran ulang tidak mengubah password lama. Masuk atau gunakan Lupa password untuk memulihkan akun.'};}
async function authEmail(db:Db,userId:string,email:string,kind:'verify'|'reset'){const raw=token();await db.query('INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,$3,$4)',[hash(raw),userId,kind,new Date(Date.now()+3600000)]);await enqueueMail(db,email,{subject:(kind==='verify'?'Verifikasi email':'Reset password')+' — tinitix',text:`Buka tautan berikut dalam 1 jam:\n${appUrl()}/auth/confirm#token=${raw}&kind=${kind}\nAbaikan jika Anda tidak meminta ini.`});}
export async function requestAuthEmail(input:unknown){const body=z.object({email:emailSchema,kind:z.enum(['reset','verify'])}).parse(input);await transaction(async db=>{const r=await db.query('SELECT id FROM users WHERE email=$1',[body.email]);if(r.rows[0])await authEmail(db,r.rows[0].id,body.email,body.kind);});return {message:'Jika alamat terdaftar, tautan akan dikirim ke email tersebut.'};}
export async function confirmAuth(input:unknown){const body=z.object({token:z.string().min(30).max(100),password:passwordSchema.optional()}).parse(input);return transaction(async db=>{const r=await db.query('DELETE FROM auth_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING *',[hash(body.token)]);const t=r.rows[0];if(!t)throw new AppError(400,'Tautan tidak valid atau sudah kedaluwarsa.');if(t.kind==='reset'){if(!body.password)throw new AppError(400,'Masukkan password baru.');await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash(body.password),t.user_id]);await db.query('DELETE FROM sessions WHERE user_id=$1',[t.user_id]);await db.query("DELETE FROM auth_tokens WHERE user_id=$1 AND kind='reset'",[t.user_id]);}else await db.query('UPDATE users SET verified=true WHERE id=$1',[t.user_id]);await audit(db,t.user_id,t.kind,t.user_id);return {message:t.kind==='reset'?'Password diperbarui. Silakan masuk.':'Email terverifikasi. Silakan masuk.'};});}

// A verified buyer can create only their own organization; no client-provided role or tenant ID is accepted.
export async function createOrganizer(input:unknown,user:User){
 return transaction(async db=>{
  const member=(await db.query('SELECT m.*,u.verified FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 FOR UPDATE OF m',[user.id])).rows[0];
  if(!member?.verified)throw new AppError(403,'Verifikasi email sebelum membuat organisasi.');
  if(member.role==='admin')return {organizationId:member.organization_id};
  if(member.role!=='buyer')throw new AppError(409,'Akun petugas sudah terhubung ke organisasi. Gunakan akun lain untuk membuat EO.');
  const body=z.object({
   organizationName:z.string().trim().min(2,'Isi nama organizer.').max(120),
   organizerType:z.enum(['individual','company']),
   slug:z.string().trim().toLowerCase().min(3,'URL minimal 3 karakter.').max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'URL hanya boleh berisi huruf, angka, dan tanda hubung.'),
   phone:z.string().trim().regex(/^\+[1-9]\d{7,14}$/,'Masukkan nomor telepon dengan kode negara.'),
   newsletter:z.boolean().default(false),
   accepted:z.literal(true,{errorMap:()=>({message:'Setujui Syarat Layanan dan Kebijakan Privasi.'})})
  }).parse(input);
  const organizationId=id('org');
  const created=await db.query('INSERT INTO organizations(id,name,organizer_type,slug,phone,newsletter_opt_in,terms_accepted_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(slug) DO NOTHING RETURNING id',[organizationId,body.organizationName,body.organizerType,body.slug,body.phone,body.newsletter]);
  if(!created.rows.length)throw new AppError(409,'URL organizer sudah digunakan. Pilih URL lain.');
  await db.query("UPDATE memberships SET organization_id=$2,role='admin' WHERE user_id=$1",[user.id,organizationId]);
  await audit(db,user.id,'organizer_created',organizationId);
  return {organizationId};
 });
}
export async function registerOrganizer(input:unknown){
 const body=organizerProfileSchema.extend({email:emailSchema,password:passwordSchema}).parse(input);
 await transaction(async db=>{
  const userId=id('user');
  const inserted=await db.query('INSERT INTO users(id,email,name,password_hash,first_name,last_name,phone,birth_date,gender) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(email) DO NOTHING RETURNING id',[userId,body.email,body.firstName+' '+body.lastName,passwordHash(body.password),body.firstName,body.lastName,body.phone,body.birthDate,body.gender]);
  if(!inserted.rows.length)return;
  await db.query("INSERT INTO memberships(user_id,organization_id,role) VALUES($1,'tinitix','buyer')",[userId]);
  await authEmail(db,userId,body.email,'verify');
  await audit(db,userId,'organizer_account_registered',userId);
 });
 return {message:'Jika email belum terdaftar, tautan verifikasi dikirim. Setelah verifikasi, masuk melalui Login Organizer. Jika email sudah terdaftar, pendaftaran ulang tidak mengubah password lama. Gunakan Login Organizer atau Lupa password.'};
}
