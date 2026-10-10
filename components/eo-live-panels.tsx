'use client';
import {useEffect,useState} from 'react';
import type {EoLiveData} from '@/lib/eo-live';
import {EoOverview} from './eo-overview';
import {EoSalesTrend} from './eo-sales-trend';
import {EoAnalytics} from './eo-analytics';

export function EoLivePanels({eventId,view,base}:{eventId:string;view:string;base:string}){
 const [data,setData]=useState<EoLiveData|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let stopped=false,timer:ReturnType<typeof setTimeout>,controller:AbortController|undefined,inFlight=false;
  setData(null);setError('');
  async function refresh(){
   if(stopped||inFlight)return;
   clearTimeout(timer);
   if(document.hidden){timer=setTimeout(refresh,3000);return;}
   inFlight=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),15000);
   try{const res=await fetch('/api/admin/live?eventId='+encodeURIComponent(eventId),{cache:'no-store',signal:controller.signal});const body=await res.json();if(!res.ok)throw new Error(body.error||'Gagal memuat dashboard.');if(!stopped){setData(body);setError('');}}
   catch(e){if(!stopped)setError((e as Error).name==='AbortError'?'Koneksi lambat. Mencoba kembali.':(e as Error).message);}
   finally{clearTimeout(timeout);inFlight=false;if(!stopped)timer=setTimeout(refresh,3000);}
  }
  void refresh();const wake=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  return()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);};
 },[eventId,retry]);
 return <><div className={error?'error-message':'notice compact'} role="status">{error?`${error} Data terakhir ditampilkan sampai koneksi pulih.`:data?`Pembaruan otomatis setiap 3 detik · Terakhir ${new Date(data.updatedAt).toLocaleTimeString('id-ID',{timeZone:data.timezone})}`:'Memuat transaksi dan stok...'}{error&&<button className="text-button" onClick={()=>setRetry(v=>v+1)}>Coba lagi</button>}</div>{data&&(view==='overview'?<EoOverview base={base} data={data}/>:view==='sales'?<EoSalesTrend data={data}/>:<EoAnalytics data={data}/>)}</>;
}
