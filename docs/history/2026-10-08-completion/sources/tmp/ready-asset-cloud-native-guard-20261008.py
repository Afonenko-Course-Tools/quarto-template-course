"""Read-only actual completed native Cloud evidence; no main/check receipt emission."""
import unittest,tempfile,importlib.util,sys
from pathlib import Path
SCRIPT=sys.argv.pop(1);spec=importlib.util.spec_from_file_location('verifier',SCRIPT);v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
STAGE=Path('/tmp/course-release-20261008/receipts/builds/cloud');READY=STAGE/'_book/full'
class Cloud(unittest.TestCase):
 def test_completed_native_loader_facts_accepted(self):
  before=v.hashes(READY)
  with tempfile.TemporaryDirectory(prefix='cloud-native-probe-20261008-') as temp:
   try:v.outputs('cloud',READY,STAGE,Path(temp))
   except Exception as error:self.fail('Current completed native Cloud evidence falsely rejected: '+str(error))
  self.assertEqual(v.hashes(READY),before)
if __name__=='__main__':unittest.main()
