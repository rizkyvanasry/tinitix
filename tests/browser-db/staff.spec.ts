import {test,expect} from '@playwright/test';
import {Pool} from 'pg';
import {decrypt} from '../../lib/security';
import {seedEvents} from '../../lib/seed';

test('EO invites a new staff account, assigns events and revokes access without an operator',async({page,browser,baseURL})=>{
 const headers={Origin:baseURL!};
 expect((await page.request.post('/api/auth/login',{headers,data:{email:'admin@example.test',password:'Browser-test-password-123'}})).status()).toBe(200);
 const seed=seedEvents()[0],starts=new Date(Date.now()+86400000).toISOString();
 const created=await page.request.post('/api/admin/events',{headers,data:{...seed,id:undefined,slug:'staff-invitation-event',name:'Staff Invitation Event',starts,ends:new Date(Date.now()+172800000).toISOString(),categories:seed.categories.map(c=>({...c,starts:new Date(Date.now()-86400000).toISOString(),ends:starts}))}});
 expect(created.status()).toBe(200);const event=await created.json();
 await page.goto('/organizer/events/'+event.id+'?view=agents');
 await page.getByLabel('Email petugas',{exact:true}).fill('invited-agent@example.test');
 await page.getByRole('button',{name:'Kirim undangan',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('antrean email');
 const db=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 const staffContext=await browser.newContext({baseURL});
 try{
  const invitation=JSON.parse(decrypt((await db.query("SELECT payload FROM email_jobs WHERE recipient='invited-agent@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0].payload));
  const raw=invitation.text.match(/#token=([^\s]+)/)[1];
  await staffContext.request.post('/api/auth/register',{headers,data:{name:'Invited Agent',email:'invited-agent@example.test',password:'Invited-agent-password-123'}});
  const verify=JSON.parse(decrypt((await db.query("SELECT payload FROM email_jobs WHERE recipient='invited-agent@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0].payload));
  await staffContext.request.post('/api/auth/confirm',{headers,data:{token:verify.text.match(/#token=([^&\s]+)/)[1]}});
  await staffContext.request.post('/api/auth/login',{headers,data:{email:'invited-agent@example.test',password:'Invited-agent-password-123'}});
  const staffPage=await staffContext.newPage();await staffPage.goto('/staff/invitation#token='+raw);
  await staffPage.getByRole('button',{name:'Terima undangan'}).click();await expect(staffPage.getByRole('link',{name:'Buka check-in'})).toBeVisible();
  expect((await (await staffContext.request.get('/api/admin/staff-events')).json()).map((e:any)=>e.id)).toEqual([event.id]);
  expect((await staffContext.request.get('/api/admin/live?eventId='+event.id)).status()).toBe(403);
  expect((await staffContext.request.post('/api/staff/accept',{headers,data:{token:raw}})).status()).toBe(400);
  await page.reload();const member=page.locator('tr').filter({hasText:'Invited Agent'});
  await member.getByRole('button',{name:'Ubah event'}).click();
  await page.getByRole('checkbox',{name:'Staff Invitation Event',exact:true}).uncheck();
  await page.getByRole('button',{name:'Simpan penugasan'}).click();await expect(page.getByRole('status')).toContainText('disimpan');
  expect(await (await staffContext.request.get('/api/admin/staff-events')).json()).toEqual([]);
  await member.getByRole('button',{name:'Cabut akses',exact:true}).click();await member.getByRole('button',{name:'Ya, cabut akses'}).click();
  await expect(page.getByRole('status')).toContainText('dicabut');
  expect((await staffContext.request.get('/api/admin/staff-events')).status()).toBe(403);
  expect((await staffContext.request.post('/api/admin/check-ins',{headers,data:{eventId:event.id,token:'invalid-but-long-enough-token'}})).status()).toBe(403);
  expect((await (await staffContext.request.get('/api/auth/me')).json()).user.role).toBe('buyer');
 }finally{await staffContext.close();await db.end();}
});
