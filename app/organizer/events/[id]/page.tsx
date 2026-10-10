import Link from 'next/link';
import {notFound} from 'next/navigation';
import {organizerSession} from '@/lib/organizer-session';
import {getOrganizerEvent} from '@/lib/organizer-events';
import {EoDashboard,type DashboardView} from '@/components/eo-dashboard';
import {database} from '@/lib/db';
import {rupiah,shortDate,timeLabel} from '@/lib/format';
import '../../../admin/admin.css';
import '../../dashboard.css';

export const metadata={title:'Dashboard acara'};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{view?:string;p?:string;q?:string}>}){
 const user=await organizerSession();
 const {id}=await params;
 const event=await getOrganizerEvent(id,user);
 if(!event)notFound();
 const query=await searchParams;
 const views=['overview','sales','analytics','orders','details','tickets','design','registration','agents','scans'];
 const view=(views.includes(query.view||'')?query.view:'overview') as DashboardView;
 const db=database();
 const base='/organizer/events/'+encodeURIComponent(id);
 let content:React.ReactNode;
 if(view==='orders'){
  const q=(query.q||'').trim().slice(0,100);
  const where="FROM orders o JOIN events e ON e.id=o.event_id WHERE o.event_id=$1 AND e.organization_id=$2 AND ($3='' OR strpos(lower(o.id),lower($3))>0 OR strpos(lower(o.buyer_name),lower($3))>0 OR strpos(lower(o.buyer_email),lower($3))>0 OR strpos(lower(o.status),lower($3))>0)";
  const values=[id,user.organizationId,q];
  const total=Number((await db.query('SELECT count(*)::int AS total '+where,values)).rows[0].total);
  const pages=Math.max(1,Math.ceil(total/50));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(query.p)||1)));
  const orders=(await db.query("SELECT o.id,o.created_at,o.buyer_name,o.buyer_email,o.phone,o.total,o.status,o.people,COALESCE((SELECT SUM(i.quantity) FROM order_items i WHERE i.order_id=o.id),0)::int AS quantity "+where+' ORDER BY o.created_at DESC,o.id DESC LIMIT 50 OFFSET $4',[...values,(page-1)*50])).rows;
  const href=(p:number)=>base+'?'+new URLSearchParams({view:'orders',q,p:String(p)});
  content=<><form className="eo-orders-search"><input type="hidden" name="view" value="orders"/><input name="q" defaultValue={q} aria-label="Cari order" placeholder="Cari nomor order, pembeli, email, atau status" maxLength={100}/><button className="button" type="submit">Cari</button></form><div className="eo-dashboard-table"><table><thead><tr><th>No. Order</th><th>Time &amp; Date</th><th>Buyer Information</th><th>Quantity</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.id}</td><td>{shortDate(new Date(o.created_at).toISOString(),event.timezone)}<small>{timeLabel(new Date(o.created_at).toISOString(),event.timezone)}</small></td><td>{o.buyer_name||'Data pembeli belum diisi'}<small>{o.buyer_email}</small>{o.phone&&<small>{o.phone}</small>}</td><td>{o.quantity} unit<small>{o.people} tiket / orang</small></td><td>{rupiah(o.total)}</td><td><span className={'eo-order-status '+o.status}>{o.status.replaceAll('_',' ')}</span></td></tr>)}{!orders.length&&<tr><td colSpan={6}>{q?'Tidak ada order yang cocok dengan pencarian.':'Belum ada order untuk event ini.'}</td></tr>}</tbody></table></div><nav className="eo-orders-pagination" aria-label="Halaman orders"><span>{total} orders · Halaman {page} dari {pages}</span>{page>1&&<Link href={href(page-1)}>Sebelumnya</Link>}{page<pages&&<Link href={href(page+1)}>Berikutnya</Link>}</nav></>;
 }
 if(view==='agents'){
  const agents=(await db.query('SELECT u.id,u.name,u.email FROM assignments a JOIN users u ON u.id=a.user_id JOIN events e ON e.id=a.event_id WHERE a.event_id=$1 AND e.organization_id=$2 ORDER BY u.name',[id,user.organizationId])).rows;
  content=<div className="eo-dashboard-panel"><h2>Petugas gate event</h2><p>Petugas berikut memiliki penugasan untuk event ini.</p><div className="eo-dashboard-table"><table><thead><tr><th>Nama</th><th>Email</th></tr></thead><tbody>{agents.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.email}</td></tr>)}{!agents.length&&<tr><td colSpan={2}>Belum ada petugas yang ditugaskan.</td></tr>}</tbody></table></div><Link className="button button-outline" href="/check-in">Buka check-in</Link></div>;
 }
 if(view==='scans'){
  const count=Number((await db.query('SELECT count(*)::int AS total FROM check_ins c JOIN tickets t ON t.id=c.ticket_id JOIN events e ON e.id=t.event_id WHERE t.event_id=$1 AND e.organization_id=$2',[id,user.organizationId])).rows[0].total);
  const pages=Math.max(1,Math.ceil(count/50));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(query.p)||1)));
  const logs=(await db.query('SELECT c.ticket_id,c.checked_at,t.name,t.category_name,u.name AS agent FROM check_ins c JOIN tickets t ON t.id=c.ticket_id JOIN users u ON u.id=c.user_id JOIN events e ON e.id=t.event_id WHERE t.event_id=$1 AND e.organization_id=$2 ORDER BY c.checked_at DESC,c.ticket_id LIMIT 50 OFFSET $3',[id,user.organizationId,(page-1)*50])).rows;
  content=<><p>Riwayat check-in berhasil · {count} tiket</p><div className="eo-dashboard-table"><table><thead><tr><th>Ticket</th><th>Attendee</th><th>Gate Agent</th><th>Time &amp; Date</th></tr></thead><tbody>{logs.map(l=><tr key={l.ticket_id}><td>{l.ticket_id}</td><td>{l.name}<small>{l.category_name}</small></td><td>{l.agent}</td><td>{shortDate(new Date(l.checked_at).toISOString(),event.timezone)}<small>{timeLabel(new Date(l.checked_at).toISOString(),event.timezone)}</small></td></tr>)}{!logs.length&&<tr><td colSpan={4}>Belum ada check-in yang berhasil.</td></tr>}</tbody></table></div><nav className="eo-orders-pagination" aria-label="Halaman scan logs"><span>Halaman {page} dari {pages}</span>{page>1&&<Link href={base+'?view=scans&p='+(page-1)}>Sebelumnya</Link>}{page<pages&&<Link href={base+'?view=scans&p='+(page+1)}>Berikutnya</Link>}</nav></>;
 }
 return <EoDashboard event={event} view={view}>{content}</EoDashboard>;
}
