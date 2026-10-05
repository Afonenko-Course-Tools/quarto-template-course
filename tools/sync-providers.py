"""Install complete frozen local provider archives, preserving unrelated themes."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, tempfile, zipfile
ROOT=Path(__file__).resolve().parents[1]
def inventory(root):
    return {str(p.relative_to(root)): {'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size,'mode':p.stat().st_mode & 0o777} for p in sorted(root.rglob('*')) if p.is_file()}
def sync(provider_root, selected=None):
    manifest=json.loads((ROOT/'providers.json').read_text())
    provenance=json.loads((ROOT/'installed-packages.json').read_text()) if (ROOT/'installed-packages.json').exists() else {'schema':'course-template-packages-v1','packages':{}}
    for key,provider in manifest['providers'].items():
        if selected and key not in selected:continue
        checkout=provider_root/provider['checkout'];commit=provider['commit']
        tree=subprocess.check_output(['git','rev-parse',f'{commit}:_extensions'],cwd=checkout,text=True).strip()
        with tempfile.TemporaryDirectory(prefix='template-provider-') as temporary:
            work=Path(temporary);archive=work/'provider.zip';original=work/'original';installed=work/'installed';original.mkdir();installed.mkdir()
            subprocess.run(['git','archive','--format=zip',f'--output={archive}',commit,'_extensions'],cwd=checkout,check=True)
            with zipfile.ZipFile(archive) as source:source.extractall(original)
            subprocess.run([os.environ.get('QUARTO','quarto'),'add',str(archive),'--no-prompt'],cwd=installed,check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
            for package,scopes in provider['packages'].items():
                before=original/'_extensions'/package;actual=installed/'_extensions'/package
                expected=inventory(before)
                # zip extraction mode is not authoritative; the Git archive's bytes/file set are.
                actual_inventory=inventory(actual)
                assert {k:(v['sha256'],v['size'])for k,v in actual_inventory.items()}=={k:(v['sha256'],v['size'])for k,v in expected.items()},package
                for scope in scopes:
                    destination=ROOT/scope/'_extensions'/manifest['namespace']/package
                    if destination.exists():shutil.rmtree(destination)
                    destination.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(actual,destination)
                    assert inventory(destination)==actual_inventory
                provenance['packages'][package]={'provider':key,'repository':provider['repository'],'commit':commit,'extensionTree':tree,'scopes':scopes,'files':actual_inventory}
                print(f'Installed {package}: {len(actual_inventory)} files x {len(scopes)} scopes from {commit}',flush=True)
    for obsolete in ['project-publish','course-publication']:
        for parent in [ROOT]+[ROOT/p for p in ['theory','tasks','lectures','practice','handbook','book','essay','examples/cloud','examples/prairielearn']]:
            target=parent/'_extensions'/manifest['namespace']/obsolete
            if target.exists():shutil.rmtree(target)
    (ROOT/'installed-packages.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--providers-root',type=Path,default=ROOT.parent);parser.add_argument('--provider',action='append');args=parser.parse_args();sync(args.providers_root,args.provider)
