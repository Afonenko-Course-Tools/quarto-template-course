from pathlib import Path,PurePosixPath
import subprocess,json,hashlib,tarfile,datetime,shutil
root=Path('/tmp/template-core-patch-20261008');repo=Path('/home/tolya/course-tools/quarto-template-core-patch-20261008')
receipt=Path('/tmp/core-patch-release-20261008/verified-releases.json');j=json.loads(receipt.read_text());source=j['commit'];assert source=='a9a439bd6e6498806d4d4943efd71232e70170be'
new=j['releases']['demo-20261008-1'];tool=j['releases']['v4.0.1']
assert new['gate']['immutable'] and tool['gate']['immutable']
assert new['gate']['sha']==tool['gate']['sha']==source
asset=next(a for a in new['release']['assets'] if a['name']=='course.tar.gz');expected=new['assets']['course.tar.gz']
published=root/'published'/'core';published.mkdir(parents=True,exist_ok=True);archive=published/'course.tar.gz'
subprocess.run(['curl','--fail','--location','--retry','2','--output',str(archive),asset['browser_download_url']],check=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
actualhash=sha(archive.read_bytes());assert actualhash==expected['sha256']==asset['digest'].removeprefix('sha256:');assert archive.stat().st_size==expected['bytes']==asset['size']
tree=published/'files';tree.mkdir(exist_ok=True)
with tarfile.open(archive,'r:gz') as tf:
 for m in tf.getmembers():
  parts=PurePosixPath(m.name).parts
  assert not PurePosixPath(m.name).is_absolute() and '..' not in parts,m.name
  assert m.isdir() or m.isfile(),m.name
 tf.extractall(tree,filter='data')
files={p.relative_to(tree).as_posix():sha(p.read_bytes()) for p in sorted(tree.rglob('*')) if p.is_file()};assert len(files)==107
assert files==j['demoBuild']['files']==new['releaseManifest']['provenance']['core']['nativeBuild']['files']
build=json.loads((tree/'BUILD.json').read_text());assert build==j['demoBuild']['build'];assert build['commit']==source and build['sourceDirty'] is False and build['dependencies']=={'quarto-course':'v4.0.1','quarto':'1.11.5'}
manifestpath=repo/'tests/ready-assets.json';before=manifestpath.read_bytes();old=json.loads(before)
assert json.dumps(old,ensure_ascii=False,indent=2)+'\n'==before.decode()
(root/'ready-assets.before.json').write_bytes(before)
record=dict(old['core']);record.update(url=asset['browser_download_url'],sourcePath=j['demoBuild']['operation']['folder'],archiveSha256=actualhash,build=build,sourceRef='v4.0.1',files=files)
after=dict(old);after['core']=record
assert all(after[k]==old[k] for k in old if k!='core')
manifestpath.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n')
(temp:=published/'checker').mkdir(exist_ok=True);(temp/'tests').mkdir(exist_ok=True);(temp/'tests/ready-assets.json').write_text(json.dumps(after,indent=2)+'\n')
check=subprocess.run(['node',str(repo/'tests/site.cjs'),'--demo-dir',str(tree),'--demo-group','core'],cwd=temp,capture_output=True,text=True)
(published/'published-ready-check.log').write_text(check.stdout+check.stderr);assert check.returncode==0,check.stdout+check.stderr
proof={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rootReceipt':str(receipt),'rootReceiptSHA256':sha(receipt.read_bytes()),'sourceSHA':source,'toolTag':'v4.0.1','toolReleaseId':tool['gate']['releaseId'],'demoTag':'demo-20261008-1','demoReleaseId':new['gate']['releaseId'],'archive':str(archive),'archiveSHA256':actualhash,'archiveBytes':archive.stat().st_size,'url':asset['browser_download_url'],'build':build,'files':files,'fileCount':len(files),'allArchiveFileBytesMatchRootNativeTree':True,'allSevenOtherManifestRecordsUnchanged':True,'nativeExistingReadyCheck':{'exitCode':check.returncode,'output':check.stdout.strip()},'manifestSHA256':sha(manifestpath.read_bytes())}
(root/'published-core-verification.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in proof.items() if k not in ['files','build']},ensure_ascii=False,indent=2))
