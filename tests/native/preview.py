"""Preview delegates initial rendering and watches to native Quarto."""
from pathlib import Path
import json,os,selectors,shutil,signal,socket,subprocess,sys,time
root=Path(sys.argv[1]).resolve();quarto=os.environ.get('QUARTO','quarto');trace=root/'preview-trace.jsonl'
def renders():
    return sum(json.loads(x)['kind']=='render'for x in trace.read_text().splitlines())if trace.exists()else 0
def preview(cwd,clean=False):
    if clean:shutil.rmtree(cwd/'_site-student')
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    before=renders();p=subprocess.Popen([quarto,'preview','--profile','student','--no-browser','--no-watch-inputs','--port',str(port)],cwd=cwd,env=dict(os.environ,COURSE_BUILD_TRACE=str(trace)),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
    selector=selectors.DefaultSelector();selector.register(p.stdout,selectors.EVENT_READ);deadline=time.monotonic()+240;listening=False
    source=cwd/'index.qmd';original=source.read_bytes()
    try:
        while p.poll() is None and time.monotonic()<deadline:
            for key,_ in selector.select(timeout=.2):
                line=key.fileobj.readline();print(line,end='',flush=True)
                if 'Listening on' in line or 'Browse at' in line:
                    listening=True;deadline=time.monotonic()+3;source.write_bytes(original+b'\nNo-watch native preview edit.\n')
        assert listening,'native preview did not start'
    finally:
        source.write_bytes(original);selector.close()
        if p.poll() is None:os.killpg(p.pid,signal.SIGTERM)
        try:p.wait(timeout=4)
        except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
    expected=5 if clean and cwd==root else 0
    assert renders()-before==expected,(renders()-before,expected)
preview(root);preview(root,True);preview(root/'theory')
print('PASS root existing/clean and component native preview; no-watch edit does not trigger children')
