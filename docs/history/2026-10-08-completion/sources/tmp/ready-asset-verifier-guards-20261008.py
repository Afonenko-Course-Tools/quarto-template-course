"""Isolated guard fixtures; no actual build/release readiness claim."""
import unittest, tempfile, json, importlib.util, sys, io, contextlib, subprocess, shutil
from pathlib import Path
from unittest.mock import patch
SCRIPT=sys.argv.pop(1)
spec=importlib.util.spec_from_file_location('verifier',SCRIPT);v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
SHA='a'*40
class Guards(unittest.TestCase):
 def pl_fixture(self,extra=None,generated=False):
  with tempfile.TemporaryDirectory() as temp:
   base=Path(temp);stage=base/'stage';root=base/'ready';out=base/'out';out.mkdir()
   source=stage/'bank/projects/clamp'
   repo=base/'quarto-course-prairielearn';authored=repo/'examples/java-gradle/bank/projects/clamp'
   for name in ['student/Clamp.java','reference/Clamp.java','tests/ClampChecks.java','tests/build.gradle','tests/grade.sh','tests/settings.gradle']:
    path=authored/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(name)
   subprocess.run(['git','init','-q',str(repo)],check=True)
   subprocess.run(['git','add','.'],cwd=repo,check=True)
   subprocess.run(['git','-c','user.name=Guard Fixture','-c','user.email=guard@example.invalid','commit','-qm','Bounded authored PL fixture'],cwd=repo,check=True)
   commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
   shutil.copytree(authored,source)
   root.mkdir();(root/'BUILD.json').write_text(json.dumps({'commit':commit}))
   for variant,exercise in [('a','exr-clamp'),('b','exr-control')]:
    package=root/'artifacts'/('variant-'+variant);question=package/'questions/demo-java-gradle'/exercise;question.mkdir(parents=True)
    (package/'delivery.json').write_text(json.dumps({'questions':['demo-java-gradle/'+exercise]}))
    (question/'info.json').write_text(json.dumps({'gradingMethod':'External','showCorrectAnswer':False,'externalGradingOptions':{'enableNetworking':False}}))
    for source_folder,target in [('student','clientFilesQuestion'),('tests','tests')]:
     shutil.copytree(source/source_folder,question/target)
    if extra:
     file=question/extra;file.parent.mkdir(parents=True,exist_ok=True);file.write_text('private extra')
   if generated:
    for name in ['tests/build/classes/Clamp.class','tests/.gradle/cache.bin']:
     path=source/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('producer generated')
   native_run=subprocess.run
   def fake_gradle(args,**kwargs):
    if args[0]!='gradle':return native_run(args,**kwargs)
    class Result:pass
    result=Result();result.returncode=0 if '-Psolution=../reference' in args else 1;result.stdout='isolated fixture';result.stderr='';return result
   with patch.object(v.subprocess,'run',fake_gradle),patch.object(v,'BASE',base):v.outputs('prairielearn',root,stage,out)
 def test_pl_exact_valid(self):self.pl_fixture()
 def test_pl_producer_generated_files_accepted(self):
  try:self.pl_fixture(generated=True)
  except RuntimeError as error:self.fail('Legitimate authored delivery rejected after producer Gradle: '+str(error))
 def test_pl_delivered_generated_files_rejected(self):
  for extra in ['tests/build/classes/Clamp.class','tests/.gradle/cache.bin']:
   with self.subTest(extra=extra):
    with self.assertRaisesRegex(RuntimeError,'PL resource'):self.pl_fixture(extra,generated=True)
 def test_pl_extra_reference_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'PL resource'):self.pl_fixture('clientFilesQuestion/reference/Clamp.java')
 def test_pl_extra_client_file_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'PL resource'):self.pl_fixture('clientFilesQuestion/key.txt')
 def test_pl_extra_test_key_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'PL resource'):self.pl_fixture('tests/private-key.txt')
 def source_fixture(self,group,url=None):
  owner,folder,output,*_=v.builder.SPECS[group]
  with tempfile.TemporaryDirectory() as temp:
   evidence=Path(temp);stage=evidence/'builds'/group;root=stage/output;root.mkdir(parents=True)
   tag='v'+v.builder.VERSIONS[owner]
   html='<html><body>Fixture</body></html>' if url is None else '<html><body><a href="'+url.format(owner=owner,tag=tag,folder=folder)+'">Исходники</a></body></html>'
   (root/'index.html').write_text(html)
   build={'commit':SHA,'producer':v.builder.REMOTE+owner,'sourceDirty':False,'dependencies':{owner:tag}};(root/'BUILD.json').write_text(json.dumps(build))
   receipt={'operation':{'group':group,'producer':v.builder.REMOTE+owner,'commit':SHA,'folder':folder,'releases':{owner:{'tag':tag,'commit':SHA}}},'ready':str(root),'build':build,'files':v.hashes(root)}
   (stage/'operation-receipt.json').write_text(json.dumps(receipt))
   # QRC must have both fixture groups for main's exact owner contract.
   groups=[g for g in v.GROUPS if v.builder.SPECS[g][0]==owner]
   if len(groups)>1:
    other=next(g for g in groups if g!=group);_,other_folder,other_output,*_=v.builder.SPECS[other];other_stage=evidence/'builds'/other;other_root=other_stage/other_output;other_root.mkdir(parents=True)
    (other_root/'index.html').write_text(html.replace(folder,other_folder));(other_root/'BUILD.json').write_text(json.dumps(build))
    other_receipt=json.loads(json.dumps(receipt));other_receipt['operation'].update(group=other,folder=other_folder);other_receipt.update(ready=str(other_root),files=v.hashes(other_root));(other_stage/'operation-receipt.json').write_text(json.dumps(other_receipt))
   argv=['verifier',owner,SHA,'--evidence',str(evidence)]
   with patch.object(sys,'argv',argv),patch.object(v.builder,'clean',lambda *_:None),patch.object(v,'outputs',lambda *_:None),contextlib.redirect_stdout(io.StringIO()):v.main()
 def test_all_groups_missing_own_source_rejected(self):
  for group in v.GROUPS:
   with self.subTest(group=group):
    with self.assertRaisesRegex(RuntimeError,'authored producer source'):self.source_fixture(group)
 def test_core_actual_code_link_shape_accepted(self):
  self.source_fixture('core','https://github.com/Afonenko-Course-Tools/{owner}/tree/{tag}/{folder}')
 def test_wrong_source_folder_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'authored producer source'):self.source_fixture('core','https://github.com/Afonenko-Course-Tools/{owner}/tree/{tag}/examples/course-other')
 def test_wrong_source_tag_rejected(self):
  with self.assertRaises((RuntimeError,AssertionError,v.subprocess.CalledProcessError)):self.source_fixture('core','https://github.com/Afonenko-Course-Tools/{owner}/tree/v0.0.0/{folder}')
if __name__=='__main__':unittest.main()
