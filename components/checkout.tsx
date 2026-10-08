'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,Minus,Plus,Ticket,ShieldCheck,Mail,Info,Check,ChevronRight} from 'lucide-react';
import type {PublicEvent,OrderView} from '@/lib/types';
import {rupiah,dateLabel,shortDate} from '@/lib/format';
import {api} from '@/lib/client';
import {priceBreakdown} from '@/lib/pricing';
import {paymentChannels} from '@/lib/payment-channels';
export function Checkout({initialEvent,enabled,step='tickets',initialQuantities={},orderId}:{initialEvent:PublicEvent;enabled:boolean;step?:'tickets'|'buyer';initialQuantities?:Record<string,number>;orderId?:string}){
 const buyerStep=step==='buyer';
 const [event,setEvent]=useState(initialEvent),[quantities,setQuantities]=useState<Record<string,number>>(initialQuantities),[form,setForm]=useState({buyerName:'',buyerEmail:'',phone:'',gender:'',paymentChannel:'',accepted:false}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState(false),[touched,setTouched]=useState<Record<string,boolean>>({});
 const router=useRouter(),key=useRef('');
 const [hold,setHold]=useState<OrderView|null>(null),[serverTime,setServerTime]=useState(0),[holdLoading,setHoldLoading]=useState(buyerStep&&Boolean(orderId));
 const [resumeId,setResumeId]=useState('');
 useEffect(()=>{
  if(buyerStep)return;let active=true;
  try{const saved=sessionStorage.getItem('tinitix-active-hold:'+initialEvent.id);if(saved)void api<OrderView>('orders/'+saved).then(o=>{if(active&&o.event.id===initialEvent.id&&!o.buyerCompleted&&o.status==='pending'&&Date.parse(o.expiresAt)>Date.parse(o.serverNow))setResumeId(o.id);}).catch(()=>{});}catch{}
  return()=>{active=false;};
 },[buyerStep,initialEvent.id]);
 const clock=useRef({server:0,local:0});
 useEffect(()=>{
  if(!buyerStep||!orderId)return;
  let active=true;
  async function load(){try{
   const value=await api<OrderView>('orders/'+orderId);if(!active)return;
   if(value.event.id!==initialEvent.id)throw new Error('Reservasi bukan untuk event ini.');
   if(value.buyerCompleted){router.replace('/orders/'+orderId);return;}
   clock.current={server:Date.parse(value.serverNow),local:performance.now()};setServerTime(clock.current.server);setHold(value);
   setQuantities(Object.fromEntries(value.items.map(i=>[i.categoryId,i.quantity])));
   setEvent({...value.event,categories:value.event.categories.map(c=>({...c,price:value.items.find(i=>i.categoryId===c.id)?.price??c.price}))});
  }catch(e){if(active)setError((e as Error).message);}finally{if(active)setHoldLoading(false);}}
  void load();const poll=setInterval(()=>void load(),20000),tick=setInterval(()=>setServerTime(clock.current.server+performance.now()-clock.current.local),1000);
  return()=>{active=false;clearInterval(poll);clearInterval(tick);};
 },[buyerStep,orderId,initialEvent.id,router]);
 const remaining=hold?Math.max(0,Date.parse(hold.expiresAt)-serverTime):0;

 const selected=event.categories.filter(c=>quantities[c.id]>0),total=selected.reduce((s,c)=>s+c.price*quantities[c.id],0),people=selected.reduce((s,c)=>s+c.people*quantities[c.id],0);
 const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail);
 const validTickets=buyerStep?Boolean(hold&&hold.status==='pending'&&remaining>0):people>0&&people<=event.maxPeople&&selected.every(c=>c.state==='available'&&quantities[c.id]<=c.available)&&event.saleState==='Tersedia';
 const valid=validTickets&&form.buyerName.trim().length>=2&&validEmail&&/^[+\d\s()-]+$/.test(form.phone)&&form.phone.replace(/\D/g,'').length>=8&&['male','female'].includes(form.gender)&&paymentChannels.some(c=>c.value===form.paymentChannel)&&form.accepted;
 const pricing=hold?.pricing??priceBreakdown(total,event.taxPercent??10,event.servicePercent??3);
 const selectionQuery='?selection='+encodeURIComponent(JSON.stringify(quantities));
 const ticketHref='/events/'+event.slug+'/tickets'+selectionQuery;

 useEffect(()=>{key.current='';},[quantities,form]);
 function change(id:string,delta:number){setQuantities(q=>({...q,[id]:Math.max(0,(q[id]||0)+delta)}));setError('');}
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy||!enabled||!(buyerStep?valid:validTickets))return;
  setBusy(true);setError('');
  const storageKey='tinitix-hold:'+event.id+':'+JSON.stringify(quantities);
  try{
   if(!buyerStep){
    if(!key.current){try{key.current=sessionStorage.getItem(storageKey)||crypto.randomUUID();sessionStorage.setItem(storageKey,key.current);}catch{key.current=crypto.randomUUID();}}
    const result=await api<{id:string}>('orders/reserve',{eventId:event.id,items:selected.map(c=>({categoryId:c.id,quantity:quantities[c.id],price:c.price}))},{'Idempotency-Key':key.current});
    try{sessionStorage.setItem('tinitix-active-hold:'+event.id,result.id);}catch{}
    router.push('/events/'+event.slug+'/buyer?order='+encodeURIComponent(result.id));
   }else{
    const result=await api<{id:string}>('orders/'+orderId+'/buyer',form);router.push('/orders/'+result.id);
   }
  }catch(e){
   const err=e as Error&{code?:string};setError(err.message);
   if(err.code==='HOLD_EXPIRED'){key.current='';try{sessionStorage.removeItem(storageKey);}catch{}if(buyerStep)setHold(h=>h?{...h,status:'expired'}:h);}
   if(!buyerStep&&(err.code==='STOCK_CHANGED'||err.code==='PRICE_CHANGED')){try{setEvent(await api<PublicEvent>('events/'+event.slug));setReview(true);key.current='';sessionStorage.removeItem(storageKey);}catch{}}
   setBusy(false);
  }
 }

 const update=(name:string,value:string|boolean)=>setForm(f=>({...f,[name]:value}));
 return <div className="container checkout-page"><Link className="back-link" href={buyerStep?ticketHref:'/events/'+event.slug}><ArrowLeft size={17}/> {buyerStep?'Kembali pilih tiket':'Kembali ke event'}</Link><div className="checkout-heading"><div><span className="eyebrow">ONE STEP CLOSER TO THE GOOD TIMES</span><h1>{buyerStep?'Data pembeli':'Pilih tiketmu'}<span className="blue-text">.</span></h1></div><div className="checkout-steps"><span className={!buyerStep?'active':''}><b>1</b> Pilih tiket</span><ChevronRight size={16}/><span className={buyerStep?'active':''}><b>2</b> Data pembeli</span><ChevronRight size={16}/><span><b>3</b> Pembayaran</span><ChevronRight size={16}/><span><b>4</b> E-ticket</span></div></div>
 {!buyerStep&&resumeId&&<div className="notice">Kamu masih punya tiket yang ditahan. <Link href={'/events/'+event.slug+'/buyer?order='+encodeURIComponent(resumeId)}>Lanjutkan isi data pembeli</Link>.</div>}
 {buyerStep&&<div className="reservation-timer" role="timer" aria-label="Sisa waktu reservasi"><ShieldCheck size={16}/><span>{holdLoading?'Memuat reservasi...':!hold?'Reservasi tidak tersedia':remaining<=0||hold.status!=='pending'?'Reservasi berakhir':'Tiket ditahan untukmu'}</span>{hold&&hold.status==='pending'&&remaining>0&&<strong>{String(Math.floor(remaining/60000)).padStart(2,'0')}:{String(Math.floor((remaining%60000)/1000)).padStart(2,'0')}</strong>}</div>}
 {!enabled&&<div className="notice"><Info size={20}/><span><strong>Checkout belum diaktifkan.</strong> Kamu tetap dapat mencoba pemilihan tiket. Transaksi menunggu konfigurasi database dan provider pembayaran.</span></div>}
 <form onSubmit={submit} className="checkout-grid"><div>{!buyerStep?<section className="form-panel"><div className="panel-heading"><h2>Kategori tiket</h2><span>Maks. {event.maxPeople} orang / pesanan</span></div><div className="category-list">{event.categories.map(c=>{const disabled=c.state!=='available'||event.saleState!=='Tersedia';return <div className={'category-row '+(disabled?'unavailable':'')} key={c.id}><div className="category-icon"><Ticket size={22}/></div><div className="category-content"><div className="category-name"><h3>{c.name}</h3><span className={'status-dot '+c.state}>{({available:'Tersedia',soon:'Segera dijual',soldout:'Habis',ended:'Penjualan berakhir'})[c.state]}</span></div><p>{c.people===2?'1 paket untuk 2 orang · 2 QR berbeda':'1 tiket untuk 1 orang'}</p><small>{shortDate(c.starts,event.timezone)} — {shortDate(c.ends,event.timezone)}</small><strong>{rupiah(c.price)} <span>/ {c.people===2?'paket':'tiket'}</span></strong></div><div className="quantity-control"><button type="button" disabled={!quantities[c.id]||busy} onClick={()=>change(c.id,-1)} aria-label={'Kurangi '+c.name}><Minus size={16}/></button><output aria-label={'Jumlah '+c.name}>{quantities[c.id]||0}</output><button type="button" disabled={disabled||busy||people+c.people>event.maxPeople||(quantities[c.id]||0)>=c.available} onClick={()=>change(c.id,1)} aria-label={'Tambah '+c.name}><Plus size={16}/></button></div></div>;})}</div><p className="form-footnote"><Info size={15}/> Tiket couple dapat dipakai oleh dua orang yang datang terpisah.</p></section>:<section className="form-panel buyer-form"><div className="panel-heading"><h2>Data pembeli</h2><span>Tidak perlu membuat akun</span></div><p>E-ticket dikirim ke email ini. Periksa kembali alamat email sebelum melanjutkan.</p><div className="field-grid">
 <label className="field wide">Nama lengkap (sesuai KTP/SIM)<input required autoComplete="name" minLength={2} maxLength={100} placeholder="Nama sesuai KTP atau SIM" value={form.buyerName} onChange={e=>update('buyerName',e.target.value)}/></label>
 <label className="field">Alamat email<input type="email" required autoComplete="email" maxLength={254} placeholder="nama@email.com" value={form.buyerEmail} onChange={e=>update('buyerEmail',e.target.value)} onBlur={()=>setTouched(t=>({...t,email:true}))}/>{touched.email&&!validEmail&&<small className="field-error">Masukkan alamat email yang valid.</small>}</label>
 <label className="field">Nomor telepon<input type="tel" required autoComplete="tel" maxLength={25} placeholder="08 atau +62" value={form.phone} onChange={e=>update('phone',e.target.value)}/></label>
 <label className="field wide">Jenis kelamin<select required value={form.gender} onChange={e=>update('gender',e.target.value)}><option value="" disabled>Pilih jenis kelamin</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
 </div><h2>Kanal pembayaran</h2><p className="muted">Pilih metode untuk simulasi pembayaran. Tidak ada uang yang ditagihkan.</p><div className="payment-channel-options">{paymentChannels.map(c=><label className={'payment-channel-option '+(form.paymentChannel===c.value?'selected':'')} key={c.value}><input type="radio" name="paymentChannel" required value={c.value} checked={form.paymentChannel===c.value} onChange={()=>update('paymentChannel',c.value)}/><span>{c.label}<small>Simulasi</small></span></label>)}</div>
 {!validTickets&&<div className="notice">{holdLoading?'Memuat reservasi.':!hold?'Mulai dengan memilih tiket dan klik Checkout.':'Reservasi berakhir. Tiket yang belum dibayar tersedia kembali.'} <Link href={ticketHref}>Kembali pilih tiket</Link>.</div>}</section>}</div>
 <aside><div className="order-summary"><h2>Ringkasan pesanan</h2><div className="summary-event"><img src={event.poster} alt="" width="82" height="74"/><div><h3>{event.name}</h3><p>{dateLabel(event.starts,event.timezone)}</p><small>{event.venue}, {event.city}</small></div></div><div className="summary-items">{selected.length?selected.map(c=><div key={c.id}><span>{c.name}<small>{quantities[c.id]} {c.people===2?'paket':'tiket'} × {rupiah(c.price)}</small></span><strong>{rupiah(c.price*quantities[c.id])}</strong></div>):<p className="muted">Belum ada tiket dipilih.</p>}</div><div className="summary-people"><Ticket size={17}/>{people} orang · {selected.reduce((s,c)=>s+quantities[c.id],0)} unit pembelian</div><div className="cost-row"><span>Subtotal tiket</span><span>{rupiah(pricing.subtotal)}</span></div><div className="cost-row"><span>Pajak ({pricing.taxPercent}%)</span><span>{rupiah(pricing.taxAmount)}</span></div><div className="cost-row"><span>Biaya layanan ({pricing.servicePercent}%)</span><span>{rupiah(pricing.serviceAmount)}</span></div><div className="summary-total" aria-live="polite"><span>Total pembayaran</span><strong>{rupiah(pricing.total)}</strong></div>{form.buyerEmail&&<div className="email-confirm"><Mail size={16}/><span>Tiket dikirim ke<br/><strong>{form.buyerEmail}</strong></span></div>}{buyerStep&&<label className="checkbox-field"><input type="checkbox" required checked={form.accepted} onChange={e=>update('accepted',e.target.checked)}/><span>Saya telah memeriksa email dan menyetujui <Link href={'/events/'+event.slug} target="_blank">syarat event</Link> serta <Link href="/privacy" target="_blank">kebijakan privasi</Link>.</span></label>}{error&&<div className="error-message" role="alert">{error}</div>}{review&&<div className="notice compact"><span>Ringkasan telah diperbarui. Periksa harga dan jumlah tiket.</span><button type="button" className="text-button" onClick={()=>{setReview(false);setError('');}}>Sudah saya periksa <Check size={16}/></button></div>}<button className="button full" type="submit" disabled={busy||review||!enabled||(buyerStep?!valid:!validTickets)}>{busy?'Memproses...':buyerStep?'Lanjut ke pembayaran':'Checkout'} <ArrowRight size={18}/></button><p className="secure-note"><ShieldCheck size={16}/> {buyerStep?'Selesaikan data dan pembayaran sebelum timer habis.':'Stok ditahan 15 menit setelah klik Checkout.'}</p></div></aside></form></div>;
}
