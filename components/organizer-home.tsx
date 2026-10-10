'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,Building2,Plus,UserRound,X} from 'lucide-react';
import {api} from '@/lib/client';

type Organization={id:string;name:string;slug:string|null;organizer_type:'individual'|'company'|null};
export function OrganizerHome({organization,urlPrefix}:{organization:Organization|null;urlPrefix:string}){
 const [open,setOpen]=useState(false);
 const router=useRouter();
 return <section className="organizer-home"><div className="organizer-home-inner">
  {organization?<>
   <header className="organizer-home-heading"><h1>Organizer saya</h1></header>
   <Link className="organizer-home-card" href="/organizer/events"><span className="organizer-home-avatar">{organization.organizer_type==='company'?<Building2 size={34}/>:<UserRound size={34}/>}</span><div><h2>{organization.name}</h2>{organization.slug&&<p>/o/{organization.slug}</p>}</div><ArrowUpRight size={22}/></Link>
  </>:<div className="organizer-home-actions"><button className="button organizer-create-button" onClick={()=>setOpen(true)}><Plus size={23}/> Create Organizer</button></div>}
  {open&&<CreateOrganizerDialog urlPrefix={urlPrefix} onClose={()=>setOpen(false)} onCreated={()=>{setOpen(false);router.refresh();}}/>}
 </div></section>;
}

function CreateOrganizerDialog({urlPrefix,onClose,onCreated}:{urlPrefix:string;onClose:()=>void;onCreated:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [slug,setSlug]=useState('');
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const fields=new FormData(event.currentTarget);
  setBusy(true);setError('');
  try{
   await api('organizer/create',{
    organizerType:fields.get('organizerType'),organizationName:fields.get('organizationName'),slug,
    phone:String(fields.get('countryCode'))+String(fields.get('nationalPhone')).replace(/^0+/,''),
    newsletter:fields.get('newsletter')==='on',accepted:fields.get('accepted')==='on'
   });
   onCreated();
  }catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 return <dialog ref={dialog} className="organizer-create-dialog" aria-labelledby="create-organizer-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <header><h2 id="create-organizer-title">Create Organizer</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Tutup Create Organizer"><X size={27}/></button></header>
  <form onSubmit={submit} aria-busy={busy}>
   <fieldset disabled={busy} className="organizer-create-fields">
    <fieldset className="organizer-type"><legend>Organizer Type</legend><div><label><input type="radio" name="organizerType" value="individual" defaultChecked/> Individual</label><label><input type="radio" name="organizerType" value="company"/> Company</label></div></fieldset>
    <label className="organizer-create-field">Organizer Name <span>*</span><input name="organizationName" required minLength={2} maxLength={120} autoComplete="organization" placeholder="Contoh: Unity Collective"/></label>
    <div className="organizer-create-field"><label htmlFor="organizer-slug">Organizer page URL <span>*</span></label><p id="organizer-url-note">URL ini tidak dapat diubah setelah disimpan. Periksa kembali sebelum melanjutkan.</p><div className="organizer-url-input"><span>{urlPrefix}</span><input id="organizer-slug" name="slug" required minLength={3} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="nama-organizer" value={slug} onChange={event=>setSlug(event.target.value.toLowerCase())} aria-describedby="organizer-url-note" autoCapitalize="none" spellCheck={false}/></div></div>
    <div className="organizer-create-field"><label htmlFor="organizer-contact">Phone Number <span>*</span></label><div className="organizer-phone-input"><select name="countryCode" aria-label="Kode negara" defaultValue="+62"><option>+62</option><option>+60</option><option>+65</option><option>+66</option><option>+1</option></select><input id="organizer-contact" name="nationalPhone" type="tel" inputMode="numeric" required minLength={8} maxLength={13} pattern="[0-9]{8,13}" autoComplete="tel-national" placeholder="Nomor telepon organizer"/></div><small>Tanpa kode negara. Awalan 0 dihapus otomatis.</small></div>
    <label className="organizer-create-check"><input type="checkbox" name="newsletter"/><span>Berlangganan newsletter Tinitix Organizer <small>(opsional)</small></span></label>
    <label className="organizer-create-check"><input type="checkbox" name="accepted" required/><span>Saya telah membaca dan menyetujui <Link href="/terms" target="_blank" rel="noopener noreferrer">Syarat Layanan</Link> dan <Link href="/privacy" target="_blank" rel="noopener noreferrer">Kebijakan Privasi</Link>.</span></label>
   </fieldset>
   {error&&<p className="error-message" role="alert">{error}</p>}
   <button className="button organizer-create-submit" disabled={busy}>{busy?'Menyimpan...':'Create Organizer'}</button>
  </form>
 </dialog>;
}
