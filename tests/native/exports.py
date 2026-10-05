from pathlib import Path
import base64,hashlib,json,os,subprocess,sys,xml.etree.ElementTree as ET
from run import ROOT,QUARTO,command
root=Path(sys.argv[1]).resolve()/ 'examples/exports'
for profile in ['student','full','student']:
    command(['render','.', '--profile',profile],root)
    command(['run',str(ROOT/'tests/native/package.ts'),str(root),profile],root)
    public=root/'_generated/public-package.json';teacher=root/'_generated/teacher-package.json'
    payload=json.loads(public.read_text())
    assert 'EXPORT_PRIVATE' not in public.read_text()
    assert len(payload['questions'])==2 and len(payload['resources'])==2
    assert ('EXPORT_PRIVATE' in teacher.read_text())==(profile=='full')
    output=root/f'_generated/print-{profile}'
    command(['run',str(ROOT/'_extensions/Afonenko-Course-Tools/course-print/entrypoints/export.ts'),str(public),'example-exports/sec-work',str(output)],root)
    text=subprocess.check_output(['pdftotext',str(output/'handout.pdf'),'-'],text=True)
    assert 'Observation' in text and 'EXPORT_PRIVATE' not in text
    for r in payload['resources']:
        assert hashlib.sha256((output/r['target']).read_bytes()).hexdigest()==r['sha256']
    binding=root/'_generated/binding.json';binding.write_text('{"defaultGrade":1,"shuffle":false}')
    xml=root/f'_generated/bank-{profile}.xml'
    moodle=['run',str(ROOT/'_extensions/Afonenko-Course-Tools/course-moodle/entrypoints/export.ts'),str(teacher),str(binding),str(xml)]
    if profile=='student':
        refused=subprocess.run([QUARTO,*moodle],cwd=root,capture_output=True,text=True)
        assert refused.returncode and 'invalid single-choice mapping' in refused.stderr and not xml.exists()
        continue
    command(moodle,root)
    tree=ET.parse(xml);questions=tree.findall('question')
    assert [q.attrib['type']for q in questions]==['essay','multichoice']
    assert [a.attrib['fraction']for a in questions[1].findall('answer')]==['100','0']
    assert 'EXPORT_PRIVATE' not in xml.read_text()
    attached={f.attrib['path'].lstrip('/')+f.attrib['name']:base64.b64decode(f.text)for f in questions[0].findall('questiontext/file')}
    assert attached=={r['target']:base64.b64decode(r['data'])for r in payload['resources']}
print('PASS installed native Body -> public Print PDF/resources and teacher Moodle XML/attachments; student/full/student')
