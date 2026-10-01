"""Проверки mature ZIP audit: реальные bytes и неоднозначные carriers."""
import gzip
import io
import json
import pathlib
import stat
import subprocess
import sys
import tempfile
import zipfile

AUDIT = pathlib.Path(__file__).resolve().parents[2] / 'fixtures/probes/resources/audit.py'

def run(root, error=None):
    result = subprocess.run([sys.executable, str(AUDIT), str(root)], text=True, capture_output=True)
    if error:
        assert result.returncode and error in result.stderr, (error, result.stdout, result.stderr)
    else:
        assert result.returncode == 0, result.stderr
        return json.loads(result.stdout)

def archive(path, entries):
    with zipfile.ZipFile(path, 'w') as z:
        for name, data in entries:
            z.writestr(name, data)

with tempfile.TemporaryDirectory() as temporary:
    root = pathlib.Path(temporary)
    carrier = root / 'renamed.bin'
    archive(carrier, [('src/main.txt', b'public source')])
    actual = run(root)
    assert actual[0]['path'] == 'renamed.bin' and actual[0]['entries'][0]['path'] == 'src/main.txt'
    for name in ['../escape.txt', '/absolute.txt', 'C:/drive.txt', 'folder\\ambiguous.txt', './alias.txt', 'a//b.txt']:
        archive(carrier, [(name, b'bad')])
        run(root, 'UNSAFE_ZIP_NAME')
    archive(carrier, [('same.txt', b'one'), ('same.txt', b'two')])
    run(root, 'DUPLICATE_ZIP_NAME')
    info = zipfile.ZipInfo('symlink')
    info.create_system = 3
    info.external_attr = (stat.S_IFLNK | 0o777) << 16
    archive(carrier, [(info, b'target')])
    run(root, 'UNSUPPORTED_ZIP_ENTRY')
    inner = io.BytesIO()
    with zipfile.ZipFile(inner, 'w') as z:
        z.writestr('inner.txt', b'bytes')
    archive(carrier, [('renamed.dat', inner.getvalue())])
    run(root, 'UNSUPPORTED_NESTED_ARCHIVE')
    carrier.write_bytes(gzip.compress(b'renamed compressed carrier'))
    run(root, 'UNSUPPORTED_ARCHIVE')
    carrier.unlink()
    (root / 'unsupported.7z').write_bytes(b'unknown carrier')
    run(root, 'UNSUPPORTED_ARCHIVE')
print('PASS resource archive guards: renamed carrier, names, duplicates, symlinks, nested/unknown archives')
