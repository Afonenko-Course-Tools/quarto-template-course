"""Prepare, download-verify and publish one authorized immutable release."""
from pathlib import Path
import subprocess,json,hashlib,argparse,tempfile
p=argparse.ArgumentParser()
p.add_argument('repo');p.add_argument('tag');p.add_argument('commit');p.add_argument('--demo',action='append',default=[],help='asset-name=ready-web-root')
a=p.parse_args();base=Path('/home/tolya/course-tools');repo=base/a.repo;remote='Afonenko-Course-Tools/'+a.repo
out=base/'local-evidence/implementation-2026-10-06/releases'/a.repo/a.tag;out.mkdir(parents=True,exist_ok=True)
def run(args,**kwargs): return subprocess.run(args,check=True,**kwargs)
def get(args,**kwargs): return subprocess.check_output(args,text=True,**kwargs).strip()
assert len(a.commit)==40
assert get(['git','rev-parse','HEAD'],cwd=repo)==a.commit, 'Build from merged checkout'
assert not get(['git','status','--porcelain','--untracked-files=normal'],cwd=repo), 'Producer must be clean'
assert json.loads(get(['gh','api','repos/'+remote+'/immutable-releases']))['enabled']
assets=[]
if a.demo:
 for value in a.demo:
  name,directory=value.split('=',1);root=Path(directory).resolve()
  assert name.endswith('.tar.gz') and '/' not in name
  build=json.loads((root/'BUILD.json').read_text())
  assert build['commit']==a.commit and not build.get('sourceDirty'), 'Demo provenance must match clean merged SHA'
  assert build.get('dependencies') and (root/'index.html').is_file()
  run(['node',str(base/'quarto-template-course/tests/site.cjs'),'--demo-dir',str(root)])
  archive=out/name
  run(['tar','-czf',str(archive),'-C',str(root),'.']);assets.append(archive)
else:
 archive=out/(a.repo+'-'+a.tag+'.tar.gz')
 tracked=get(['git','ls-files','README.md','LICENSE','LICENSE.md'],cwd=repo).splitlines()
 run(['git','archive','--format=tar.gz','-o',str(archive),a.commit,'_extensions',*tracked],cwd=repo);assets.append(archive)
if not a.demo:
 with tempfile.TemporaryDirectory(prefix='extension-package-install-') as temp:
  run(['quarto','add',str(assets[0]),'--no-prompt'],cwd=temp)
  expected=list((repo/'_extensions').glob('*/_extension.yml'))
  actual=list(Path(temp).rglob('_extension.yml'))
  assert len(actual)==len(expected)
  for descriptor in expected:
   installed=Path(temp)/'_extensions'/descriptor.parent.name/'_extension.yml'
   assert installed.read_bytes()==descriptor.read_bytes(), 'Installed descriptor differs from merged source'
manifest={'producer':remote,'tag':a.tag,'commit':a.commit,'kind':'ready-demos' if a.demo else 'extension',
 'assets':{f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in assets}}
meta=out/'RELEASE.json';meta.write_text(json.dumps(manifest,indent=2)+'\n');assets.append(meta)
notes=out/'notes.md';notes.write_text('Verified merged revision `'+a.commit+'`.\n\n'+
 ('Ready HTML, resources and BUILD.json are prepared by the producer from pinned installed releases. Demo source links identify the same revision.\n' if a.demo else 'Compact extension bundle. Native and focused regression checks passed locally; final pull request CI passed before merge. Ready demonstration archives are published separately in demo-20261007.\n')+
 '\nRELEASE.json records SHA-256 and size of every payload. All assets were uploaded and downloaded for verification before this immutable release was published.\n')
latest='false' if a.demo else 'true'
run(['gh','release','create',a.tag,*map(str,assets),'--repo',remote,'--target',a.commit,'--draft','--latest='+latest,'--title',a.repo+' '+a.tag,'--notes-file',str(notes)])
with tempfile.TemporaryDirectory(prefix='release-verify-') as temp:
 run(['gh','release','download',a.tag,'--repo',remote,'--dir',temp])
 for f in assets: assert hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256((Path(temp)/f.name).read_bytes()).digest(), f.name
run(['gh','release','edit',a.tag,'--repo',remote,'--draft=false','--latest='+latest])
release=json.loads(get(['gh','api','repos/'+remote+'/releases/tags/'+a.tag]))
assert release.get('immutable') is True and not release['draft'], 'Immutable publication not confirmed'
assert release['target_commitish']==a.commit, 'Release source mismatch'
(out/'published.json').write_text(json.dumps(release,indent=2)+'\n')
print('PUBLISHED',release['html_url'],flush=True)
