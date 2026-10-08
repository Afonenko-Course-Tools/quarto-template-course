"""Dated local-only verification of native builder trees. Never builds or publishes."""
from pathlib import Path
import argparse, json, hashlib, subprocess, tempfile, shutil, importlib.util, re
BASE=Path('/home/tolya/course-tools')
HELPER=Path('/tmp/course-release-20261008/build-verified-demo.py')
spec=importlib.util.spec_from_file_location('dated_builder', HELPER)
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
GROUPS=tuple(builder.SPECS)
def require(ok,msg):
 if not ok: raise RuntimeError(msg)
def hashes(root):
 require(not any(p.is_symlink() for p in root.rglob('*')), 'Ready symlink')
 return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
def exact_pl_resources(source,question,commit):
 require(re.fullmatch('[0-9a-f]{40}',commit),'PL resource exact producer SHA required')
 producer=BASE/'quarto-course-prairielearn'
 for folder,target in [('student','clientFilesQuestion'),('tests','tests')]:
  prefix='examples/java-gradle/bank/projects/clamp/'+folder+'/'
  tree=subprocess.check_output(['git','ls-tree','-r','-z',commit,'--',prefix],cwd=producer)
  expected={}
  for record in tree.split(b'\0'):
   if not record:continue
   metadata,path=record.split(b'\t',1);mode,kind,object_sha=metadata.split()
   name=path.decode('utf-8')
   require(mode in [b'100644',b'100755'] and kind==b'blob' and name.startswith(prefix),'PL resource unsupported committed entry')
   relative=name[len(prefix):]
   bytes_=subprocess.check_output(['git','show',commit+':'+name],cwd=producer)
   expected[relative]=hashlib.sha256(bytes_).hexdigest()
   staged=source/folder/relative
   require(staged.is_file() and not staged.is_symlink() and hashlib.sha256(staged.read_bytes()).hexdigest()==expected[relative],'PL resource staged authored bytes differ: '+name)
  actual=question/target
  require(expected and actual.is_dir(),'PL resource committed/delivered directory missing: '+target)
  require(hashes(actual)==expected,'PL resource file set/bytes differ: '+target)
def source_witness(root,operation):
 # Bounded authored anchor witness; encounter/tag checks remain in unchanged site.cjs.
 owner=operation['producer'].split('/')[-1];tag=operation['releases'][owner]['tag']
 prefix='https://github.com/'+operation['producer']+'/'
 folder=operation['folder'].rstrip('/')
 witnesses=[]
 for path in sorted(root.rglob('*.html')):
  for match in re.finditer(r"<a\b[^>]*\bhref=[\"'](https://github\.com/[^\"']+/(?:blob|tree)/[^\"']+)[\"']",path.read_text(),re.I):
   url=match.group(1).replace('&amp;','&')
   for kind in ['blob','tree']:
    expected=prefix+kind+'/'+tag+'/'+folder
    if url==expected or url.startswith(expected+'/'):
     witnesses.append({'html':str(path.relative_to(root)),'url':url})
 require(witnesses,'Missing authored producer source URL witness: '+operation['group'])
 return witnesses
def run(args,cwd=None):
 try:out=subprocess.check_output(args,cwd=cwd,text=True,stderr=subprocess.STDOUT)
 except subprocess.CalledProcessError as error:
  print(error.output,end='',flush=True)
  raise
 print(out,end='',flush=True);return out
def jsonfile(path):return json.loads(path.read_text())
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('repo',choices=builder.NAMES);p.add_argument('commit')
 p.add_argument('--evidence',type=Path,default=Path('/tmp/course-release-20261008/receipts'))
 a=p.parse_args();require(re.fullmatch('[0-9a-f]{40}',a.commit),'Exact SHA required')
 selected=[g for g in GROUPS if builder.SPECS[g][0]==a.repo]
 require(selected,'No demos for owner');producer=BASE/a.repo;builder.clean(producer,a.commit)
 out=a.evidence.resolve()/'checks'/a.repo
 require(not out.exists(),'Fresh verification directory required');out.mkdir(parents=True)
 pins={};receipts={}
 for group in selected:
  receipt=jsonfile(a.evidence.resolve()/'builds'/group/'operation-receipt.json');op=receipt['operation']
  require((op['group'],op['producer'],op['commit'])==(group,builder.REMOTE+a.repo,a.commit),'Receipt identity mismatch')
  root=Path(receipt['ready']).resolve();stage=a.evidence.resolve()/'builds'/group
  require(root==stage/builder.SPECS[group][2],'Fixed ready path mismatch')
  require(hashes(root)==receipt['files'],'Actual tree differs from native receipt')
  build=jsonfile(root/'BUILD.json');require(build==receipt['build'] and build['sourceDirty'] is False,'BUILD differs')
  own=op['releases'][a.repo];require(own['commit']==a.commit,'Source tag provenance mismatch')
  pins[group]={'sourcePath':op['folder'],'sourceRef':own['tag'],'build':build,'files':receipt['files']}
  receipts[group]=receipt
 ephemeral=out/'harness';(ephemeral/'tests').mkdir(parents=True)
 (ephemeral/'tests/ready-assets.json').write_text(json.dumps(pins,indent=2)+'\n')
 # The existing consumer harness is called byte-for-byte from its repository.
 results={}
 for group in selected:
  receipt=receipts[group];root=Path(receipt['ready']);stage=a.evidence.resolve()/'builds'/group
  witnesses=source_witness(root,receipt['operation'])
  (out/(group+'-source-witnesses.json')).write_text(json.dumps(witnesses,indent=2)+'\n')
  log=run(['node',str(BASE/'quarto-template-course/tests/site.cjs'),'--demo-dir',str(root),'--demo-group',group],ephemeral)
  (out/(group+'-site.log')).write_text(log)
  outputs(group,root,stage,out)
  require(hashes(root)==receipt['files'],'Verification modified ready tree')
  results[group]={'passed':True,'files':receipt['files'],'checks':{'html':True,'resources':True,'sourceLinks':True,'outputs':True},'logs':str(out)}
 builder.clean(producer,a.commit)
 gate={'producer':builder.REMOTE+a.repo,'commit':a.commit,'sourceDirty':False,'groups':results}
 (out/'verified-demo-checks.json').write_text(json.dumps(gate,indent=2)+'\n')
 print('VERIFIED',out/'verified-demo-checks.json')
