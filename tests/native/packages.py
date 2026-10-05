"""Verify every installed package byte and the exact file set against provenance."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
m=json.loads((ROOT/'providers.json').read_text());p=json.loads((ROOT/'installed-packages.json').read_text())
expected={(scope,name)for provider in m['providers'].values()for name,scopes in provider['packages'].items()for scope in scopes}
actual={(str(file.parents[3].relative_to(ROOT)) or '.',file.parent.name)for file in ROOT.glob('**/_extensions/'+m['namespace']+'/*/_extension.yml')}
assert actual==expected,('undeclared/missing installed package',actual^expected)
count=0
for name,entry in p['packages'].items():
    provider=m['providers'][entry['provider']]
    assert entry['commit']==provider['commit'] and entry['scopes']==provider['packages'][name]
    for scope in entry['scopes']:
        root=ROOT/scope/'_extensions'/m['namespace']/name
        actual={}
        for file in sorted(root.rglob('*')):
            assert not file.is_symlink(),file
            if file.is_file():actual[str(file.relative_to(root))]={'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'size':file.stat().st_size,'mode':file.stat().st_mode & 0o777}
        assert actual==entry['files'],(name,scope,'installed payload differs')
        count+=1
print('PASS complete installed file sets and SHA256 bytes:',count,'package installations')
