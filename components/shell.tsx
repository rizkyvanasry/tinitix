'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState,useEffect,useRef} from 'react';
import {ArrowUpRight,Menu,X,ArrowRight,Ticket,ChevronDown} from 'lucide-react';
export function Logo(){return <Link href="/" className="wordmark" aria-label="tinitix beranda">tinitix<span className="logo-dot">.</span></Link>;}
export function Header({demo}:{demo:boolean}){
 const pathname=usePathname();
 const organizerRoot=useRef<HTMLDivElement>(null),organizerButton=useRef<HTMLButtonElement>(null);
 const [organizerOpen,setOrganizerOpen]=useState(false);
 const closeNavigation=()=>{setOpen(false);setOrganizerOpen(false);};
 const menuButton=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[user,setUser]=useState<{name:string;role:string}|null>(null);
 useEffect(()=>{setOpen(false);setOrganizerOpen(false);},[pathname]);
 useEffect(()=>{
  if(!organizerOpen)return;
  const outside=(e:PointerEvent)=>{if(!organizerRoot.current?.contains(e.target as Node))setOrganizerOpen(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopImmediatePropagation();setOrganizerOpen(false);organizerButton.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
 },[organizerOpen]);
 useEffect(()=>{if(!demo)fetch('/api/auth/me').then(r=>r.json()).then(r=>setUser(r.user)).catch(()=>{});},[demo]);
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);menuButton.current?.focus();}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[open]);
 return <><a className="skip-link" href="#main">Lewati ke konten</a>{demo&&<div className="preview-banner">Mode pratinjau <span>&middot; Event contoh. Tidak ada penjualan tiket nyata.</span></div>}<header className="site-header"><div className="container nav-wrap"><Logo/><nav id="primary-navigation" className={open?'main-nav open':'main-nav'} aria-label="Navigasi utama"><div className="organizer-nav" ref={organizerRoot} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOrganizerOpen(false);}}><button ref={organizerButton} type="button" className="organizer-trigger" aria-expanded={organizerOpen} aria-controls="organizer-navigation" onClick={()=>setOrganizerOpen(v=>!v)}>Organizer <ChevronDown size={18} className={organizerOpen?'rotated':''}/></button><div id="organizer-navigation" className="organizer-dropdown" hidden={!organizerOpen}><Link href="/organizer/login" onClick={closeNavigation}>Create Event</Link><Link href="/organizer/services" onClick={closeNavigation}>Our Services</Link><Link href="/organizer/help-center" onClick={closeNavigation}>Creator Help Center</Link></div></div><Link href="/help" onClick={closeNavigation}>Cara Pesan</Link><Link href="/access" onClick={closeNavigation}>Tiket Saya</Link></nav><div className="auth-nav">{user?<><Link href={user.role==='admin'?'/admin':user.role==='staff'?'/check-in':'/account'} className="login-link">{user.name.split(' ')[0]} <ArrowUpRight size={16}/></Link><button className="text-button" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});location.href='/';}}>Keluar</button></>:<><Link className="login-link" href="/login">Masuk</Link><Link className="button button-small" href="/register">Daftar <ArrowUpRight size={16}/></Link></>}<button ref={menuButton} aria-controls="primary-navigation" className="mobile-menu icon-button" onClick={()=>{setOpen(!open);setOrganizerOpen(false);}} aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open}>{open?<X/>:<Menu/>}</button></div></div></header></>;
}
export function Footer(){return <footer className="site-footer"><div className="container footer-editorial"><div><Logo/><p>Ketemu di depan panggung.</p></div><nav aria-label="Navigasi footer"><Link href="/help">Panduan pemesanan</Link><Link href="/help#support">Hubungi kami</Link><Link href="/access">Tiket saya</Link></nav></div><div className="container footer-bottom"><span>&copy; {new Date().getFullYear()} tinitix</span><div><Link href="/terms">Syarat & ketentuan</Link><Link href="/privacy">Kebijakan privasi</Link></div></div></footer>;}
export function EmptyState({title,description,href,label}:{title:string;description:string;href?:string;label?:string}){return <div className="empty-state"><Ticket size={38}/><h2>{title}</h2><p>{description}</p>{href&&<Link className="button" href={href}>{label||'Jelajahi event'} <ArrowRight size={18}/></Link>}</div>;}
