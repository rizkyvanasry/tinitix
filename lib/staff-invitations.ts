import {z} from 'zod';
import {database,transaction,type Db} from './db';
import {AppError,audit,id,hash,token} from './security';
import {enqueueMail} from './mail';
import {appUrl} from './config';
import type {User} from './types';
function admin(user:User){if(!user.verified||user.role!=='admin')throw new AppError(403,'Akses admin organizer diperlukan.');}
async function events(db:Db,ids:string[],organizationId:string){for(const eventId of ids)if(!(await db.query('SELECT 1 FROM events WHERE id=$1 AND organization_id=$2',[eventId,organizationId])).rows.length)throw new AppError(403,'Event bukan milik organisasi ini.');}
export async function listStaff(user:User){
 admin(user);const db=database();
 const members=(await db.query("SELECT u.id,u.name,u.email,COALESCE((SELECT json_agg(a.event_id) FROM assignments a WHERE a.user_id=u.id),'[]'::json) AS event_ids FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=$1 AND m.role='staff' ORDER BY u.name",[user.organizationId])).rows;
 const invitations=(await db.query("SELECT id,email,event_ids,expires_at,CASE WHEN status='pending' AND expires_at<=now() THEN 'expired' ELSE status END AS status FROM staff_invitations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100",[user.organizationId])).rows;
 const available=(await db.query("SELECT id,data->>'name' AS name FROM events WHERE organization_id=$1 ORDER BY data->>'name'",[user.organizationId])).rows;
 return {members,invitations,events:available};
}
export async function inviteStaff(input:unknown,user:User){
 admin(user);const body=z.object({email:z.string().trim().email().max(254).toLowerCase(),eventIds:z.array(z.string().min(1)).min(1).max(100)}).parse(input);
 if(body.email===user.email.toLowerCase())throw new AppError(400,'Admin tidak perlu mengundang dirinya sendiri.');
 return transaction(async db=>{
  await db.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[user.organizationId]);
  await events(db,body.eventIds,user.organizationId);
  const existing=(await db.query('SELECT m.role,m.organization_id FROM users u JOIN memberships m ON m.user_id=u.id WHERE lower(u.email)=$1',[body.email])).rows[0];
  if(existing&&(existing.role==='admin'||existing.role==='staff'&&existing.organization_id!==user.organizationId))throw new AppError(409,'Akun sudah memiliki akses pengelola organisasi. Gunakan akun pembeli atau petugas organisasi ini.');
  await db.query("UPDATE staff_invitations SET status='revoked' WHERE organization_id=$1 AND email=$2 AND status='pending'",[user.organizationId,body.email]);
  const raw=token(),inviteId=id('invite');
  await db.query("INSERT INTO staff_invitations(id,organization_id,email,token_hash,event_ids,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '7 days')",[inviteId,user.organizationId,body.email,hash(raw),JSON.stringify([...new Set(body.eventIds)]),user.id]);
  await enqueueMail(db,body.email,{subject:'Undangan petugas event — Tinitix',text:`Anda diundang menjadi petugas event. Masuk atau daftar dengan email ${body.email}, verifikasi akun, lalu buka tautan ini untuk menerima. Tautan berlaku 7 hari:\n${appUrl()}/staff/invitation#token=${raw}\nAbaikan jika Anda tidak mengenali undangan ini.`});
  await audit(db,user.id,'staff_invited',inviteId);
  return {message:'Undangan masuk antrean email. Berlaku 7 hari.',id:inviteId};
 });
}
export async function acceptStaffInvitation(input:unknown,user:User){
 if(!user.verified)throw new AppError(403,'Verifikasi email terlebih dahulu.');
 const body=z.object({token:z.string().min(30).max(100)}).parse(input);
 return transaction(async db=>{
  const found=(await db.query('SELECT organization_id FROM staff_invitations WHERE token_hash=$1',[hash(body.token)])).rows[0];
  if(!found)throw new AppError(400,'Undangan tidak valid atau sudah tidak berlaku.');
  await db.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[found.organization_id]);
  const invite=(await db.query("SELECT * FROM staff_invitations WHERE token_hash=$1 AND status='pending' AND expires_at>now() FOR UPDATE",[hash(body.token)])).rows[0];
  if(!invite)throw new AppError(400,'Undangan tidak valid atau sudah tidak berlaku.');
  const member=(await db.query('SELECT m.*,u.email,u.verified FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 FOR UPDATE OF m',[user.id])).rows[0];
  if(!member?.verified||member.email.toLowerCase()!==invite.email)throw new AppError(403,'Masuk dengan email yang menerima undangan dan verifikasi email tersebut.');
  if(member.role==='admin'||member.role==='staff'&&member.organization_id!==invite.organization_id)throw new AppError(409,'Akun terhubung sebagai pengelola organisasi lain.');
  await events(db,invite.event_ids,invite.organization_id);
  await db.query("UPDATE memberships SET role='staff',organization_id=$2 WHERE user_id=$1",[user.id,invite.organization_id]);
  await db.query('DELETE FROM assignments WHERE user_id=$1',[user.id]);
  for(const eventId of invite.event_ids)await db.query('INSERT INTO assignments(user_id,event_id) VALUES($1,$2)',[user.id,eventId]);
  await db.query("UPDATE staff_invitations SET status='accepted',accepted_by=$2,accepted_at=now() WHERE id=$1",[invite.id,user.id]);
  await audit(db,user.id,'staff_invitation_accepted',invite.id);
  return {message:'Undangan diterima. Akses check-in telah aktif.'};
 });
}
export async function cancelStaffInvitation(input:unknown,user:User){
 admin(user);const body=z.object({id:z.string()}).parse(input);
 return transaction(async db=>{
  await db.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[user.organizationId]);
  const result=await db.query("UPDATE staff_invitations SET status='revoked' WHERE id=$1 AND organization_id=$2 AND status='pending' RETURNING id",[body.id,user.organizationId]);
  if(!result.rows.length)throw new AppError(404,'Undangan aktif tidak ditemukan.');
  await audit(db,user.id,'staff_invitation_revoked',body.id);return {message:'Undangan dibatalkan.'};
 });
}
export async function revokeStaff(input:unknown,user:User){
 admin(user);const body=z.object({userId:z.string()}).parse(input);
 return transaction(async db=>{
  await db.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[user.organizationId]);
  const member=(await db.query("SELECT m.user_id,u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.role='staff' FOR UPDATE OF m",[body.userId,user.organizationId])).rows[0];
  if(!member)throw new AppError(404,'Petugas tidak ditemukan.');
  await db.query('DELETE FROM assignments WHERE user_id=$1',[body.userId]);
  await db.query("UPDATE memberships SET role='buyer',organization_id='tinitix' WHERE user_id=$1",[body.userId]);
  await db.query("UPDATE staff_invitations SET status='revoked' WHERE organization_id=$1 AND email=$2 AND status='pending'",[user.organizationId,member.email.toLowerCase()]);
  await audit(db,user.id,'staff_access_revoked',body.userId);return {message:'Akses petugas dicabut. Akun tetap dapat membeli tiket.'};
 });
}
