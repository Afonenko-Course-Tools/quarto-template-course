"""Dated exact-ID Core recovery. Default read-only; --publish only after root review."""
import argparse,importlib.util,json,subprocess
from pathlib import Path
spec=importlib.util.spec_from_file_location('pub','/tmp/course-release-20261008/publish-verified-release.py');pub=importlib.util.module_from_spec(spec);spec.loader.exec_module(pub)
REMOTE='Afonenko-Course-Tools/quarto-course';SHA='d58494171e3020957b64ed229cbc8537751e3beb';TAG='v4.0.0';ID=406364109
OUT=Path('/tmp/course-release-20261008/receipts/releases/quarto-course/v4.0.0');EVIDENCE=Path('/tmp/release-draft-recovery-20261008')
EXPECTED={'quarto-course-v4.0.0.tar.gz':{'sha256':'40fb5b3e0bee71a9d652c347e7c8d1f89c193473d9029eb374e0b03edbc63bec','bytes':114119},'RELEASE.json':{'sha256':'670601d2fc1b42c956207830441ead459a32f23de8c5a4e9113cd190e7067823','bytes':386}}
def verify():
 pub.clean(pub.BASE/'quarto-course',SHA)
 pub.require(json.loads(pub.get(['gh','api','repos/'+REMOTE+'/immutable-releases'])).get('enabled') is True,'Immutable releases disabled')
 ci=json.loads(pub.get(['gh','api','repos/'+REMOTE+'/actions/runs/37719402877']))
 pub.require(ci.get('head_sha')==SHA and ci.get('status')=='completed' and ci.get('conclusion')=='success' and ci.get('head_branch')=='main','Exact main CI no longer verified')
 pub.absent('repos/'+REMOTE+'/git/ref/tags/'+TAG)
 pub.require(subprocess.run(['git','show-ref','--verify','--quiet','refs/tags/'+TAG],cwd=pub.BASE/'quarto-course').returncode==1,'Local tag appeared')
 manifest=json.loads((OUT/'RELEASE.json').read_text())
 pub.require(manifest=={'producer':REMOTE,'tag':TAG,'commit':SHA,'kind':'extension','demos':{},'plannedVersion':'4.0.0','provenance':{},'assets':{name:record for name,record in EXPECTED.items() if name!='RELEASE.json'}},'Manifest changed')
 assets=[OUT/name for name in EXPECTED]
 pub.require({f.name:{'sha256':pub.sha(f),'bytes':f.stat().st_size} for f in assets}==EXPECTED,'Original local bytes changed')
 # Reproduce native tracked compact archive from exact clean merged SHA without altering repository.
 tracked=pub.get(['git','ls-files','README.md','LICENSE','LICENSE.md'],cwd=pub.BASE/'quarto-course').splitlines()
 archive=subprocess.check_output(['git','archive','--format=tar.gz',SHA,'_extensions',*tracked],cwd=pub.BASE/'quarto-course')
 pub.require(archive==(OUT/'quarto-course-v4.0.0.tar.gz').read_bytes(),'Compact archive differs from exact merged source')
 draft=pub.find_draft(REMOTE,TAG,SHA)
 pub.require(draft['id']==ID and draft.get('immutable') is False and draft.get('published_at') is None and draft.get('name')=='quarto-course v4.0.0' and draft.get('body')==(OUT/'notes.md').read_text(),'Existing exact draft intent mismatch')
 pub.verify_downloads(REMOTE,draft,assets)
 pub.require(pub.find_draft(REMOTE,TAG,SHA)==draft,'Draft changed after download verification')
 (EVIDENCE/'verified-existing-draft.json').write_text(json.dumps({'releaseId':ID,'commit':SHA,'assets':EXPECTED,'mainCI':{'id':ci['id'],'head_sha':ci['head_sha'],'conclusion':ci['conclusion']},'draft':draft},indent=2)+'\n')
 return draft,assets
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--publish',action='store_true');args=parser.parse_args()
 draft,assets=verify()
 if not args.publish:
  print('VERIFIED EXISTING DRAFT',ID,'NO REMOTE MUTATIONS');return
 # No create/upload/clobber route. Publish only the exact just-verified existing ID.
 pub.clean(pub.BASE/'quarto-course',SHA)
 pub.run(['gh','api','--method','PATCH','repos/'+REMOTE+'/releases/'+str(ID),'-F','draft=false','-f','make_latest=true'],stdout=subprocess.DEVNULL)
 release=json.loads(pub.get(['gh','api','repos/'+REMOTE+'/releases/'+str(ID)]))
 pub.require(release.get('id')==ID and release.get('tag_name')==TAG and release.get('target_commitish')==SHA and release.get('draft') is False and release.get('immutable') is True,'Exact immutable publication not confirmed')
 pub.require(json.loads(pub.get(['gh','api','repos/'+REMOTE+'/releases/tags/'+TAG]))==release,'Published tag identity mismatch')
 pub.verify_downloads(REMOTE,release,assets)
 (OUT/'draft.json').write_text(json.dumps(draft,indent=2)+'\n')
 (OUT/'download-verified.json').write_text(json.dumps(EXPECTED,indent=2)+'\n')
 (OUT/'published.json').write_text(json.dumps(release,indent=2)+'\n')
 print('PUBLISHED',release['html_url'])
if __name__=='__main__':main()
