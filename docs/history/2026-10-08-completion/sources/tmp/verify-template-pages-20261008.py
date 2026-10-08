import concurrent.futures, hashlib, json, pathlib, subprocess, urllib.request

root=pathlib.Path('/home/tolya/course-tools/quarto-template-course')
out=pathlib.Path('/tmp/template-pages-20261008');out.mkdir(exist_ok=True)
def git(*args): return subprocess.check_output(['git',*args],cwd=root)
expected=json.loads(pathlib.Path('/tmp/template-main-prepublish-20261008/site-tree-hashes.json').read_text())
sha=git('rev-parse','gh-pages').decode().strip()
actual={}
for path in git('ls-tree','-r','--name-only',sha).decode().splitlines():
    actual[path]=hashlib.sha256(git('show',sha+':'+path)).hexdigest()
assert set(actual)==set(expected)|{'.nojekyll'}
assert all(actual[p]==h for p,h in expected.items())
paths=['index.html','guide/exercises.html','catalog/index.html','search.json']
pins=json.loads((root/'tests/ready-assets.json').read_text())
for group,pin in pins.items():
    base='examples/'+group
    paths.append(base+'/BUILD.json')
    paths.append(base+'/index.html')
    for suffix in ('.pdf','.xml'):
        matches=[p for p in pin['files'] if p.endswith(suffix)]
        if matches: paths.append(base+'/'+matches[0])
def get(path):
    url='https://afonenko-course-tools.github.io/quarto-template-course/'+path
    with urllib.request.urlopen(url,timeout=60) as response:
        data=response.read(); status=response.status
    digest=hashlib.sha256(data).hexdigest()
    assert status==200 and digest==expected[path],(path,status,digest,expected[path])
    return {'path':path,'status':status,'sha256':digest,'bytes':len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: checks=list(pool.map(get,paths))
pages=json.loads(subprocess.check_output(['gh','api','repos/Afonenko-Course-Tools/quarto-template-course/pages']))
build=json.loads(subprocess.check_output(['gh','api','repos/Afonenko-Course-Tools/quarto-template-course/pages/builds/latest']))
assert pages['source']=={'branch':'gh-pages','path':'/'} and pages['build_type']=='legacy'
assert build['commit']==sha and build['status']=='built'
assert git('status','--porcelain')==b''
report={'sourceMainSHA':git('rev-parse','HEAD').decode().strip(),'ghPagesSHA':sha,'publishedEveryFileByteEqual':True,'fileCount':len(expected),'extraNativeFiles':['.nojekyll'],'pages':pages,'build':build,'liveChecks':checks}
(out/'verified-pages.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'ghPagesSHA':sha,'publishedFiles':len(expected),'liveChecks':len(checks),'allByteEqual':True}))
