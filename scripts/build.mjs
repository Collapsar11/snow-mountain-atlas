import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await cp(path.join(root, 'src', file), path.join(out, file));
}
const catalog = JSON.parse(await readFile(path.join(root, 'src/data/catalog.json'), 'utf8'));
const photos = JSON.parse(await readFile(path.join(root, 'src/data/photos.json'), 'utf8'));
await writeFile(path.join(out, 'data.js'), `export const catalog=${JSON.stringify(catalog)};\nexport const photos=${JSON.stringify(photos)};\n`);
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, 'build.json'), JSON.stringify({ version: catalog.version, mountains: catalog.mountains.length, routes: catalog.routes.length, photos: Object.keys(photos).length }, null, 2));
console.log(`Built ${catalog.mountains.length} mountain collections, ${catalog.routes.length} routes into dist/`);
