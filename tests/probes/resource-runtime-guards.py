"""Проверка конкретного HTML runtime witness: реальные документы и provider bytes."""
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / 'fixtures/probes/resources/runtime.py'
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
with tempfile.TemporaryDirectory() as temporary:
    root = pathlib.Path(temporary)
    source = root / 'source'
    stage = root / 'stage'
    source.mkdir()
    (stage / 'tasks/nested').mkdir(parents=True)
    (stage / 'tasks/moved/runtime').mkdir(parents=True)
    asset = source / 'runtime.js'
    asset.write_text('window.publicRuntime = true;\n')
    entrypoint = source / 'filter.lua'
    entrypoint.write_text('quarto.doc.add_html_dependency(declaration)\n')
    declaration = source / 'html-dependency.json'
    declaration.write_text(json.dumps({'name':'course-presentation','version':'0.1.0','scripts':[{'path':'runtime.js','attribs':{'data-course-runtime-provider':'course-presentation','data-course-runtime-asset':'runtime.js'}}], 'stylesheets':[]}))
    destination = stage / 'tasks/moved/runtime/current.js'
    destination.write_bytes(asset.read_bytes())
    document = stage / 'tasks/nested/index.html'
    tag = '<script src="../moved/runtime/current.js" data-course-runtime-provider="course-presentation" data-course-runtime-asset="runtime.js"></script>'
    document.write_text(tag)
    manifest = root / 'manifest.json'
    record = {'namespace':'tasks','mount':'tasks','root':str(source),'provider':'course-presentation','declarationPath':str(declaration),'declarationSha256':digest(declaration),'entrypoint':str(entrypoint),'entrypointSha256':digest(entrypoint),'assets':[{'path':'runtime.js','source':str(asset),'sha256':digest(asset),'kind':'script'}]}
    manifest.write_text(json.dumps([record]))
    def run(error=None):
        result = subprocess.run([sys.executable,str(SCRIPT),str(stage),str(manifest)],capture_output=True,text=True)
        if error:
            assert result.returncode and error in result.stderr, (error,result.stdout,result.stderr)
        else:
            assert result.returncode == 0, result.stderr
            return json.loads(result.stdout)
    rows = run()
    assert rows[0]['destination']=='tasks/moved/runtime/current.js' and rows[0]['sha256']==digest(asset) and rows[0]['document']=='tasks/nested/index.html'
    document.write_text('<script src="../moved/runtime/current.js"></script>')
    assert run() == [], 'unmarked bytes must not create a runtime exception'
    document.write_text(tag.replace('runtime.js"','unclaimed.js"'))
    run('RUNTIME_UNKNOWN_ASSET')
    document.write_text(tag.replace('<script','<link'))
    run('RUNTIME_TAG_KIND')
    document.write_text('<base href="/ambiguous/">'+tag)
    run('RUNTIME_BASE_UNSUPPORTED')
    document.write_text(tag.replace('../moved/runtime/current.js','https://example.org/current.js'))
    run('RUNTIME_EXTERNAL_UNSUPPORTED')
    document.write_text(tag.replace('../moved/runtime/current.js','../../../outside.js'))
    run('RUNTIME_OUTSIDE_MEMBER')
    document.write_text(tag + tag)
    run('RUNTIME_DUPLICATE_ASSET')
    document.write_text(tag)
    destination.write_text('changed output bytes')
    run('RUNTIME_OUTPUT_CHANGED')
    destination.write_bytes(asset.read_bytes())
    asset.write_text('changed source bytes')
    run('RUNTIME_SOURCE_CHANGED')
    asset.write_text('window.publicRuntime = true;\n')
    entrypoint.write_text('changed producer')
    run('RUNTIME_PRODUCER_CHANGED')
print('PASS runtime witness: actual relocated tag destination, identity/kind/path/current bytes')
