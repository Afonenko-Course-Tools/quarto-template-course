import unittest, tempfile, json, importlib.util, sys
from pathlib import Path
SCRIPT=sys.argv.pop(1);spec=importlib.util.spec_from_file_location('verifier',SCRIPT);v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class Reveal(unittest.TestCase):
 def fixture(self,href,reveal=True,slide=True,object_=True):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)/'ready';root.mkdir();out=Path(temp)/'checks';out.mkdir()
   (root/'reference-catalog.json').write_text(json.dumps({'schema':'quarto-reference-catalog','generator':{'quarto':'1.11.5'},'targets':{}}))
   (root/'index.html').write_text('<a data-qrc-ref="slides:sec-slide" href="'+href+'">Caption</a>')
   target=('<section id="sec-slide">' if slide else '<section>')+('<figure id="fig-layout"></figure>' if object_ else '')+'</section>'
   if reveal:target='<div class="reveal"><div class="slides">'+target+'</div></div>'
   (root/'slides.html').write_text(target)
   v.outputs('composition',root,Path(temp)/'unused-stage',out)
 def accepts(self,*args,**kwargs):
  try:self.fixture(*args,**kwargs)
  except Exception as error:self.fail('Valid native QRC URL rejected: '+str(error))
 def test_native_reveal_route(self):self.accepts('slides.html#/sec-slide')
 def test_native_reveal_object_query(self):self.accepts('slides.html?qrc-target=fig-layout#/sec-slide')
 def test_missing_slide_rejected(self):
  with self.assertRaises(Exception):self.fixture('slides.html?qrc-target=fig-layout#/sec-slide',slide=False)
 def test_missing_object_rejected(self):
  with self.assertRaises(Exception):self.fixture('slides.html?qrc-target=fig-layout#/sec-slide',object_=False)
 def test_plain_fragment_accepted(self):self.accepts('slides.html#sec-slide',reveal=False)
 def test_plain_slash_fragment_rejected(self):
  with self.assertRaises(Exception):self.fixture('slides.html#/sec-slide',reveal=False)
if __name__=='__main__':unittest.main()
