'use client';
import {useState} from 'react';
import {CheckCircle2,ArrowRight,Download} from 'lucide-react';
import type {OrderView} from '@/lib/types';
import {rupiah,dateLabel,timeLabel} from '@/lib/format';
import {paymentChannelLabel} from '@/lib/payment-channels';
import './payment-success.css';
export function PaymentSuccess({order,simulation}:{order:OrderView;simulation:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const tickets=order.tickets.filter(t=>t.status!=='cancelled');
 async function download(){setBusy(true);setError('');try{
  if(!tickets.length)throw new Error('Tiket belum tersedia.');
  const link=document.createElement('a');let url:string|undefined;
  if(tickets.length===1){link.href=tickets[0].qr;link.download=`tinitix-${tickets[0].id}.png`;}
  else{const {default:JSZip}=await import('jszip');const zip=new JSZip();for(const t of tickets)zip.file(`tinitix-${t.id}.png`,t.qr.split(',')[1],{base64:true});url=URL.createObjectURL(await zip.generateAsync({type:'blob'}));link.href=url;link.download=`tinitix-${order.id}.zip`;}
  document.body.appendChild(link);link.click();link.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url!),60000);
 }catch(e){setError((e as Error).message||'Unduhan gagal. Coba unduh QR satu per satu.');}finally{setBusy(false);}}
 return <section className="payment-success" aria-labelledby="payment-success-title"><div className="payment-success-heading"><CheckCircle2 size={48} aria-hidden="true"/><div><h1 id="payment-success-title">Pembayaran Sukses</h1><p>{simulation?'Simulasi pembayaran berhasil. Tidak ada uang yang ditagihkan.':'Pembayaran terverifikasi. Sampai ketemu di acara!'}</p></div></div><div className="payment-success-body"><div className="payment-success-event"><img src={order.event.poster} width={140} height={110} alt=""/><div><span>DETAIL EVENT</span><h2>{order.event.name}</h2><p>{dateLabel(order.event.starts,order.event.timezone)} · {timeLabel(order.event.starts,order.event.timezone)}</p><p>{order.event.venue}, {order.event.city}</p>{order.event.address&&<p>{order.event.address}</p>}</div></div><dl><div><dt>Total pembayaran</dt><dd>{rupiah(order.total)}</dd></div><div><dt>Metode pembayaran{simulation?' (simulasi)':''}</dt><dd>{order.paymentChannel?paymentChannelLabel(order.paymentChannel):simulation?'Simulasi':'Tidak tercatat'}</dd></div><div><dt>Nomor pesanan</dt><dd>{order.id}</dd></div></dl></div>{tickets.length>0?<div className="payment-success-actions"><a className="button" href="#tiket-saya">Lihat Tiket <ArrowRight size={18}/></a><button className="button button-outline" disabled={busy} onClick={download}><Download size={18}/>{busy?'Menyiapkan unduhan...':'Download Tiket'}</button><p>{tickets.length>1?`${tickets.length} QR berbeda dalam satu ZIP. Setiap QR berlaku untuk satu orang.`:'Unduh QR tiket dalam format PNG.'}</p></div>:<p className="notice">Tiket belum tersedia. Hubungi dukungan dengan nomor pesanan ini.</p>}{error&&<p className="error-message" role="alert">{error}</p>}</section>;
}
