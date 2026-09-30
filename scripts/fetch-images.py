"""Fetch Commons metadata; download only explicitly selected, openly licensed photos."""
import concurrent.futures, html, json, pathlib, re, subprocess, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
HEADERS = {'User-Agent': 'SnowMountainAtlas/1.0 (educational, attributed landscape collection)'}
def get(url):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=45) as r:
                return r.read()
        except Exception:
            if attempt==4: raise
            time.sleep(3*(attempt+1))
def plain(s):
    return html.unescape(re.sub('<[^>]+>', '', s or '')).strip()
def search(item):
    key, query = item
    params = dict(action='query', format='json', generator='search', gsrsearch=query, gsrnamespace=6,
                  gsrlimit=6, prop='imageinfo', iiprop='url|extmetadata|size', iiurlwidth=1600)
    if query.startswith('File:'):
        params = dict(action='query',format='json',titles=query,prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1600)
    data=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
    rows=[]
    for page in sorted(data.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',0)):
        if 'imageinfo' not in page: continue
        i=page['imageinfo'][0]; m=i.get('extmetadata',{})
        val=lambda k: plain(m.get(k,{}).get('value',''))
        rows.append(dict(title=page['title'],url=i.get('thumburl',i['url']).split('?')[0],original=i['url'].split('?')[0],
           source=i['descriptionurl'],author=val('Artist'),license=val('LicenseShortName'),licenseUrl=val('LicenseUrl'),
           description=val('ImageDescription'),width=i['width'],height=i['height']))
    return key,rows
if sys.argv[1]=='search':
    queries=json.loads((ROOT/'research/image-queries.json').read_text())
    path=ROOT/'research/image-candidates.json'
    out=json.loads(path.read_text()) if path.exists() else {}
    for item in queries.items():
        if item[0] in out: continue
        key,rows=search(item)
        out[key]=rows
        print(key,[(r['title'],r['license']) for r in rows],flush=True)
        path.write_text(json.dumps(out,ensure_ascii=False,indent=2))
        time.sleep(1)
elif sys.argv[1]=='download':
    candidates=json.loads((ROOT/'research/image-candidates.json').read_text())
    selection=json.loads((ROOT/'research/image-selection.json').read_text())
    out={}
    for key,n in selection.items():
        r=candidates[key][n]
        assert r['license'].startswith(('CC BY','CC0','Public domain')),r
        path=ROOT/'public/images'/f'{key}.jpg'
        if not path.exists():
            archive=pathlib.Path('/Volumes/H/snow-mountain-atlas/image-cache')
            archive.mkdir(parents=True,exist_ok=True)
            raw=archive/f'{key}.original'
            if not raw.exists(): raw.write_bytes(get(r['url']))
            subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','78','-Z','1600',str(raw),'--out',str(path)],check=True,capture_output=True)
            time.sleep(1)
        out[key]={**r,'src':f'images/{key}.jpg','modification':'原作缩放压缩，卡片采用视觉裁切；保留原授权。'}
        print(key,path.stat().st_size,flush=True)
    (ROOT/'src/data/photos.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
