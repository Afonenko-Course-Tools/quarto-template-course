"""Build one ready producer group using normal pinned Quarto installation."""
from pathlib import Path
import subprocess,os,json,argparse,tempfile
p=argparse.ArgumentParser();p.add_argument('group');a=p.parse_args()
base=Path('/home/tolya/course-tools')
# One fixed release operation per group; no dependency resolution or consumer prebuild.
specs={
'core':('quarto-course','examples/course','_book-full','task',[]),
'composition':('quarto-project-publish','examples/course','_site','task',[]),
'qrc':('quarto-reference-catalog','examples/course','_site','task',[]),
'external':('quarto-reference-catalog','examples/external','_site','task',[]),
'print':('quarto-course-print','examples/paper','_site','script',[('bank','quarto-course','v3.0.0'),('.','quarto-course-print','v0.2.0')]),
'moodle':('quarto-course-moodle','examples/questions','_site','script',[('bank','quarto-course','v3.0.0'),('.','quarto-course-moodle','v0.2.0')]),
'prairielearn':('quarto-course-prairielearn','examples/java-gradle','_site','script',[('bank','quarto-course','v3.0.0'),('bank','quarto-course-prairielearn','v2.1.0')]),
'cloud':('quarto-course-cloud','examples/course','_book/full','script',[('.','quarto-course','v3.0.0'),('.','quarto-course-cloud','v2.1.0')]),
}
owner,folder,output,kind,installs=specs[a.group];producer=base/owner
assert subprocess.check_output(['git','branch','--show-current'],cwd=producer,text=True).strip()=='main'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=producer,text=True).strip()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=producer,text=True).strip()
stage=base/'local-evidence/implementation-2026-10-06/builds'/a.group
assert not stage.exists(), 'Use fresh staging; preserve earlier evidence'
stage.parent.mkdir(parents=True,exist_ok=True)
stage.mkdir()
with tempfile.NamedTemporaryFile(suffix='.tar') as source:
 subprocess.run(['git','archive','--format=tar','-o',source.name,commit,folder],cwd=producer,check=True)
 subprocess.run(['tar','-xf',source.name,'--strip-components=2','-C',str(stage)],check=True)
env=dict(os.environ,DEMO_SOURCE_COMMIT=commit,DEMO_SOURCE_DIRTY='false',XDG_CACHE_HOME=str(base/'local-cache/final-demos'/a.group),DENO_DIR=str(base/'local-cache/current-deno'),CUE=str(base/'local-tools/cue/cue'))
def run(args,cwd=stage): subprocess.run(args,cwd=cwd,env=env,check=True)
if kind=='task':
 task=str(base/'local-tools/task/task');run([task,'install']);run([task,'render'])
else:
 for directory,repo,tag in installs: run(['quarto','add','Afonenko-Course-Tools/'+repo+'@'+tag,'--no-prompt'],stage/directory)
 run(['quarto','run','build.ts'])
ready=stage/output
build=json.loads((ready/'BUILD.json').read_text());assert build['commit']==commit and not build.get('sourceDirty')
run(['node',str(base/'quarto-template-course/tests/site.cjs'),'--demo-dir',str(ready)])
print('READY',a.group,commit,ready,flush=True)
