import {database} from './db';
import {loadEvent} from './catalog';
import {AppError} from './security';
import type {User} from './types';

function assertOrganizer(user:User){
 if(!user.verified||user.role!=='admin')throw new AppError(403,'Akses organizer tidak diizinkan.');
}
export async function listOrganizerEvents(user:User){
 assertOrganizer(user);
 const db=database();
 const result=await db.query("SELECT id FROM events WHERE organization_id=$1 ORDER BY data->>'starts' DESC,id",[user.organizationId]);
 return Promise.all(result.rows.map(row=>loadEvent(db,row.id)));
}
export async function getOrganizerEvent(eventId:string,user:User){
 assertOrganizer(user);
 const db=database();
 const result=await db.query('SELECT id FROM events WHERE id=$1 AND organization_id=$2',[eventId,user.organizationId]);
 return result.rows.length?loadEvent(db,result.rows[0].id):null;
}
