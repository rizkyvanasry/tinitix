import {test,expect} from '@playwright/test';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {hash} from '../../lib/security';
import {seedEvents} from '../../lib/seed';

async function createEvent(request:any,baseURL:string){
 const login=await request.post('/api/auth/login',{headers:{origin:baseURL},data:{email:'admin@example.test',password:'Browser-test-password-123'}});expect(login.ok()).toBeTruthy();
 const seed=seedEvents()[0],starts=new Date(Date.now()+86400000).toISOString(),ends=new Date(Date.now()+172800000).toISOString();
 const result=await request.post('/api/admin/events',{headers:{origin:baseURL},data:{...seed,id:undefined,slug:'perf-'+randomUUID(),name:'Performance regression event',status:'published',starts,ends,categories:seed.categories.map(c=>({...c,quota:10,starts:new Date(Date.now()-86400000).toISOString(),ends}))}});
 expect(result.ok()).toBeTruthy();return result.json();
}
test('live endpoint enforces verified tenant access and polling preserves last data on failure',async({page,browser,baseURL})=>{
 const event=await createEvent(page.request,baseURL!);
 const outsider=await browser.newContext({baseURL});expect((await outsider.request.get('/api/admin/live?eventId='+event.id)).status()).toBe(403);
 const db=new Pool({connectionString:process.env.DATABASE_URL,max:1});const id='outsider-'+randomUUID(),token=randomUUID();
 try{
  await db.query('INSERT INTO organizations(id,name) VALUES($1,$1)',[id]);
  await db.query('INSERT INTO users(id,email,name,password_hash,verified) VALUES($1,$2,$1,$1,true)',[id,id+'@example.test']);
  await db.query("INSERT INTO memberships VALUES($1,$1,'admin')",[id]);
  await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[hash(token),id]);
  await outsider.addCookies([{name:'tinitix_session',value:token,url:baseURL!}]);
  expect((await outsider.request.get('/api/admin/live?eventId='+event.id)).status()).toBe(404);
  await db.query('UPDATE users SET verified=false WHERE id=$1',[id]);
  expect((await outsider.request.get('/api/admin/live?eventId='+event.id)).status()).toBe(403);
 }finally{await db.end();await outsider.close();}
 let calls=0,active=0,maxActive=0;
 await page.route('**/api/admin/live?**',async route=>{
  calls++;active++;maxActive=Math.max(maxActive,active);
  if(calls===2){await route.fulfill({status:503,json:{error:'Gangguan uji'}});}
  else{const response=await route.fetch();if(calls===1)await new Promise(r=>setTimeout(r,3500));await route.fulfill({response});}
  active--;
 });
 await page.goto('/organizer/events/'+event.id);
 await expect.poll(()=>calls).toBe(1);
 await page.evaluate(()=>{for(let i=0;i<8;i++)window.dispatchEvent(new Event('online'));});
 await expect(page.locator('time[datetime]')).toBeVisible({timeout:15000});
 const last=await page.locator('time[datetime]').getAttribute('datetime');
 await expect(page.getByRole('status')).toContainText('Gangguan uji',{timeout:20000});
 expect(await page.locator('time[datetime]').getAttribute('datetime')).toBe(last);
 await page.waitForTimeout(1500);expect(calls).toBe(2);
 await expect(page.getByRole('status')).not.toContainText('Gangguan uji',{timeout:12000});expect(maxActive).toBe(1);
});

test('lost reservation response survives reload; payment retries do not duplicate orders or tickets',async({page,browser,baseURL})=>{
 const event=await createEvent(page.request,baseURL!);
 const guest=await browser.newContext({baseURL}),buyer=await guest.newPage();let lost=true,createdId='';
 await buyer.route('**/api/orders/reserve',async route=>{if(lost){lost=false;const response=await route.fetch();createdId=(await response.json()).id;await route.abort('failed');}else await route.continue();});
 await buyer.goto('/events/'+event.slug+'/tickets');
 await buyer.getByRole('button',{name:'Tambah '+event.categories[0].name,exact:true}).click();
 await buyer.getByRole('button',{name:'Checkout',exact:true}).click();await expect(buyer.locator('.error-message[role=alert]')).toContainText('Status transaksi');
 await buyer.reload();await expect(buyer.locator('.error-message[role=alert]')).toContainText('Reservasi sebelumnya');
 await buyer.getByRole('button',{name:'Checkout',exact:true}).click();await expect(buyer).toHaveURL(new RegExp('order='+createdId));
 await buyer.getByLabel('Nama lengkap').fill('Retry Buyer');await buyer.getByLabel('Alamat email').fill('retry@example.test');await buyer.getByLabel('Nomor telepon').fill('081234567890');await buyer.getByLabel('Jenis kelamin').selectOption('female');await buyer.getByRole('radio',{name:/QRIS/}).check();await buyer.getByRole('checkbox').check();
 await buyer.getByRole('button',{name:'Lanjut ke pembayaran',exact:true}).click();await expect(buyer).toHaveURL(new RegExp('/orders/'+createdId));
 const replies=await Promise.all(Array.from({length:6},()=>guest.request.post('/api/orders/'+createdId+'/simulate',{headers:{origin:baseURL!},data:{status:'paid'}})));
 for(const reply of replies){expect(reply.ok()).toBeTruthy();expect((await reply.json()).status).toBe('paid');}
 await buyer.reload();await expect(buyer.locator('.issued-ticket')).toHaveCount(event.categories[0].people);
 const db=new Pool({connectionString:process.env.DATABASE_URL,max:1});try{
  expect((await db.query('SELECT count(*)::int n FROM orders WHERE event_id=$1',[event.id])).rows[0].n).toBe(1);
  expect((await db.query('SELECT count(*)::int n FROM tickets WHERE event_id=$1',[event.id])).rows[0].n).toBe(event.categories[0].people);
 }finally{await db.end();await guest.close();}
});
