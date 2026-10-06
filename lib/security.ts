import {randomBytes,createHash,createHmac,scryptSync,timingSafeEqual,createCipheriv,createDecipheriv} from 'node:crypto';
import {database,type Db} from './db';
export class AppError extends Error { constructor(public status:number,message:string,public code='INVALID_REQUEST'){super(message);} }
export const id = (prefix:string) => prefix+'_'+randomBytes(12).toString('hex');
export const token = () => randomBytes(32).toString('base64url');
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export function secret(){const s=process.env.APP_SECRET;if(!s||s.length<32)throw new AppError(503,'Konfigurasi keamanan belum siap.');return s;}
export const sign = (value:string) => createHmac('sha256',secret()).update(value).digest('base64url');
export function safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function passwordValid(password:string,encoded:string){const [salt,digest]=encoded.split(':');return Boolean(salt&&digest&&safeEqual(scryptSync(password,salt,64).toString('hex'),digest));}
export function encrypt(value:string){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',Buffer.from(hash(secret()),'hex'),iv);return Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64');}
export function decrypt(value:string){const b=Buffer.from(value,'base64');const c=createDecipheriv('aes-256-gcm',Buffer.from(hash(secret()),'hex'),b.subarray(0,12));c.setAuthTag(b.subarray(-16));return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString('utf8');}
export async function audit(db:Db,actor:string,action:string,target:string,reason=''){await db.query('INSERT INTO audit_logs(id,actor,action,target,reason) VALUES($1,$2,$3,$4,$5)',[id('audit'),actor,action,target,reason]);}
export async function rateLimit(key:string,limit=10,seconds=60){const result=await database().query('INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits',[hash(key),new Date(Date.now()+seconds*1000)]);if(result.rows[0].hits>limit)throw new AppError(429,'Terlalu banyak percobaan. Silakan coba sebentar lagi.');}