def outputs(group,root,stage,out):
 if group=='print':
  for name in ['ordinary.pdf','variant-a/handout.pdf','variant-b/handout.pdf']:
   path=root/'artifacts'/name;require(path.is_file(),'Missing actual PDF '+name)
   info=run(['pdfinfo',str(path)]);require(re.search(r'Pages:\s*[1-9][0-9]*',info),'PDF has no pages')
   text=run(['pdftotext',str(path),'-']);require(len(text.strip())>30,'PDF missing extracted text')
   if name.startswith('variant-'):
    require('Демонстрация' in text,'PDF group header missing')
    require('публичные стартовые материалы' in text,'Selected control condition missing from actual PDF')
    require('Дополнительное задание банка' not in text,'Unassigned bank task leaked')
   (out/('pdf-'+name.replace('/','-')+'.txt')).write_text(info+'\n'+text)
 if group=='moodle':
  script=out/'verify-moodle.ts'
  script.write_text('''import {quiz,children,text} from "file:///home/tolya/course-tools/quarto-course-moodle/tests/xml.ts";
const root=Deno.args[0];
for(const variant of ["a","b"]){
 const xml=await Deno.readTextFile(`${root}/artifacts/variant-${variant}.xml`);
 const questions=children(quiz(xml),"question");
 if(questions.length!==2)throw Error("Expected selected 2 XML questions");
 const names=questions.map(q=>text(children(q,"name")[0],"text"));
 const expected=[`demo-moodle/exr-${variant==="a"?"manual":"choice"}`,"demo-moodle/exr-control"];
 if(JSON.stringify(names.sort())!==JSON.stringify(expected.sort()))throw Error("Wrong XML question set: "+names);
 if(variant==="b"){
  const choice=questions.find(q=>text(children(q,"name")[0],"text")==="demo-moodle/exr-choice");
  const correct=children(choice,"answer").filter(a=>a.getAttribute("fraction")==="100");
  if(correct.length!==1||text(correct[0],"text").trim()!=="TLS")throw Error("Incorrect Moodle teacher key");
 }
 console.log("PASS actual Moodle XML "+variant);
}
''')
  (out/'moodle-outputs.log').write_text(run(['quarto','run',str(script),str(root)]))
 if group=='prairielearn':
  source=stage/'bank/projects/clamp'
  for variant,exercise in [('a','exr-clamp'),('b','exr-control')]:
   package=root/'artifacts'/('variant-'+variant);delivery=jsonfile(package/'delivery.json')
   key='demo-java-gradle/'+exercise
   require(delivery['questions']==[key],'Wrong selected PL question set')
   question=package/'questions'/key;info=jsonfile(question/'info.json')
   require(info['gradingMethod']=='External' and info['showCorrectAnswer'] is False,'Wrong PL grading')
   require(info['externalGradingOptions']['enableNetworking'] is False,'PL grader network policy differs')
   exact_pl_resources(source,question,jsonfile(root/'BUILD.json')['commit'])
   # Run actual delivered tests with existing Gradle contract; only an ephemeral copy is writable.
   with tempfile.TemporaryDirectory(prefix='ready-pl-check-20261008-') as temp:
    work=Path(temp);shutil.copytree(question/'tests',work/'tests');shutil.copytree(question/'clientFilesQuestion',work/'student');shutil.copytree(source/'reference',work/'reference')
    for solution,ok in [('reference',True),('student',False)]:
     result=subprocess.run(['gradle','--offline','--no-daemon','-Psolution=../'+solution,'test'],cwd=work/'tests',capture_output=True,text=True,env={**__import__('os').environ,'GRADLE_USER_HOME':str(work/'gradle-home')})
     (out/(f'pl-{variant}-{solution}.log')).write_text(result.stdout+result.stderr)
     require((result.returncode==0)==ok,'Actual PL grader result differs '+solution)
 if group=='cloud':
  script=stage/'projects/service/check.sh';require(script.is_file(),'Cloud source action missing')
  run(['sh','-n',str(script)])
  loaders=[stage/'_extensions'/owner/'course-core/infrastructure/native-run.ts' for owner in ['', 'Afonenko-Course-Tools']]
  installed=[path for path in loaders if path.is_file()]
  require(len(installed)==1,'Cloud installed Core native loader missing or ambiguous')
  probe=out/'verify-cloud.ts'
  probe.write_text('import {loadNativeRun} from '+json.dumps(installed[0].as_uri())+';\n'+'''const run=await loadNativeRun(Deno.args[0],{view:"full"});
const adapters=run.adapters.filter(a=>a.contract.name==="cloud");
if(adapters.length!==1)throw Error("Cloud native adapter missing or duplicated");
const fragment=adapters[0].fragments.get("tasks/index.qmd");
if(!fragment||fragment.course.id!=="demo-cloud")throw Error("Cloud native task fragment missing");
const exercises=fragment.exercises;
if(exercises.length!==1||exercises[0].id!=="exr-service")throw Error("Cloud native exercise set changed");
const steps=exercises[0].payload.steps;
if(JSON.stringify(steps.map(s=>s.key))!==JSON.stringify(["configure","client"]))throw Error("Cloud steps changed");
if(steps[0].actions[0].source.file!=="/projects/service/check.sh")throw Error("Cloud source action changed");
console.log("PASS installed current native Cloud loader: exr-service/configure/client/source file");
''')
  (out/'cloud-outputs.log').write_text(run(['quarto','run',str(probe),str(stage)]))
  require(not (root/'projects').exists(),'Private Cloud source directory copied')
 if group in ['composition','qrc','external']:
  # Native QRC finalization is already a builder gate. Check actual catalogs in the fixed tree.
  catalogs=list(root.rglob('reference-catalog*.json'));require(catalogs,'Native QRC output missing')
  for path in catalogs:
   catalog=jsonfile(path);require(catalog.get('schema')=='quarto-reference-catalog','QRC schema differs')
   require(isinstance(catalog.get('targets'),dict),'QRC targets map missing')
  script=out/'verify-qrc.ts'
  script.write_text(r'''import {parseHtml,elements,attr,content,hasClass} from "file:///home/tolya/course-tools/quarto-reference-catalog/_extensions/reference-catalog/infrastructure/html.ts";
import {validateImportedCatalog} from "file:///home/tolya/course-tools/quarto-reference-catalog/_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import {join} from "node:path";
import {pathToFileURL,fileURLToPath} from "node:url";
const root=Deno.args[0];let links=0;
async function walk(dir:string){for await(const entry of Deno.readDir(dir)){
 const path=join(dir,entry.name);if(entry.isDirectory){await walk(path);continue;}
 if(entry.name.startsWith("reference-catalog")&&entry.name.endsWith(".json"))validateImportedCatalog(JSON.parse(await Deno.readTextFile(path)),path);
 if(!entry.name.endsWith(".html"))continue;
 for(const node of elements(parseHtml(await Deno.readTextFile(path)))){
  if(node.tagName!=="a"||!attr(node,"data-qrc-ref"))continue;
  const href=attr(node,"href");if(!href||!content(node).trim())throw Error("Unresolved QRC reference in "+path);
  if(!/^(https?:)?\/\//.test(href)){
   const url=new URL(href,pathToFileURL(path));
   const nodes=elements(parseHtml(await Deno.readTextFile(fileURLToPath(url))));
   const reveal=nodes.some(n=>hasClass(n,"reveal")&&elements(n).some(child=>hasClass(child,"slides")));
   const fragment=decodeURIComponent(url.hash.slice(1));
   if(fragment.startsWith("/")&&!reveal)throw Error("Reveal route on plain HTML: "+href);
   const id=reveal?fragment.replace(/^\//,""):fragment;
   if(id&&!nodes.some(n=>attr(n,"id")===id))throw Error("Missing QRC target fragment: "+href);
   if(fragment.startsWith("/")&&!nodes.some(n=>hasClass(n,"slides")&&elements(n).some(slide=>slide.tagName==="section"&&attr(slide,"id")===id)))throw Error("Missing QRC native slide: "+href);
   if(url.searchParams.has("qrc-target")){
    const objects=url.searchParams.getAll("qrc-target");
    if(!reveal||!id||objects.length!==1||!objects[0]||!nodes.some(n=>attr(n,"id")===objects[0]))throw Error("Missing QRC Reveal object target: "+href);
   }
  }links++;
 }
}}
await walk(root);if(!links)throw Error("No real QRC references");console.log("PASS actual QRC links "+links);
''')
  (out/'qrc-outputs.log').write_text(run(['quarto','run',str(script),str(root)]))
if __name__=='__main__':main()
