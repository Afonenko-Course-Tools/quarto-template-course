"""Exercise actual Task/curl/tar/check in a Unicode path with spaces."""
from pathlib import Path
import tempfile, tarfile, json, re, subprocess, os
root=Path(__file__).resolve().parents[1]
tmp=Path(tempfile.mkdtemp(prefix='Документация с пробелами '))
task=os.environ.get('TASK','task')
payload=tmp/'payload';payload.mkdir()
(payload/'index.html').write_text('NEW_DEMO')
(payload/'BUILD.json').write_text(json.dumps({'commit':'a'*40,'dependencies':{'core':'v3.0.0'}}))
valid=tmp/'готовый пример.tar.gz';bad=tmp/'неполный пример.tar.gz';broken=tmp/'неполные ресурсы.tar.gz'
with tarfile.open(valid,'w:gz') as tar:
 for p in payload.iterdir():tar.add(p,arcname=p.name)
with tarfile.open(bad,'w:gz') as tar:tar.add(payload/'index.html',arcname='index.html')
(payload/'index.html').write_text('<img src="missing.png">')
with tarfile.open(broken,'w:gz') as tar:
 for p in payload.iterdir():tar.add(p,arcname=p.name)
source=(root/'Taskfile.yml').read_text().replace('node tests/site.cjs', 'node "'+str(root/'tests/site.cjs')+'"')
def run(url):
 text=re.sub(r'(GROUP: core\s+URL: )https[^\s]+',lambda m:m[1]+url,source)
 assert text!=source,'Core URL missing from Taskfile'
 (tmp/'Taskfile.yml').write_text(text)
 return subprocess.run([task,'fetch:core'],cwd=tmp,capture_output=True,text=True)
initial=tmp/'examples/core';initial.mkdir(parents=True);(initial/'old.html').write_text('OLD_DEMO')
for url in [(tmp/'нет файла.tar.gz').as_uri(),bad.as_uri(),broken.as_uri()]:
 r=run(url);assert r.returncode!=0,r.stdout+r.stderr
 assert (initial/'old.html').read_text()=='OLD_DEMO'
for _ in range(2):
 r=run(valid.as_uri());assert r.returncode==0,r.stdout+r.stderr
 assert (initial/'index.html').read_text()=='NEW_DEMO'
 assert not (initial/'old.html').exists()
print('PASS actual Task fetch: Unicode/spaces, download/missing/invalid-resources refusal, prior result preserved, repeat replacement')
