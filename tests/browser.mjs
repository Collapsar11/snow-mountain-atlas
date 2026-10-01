import {chromium} from 'playwright';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {homedir} from 'node:os';
const data=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const photos=JSON.parse(await readFile(new URL('../src/data/photos.json',import.meta.url)));
const base=process.env.ATLAS_URL||'http://127.0.0.1:4173/';
let executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
if(!executablePath){const cached=homedir()+'/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';try{await access(cached);executablePath=cached}catch{}}
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const deadline=setTimeout(()=>{console.error('Browser verification exceeded four minutes');void browser.close();process.exitCode=1},240000);
const errors=[];let pagesChecked=0;
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const visit=async(p,url)=>{await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(view=>document.querySelector('#main')?.dataset.view===view,(new URL(url).hash.slice(1).split('?')[0]||'/'))};
const decodeImages=async locator=>locator.evaluateAll(async imgs=>{
 for(const img of imgs)img.loading='eager';
 let timer;
 try{await Promise.race([Promise.all(imgs.map(img=>img.decode())),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Image loading timed out: '+imgs.filter(i=>!i.complete).map(i=>i.src).join(', '))),30000)})])}finally{clearTimeout(timer)}
});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(r.status()+' '+r.url())});
await visit(page,base);
console.log('Loaded '+base);
await decodeImages(page.locator('img'));
await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
await page.locator('#home-search input').fill('梅里');
await page.locator('#home-search button').click();
await page.locator('#catalog-search').waitFor();
assert.equal(await page.locator('.mountain-card').count(),1);
await page.getByRole('button',{name:'收藏梅里雪山',exact:true}).click();
await visit(page,base+'#/saved');
assert.equal(await page.locator('.mountain-card').count(),1);
await page.reload();
assert.equal(await page.locator('.mountain-card').count(),1);
await visit(page,base+'#/explore?region=四川&kind=private');
assert.equal(await page.locator('.mountain-card').count(),3);
await page.locator('#catalog-search').fill('不存在的测试雪山');
await page.getByRole('heading',{name:'这片山野，还没有匹配的记录。'}).waitFor();
await page.getByRole('button',{name:'重置筛选 ↺'}).click();
assert.equal(await page.locator('.mountain-card').count(),data.mountains.length);
await page.selectOption('#sort','height-desc');
assert.match(await page.locator('.mountain-card h3').first().innerText(),/珠穆朗玛/);
await visit(page,base+'#/lakes');
assert.equal(await page.locator('.lake-card').count(),data.lakes.length);
await page.getByRole('button',{name:'收藏纳木错',exact:true}).click();
await visit(page,base+'#/saved');
assert.equal(await page.locator('.lake-card').count(),1);
await page.reload();
assert.equal(await page.locator('.lake-card').count(),1);
for(const region of ['四川','云南']){
 await visit(page,base+'#/lakes?region='+encodeURIComponent(region));
 assert(await page.locator('.lake-card h3').allTextContents().then(names=>names.includes('泸沽湖')));
}
await visit(page,base+'#/lakes?kind=archive');
assert.equal(await page.locator('.lake-card').count(),data.lakes.filter(l=>l.mode==='archive').length);
await page.locator('#catalog-search').fill('空间站');
assert((await page.locator('.lake-card').count())>0);
await page.getByRole('button',{name:'重置筛选 ↺'}).click();
await page.selectOption('#sort','name-asc');
assert.match(page.url(),/sort=name-asc/);
await visit(page,base+'#/lake/manasarovar');
assert.equal(await page.locator('.landscape-links a').count(),3);
await page.getByRole('button',{name:'背景与故事',exact:true}).click();
assert.equal(await page.evaluate(()=>document.activeElement.id),'stories');
await visit(page,base);
await page.locator('#home-search input').fill('青海湖');
await page.locator('#home-search button').click();
await page.waitForFunction(()=>document.querySelector('#main')?.dataset.view==='/lakes');
await page.locator('.lake-card').first().waitFor();
assert.equal(await page.locator('.lake-card').count(),1);
assert.match(page.url(),/#\/lakes/);
await visit(page,base+'#/routes?kind=private');
assert.equal(await page.locator('.route-card').count(),5);
await visit(page,base+'#/gear?set=high');
await page.locator('.check-item').first().click();
assert.equal(await page.locator('#gear-progress').innerText(),'已准备 1 / 8 项');
await page.reload();
assert(await page.locator('[data-gear="high:0"]').isChecked());
await page.getByRole('button',{name:'重置本组 ↺'}).click();
assert.equal(await page.locator('#gear-progress').innerText(),'已准备 0 / 8 项');
for(const [type,records] of [['mountain',data.mountains],['lake',data.lakes],['route',data.routes]]){
 for(const r of records){
  await visit(page,base+`#/${type}/${r.id}`);
  await page.locator('h1').waitFor();
  assert.equal(await page.locator('h1').innerText(),r.name);
  await decodeImages(page.locator('.detail-photo img'));
  assert(await page.locator('.detail-photo img').evaluate(img=>img.naturalWidth>100));
  assert((await page.locator('.source-list a').count())>0);
  if(type!=='route')assert.equal(await page.locator('.reading-story').count(),r.stories.length);
  else{assert.equal(await page.locator('.itinerary li p').count(),r.stops.length);assert.equal(await page.locator('.trail-story h2').innerText(),r.trailStory.title)}
  pagesChecked++;
  if(pagesChecked%10===0)console.log('Verified '+pagesChecked+' detail pages');
 }
}
await visit(page,base+'#/mountain/meili');
const hashBefore=await page.evaluate(()=>location.hash);
await page.getByRole('button',{name:'背景与故事',exact:true}).click();
assert.equal(await page.evaluate(()=>document.activeElement.id),'stories');
assert.equal(await page.evaluate(()=>location.hash),hashBefore);
await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
await page.screenshot({path:'test-results/mountain-desktop.png',fullPage:true});
await visit(page,base+'#/route/kailash-kora');
await page.screenshot({path:'test-results/route-desktop.png',fullPage:true});
await visit(page,base+'#/lakes');
await decodeImages(page.locator('img'));
await page.screenshot({path:'test-results/lakes-desktop.png',fullPage:true});
await visit(page,base+'#/lake/namtso');
await page.screenshot({path:'test-results/lake-desktop.png',fullPage:true});
const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
mobile.on('pageerror',e=>errors.push(e.message));
for(const route of ['', '#/explore','#/lakes','#/lake/namtso','#/lake/tangra','#/lake/zhaling','#/routes','#/mountain/meili','#/route/yading-long','#/gear','#/about','#/saved']){
 await visit(mobile,base+route);
 await decodeImages(mobile.locator('img'));
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow '+route);
 if(!route)await mobile.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 if(route==='#/lake/namtso')await mobile.screenshot({path:'test-results/lake-mobile.png',fullPage:true});
 if(route==='#/route/yading-long')await mobile.screenshot({path:'test-results/route-mobile.png',fullPage:true});
}
await visit(page,base+'#/about');
await decodeImages(page.locator('.credits-grid img'));
await page.locator('.photo-credits').screenshot({path:'test-results/photo-contact.png'});
assert.equal(errors.length,0,errors.join('\n'));
const result={base,pagesChecked,photoAssets:Object.keys(photos).length,desktop:'1440x1000',mobile:'390x844',checks:['mountain and lake search','cross-province lake filters','appreciation filters','lake favorites and related links','region and kind filters','empty state','reset','elevation sort','saved persistence','gear persistence and reset',`${pagesChecked} detail pages`,`${[...data.mountains,...data.lakes].reduce((n,x)=>n+x.stories.length,0)} cited landscape stories`,'all route stages and narratives','in-page reading navigation','all full-size photo decodes','mobile overflow'],errors};
await writeFile('test-results/browser-report.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
clearTimeout(deadline);
await browser.close();
