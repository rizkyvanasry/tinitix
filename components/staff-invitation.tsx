'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
export function StaffInvitation(){
 const [token,setToken]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{setToken(new URLSearchParams(location.hash.slice(1)).get('token')||'');},[]);
 async function accept(){setBusy(true);setError('');try{await api('staff/accept',{token});setDone(true);history.replaceState(null,'',location.pathname);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="container narrow page-space"><h1>Undangan petugas</h1>{done?<><p>Akses check-in sudah aktif.</p><Link className="button" href="/check-in">Buka check-in</Link></>:<><p>Masuk atau daftar menggunakan email yang menerima undangan, lalu verifikasi email. Setelah itu kembali ke halaman ini dan terima undangan.</p><p><Link href="/login" target="_blank" rel="noopener noreferrer">Masuk</Link> · <Link href="/register" target="_blank" rel="noopener noreferrer">Daftar akun</Link></p><button className="button" disabled={busy||!token} onClick={()=>void accept()}>{busy?'Memproses...':'Terima undangan'}</button>{!token&&<p>Buka tautan lengkap dari email undangan.</p>}</>}{error&&<p className="error-message" role="alert">{error}</p>}</section>;
}
