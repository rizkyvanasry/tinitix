import ExcelJS from 'exceljs';
import template from './report-template.json';
import {paymentChannelLabel} from './payment-channels';
import {transaction} from './db';
import {loadEvent} from './catalog';
import {AppError} from './security';
import type {User} from './types';

type Cell=string|number|null;
type Sheet={name:string;headers:string[];rows:Cell[][]};
const sheetNames=['Summary','Sold By Type','Sold By Date','Sold By Payment Channel','Orders','Tickets'] as const;
const notes='Data kosong berarti tidak dikumpulkan atau belum tersedia. Nilai pembayaran simulasi bukan pencairan uang nyata. Ringkasan penjualan hanya mencakup order paid; Orders mencakup semua status. Tanggal penjualan memakai waktu pembayaran dan zona waktu event. Quantity adalah jumlah tiket/orang; harga kategori adalah harga per paket. Nama lengkap ditempatkan di First Name tanpa menebak nama belakang.';
function localTime(value:Date|string,timezone:string){
 const date=new Date(value),parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));
 const offset=new Intl.DateTimeFormat('en',{timeZone:timezone,timeZoneName:'longOffset'}).formatToParts(date).find(v=>v.type==='timeZoneName')?.value.replace('GMT','')||'+00:00';
 return {created:`${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`,day:`${p.year}-${p.month}-${p.day}`,year:Number(p.year),month:Number(p.month),date:Number(p.day),time:`${p.hour}:${p.minute}:${p.second}`,offset,timestamp:date.getTime()};
}
function channel(order:Record<string,any>){return order.merchant==='tinitix-simulation'?'Simulation':order.payment_channel||'';}
const rowFrom=(name:'Orders'|'Tickets',values:Record<string,Cell>)=>template[name].map(key=>values[key]??null);

