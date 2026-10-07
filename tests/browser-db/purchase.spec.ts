import {test,expect} from '@playwright/test';
import {ticketToken} from '../../lib/orders';
import ExcelJS from 'exceljs';

test('admin publishes, guest buys couple, email link opens tickets, and check-in rejects reuse',async({page,browser,baseURL})=>{
 expect((await page.request.post('/api/auth/login',{headers:{Origin:'https://untrusted.example'},data:{email:'admin@example.test',password:'Browser-test-password-123'}})).status()).toBe(403);
 await page.goto('/login');
 await page.getByLabel('Alamat email',{exact:true}).fill('admin@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Browser-test-password-123');
 await page.getByRole('button',{name:'Masuk',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Semua dalam kendali.'})).toBeVisible();
 await page.getByRole('button',{name:'Buat event',exact:true}).click();
 const editor=page.getByRole('dialog');
 await editor.getByLabel('Nama event',{exact:true}).fill('Browser Couple Event');
 await editor.getByLabel('Slug URL').fill('browser-couple-event');
 await editor.getByLabel('Nama venue').fill('Test Venue');
 await editor.getByLabel('Alamat lengkap').fill('Jalan Test 123');
 await editor.getByLabel('Deskripsi').fill('Event khusus pengujian browser dengan database terisolasi.');
 await editor.getByLabel('Syarat event').fill('Tiket pengujian saja. Tidak berlaku untuk event atau pembayaran nyata.');
 for(let i=0;i<5;i++){
  await editor.getByLabel('Harga per unit (IDR)').nth(i).fill('100000');
  await editor.getByLabel('Kuota unit').nth(i).fill('10');
 }
 await editor.getByRole('combobox',{name:/^Status/}).selectOption('published');
 await editor.getByRole('button',{name:'Simpan event',exact:true}).click();
 await expect(editor).toBeHidden();

 const guest=await browser.newContext({baseURL}),buyer=await guest.newPage();
 await buyer.goto('/events/browser-couple-event/tickets');
 await buyer.getByRole('button',{name:'Tambah Presale 1 Couple Ticket',exact:true}).click();
 await buyer.getByLabel('Nama lengkap').fill('Couple Buyer');
 await buyer.getByLabel('Alamat email').fill('couple@example.test');
 await buyer.getByLabel('Konfirmasi email').fill('couple@example.test');
 await buyer.getByRole('checkbox').check();
 await buyer.getByRole('button',{name:'Checkout',exact:true}).click();
 await expect(buyer).toHaveURL(/\/orders\/TIX/);
 const orderId=buyer.url().split('/').pop()!;
 await buyer.getByRole('button',{name:'Simulasikan pembayaran sukses'}).click();
 await expect(buyer.locator('.issued-ticket')).toHaveCount(2);
 const ticketIds=await buyer.locator('.issued-ticket > small').allTextContents();
 expect(new Set(await buyer.locator('.issued-ticket img').evaluateAll(images=>images.map(i=>i.getAttribute('src')))).size).toBe(2);

 // Verify the queued email and its actual link, without sending test mail externally.
 const mail=await (await page.request.get('/api/admin/outbox')).json();
 const message=mail.find((m:any)=>m.payload.text.includes(orderId));
 expect(message).toBeTruthy();
 const link=message.payload.text.match(/http[^\s]+\/access#token=[^\s]+/)[0];
 const emailContext=await browser.newContext({baseURL}),emailPage=await emailContext.newPage();
 await emailPage.goto(link);await emailPage.getByRole('button',{name:'Buka pesanan',exact:true}).click();
 await expect(emailPage.locator('.issued-ticket')).toHaveCount(2);
 const outsider=await browser.newContext({baseURL});
 expect((await outsider.request.get('/api/orders/'+orderId)).status()).toBe(403);

 await page.getByRole('button',{name:'Pesanan',exact:true}).click();
 await page.getByLabel('Cari pesanan').fill(orderId);
 await expect(page.locator('tbody tr')).toHaveCount(1);
 const csv=await page.request.get('/api/admin/orders/export?q='+orderId);
 expect(csv.status()).toBe(200);expect(await csv.text()).toContain(orderId);
 await page.goto('/check-in');
 for(const id of ticketIds){
  await page.getByLabel('Atau masukkan kode dari QR').fill(ticketToken(id));
  await page.getByRole('button',{name:'Validasi tiket'}).click();
  await expect(page.getByRole('status')).toContainText('Tiket valid.');
 }
 await page.getByLabel('Atau masukkan kode dari QR').fill(ticketToken(ticketIds[0]));
 await page.getByRole('button',{name:'Validasi tiket'}).click();
 await expect(page.getByRole('status')).toContainText('Tiket sudah digunakan.');
 await page.goto('/admin');
 await page.getByRole('button',{name:'Laporan Excel',exact:true}).click();
 await expect(page.getByRole('button',{name:'Summary',exact:true})).toBeVisible();
 const eventId=await page.getByLabel('Event laporan').inputValue();
 expect((await outsider.request.get('/api/admin/reports/export?eventId='+eventId)).status()).toBe(403);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Unduh Excel',exact:true}).click()]);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile((await download.path())!);
 expect(workbook.worksheets.map(s=>s.name)).toEqual(['Summary','Sold By Type','Sold By Date','Sold By Payment Channel','Orders','Tickets']);
 expect(workbook.getWorksheet('Orders')!.getCell('A2').value).toBe(orderId);
 expect(workbook.getWorksheet('Tickets')!.rowCount).toBe(3);
 expect(workbook.getWorksheet('Tickets')!.getCell('AR2').value).toBe(1);
 expect(workbook.getWorksheet('Tickets')!.getCell('AR3').value).toBe(1);
 await guest.close();await emailContext.close();await outsider.close();
});
