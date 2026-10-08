from pathlib import Path
import datetime,json,os,subprocess,sys
root=Path('/tmp/template-patch-main-prepublish-20261008');repo=Path('/home/tolya/course-tools/quarto-template-course')
label,*command=sys.argv[1:]
env=os.environ.copy();env['PATH']='/home/tolya/course-tools/local-tools/cue:/home/tolya/course-tools/local-tools/task:'+env['PATH'];env['CUE']='/home/tolya/course-tools/local-tools/cue/cue';env['TASK']='/home/tolya/course-tools/local-tools/task/task'
for key,directory in [('XDG_CACHE_HOME','cache'),('XDG_DATA_HOME','data'),('IPYTHONDIR','ipython'),('JUPYTER_CONFIG_DIR','jupyter-config'),('JUPYTER_DATA_DIR','jupyter-data'),('JUPYTER_RUNTIME_DIR','jupyter-runtime')]:
 p=root/directory;p.mkdir(exist_ok=True);env[key]=str(p)
log=root/(label+'.log');started=datetime.datetime.now(datetime.timezone.utc).isoformat();print(label+': '+' '.join(command),flush=True)
with log.open('w') as output:r=subprocess.run(command,cwd=repo,env=env,stdout=output,stderr=subprocess.STDOUT)
receipt={'label':label,'command':command,'cwd':str(repo),'started':started,'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':r.returncode,'log':str(log),'cue':env['CUE'],'task':env['TASK'],'cache':env['XDG_CACHE_HOME']}
(root/(label+'.json')).write_text(json.dumps(receipt,indent=2)+'\n');print('\n'.join(log.read_text(errors='replace').splitlines()[-35:]),flush=True);print(label+' exit='+str(r.returncode),flush=True);sys.exit(r.returncode)
