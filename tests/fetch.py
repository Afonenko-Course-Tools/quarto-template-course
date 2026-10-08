"""Check actual Task/curl/tar and pinned provenance before replacing a demo."""
from pathlib import Path
import tempfile, tarfile, json, re, subprocess, os, hashlib

root=Path(__file__).resolve().parents[1]
tmp=Path(tempfile.mkdtemp(prefix='Документация с пробелами '))
task=os.environ.get('TASK','task')
payload=tmp/'payload'
payload.mkdir()
valid_html='<html lang="ru"><head><meta name="generator" content="quarto-1.11.5"></head><body>NEW_DEMO <a href="https://github.com/Afonenko-Course-Tools/quarto-course/blob/v3.0.2/index.qmd">Исходный QMD</a></body></html>'
(payload/'index.html').write_text(valid_html)
build={'producer':'Afonenko-Course-Tools/quarto-course','commit':'a'*40,
       'sourceDirty':False,'dependencies':{'quarto-course':'v3.0.2'}}
(payload/'BUILD.json').write_text(json.dumps(build))
valid=tmp/'готовый пример.tar.gz'
bad=tmp/'неполный пример.tar.gz'
broken=tmp/'неполные ресурсы.tar.gz'

def archive(destination):
    with tarfile.open(destination,'w:gz') as tar:
        for path in sorted(payload.iterdir()):
            tar.add(path,arcname=path.name)

archive(valid)
with tarfile.open(bad,'w:gz') as tar:
    tar.add(payload/'index.html',arcname='index.html')
(payload/'index.html').write_text('<img src="missing.png">')
archive(broken)
(payload/'index.html').write_text(valid_html)

sha=lambda data:hashlib.sha256(data).hexdigest()
expected={'archiveSha256':sha(valid.read_bytes()), 'build':build, 'sourceRef':'v3.0.2',
          'files':{str(path.relative_to(payload)):sha(path.read_bytes())
                   for path in payload.iterdir()}}
(tmp/'tests').mkdir()
source=(root/'Taskfile.yml').read_text().replace(
    'node tests/site.cjs', 'node "'+str(root/'tests/site.cjs')+'"')

def run(url, pin=None):
    text=re.sub(r'(GROUP: core\s+URL: )https[^\s]+',lambda m:m[1]+url,source)
    assert text!=source,'Core URL missing from Taskfile'
    (tmp/'Taskfile.yml').write_text(text)
    (tmp/'tests/ready-assets.json').write_text(json.dumps({'core':pin or expected}))
    return subprocess.run([task,'fetch:core'],cwd=tmp,capture_output=True,text=True)

initial=tmp/'examples/core'
initial.mkdir(parents=True)
(initial/'old.html').write_text('OLD_DEMO')

def refusal(url, pin=None):
    result=run(url,pin)
    assert result.returncode!=0,result.stdout+result.stderr
    assert (initial/'old.html').read_text()=='OLD_DEMO'

refusal((tmp/'нет файла.tar.gz').as_uri())
for asset in [bad,broken]:
    # Permit archive bytes so extraction/file validation is exercised as well.
    pin=dict(expected,archiveSha256=sha(asset.read_bytes()))
    if asset==broken:
        pin['files']={**expected['files'],'index.html':sha(b'<img src="missing.png">')}
    refusal(asset.as_uri(),pin)
refusal(valid.as_uri(),dict(expected,archiveSha256='0'*64))
for field,value in [('commit','b'*40),('sourceDirty',True),
                    ('dependencies',{'quarto-course':'v99.0.0'})]:
    altered=dict(build,**{field:value})
    refusal(valid.as_uri(),dict(expected,build=altered))
refusal(valid.as_uri(),dict(expected,files={**expected['files'],'index.html':'0'*64}))
for name,html in [
        ('language',valid_html.replace('lang="ru"','lang="en"')),
        ('source-ref',valid_html.replace('/blob/v3.0.2/','/blob/main/')),
        ('source-duplicate',valid_html.replace('</body>','<a id="quarto-code-tools-source"></a><a class="toc-action">Показать код</a></body>'))]:
    (payload/'index.html').write_text(html)
    asset=tmp/(name+'.tar.gz')
    archive(asset)
    refusal(asset.as_uri(),dict(expected,archiveSha256=sha(asset.read_bytes())))
(payload/'index.html').write_text(valid_html)
dirty_build=dict(build,sourceDirty=True)
(payload/'BUILD.json').write_text(json.dumps(dirty_build))
dirty=tmp/'dirty-producer.tar.gz'
archive(dirty)
refusal(dirty.as_uri(),dict(expected,archiveSha256=sha(dirty.read_bytes()),build=dirty_build,
                           files={**expected['files'],'BUILD.json':sha((payload/'BUILD.json').read_bytes())}))
(payload/'BUILD.json').write_text(json.dumps(build))

for _ in range(2):
    result=run(valid.as_uri())
    assert result.returncode==0,result.stdout+result.stderr
    assert (initial/'index.html').read_text()==valid_html
    assert not (initial/'old.html').exists()
print('PASS actual Task fetch: Unicode/spaces, download/archive/file/BUILD/hash/dependency/lang/source refusals, prior group preserved, repeat replacement')
