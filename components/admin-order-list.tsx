'use client';
import {useEffect,useState} from 'react';
import {Download,Search} from 'lucide-react';
import {api} from '@/lib/client';
import {rupiah} from '@/lib/format';
type Order={id:string;buyer_name:string;buyer_email:string;status:string;people:number;total:number};
type Page={orders:Order[];total:number;page:number;pageSize:number};
export function AdminOrderList({preview,busy,onResend}:{preview:boolean;busy:boolean;onResend:(id:string)=>void}){
 const [search,setSearch]=useState(''),[page,setPage]=useState(1),[result,setResult]=useState<Page|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  if(preview)return;
  let cancelled=false;setResult(null);setError('');
  const timer=setTimeout(()=>{api<Page>('admin/orders?'+new URLSearchParams({q:search,page:String(page)})).then(value=>{if(!cancelled)setResult(value);}).catch(e=>{if(!cancelled)setError(e.message);});},250);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[preview,search,page]);
 const orders=result?.orders||[];
 return <>
  <div className="admin-actions"><label className="search-field"><Search size={18}/><input aria-label="Cari pesanan" maxLength={100} placeholder="Cari nomor, pembeli, email, atau status..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>{!preview&&<a className="button button-outline button-small" href={'/api/admin/orders/export?'+new URLSearchParams({q:search})}><Download size={16}/> {search?'Ekspor hasil':'Ekspor semua'} CSV</a>}</div>
  {error&&<div role="alert" className="error-message">{error}</div>}
  <div className="table-scroll" aria-busy={!preview&&!result&&!error}><table><thead><tr><th>Pesanan / Pembeli</th><th>Status</th><th>Orang</th><th>Total</th><th>Tindakan</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.buyer_name}</strong><small>{o.buyer_email}</small><small>{o.id}</small></td><td><span className="pill">{o.status}</span></td><td>{o.people}</td><td>{rupiah(o.total)}</td><td><button className="text-button" disabled={busy} onClick={()=>onResend(o.id)}>Kirim ulang email</button></td></tr>)}</tbody></table>{!orders.length&&<p className="table-empty">{!preview&&!result&&!error?'Memuat pesanan...':'Belum ada pesanan yang cocok.'}</p>}</div>
  {result&&<div className="admin-actions" aria-label="Halaman pesanan"><p role="status">{result.total?((page-1)*result.pageSize+1)+'–'+Math.min(page*result.pageSize,result.total):0} dari {result.total} pesanan</p><button className="button button-outline button-small" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Sebelumnya</button><button className="button button-outline button-small" disabled={page*result.pageSize>=result.total} onClick={()=>setPage(p=>p+1)}>Berikutnya</button></div>}
 </>;
}
