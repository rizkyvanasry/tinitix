'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
import type {User} from '@/lib/types';

export function OrganizerRegister(){
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 useEffect(()=>{
  api<{user:User|null}>('auth/me').then(result=>setUser(result.user)).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 },[]);

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  const data=Object.fromEntries(new FormData(event.currentTarget));
  const phone=String(data.countryCode)+String(data.nationalPhone).replace(/^0+/,'');
  const profile={
   firstName:data.firstName,
   lastName:data.lastName,
   phone,
   birthDate:data.birthDate,
   gender:data.gender
  };
  setBusy(true);
  setError('');
  try{
    const result=await api<{message:string}>('auth/organizer-register',{...profile,email:data.email,password:data.password});
    setMessage(result.message);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setBusy(false);
  }
 }

 async function resendVerification(){
  if(!user)return;
  setBusy(true);
  setError('');
  try{
   const result=await api<{message:string}>('auth/email',{email:user.email,kind:'verify'});
   setMessage(result.message);
  }catch(e){
   setError((e as Error).message);
  }finally{
   setBusy(false);
  }
 }

 return <section className="organizer-register-page">
  <div className="organizer-register-wrap">
   <span className="eyebrow blue-text">TINITIX ORGANIZER</span>
   <h1>{user?'Akun Organizer':'Buat Akun'}</h1>
   <p className="organizer-register-intro">Buat akun dan verifikasi email, lalu buat organizer melalui tombol Create Organizer.</p>
   {loading?<p role="status">Memuat akun...</p>
   :user&&!user.verified?<div className="organizer-register-notice"><p>Verifikasi email akun kamu sebelum membuat organisasi.</p><button type="button" className="button" disabled={busy} onClick={resendVerification}>Kirim ulang verifikasi</button><p>Setelah verifikasi, muat ulang halaman ini.</p></div>
   :user?.role==='staff'?<p>Akun ini terhubung sebagai petugas. Gunakan akun lain untuk membuat organisasi.</p>
   :user?<Link className="button full" href="/organizer">Lanjut ke organizer</Link>
   :message&&!user?<p className="organizer-register-notice" role="status">{message}</p>
   :<form className="organizer-register-form" onSubmit={submit} aria-busy={busy}>
    <label className="field">Nama Depan<input name="firstName" required maxLength={50} autoComplete="given-name" placeholder="Nama depan"/></label>
    <label className="field">Nama Belakang<input name="lastName" required maxLength={49} autoComplete="family-name" placeholder="Nama belakang"/></label>
    <div className="organizer-register-phone">
     <label className="field" htmlFor="organizer-phone">Nomor Telepon</label>
     <div className="organizer-register-phone-control">
      <select name="countryCode" aria-label="Kode negara" defaultValue="+62">
       <option value="+62">+62</option>
       <option value="+60">+60</option>
       <option value="+65">+65</option>
       <option value="+1">+1</option>
      </select>
      <input id="organizer-phone" name="nationalPhone" type="tel" inputMode="numeric" required minLength={8} maxLength={13} pattern="[0-9]{8,13}" autoComplete="tel-national" placeholder="85719593780"/>
     </div>
     <small>Masukkan nomor tanpa kode negara. Awalan 0 akan dihapus otomatis.</small>
    </div>
    <label className="field">Tanggal Lahir<input name="birthDate" type="date" required max={new Date().toISOString().slice(0,10)} autoComplete="bday" lang="id"/></label>
    <label className="field">Jenis Kelamin<select name="gender" required defaultValue=""><option value="" disabled>Pilih jenis kelamin</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
    {!user&&<>
     <label className="field">Alamat Email<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="nama@email.com"/></label>
     <label className="field">Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Minimal 10 karakter"/><small>Minimal 10 karakter.</small></label>
    </>}
    <label className="organizer-register-consent"><input type="checkbox" required/><span>Saya menyetujui <Link href="/terms">Syarat Layanan</Link> dan <Link href="/privacy">Kebijakan Privasi</Link>.</span></label>
    <button className="button full" type="submit" disabled={busy}>{busy?'Memproses...':user?'Buat Organisasi':'Buat Akun Organizer'}</button>
   </form>}
   {error&&<p className="error-message" role="alert">{error}</p>}
   {message&&user&&<p className="organizer-register-notice" role="status">{message}</p>}
   <p className="organizer-register-login">Sudah punya akun? <Link href="/organizer/login">Login Organizer</Link> · <Link href="/reset-password">Lupa password?</Link></p>
  </div>
 </section>;
}
