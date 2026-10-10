import Link from 'next/link';
import {notFound} from 'next/navigation';
import {database} from '@/lib/db';
import {hasDatabase} from '@/lib/config';
import {loadEvent} from '@/lib/catalog';
import {shortDate} from '@/lib/format';
import '../../organizer/organizer.css';

export default async function PublicOrganizer({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!hasDatabase())notFound();
 const db=database();
 const organization=(await db.query('SELECT id,name FROM organizations WHERE slug=$1',[slug])).rows[0];
 if(!organization)notFound();
 const rows=await db.query("SELECT id FROM events WHERE organization_id=$1 AND data->>'status'='published' AND (data->>'ends')::timestamptz>now() ORDER BY data->>'starts'",[organization.id]);
 const events=await Promise.all(rows.rows.map(row=>loadEvent(db,row.id)));
 return <section className="eo-workspace"><div className="eo-container"><header className="eo-heading"><h1>{organization.name}</h1></header>{events.length?<div className="eo-event-grid">{events.map(event=><article className="eo-event-card" key={event.id}><Link className="eo-event-link" href={'/events/'+event.slug}><img src={event.poster} alt=""/><div><h2>{event.name}</h2><p>{shortDate(event.starts,event.timezone)} · {event.city}</p></div></Link></article>)}</div>:<p>Belum ada acara yang dipublikasikan.</p>}</div></section>;
}
