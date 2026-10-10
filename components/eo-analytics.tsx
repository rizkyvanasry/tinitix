'use client';
import {useState} from 'react';
import {Users,Globe} from 'lucide-react';
import type {EoLiveData} from '@/lib/eo-live';
import '@/app/organizer/analytics.css';
export function EoAnalytics({data}:{data:EoLiveData}){
 const [tab,setTab]=useState<'buyer'|'traffic'>('buyer');
 const genders=[{name:'Male',count:data.buyers.male,color:'#173b80'},{name:'Female',count:data.buyers.female,color:'#7097ce'},{name:'Not specified',count:data.buyers.unknown,color:'#dce2eb'}];
 const percent=(n:number)=>data.buyers.total?(n/data.buyers.total*100).toLocaleString('id-ID',{maximumFractionDigits:1}):'0';
 const most=[...genders].sort((a,b)=>b.count-a.count)[0];
 return <div className="eo-analytics"><div className="an-toolbar"><div className="an-switch" aria-label="Jenis analytics"><button aria-pressed={tab==='buyer'} onClick={()=>setTab('buyer')}><Users size={17}/> Buyer</button><button aria-pressed={tab==='traffic'} onClick={()=>setTab('traffic')}><Globe size={17}/> Web Traffic</button></div><span className="an-demo">Pembeli dari pembayaran berhasil</span></div>
 {tab==='buyer'?<>
  <section className="an-intro"><div><span className="an-eyebrow">AUDIENCE INSIGHTS</span><h2>Kenali orang di balik tiketmu.</h2><p>Pembeli unik berdasarkan email pada pesanan dibayar. Pembelian berulang dihitung satu pembeli.</p></div><div className="an-total"><strong>{data.buyers.total}</strong><span>Unique buyers</span></div></section>
  <div className="an-highlights"><div><span>Pesanan dibayar</span><strong>{data.paidOrders}</strong><p>{data.paidPeople} tiket / orang</p></div><div><span>Gender terbanyak</span><strong>{data.buyers.total?most.name:'—'}</strong><p>{most.count} pembeli · {percent(most.count)}% dari total</p></div><div><span>Gender terisi</span><strong>{percent(data.buyers.total-data.buyers.unknown)}<small>%</small></strong><p>{data.buyers.total-data.buyers.unknown} dari {data.buyers.total} pembeli</p></div></div>
  <section className="an-gender-panel"><header><div><span className="an-eyebrow">BUYER GENDER</span><h2>Komposisi gender</h2></div><p>Persentase dari {data.buyers.total} pembeli unik</p></header><div className="an-gender-strip" role="img" aria-label={genders.map(g=>`${g.name}: ${g.count}`).join(', ')}>{genders.map(g=><span key={g.name} style={{width:(data.buyers.total?g.count/data.buyers.total*100:0)+'%',background:g.color}}/>)}</div><div className="an-gender-grid">{genders.map(g=><div key={g.name}><span><i style={{background:g.color}}/>{g.name}</span><strong>{g.count}<small>{percent(g.count)}%</small></strong></div>)}</div><p className="an-footnote">Gender mengikuti data checkout terakhir pada pesanan dibayar. Not specified berarti data belum diisi.</p></section>
  <section className="an-age-panel"><span className="an-eyebrow">AGE DISTRIBUTION</span><h2>Usia pembeli</h2><p>Tanggal lahir belum dikumpulkan pada checkout. Distribusi usia belum tersedia.</p></section>
 </>:<section className="an-age-panel"><span className="an-eyebrow">WEB TRAFFIC</span><h2>Pelacakan kunjungan belum tersedia</h2><p>Aplikasi belum mencatat sesi, sumber kunjungan, atau perangkat pengunjung. Data transaksi dan pembeli tetap diperbarui otomatis pada tab Buyer.</p></section>}
 </div>;
}