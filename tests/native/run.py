"""Native acceptance. One persistent source tree per channel, never per render."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,tempfile,time
ROOT=Path(__file__).resolve().parents[2]
QUARTO=os.environ.get('QUARTO','quarto')
def command(args,cwd):
    print('RUN',str(cwd),*args,flush=True)
    started=time.monotonic()
    result=subprocess.run([QUARTO,*args],cwd=cwd)
    elapsed=time.monotonic()-started
    print('ELAPSED',json.dumps({'cwd':str(cwd),'args':args,'seconds':round(elapsed,3),'exit':result.returncode}),flush=True)
    result.check_returncode()
def ignored(directory,names):
    return [n for n in names if n in {'.git','.quarto','_freeze','_generated','_output','_downloads','__pycache__'} or n.startswith('_site') or n.endswith(('_files','_cache'))]
def fixture(kind,base):
    dest=base/kind
    if dest.exists():return dest
    source=ROOT if kind=='neutral' else ROOT/'fixtures/probes/original-course'
    shutil.copytree(source,dest,ignore=ignored)
    if kind=='original':
        for scope in ['.','book','essay','lectures','practice']:
            shutil.copytree(ROOT/scope/'_extensions',dest/scope/'_extensions',dirs_exist_ok=True)
        (dest/'fixtures').mkdir(exist_ok=True)
        shutil.copy2(ROOT/'fixtures/external-reference.json',dest/'fixtures/external-reference.json')
    return dest

def search(root,kind,profile):
    rows=json.loads((root/f'_site-{profile}/search.json').read_text())
    hrefs=[r.get('href','') for r in rows]
    assert any(h.split('#')[0]=='index.html' for h in hrefs),('root landing missing',hrefs)
    prefix='tasks/' if kind=='neutral' else 'book/'
    assert any(h.startswith(prefix) for h in hrefs),('mounted search missing',hrefs)
    for href in hrefs:
        assert (root/f'_site-{profile}'/href.split('#')[0]).is_file(),('stale search row',href)

def profiles(root,kind):
    cache=root/'.quarto/native-acceptance-sentinel';cache.parent.mkdir(exist_ok=True);cache.write_text('KEEP NATIVE CACHE')
    freeze=root/'_freeze/native-acceptance-sentinel';freeze.parent.mkdir(exist_ok=True);freeze.write_text('KEEP FREEZE')
    for profile in ['student','full','student']:
        command(['render','.', '--profile',profile],root)
        search(root,kind,profile)
        assert cache.read_text()=='KEEP NATIVE CACHE' and freeze.read_text()=='KEEP FREEZE'
    if kind=='neutral':command(['run',str(ROOT/'tests/check.ts'),str(root)],ROOT)
    else:command(['run',str(ROOT/'tests/check-original.ts'),'--root',str(root),'--skip-render'],ROOT)
    print('PASS',kind,'student -> full -> student; native caches, landing/mounted current search',flush=True)

def optional(root):
    for profile in ['student','full','student']:
        for example in ['cloud','prairielearn']:
            command(['run',str(ROOT/'tests/render-example.ts'),'--root',str(root),'--example',example,'--profile',profile],ROOT)
    print('PASS optional adapters persistent native student/full/student',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('case',choices=['neutral','original','optional','all']);parser.add_argument('--workspace',type=Path);args=parser.parse_args()
    base=args.workspace or Path(tempfile.mkdtemp(prefix='template-native-'));base.mkdir(parents=True,exist_ok=True)
    print('WORKSPACE',base,flush=True)
    if args.case in ['neutral','all']:profiles(fixture('neutral',base),'neutral')
    if args.case in ['original','all']:profiles(fixture('original',base),'original')
    if args.case in ['optional','all']:optional(fixture('neutral',base))
