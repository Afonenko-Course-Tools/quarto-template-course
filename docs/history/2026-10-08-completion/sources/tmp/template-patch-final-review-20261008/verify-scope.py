from pathlib import Path
import json,hashlib,subprocess,tarfile,re,datetime
root=Path('/home/tolya/course-tools/quarto-template-core-patch-20261008'); core=Path('/home/tolya/course-tools/quarto-course'); receipts=Path('/tmp/template-core-patch-20261008'); out=Path('/tmp/template-patch-final-review-20261008'); base='8b050033b594eeae4270ca6f55f12a1d6e8f1243'; src='a9a439bd6e6498806d4d4943efd71232e70170be'
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda repo,*args:subprocess.check_output(['git',*args],cwd=repo)
scope=json.loads((receipts/'final-scope.json').read_text());assert scope['HEAD']==base
assert git(root,'rev-parse','HEAD').decode().strip()==base
scope_rows=[]
for row in scope['paths']:
 p=root/row['path']; digest=sha(p.read_bytes()); assert digest==row['sha256'],row['path']; scope_rows.append({'path':row['path'],'sha256':digest,'bytes':p.stat().st_size})
actual=set(git(root,'diff','--name-only').decode().splitlines())|set(git(root,'ls-files','--others','--exclude-standard').decode().splitlines()); assert actual=={r['path'] for r in scope_rows},(actual,{r['path'] for r in scope_rows})
assert sha((receipts/'final.diff').read_bytes())==scope['diffSHA256']=='1f4cf134c2ad7de5c67370889d309646d4e3e788a0c788e7d6054d9df94cc48b'
assert json.loads((out/'remote-core-tag.json').read_text())['commit']==src
sourcepaths=git(core,'ls-tree','-r','--name-only',src,'--','_extensions').decode().splitlines();assert len(sourcepaths)==63
vendor=root/'_extensions/Afonenko-Course-Tools';expected={r[len('_extensions/'):] for r in sourcepaths}; actualVendor={str(p.relative_to(vendor)) for p in vendor.rglob('*') if p.is_file()};assert actualVendor==expected
vendormap={}
for p in sourcepaths:
 rel=p[len('_extensions/'):]; raw=(vendor/rel).read_bytes(); assert raw==git(core,'show',src+':'+p),rel; vendormap[rel]=sha(raw)
manifest=json.loads((root/'tests/ready-assets.json').read_text()); old=json.loads(git(root,'show',base+':tests/ready-assets.json')); assert len(manifest)==8
assert all(manifest[k]==old[k] for k in manifest if k!='core')
archive=Path(json.loads((receipts/'published-core-verification.json').read_text())['archive']);assert archive.stat().st_size==2783070 and sha(archive.read_bytes())=='fe90b587569891455694836a48385d102960e906e07f2011c1f28092d4455ae4'
with tarfile.open(archive) as t:
 members=[m for m in t.getmembers() if m.isfile()]; arc={m.name.removeprefix('./'):sha(t.extractfile(m).read()) for m in members}; assert len(arc)==107 and arc==manifest['core']['files']
 build=json.loads(t.extractfile(next(m for m in members if m.name.removeprefix('./')=='BUILD.json')).read());assert build==manifest['core']['build']
assert build['commit']==src and build['sourceDirty'] is False and manifest['core']['sourceRef']=='v4.0.1' and build['dependencies']['quarto-course']=='v4.0.1'
ready=[]
for group,entry in manifest.items():
 for prefix in ('examples','_site/examples'):
  d=root/prefix/group;files={str(p.relative_to(d)):sha(p.read_bytes()) for p in d.rglob('*') if p.is_file()};assert files==entry['files'],(group,prefix)
 ready.append({'group':group,'files':len(entry['files']),'sourceRef':entry['sourceRef'],'sourceSHA':entry['build']['commit'],'recordUnchangedFromBaseline':entry==old[group],'archiveSHA256':entry['archiveSha256']})
assert sum(g['files'] for g in ready)==549
protected=scope['protectedHarnessWorkflowConfigurationUnchanged']
for p in protected:assert (root/p).read_bytes()==git(root,'show',base+':'+p),p
# CommonMark-style outer fences, including nested quoted author examples.
def fences(text):
 result=[];start=None;buf=[]
 for line in text.splitlines(keepends=True):
  if start is None:
   m=re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$',line)
   if m:start=(m[1][0],len(m[1]),m[2].strip());buf=[line]
  else:
   buf.append(line)
   if re.match(r'^ {0,3}'+re.escape(start[0])+'{'+str(start[1])+r',}\s*$',line):result.append(''.join(buf));start=None;buf=[]
 assert start is None
 return result
qmds=json.loads((receipts/'guide-inputs-conservation.json').read_text())['files'];changed=[];count=0
for row in qmds:
 p=row['path']; before=fences(git(root,'show',base+':'+p).decode());after=fences((root/p).read_text());assert len(before)==len(after)
 count+=len(after)
 for i,(a,b) in enumerate(zip(before,after)):
  if a!=b: assert a.replace('quarto-course@v4.0.0','quarto-course@v4.0.1')==b,(p,i);changed.append({'path':p,'fenceIndex':i,'onlyCoreShellPinChanged':True})
assert len(qmds)==28 and count==95 and len(changed)==3
for command in scope['orderedCommands']:assert command['exitCode']==0 and Path(command['log']).is_file()
subprocess.run(['git','diff','--check'],cwd=root,check=True)
# Re-snapshot final bytes to detect a concurrent source edit during the read-only review.
for r in scope_rows:assert sha((root/r['path']).read_bytes())==r['sha256']
result={'verdict':'Approved','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reviewedHEAD':base,'reviewedHEADTree':git(root,'rev-parse','HEAD^{tree}').decode().strip(),'releasedCoreSource':src,'reviewedDiffSHA256':scope['diffSHA256'],'scope':scope_rows,'installed63EveryPathAndByteEqualsTaggedCore':True,'vendorSHA256':vendormap,'coreArchiveSHA256':sha(archive.read_bytes()),'coreArchiveBytes':archive.stat().st_size,'coreArchive107EveryFileAndBUILDMatchesManifest':True,'sevenOtherManifestRecordsUnchanged':True,'readyGroups':ready,'totalReadyFilesEachConsumerCopy':549,'protectedHarnessWorkflowConfig':protected,'literalQmdPages':28,'fencedBlocks':95,'changedFences':changed,'nativeCommandsReviewed':[{'label':r['label'],'exitCode':r['exitCode'],'log':r['log']} for r in scope['orderedCommands']],'diffCheck':'PASS','sourceEdits':0,'nativeRendersOrSuitesRepeated':0,'pendingReleaseGates':scope['pending'][1:]}
(out/'scope-hash.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('scope','vendorSHA256','nativeCommandsReviewed','readyGroups')},ensure_ascii=False,indent=2))
