import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const data=JSON.parse(await readFile(path.join(root,'src/data/catalog.json')));
const photos=JSON.parse(await readFile(path.join(root,'src/data/photos.json')));
test('All mountain and route records have unique ids, verified photo assets and traceable sources',async()=>{
  for(const group of [data.mountains,data.routes]){
    assert.equal(new Set(group.map(x=>x.id)).size,group.length);
    for(const x of group){
      assert(x.name);assert(x.checked);assert(photos[x.photo],`${x.id} photo`);
      const image=await stat(path.join(root,'public',photos[x.photo].src));
      assert(image.size>2000,`${x.id} real image`);
      assert(x.sources.length>0);
      for(const s of x.sources){assert(data.sources[s],`${x.id}: ${s}`);assert(new URL(data.sources[s].url).protocol==='https:')}
    }
  }
});
test('Route categories meet the actual content contract',()=>{
  for(const m of data.mountains){for(const k of ['geography','history','culture'])assert(m[k]?.length>10,`${m.id}: ${k}`);assert(m.place?.length>3);assert(m.coordinates.length===2);assert(m.height>5000)}
  for(const r of data.routes){assert(data.mountains.find(m=>m.id===r.mountain));assert(r.stops.length>=3);assert(r.photoCaption);assert(r.access.length>15);assert(r.metrics);if(r.kind==='commercial'){assert(r.logistics.length>15,`${r.id} logistics`);assert(r.tips.length>=3,`${r.id} tips`);assert(['light','day','high'].includes(r.gear))}else{assert(r.record,`${r.id} record date`)}}
  assert(data.routes.some(r=>r.sources.some(s=>data.sources[s].url.includes('2bulu.com'))));
});
test('Every photo keeps its actual author, license and original source',()=>{
  for(const [id,p]of Object.entries(photos)){assert(p.author,`${id} photographer`);assert(/CC BY|CC0|Public domain/.test(p.license),id);assert(p.source.startsWith('https://commons.wikimedia.org/'));assert(p.modification);assert(!p.src.startsWith('http'))}
});
test('Updated mountain elevations and scope are preserved',()=>{
 const get=id=>data.mountains.find(m=>m.id===id);
 assert.equal(get('gongga').height,7508.9);assert.equal(get('siguniang').height,6247.8);assert.equal(get('everest').height,8848.86);
 assert.equal(data.mountains.length,20);assert.equal(data.routes.length,19);
 assert.equal(get('k2').category,'landscape');assert(get('everest').access.includes('尼泊尔'));
});
