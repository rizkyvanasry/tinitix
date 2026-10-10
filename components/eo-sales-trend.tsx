'use client';
import {useState} from 'react';
import {CalendarDays,Download,Ticket,TrendingUp,Wallet} from 'lucide-react';
import {rupiah} from '@/lib/format';
import '@/app/organizer/sales-trend.css';

import type {EoLiveData} from '@/lib/eo-live';
const date=(value:string)=>new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
export function EoSalesTrend({data}:{data:EoLiveData}){
 const rows=data.daily;
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const [metric,setMetric]=useState<'gross'|'units'>('gross'),[selected,setSelected]=useState<string|null>(null);
 const invalid=!!from&&!!to&&from>to;
 const filtered=invalid?[]:rows.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to));
 const gross=filtered.reduce((sum,r)=>sum+r.gross,0),units=filtered.reduce((sum,r)=>sum+r.units,0);
 const peak=filtered.reduce<typeof rows[number]|null>((best,r)=>!best||r.gross>best.gross?r:best,null);
 const active=filtered.find(r=>r.date===selected)??filtered[filtered.length-1];
 const max=Math.max(1,...filtered.map(r=>r[metric]));
 const ceiling=metric==='gross'?Math.max(500000,Math.ceil(max/500000)*500000):Math.max(5,Math.ceil(max/5)*5);
 const x=(i:number)=>76+(filtered.length===1?390:i*780/(filtered.length-1));
 const y=(v:number)=>270-v/ceiling*220;
 const points=filtered.map((r,i)=>`${x(i)},${y(r[metric])}`).join(' ');
 function download(){const csv=['Date,Units Sold,Gross Sales IDR',...filtered.map(r=>`${r.date},${r.units},${r.gross}`)].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='tinitix-sales-trend.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="sales-trend">
  <div className="st-toolbar"><div><span className="st-demo">TRANSAKSI BERHASIL</span><p>Tanggal pembayaran · {data.timezone}</p></div><div className="st-date-range"><CalendarDays size={19}/><label><span>Dari</span><input type="date" aria-label="Tanggal mulai" value={from} onChange={e=>{setFrom(e.target.value);setSelected(null);}}/></label><span>—</span><label><span>Sampai</span><input type="date" aria-label="Tanggal akhir" value={to} onChange={e=>{setTo(e.target.value);setSelected(null);}}/></label><button onClick={()=>{setFrom('');setTo('');setSelected(null);}}>Reset</button></div></div>
  {data.undatedRevenue>0&&<p className="st-error">Ada {rupiah(data.undatedRevenue)} pembayaran tanpa tanggal pembayaran tercatat; tidak dimasukkan dalam grafik harian.</p>}
  {invalid&&<p className="st-error" role="alert">Tanggal akhir harus sama atau setelah tanggal mulai.</p>}
  <div className="st-kpis"><article className="st-kpi-primary"><Wallet size={22}/><span>Gross sales</span><strong>{rupiah(gross)}</strong><small>Total penjualan pada periode terpilih</small></article><article><Ticket size={22}/><span>Units sold</span><strong>{units}<small> unit</small></strong><small>{filtered.length} hari dalam periode</small></article><article><TrendingUp size={22}/><span>Penjualan tertinggi</span><strong>{peak&&peak.gross>0?date(peak.date):'—'}</strong><small>{peak&&peak.gross>0?rupiah(peak.gross):'Belum ada penjualan pada periode ini'}</small></article></div>
  <section className="st-chart-panel"><header><div><span className="st-eyebrow">SALES PERFORMANCE</span><h2>Pergerakan penjualan</h2></div><div className="st-metric-toggle" aria-label="Metrik grafik"><button aria-pressed={metric==='gross'} onClick={()=>setMetric('gross')}>Gross sales</button><button aria-pressed={metric==='units'} onClick={()=>setMetric('units')}>Units sold</button></div></header>
   <div className="st-chart-detail" aria-live="polite"><span>{active?date(active.date):'Tidak ada data'}</span><strong>{active?(metric==='gross'?rupiah(active.gross):active.units+' unit'):'—'}</strong><small>{metric==='gross'?'Gross sales (IDR)':'Jumlah unit tiket'}</small></div>
   {filtered.length?<div className="st-chart-scroll"><svg className="st-chart" viewBox="0 0 900 325" role="group" aria-label={'Grafik '+(metric==='gross'?'gross sales dalam rupiah':'unit tiket terjual')+'. Pilih titik untuk melihat nilai harian.'}>
    {[0,1,2,3,4].map(i=>{const value=ceiling*i/4;return <g key={i}><line x1="76" x2="856" y1={y(value)} y2={y(value)} stroke="#e9edf4" strokeDasharray={i?'4 5':undefined}/><text x="60" y={y(value)+4} textAnchor="end" className="st-axis">{metric==='gross'?(value/1000000).toLocaleString('id-ID')+' jt':value.toLocaleString('id-ID')}</text></g>;})}
    {metric==='gross'?<><polygon points={`${x(0)},270 ${points} ${x(filtered.length-1)},270`} fill="#173b80" opacity=".07"/><polyline points={points} fill="none" stroke="#173b80" strokeWidth="3" strokeLinejoin="round"/></>:filtered.map((r,i)=><rect key={r.date} x={x(i)-16} y={y(r.units)} width="32" height={270-y(r.units)} rx="5" fill="#587bbb"/>)}
    {filtered.map((r,i)=><g key={r.date}><text x={x(i)} y="301" textAnchor="middle" className="st-axis">{r.date.slice(5)}</text><circle cx={x(i)} cy={y(r[metric])} r={active?.date===r.date?7:5} fill={active?.date===r.date?'#173b80':'white'} stroke="#173b80" strokeWidth="2"/><circle className="st-chart-hit" cx={x(i)} cy={y(r[metric])} r="18" fill="transparent" role="button" tabIndex={0} aria-label={`${date(r.date)}: ${r.units} unit, ${rupiah(r.gross)}`} onMouseEnter={()=>setSelected(r.date)} onFocus={()=>setSelected(r.date)} onClick={()=>setSelected(r.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(r.date);}}}><title>{date(r.date)}: {r.units} unit · {rupiah(r.gross)}</title></circle></g>)}
   </svg></div>:<div className="st-empty">Belum ada pembayaran berhasil pada periode ini.</div>}
   <footer><span className="st-chart-key"/>{metric==='gross'?'Gross sales':'Units sold'}<span>Zona waktu {data.timezone} · Pilih titik untuk detail</span></footer>
  </section>
  <section className="st-daily"><header><div><h2>Rincian harian</h2><p>{filtered.length} hari · Data yang sama dengan grafik di atas</p></div><button onClick={download} disabled={!filtered.length}><Download size={17}/> Export CSV</button></header><div className="st-table-scroll"><table><thead><tr><th>Tanggal</th><th>Units sold</th><th>Gross sales (IDR)</th><th>Kontribusi penjualan</th></tr></thead><tbody>{filtered.map(r=><tr key={r.date}><td>{date(r.date)}</td><td>{r.units}</td><td>{rupiah(r.gross)}</td><td><div className="st-share"><progress value={r.gross} max={gross||1} aria-label={'Kontribusi '+date(r.date)}/><span>{gross?(r.gross/gross*100).toFixed(1):'0.0'}%</span></div></td></tr>)}{!filtered.length&&<tr><td colSpan={4}>Tidak ada data pada periode terpilih.</td></tr>}</tbody><tfoot><tr><th>Total</th><td>{units}</td><td>{rupiah(gross)}</td><td>{gross?'100%':'0%'}</td></tr></tfoot></table></div></section>
 </div>;
}