export async function eventReport(user:User,eventId:string){
 if(user.role!=='admin'||!user.verified)throw new AppError(403,'Akses laporan hanya untuk admin EO.');
 return transaction(async db=>{
  await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const event=await loadEvent(db,eventId);
  if(event.organizationId!==user.organizationId)throw new AppError(404,'Event tidak ditemukan.');
  const now=new Date();
  const orders=(await db.query(`SELECT o.id,o.buyer_name,o.buyer_email,o.phone,o.buyer_gender,o.requested_payment_channel,o.status,o.total,o.people,o.created_at,o.expires_at,
   p.created_at AS paid_at,p.data->>'merchant' AS merchant,p.data->>'channel' AS payment_channel
   FROM orders o LEFT JOIN LATERAL (SELECT data,created_at FROM payment_events WHERE order_id=o.id AND data->>'status'='paid' ORDER BY created_at,id LIMIT 1) p ON true
   WHERE o.event_id=$1 ORDER BY o.created_at,o.id`,[event.id])).rows;
  const items=(await db.query('SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.event_id=$1 ORDER BY i.id',[event.id])).rows;
  const tickets=(await db.query('SELECT t.id,t.order_id,t.order_item_id,t.name,t.category_name,t.status,t.ordinal,c.checked_at FROM tickets t LEFT JOIN check_ins c ON c.ticket_id=t.id WHERE t.event_id=$1 ORDER BY t.order_id,t.order_item_id,t.ordinal,t.id',[event.id])).rows;
  if(orders.length>1048575||tickets.length>1048575)throw new AppError(422,'Data melebihi batas baris Excel. Hubungi pengelola untuk ekspor terpisah.');
  const byOrder=new Map(orders.map(o=>[o.id,o])),byItem=new Map(items.map(i=>[i.id,i]));
  const status=(o:Record<string,any>)=>o.status==='pending'&&new Date(o.expires_at)<=now?'expired':o.status;
  const paid=orders.filter(o=>status(o)==='paid'),pending=orders.filter(o=>status(o)==='pending');
  const sum=(rows:Record<string,any>[],key:string)=>rows.reduce((n,r)=>n+Number(r[key]),0);
  const gross=sum(paid,'total'),allSimulated=paid.every(o=>channel(o)==='Simulation');
  const byDate=new Map<string,number[]>(),byChannel=new Map<string,number[]>();
  for(const o of paid){
   const date=o.paid_at?localTime(o.paid_at,event.timezone).day:'Tanggal pembayaran tidak tercatat';
   for(const [map,key] of [[byDate,date],[byChannel,channel(o)||'Tidak tercatat']] as const){const v=map.get(key)||[0,0,0];v[0]+=o.total;v[1]++;v[2]+=o.people;map.set(key,v);}
  }
  const summary:Record<string,Cell>={'Total Ticket':event.categories.reduce((n,c)=>n+c.quota*c.people,0),'Paid Ticket':sum(paid,'people'),'Pending Ticket':sum(pending,'people'),'Generated Ticket':0,'Total Issued Ticket':tickets.length,'Gross Ticket Sales':gross,'Total TM Fee':allSimulated?0:null,'TM Fee Pass On':allSimulated?0:null,'TM Fee Absorb':allSimulated?0:null,'Total Payment Gateway Fee':allSimulated?0:null,'Payment Gateway Fee Pass On':allSimulated?0:null,'Payment Gateway Fee Absorb':allSimulated?0:null,'Net Payout':allSimulated?gross:null,'Total amount of promotion code used':0,'Promotion Code per ticket':0,'Promotion Code per order':0,'Donation':0,'Installment Interest':0,'Shipping':0};
  const sheets:Sheet[]=sheetNames.map(name=>({name,headers:template[name].map(v=>v||''),rows:[]}));
  sheets[0].rows=template.summaryItems.map(key=>key==='Additional Features'?[key,'Order Qty.','Total Amount']:[key, key?summary[key]??null:null,null]);
  sheets[1].rows=event.categories.map(c=>{
   const relevant=items.filter(i=>i.category_id===c.id),total=(state:string)=>relevant.reduce((n,i)=>n+(status(byOrder.get(i.order_id)!)===state?i.quantity*i.people:0),0);
   const issued=tickets.filter(t=>byItem.get(t.order_item_id)?.category_id===c.id).length;
   return [c.name,c.price,c.quota*c.people,issued,total('paid'),total('pending'),0];
  });
  sheets[2].rows=[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([day,v])=>[day,null,null,...v]);
  sheets[3].rows=[...byChannel].sort(([a],[b])=>a.localeCompare(b)).map(([name,v])=>[name,...v]);
  const common=(o:Record<string,any>)=>{const d=localTime(o.created_at,event.timezone);return {'Full Order ID':o.id,'Order ID':o.id,'Order Created':d.created,'Order Date':d.day,'Year':d.year,'Month':d.month,'Day':d.date,'Time':d.time,'Event ID':event.id,'Event Name':event.name,'Event Timezone':event.timezone,'GMT':d.offset,'Event Currency':'IDR','Contact Email':o.buyer_email,'Latest Contact Email':o.buyer_email,'First Name':o.buyer_name,'Order Timestamp':d.timestamp,'Payment Channel':channel(o)};};
  sheets[4].rows=orders.map(o=>rowFrom('Orders',{...common(o),'Phone Number':o.phone,'Gender':o.buyer_gender==='male'?'Laki-laki':o.buyer_gender==='female'?'Perempuan':null,'Status':status(o),'Amount Discounted':0,'Total Of Order':o.total,'Total Fee':channel(o)==='Simulation'?0:null,'Net Payout Amount':o.status==='paid'&&channel(o)==='Simulation'?o.total:null,'Ticket Quantity':o.people,'Payment Timestamp':o.paid_at?localTime(o.paid_at,event.timezone).created:null,'Remark':channel(o)==='Simulation'?'Pembayaran simulasi'+(o.requested_payment_channel?' ? Pilihan: '+paymentChannelLabel(o.requested_payment_channel):''):o.status==='payment_review'?'Pembayaran perlu ditinjau; tiket belum diterbitkan':null}));
  sheets[5].rows=tickets.map(t=>{
   const o=byOrder.get(t.order_id)!,item=byItem.get(t.order_item_id)!;
   // Allocate package price across tickets in whole rupiah, preserving the exact order total.
   const amount=Math.floor(item.price/item.people)+(t.ordinal%item.people<item.price%item.people?1:0),sim=channel(o)==='Simulation';
   return rowFrom('Tickets',{...common(o),'Unique Ticket ID':t.id,'Entrant Code':t.id,'Buyer Phone No':o.phone,'Status':t.status==='cancelled'?'cancelled':o.status,'Ticket Type ID':item.category_id,'Ticket Type':t.category_name,'Ticket First Name':t.name,'Ticket price':amount,'Promo Discount':0,'Discounted Ticket Price':amount,'Ticket Fee Pass On':sim?0:null,'Ticket Fee Absorbed':sim?0:null,'Payment Gateway':sim?'Simulation':null,'Payment Gateway Fee':sim?0:null,'Total Of Ticket':amount,'Net Payout':sim?amount:null,'Number Of Scanned':t.checked_at?1:0,'Start date and time':localTime(event.starts,event.timezone).created,'Remark':sim?'Simulasi; nama tiket mengikuti nama pembeli':null});
  });
  return {event:{id:event.id,name:event.name,timezone:event.timezone},generatedAt:now.toISOString(),notes,sheets,counts:{orders:orders.length,tickets:tickets.length,paidOrders:paid.length,pendingOrders:pending.length,gross}};
 });
}
export type EventReport=Awaited<ReturnType<typeof eventReport>>;
export async function reportWorkbook(report:EventReport){
 const workbook=new ExcelJS.Workbook();workbook.creator='Tinitix';workbook.created=new Date(report.generatedAt);workbook.subject=report.event.name;workbook.description=report.notes;
 for(const table of report.sheets){
  const sheet=workbook.addWorksheet(table.name,{views:[{state:'frozen',ySplit:1}]});
  sheet.columns=table.headers.map(h=>({header:h,width:/ID|Email|Name|Remark|Timezone/.test(h)?30:22}));
  sheet.addRows(table.rows);
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1746FF'}};sheet.getRow(1).alignment={wrapText:true,vertical:'middle'};sheet.getRow(1).height=32;
  if(table.name!=='Summary')sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:table.headers.length}};
  sheet.getCell('A1').note=report.notes+' Dibuat: '+report.generatedAt;
  table.headers.forEach((h,i)=>{if(/Amount|Price|price|Payout|Fee|Tax|Discount/.test(h))sheet.getColumn(i+1).numFmt='#,##0.00;[Red](#,##0.00)';});
  if(table.name==='Summary'){sheet.getColumn(1).width=38;sheet.getColumn(2).numFmt='#,##0.00';sheet.getCell('B2').note='Kuota kategori × orang per paket. Kapasitas venue bersama tetap membatasi penjualan.';}
  if(table.name==='Sold By Date'){sheet.getCell('B1').note='Analitik page view belum dikumpulkan.';sheet.getCell('C1').note='Analitik pengunjung unik belum dikumpulkan.';}
  if(table.name==='Tickets')sheet.getCell('O1').note='ID laporan tiket, bukan token atau QR untuk check-in.';
 }
 return new Uint8Array(await workbook.xlsx.writeBuffer());
}
