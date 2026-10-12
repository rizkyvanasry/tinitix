import {test,expect} from '@playwright/test';

for(const [width,columns] of [[320,2],[375,2],[768,3],[1024,4],[1440,5]]){
 test('design system at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:1000});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.ds-event-card')).toHaveCount(6);
  await expect(page.locator('.ds-event-grid')).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.ds-event-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Poppins');
  await expect.poll(()=>page.locator('.ds-poster img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:'test-results/design-system-'+width+'.png',fullPage:true});
  if(width<1024){
   const menu=page.getByRole('button',{name:'Buka menu',exact:true});
   await menu.focus();await page.keyboard.press('Enter');
   await expect(page.getByRole('link',{name:'Masuk / daftar'})).toBeVisible();
   await page.keyboard.press('Escape');await expect(menu).toBeFocused();
   await expect(menu).toHaveAttribute('aria-expanded','false');
  }
  await page.getByLabel('Cari nama event atau lokasi').fill('HINDIA');
  await page.getByLabel('Cari nama event atau lokasi').press('Enter');
  await expect(page.locator('.ds-event-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Reset filter'}).click();
  await expect(page.locator('.ds-event-card')).toHaveCount(6);
  await page.getByRole('button',{name:'Konser',exact:true}).click();await expect(page.locator('.ds-event-card')).toHaveCount(3);
  await page.getByRole('button',{name:'Semua event',exact:true}).click();
  await page.getByLabel('Filter kota').selectOption('Jakarta');await expect(page.locator('.ds-event-card')).toHaveCount(2);
  await page.getByRole('button',{name:'Hapus filter kota'}).focus();await page.keyboard.press('Tab');
  await expect(page.locator('.ds-event-card').first()).toBeFocused();
  expect(await page.locator('.ds-event-card').first().evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Tentang event'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 });
}
test('hero navigation is manual and works with keyboard',async({page})=>{
 await page.goto('/');
 const image=page.locator('.ds-hero-art img');
 const initial=await image.getAttribute('src');
 await page.clock.install();await page.clock.runFor(7000);
 await expect(image).toHaveAttribute('src',initial!);
 await page.getByRole('button',{name:'Event berikutnya',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(image).not.toHaveAttribute('src',initial!);
 await page.getByRole('button',{name:'Event sebelumnya',exact:true}).click();await expect(image).toHaveAttribute('src',initial!);
 await page.getByRole('button',{name:'Tampilkan Sunset Sessions',exact:true}).click();await expect(image).toHaveAttribute('alt','Banner Sunset Sessions');
 await page.locator('.ds-hero-art').click();await expect(page).toHaveURL(/events\/sunset-sessions$/);
});
