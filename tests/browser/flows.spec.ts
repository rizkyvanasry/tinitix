import {test,expect} from '@playwright/test';
test('spotlight advances automatically and can be paused',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Jeda poster otomatis'})).toBeVisible();
 await page.clock.install();
 const active=page.locator('.spotlight-slide[aria-hidden="false"]');
 await expect(active).toContainText('Midnight Frequency');
 await page.clock.runFor(5200);
 await expect(active).toContainText('Soundscape Festival');
 await page.getByRole('button',{name:'Jeda poster otomatis'}).click();
 await page.getByRole('heading',{name:'Temukan event berikutnya.'}).click();
 await page.clock.runFor(6000);
 await expect(active).toContainText('Soundscape Festival');
 await page.locator('.organizer-promo').click();
 await expect(page.getByRole('heading',{name:'Dari tiket pertama sampai pintu venue.'})).toBeVisible();
});
test('catalog, search, responsive layout and detail',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Temukan event berikutnya.'})).toBeVisible();await expect(page.locator('.event-card')).toHaveCount(6);
 await expect(page.locator('.event-card img').first()).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/home-'+testInfo.project.name+'.png',fullPage:true});
 await page.getByLabel('Cari nama event atau lokasi').fill('HINDIA');await expect(page.locator('.event-card')).toHaveCount(1);
 await page.getByLabel('Cari nama event atau lokasi').fill('no such concert');await expect(page.getByText('Belum ketemu yang cocok?')).toBeVisible();await page.getByRole('button',{name:'Hapus filter',exact:true}).click();
 await page.getByRole('button',{name:'Konser',exact:true}).click();await expect(page.locator('.event-card')).toHaveCount(3);
 await page.getByRole('button',{name:'Party',exact:true}).click();await expect(page.getByRole('button',{name:'Konser',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Party',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.event-card')).toHaveCount(6);
 await page.getByRole('button',{name:'Konser',exact:true}).click();await expect(page.locator('.event-card')).toHaveCount(3);
 await page.getByRole('button',{name:'Semua Event'}).click();await page.getByLabel('Filter kota').selectOption('Jakarta');await expect(page.locator('.event-card')).toHaveCount(2);
 await page.locator('.event-card').first().click();await expect(page.getByRole('heading',{name:'Tentang event'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/detail-'+testInfo.project.name+'.png',fullPage:true});
 await page.getByRole('link',{name:'Beli Sekarang'}).filter({visible:true}).click();await expect(page.getByRole('heading',{name:'Pilih tiketmu.'})).toBeVisible();expect(errors).toEqual([]);
});
test('single + couple summary, buyer validation and preview guard',async({page},testInfo)=>{
 await page.goto('/events/midnight-frequency/tickets');await page.getByRole('button',{name:'Tambah Presale 1 Single Ticket',exact:true}).click();await page.getByRole('button',{name:'Tambah Presale 1 Couple Ticket',exact:true}).click();await expect(page.getByText('3 orang · 2 unit pembelian')).toBeVisible();await expect(page.locator('.summary-total')).toContainText(/Rp\s*621\.500/);
 await expect(page.getByRole('button',{name:'Checkout',exact:true})).toBeDisabled();await expect(page.getByText('Checkout belum diaktifkan.')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/checkout-'+testInfo.project.name+'.png',fullPage:true});
});
test('admin preview and auth surfaces work without fake transactions',async({page},testInfo)=>{
 await page.goto('/admin');await expect(page.getByRole('heading',{name:'Semua dalam kendali.'})).toBeVisible();await expect(page.getByText('Pratinjau dashboard.',{exact:false})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/admin-'+testInfo.project.name+'.png',fullPage:true});await page.getByRole('button',{name:'Buat event',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('heading',{name:'Nama event',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tutup editor'}).click();await page.goto('/login');await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();await page.goto('/access');await expect(page.getByRole('heading',{name:'Tiketmu ada di sini.'})).toBeVisible();
});
