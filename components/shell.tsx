'use client';
import Link from 'next/link';
import {usePathname,useSearchParams,useRouter} from 'next/navigation';
import {Suspense,useState,useEffect,useRef} from 'react';
import {Menu,X,ArrowRight,Ticket,ChevronDown} from 'lucide-react';
import {SearchInput} from './ui';
export function Logo(){return <Link href="/" className="wordmark" aria-label="tinitix beranda">tinitix<span className="logo-dot">.</span></Link>;}
function SearchForm(){
 const params=useSearchParams(),router=useRouter(),current=params.get('q')||'';
 const [query,setQuery]=useState(current);
 useEffect(()=>setQuery(current),[current]);
 return <form className="nav-search" role="search" action="/" onSubmit={e=>{e.preventDefault();router.push('/'+(query.trim()?'?q='+encodeURIComponent(query.trim()):'')+'#events');}}><SearchInput id="event-search" name="q" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" className="icon-button nav-search-submit" aria-label="Cari event"><ArrowRight size={20}/></button></form>;
}
export function Header({demo}:{demo:boolean}){
 const pathname=usePathname();
 const organizerRoot=useRef<HTMLDivElement>(null),organizerButton=useRef<HTMLButtonElement>(null),menuButton=useRef<HTMLButtonElement>(null);
 const [organizerOpen,setOrganizerOpen]=useState(false),[open,setOpen]=useState(false),[user,setUser]=useState<{name:string;role:string}|null>(null);
 const closeNavigation=()=>{setOpen(false);setOrganizerOpen(false);};
 useEffect(()=>{setOpen(false);setOrganizerOpen(false);},[pathname]);
 useEffect(()=>{if(!demo)fetch('/api/auth/me').then(r=>r.json()).then(r=>setUser(r.user)).catch(()=>{});},[demo,pathname]);
 useEffect(()=>{
  if(!organizerOpen)return;
  const outside=(e:PointerEvent)=>{if(!organizerRoot.current?.contains(e.target as Node))setOrganizerOpen(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopImmediatePropagation();setOrganizerOpen(false);organizerButton.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
 },[organizerOpen]);
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);menuButton.current?.focus();}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[open]);
 return <><a className="skip-link" href="#main">Lewati ke konten</a>{demo&&<div className="preview-banner">Mode pratinjau · Event contoh, tanpa penjualan tiket nyata.</div>}<header className="site-header ds-header"><div className="container nav-wrap"><Logo/><Suspense fallback={<form className="nav-search" action="/" role="search"><SearchInput id="event-search" name="q"/></form>}><SearchForm/></Suspense><button ref={menuButton} aria-controls="primary-navigation" className="mobile-menu icon-button" onClick={()=>{setOpen(!open);setOrganizerOpen(false);}} aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open}>{open?<X/>:<Menu/>}</button><nav id="primary-navigation" className={open?'main-nav open':'main-nav'} aria-label="Navigasi utama"><div className="organizer-nav" ref={organizerRoot} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOrganizerOpen(false);}}>{user&&(user.role==='admin'||user.role==='buyer')?<Link href="/organizer" onClick={closeNavigation}>Event Organizer</Link>:<><button ref={organizerButton} type="button" className="organizer-trigger" aria-expanded={organizerOpen} aria-controls="organizer-navigation" onClick={()=>setOrganizerOpen(v=>!v)}>Organizer<ChevronDown size={20}/></button><div id="organizer-navigation" className="organizer-dropdown" hidden={!organizerOpen}><Link href="/organizer/create-event" onClick={closeNavigation}>Buat event</Link><Link href="/organizer/services" onClick={closeNavigation}>Layanan organizer</Link><Link href="/organizer/help-center" onClick={closeNavigation}>Bantuan organizer</Link></div></>}</div><Link href="/my-tickets" onClick={closeNavigation}>Tiket saya</Link><div className="auth-nav">{user?<><Link href={user.role==='admin'?'/organizer':user.role==='staff'?'/check-in':'/account'} className="button button-small" onClick={closeNavigation}>{user.name.split(' ')[0]}</Link><button className="text-button" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});location.href='/';}}>Keluar</button></>:<Link className="button" href="/login" onClick={closeNavigation}>Masuk / daftar</Link>}</div></nav></div></header></>;
}
export function Footer(){return <footer className="site-footer"><div className="container footer-editorial"><div><Logo/><p>Ketemu di depan panggung.</p></div><nav aria-label="Navigasi footer"><Link href="/help">Panduan pemesanan</Link><Link href="/help#support">Hubungi kami</Link><Link href="/my-tickets">Tiket saya</Link></nav></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} tinitix</span><div><Link href="/terms">Syarat & ketentuan</Link><Link href="/privacy">Kebijakan privasi</Link></div></div></footer>;}
export function EmptyState({title,description,href,label}:{title:string;description:string;href?:string;label?:string}){return <div className="empty-state"><Ticket size={38}/><h2>{title}</h2><p>{description}</p>{href&&<Link className="button" href={href}>{label||'Jelajahi event'} <ArrowRight size={18}/></Link>}</div>;}
