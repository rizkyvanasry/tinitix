import {test,expect} from '@playwright/test';
import {Pool} from 'pg';
import {decrypt} from '../../lib/security';
test('organizer registers, verifies email, logs in and owns an empty dashboard',async({page,baseURL})=>{
 await page.goto('/organizer/register');
 await page.getByLabel('Nama lengkap',{exact:true}).fill('Organizer Browser');
 await page.getByLabel('Alamat email',{exact:true}).fill('organizer-browser@example.test');
 await page.getByLabel('Password',{exact:false}).fill('Organizer-browser-password-123');
 await page.getByLabel('Nama organisasi',{exact:true}).fill('Browser Independent EO');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Daftar organizer',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('tautan verifikasi');
 const db=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 try{
  const mail=(await db.query("SELECT payload FROM email_jobs WHERE recipient='organizer-browser@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0];
  const token=JSON.parse(decrypt(mail.payload)).text.match(/#token=([^&\s]+)/)[1];
  await page.goto('/organizer/login');
  await page.getByLabel('Email',{exact:false}).first().fill('organizer-browser@example.test');
  await page.getByLabel('Password',{exact:false}).first().fill('Organizer-browser-password-123');
  await page.getByRole('button',{name:'Log In',exact:true}).click();
  await expect(page.locator('.error-message[role=alert]')).toContainText('Verifikasi email');
  expect((await page.request.get('/api/admin/events')).status()).toBe(403);
  expect((await page.request.post('/api/auth/confirm',{headers:{Origin:baseURL!},data:{token}})).status()).toBe(200);
  await page.getByRole('button',{name:'Log In',exact:true}).click();
  await expect(page).toHaveURL(/\/admin\?create=event/);
  await expect(page.getByRole('dialog')).toBeVisible();
  const overview=await (await page.request.get('/api/admin/events')).json();expect(overview.events).toEqual([]);
  const outbox=await (await page.request.get('/api/admin/outbox')).json();expect(outbox).toEqual([]);
 }finally{await db.end();}
});
