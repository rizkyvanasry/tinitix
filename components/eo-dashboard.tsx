'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {BarChart3,CalendarDays,ChevronDown,ClipboardList,ContactRound,HelpCircle,Menu,Pencil,X} from 'lucide-react';
import {Logo} from './shell';
import {EoLivePanels} from './eo-live-panels';


import {EventEditor} from './admin-dashboard';
import type {Event} from '@/lib/types';
import {rupiah,shortDate,timeLabel} from '@/lib/format';

export const dashboardViews={overview:'Overview',sales:'Sales Trend',analytics:'Analytics',orders:'Orders',details:'Event Details',tickets:'Ticket Types',design:'Design Pages',registration:'Registration Form',agents:'Gate Agent',scans:'Scan Logs'};
export type DashboardView=keyof typeof dashboardViews;
export function EoDashboard({event,view,children}:{event:Event;view:DashboardView;children?:ReactNode}){
 const [mobile,setMobile]=useState(false),[editing,setEditing]=useState(false);
 const router=useRouter();
 const base='/organizer/events/'+event.id;
 function group(label:string,Icon:typeof BarChart3,items:DashboardView[]){const active=items.includes(view);return <details key={label} className={active?'eo-nav-group active':'eo-nav-group'} open={active||undefined}><summary><Icon size={24}/><span>{label}</span><ChevronDown size={19}/></summary><div>{items.map(item=><Link key={item} href={base+'?view='+item} aria-current={view===item?'page':undefined} onClick={()=>setMobile(false)}>{dashboardViews[item]}</Link>)}</div></details>;}
 return <div className="eo-dashboard-layout">
  <button className="eo-mobile-toggle" onClick={()=>setMobile(!mobile)} aria-expanded={mobile} aria-controls="eo-sidebar">{mobile?<X/>:<Menu/>} Menu dashboard</button>
  <aside id="eo-sidebar" className={'eo-dashboard-sidebar'+(mobile?' is-open':'')}><div className="eo-sidebar-logo"><Logo/></div><nav aria-label="Navigasi dashboard event"><Link className="eo-nav-all" href="/organizer/events"><CalendarDays size={24}/> All Events</Link>
   {group('Event Dashboard',BarChart3,['overview','sales','analytics'])}
   <Link className={'eo-nav-orders'+(view==='orders'?' active':'')} href={base+'?view=orders'} aria-current={view==='orders'?'page':undefined} onClick={()=>setMobile(false)}><ClipboardList size={24}/> Orders</Link>
   {group('Event',Pencil,['details','tickets','design','registration'])}
   {group('Manage Attendances',ContactRound,['agents','scans'])}
  </nav><Link className="eo-nav-help" href="/organizer/help-center"><HelpCircle size={24}/><span>Need Help?<small>FAQ Event Organizer</small></span></Link></aside>
  <section className="eo-dashboard-content"><div className="eo-dashboard-top"><span>{event.name}</span><Link href="/account">Tiket saya</Link></div><header className="eo-dashboard-title"><div><p>EVENT WORKSPACE</p><h1>{dashboardViews[view]}</h1></div>{['details','tickets','design'].includes(view)&&<button className="button" onClick={()=>setEditing(true)}><Pencil size={17}/> Edit event</button>}</header>
   {children}
   {['overview','sales','analytics'].includes(view)&&<EoLivePanels eventId={event.id} view={view} base={base}/>}
   
   
   {view==='details'&&<div className="eo-dashboard-panel"><h2>{event.name}</h2><dl><dt>Venue</dt><dd>{event.venue}</dd><dt>Alamat</dt><dd>{event.address}, {event.city}</dd><dt>Mulai</dt><dd>{shortDate(event.starts,event.timezone)} · {timeLabel(event.starts,event.timezone)}</dd><dt>Kapasitas</dt><dd>{event.capacity} orang</dd></dl><p className="preserve-lines">{event.description}</p></div>}
   {view==='tickets'&&<div className="eo-dashboard-table"><table><thead><tr><th>Ticket type</th><th>Harga / unit</th><th>Orang / unit</th><th>Kuota unit</th></tr></thead><tbody>{event.categories.map(c=><tr key={c.id}><td>{c.name}</td><td>{rupiah(c.price)}</td><td>{c.people}</td><td>{c.quota}</td></tr>)}</tbody></table></div>}
   {view==='design'&&<div className="eo-dashboard-panel"><h2>Halaman event</h2><p>Atur poster, banner, dan konten halaman melalui Edit event.</p>{event.banner&&<img className="eo-design-banner" src={event.banner} alt="Banner event"/>}<img className="eo-design-poster" src={event.poster} alt="Poster event"/>{event.status!=='draft'&&<Link className="button button-outline" href={'/events/'+event.slug}>Lihat halaman event</Link>}</div>}
   {view==='registration'&&<div className="eo-dashboard-panel"><h2>Formulir pembelian tiket</h2><p>Formulir saat ini menggunakan kolom bawaan checkout. Pengaturan kolom khusus belum tersedia.</p><ul><li>Nama pembeli</li><li>Email pembeli</li><li>Nomor telepon</li><li>Jenis kelamin</li><li>Persetujuan syarat dan kebijakan privasi</li></ul></div>}
  </section>{editing&&<EventEditor event={event} demo={false} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);router.refresh();}}/>}
 </div>;
}
