export type ReadinessCheck={name:string;level:'ok'|'warn'|'error';message:string};
type Environment=Record<string,string|undefined>;

/** Inspect presence and shape only. Never include environment values in diagnostics. */
export function checkConfiguration(env:Environment,production=false):ReadinessCheck[]{
 const checks:ReadinessCheck[]=[];
 const add=(name:string,level:ReadinessCheck['level'],message:string)=>checks.push({name,level,message});
 const live=production||env.VERCEL_ENV==='production'||(env.NODE_ENV==='production'&&env.VERCEL_ENV!=='preview');
 try{
  const url=new URL(env.DATABASE_URL||'');
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.pathname.length<2)throw new Error();
  add('DATABASE_URL','ok','URL PostgreSQL tersedia. Koneksi diperiksa terpisah.');
 }catch{add('DATABASE_URL','error','Isi URL PostgreSQL beserta nama database di .env.local.');}
 add('APP_SECRET',(env.APP_SECRET?.trim().length||0)>=32?'ok':'error',(env.APP_SECRET?.trim().length||0)>=32?'Secret tersedia. Pertahankan nilainya untuk tiket dan email lama.':'Gunakan secret acak minimal 32 karakter.');
 try{
  const url=new URL(env.APP_URL||'');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error();
  if(live&&(url.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error();
  add('APP_URL','ok','Origin aplikasi valid.');
 }catch{add('APP_URL','error','Isi origin aplikasi tanpa path/query; produksi membutuhkan HTTPS dan host publik.');}
 if(env.PAYMENT_PROVIDER==='simulation'&&!live)add('Pembayaran','ok','Simulasi lokal/preview saja. Tidak menerima uang nyata.');
 else add('Pembayaran','error',live?'Pembayaran produksi belum tersedia. Integrasi gateway ditunda.':'Gunakan PAYMENT_PROVIDER=simulation untuk pengujian lokal.');
 const mailReady=Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM);
 add('Email',mailReady?'ok':live?'error':'warn',mailReady?'Konfigurasi tersedia; domain pengirim dan pengiriman nyata belum diverifikasi.':'RESEND_API_KEY dan EMAIL_FROM belum lengkap. Email hanya masuk antrean.');
 const cronReady=(env.CRON_SECRET?.trim().length||0)>=32;
 add('Maintenance',cronReady?'ok':live?'error':'warn',cronReady?'Secret maintenance tersedia.':'Isi CRON_SECRET acak minimal 32 karakter untuk endpoint maintenance.');
 add('Poster',env.BLOB_READ_WRITE_TOKEN?'ok':'warn',env.BLOB_READ_WRITE_TOKEN?'Konfigurasi penyimpanan poster tersedia.':'Upload poster membutuhkan BLOB_READ_WRITE_TOKEN. Poster lokal tetap tersedia.');
 return checks;
}
