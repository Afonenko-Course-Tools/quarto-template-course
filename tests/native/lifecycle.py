"""Current outputs, selected renders, author generated inputs and failed-build retry."""
from pathlib import Path
import json,os,subprocess,sys
from run import ROOT,QUARTO,command,search
root=Path(sys.argv[1]).resolve();part=root/'handbook';cfg=part/'_quarto.yml';original=(ROOT/'handbook/_quarto.yml').read_text();cfg.write_text(original)
(part/'generate.ts').unlink(missing_ok=True);(part/'generated.qmd').unlink(missing_ok=True)
# Native selected file remains local and does not compose siblings.
trace=root/'lifecycle-trace.jsonl';os.environ['COURSE_BUILD_TRACE']=str(trace)
before=trace.read_text().splitlines() if trace.exists() else []
command(['render','index.qmd','--profile','student'],part)
assert not any(json.loads(x)['kind']=='render' for x in trace.read_text().splitlines()[len(before):])
# Fail after the native capture completed; only process success authorizes collection.
(part/'fail.ts').write_text('throw Error("TEMPLATE_LATE_FAILURE");\n')
cfg.write_text(original.replace('  - ../_extensions/Afonenko-Course-Tools/course-site/entrypoints/collect.ts', '  - fail.ts\n  - ../_extensions/Afonenko-Course-Tools/course-site/entrypoints/collect.ts'))
failed=subprocess.run([QUARTO,'render','.','--profile','student'],cwd=root,capture_output=True,text=True)
assert failed.returncode and 'TEMPLATE_LATE_FAILURE' in failed.stderr
cfg.write_text(original);(part/'fail.ts').unlink()
# Poison retained output and old document files: a retry must use only current results.
(part/'_output/student/stale.html').write_text('STALE_PRIVATE_OUTPUT')
poison=part/'_generated/course-spec/stale-document.json';poison.write_text('{"source":"deleted.qmd","private":"STALE_PRIVATE_OUTPUT"}')
command(['render','.', '--profile','student'],root)
assert not (root/'_site-student/handbook/stale.html').exists()
search(root,'neutral','student')
# Use an ordinary author pre-render hook to generate an extra native input.
(part/'generate.ts').write_text("await Deno.writeTextFile('generated.qmd', '# Generated handbook {#sec-generated-handbook}\\n\\nFRESH_GENERATED_HANDBOOK\\n');\n")
cfg.write_text(original.replace('  type: book\n',"  type: default\n  render: ['*.qmd']\n").replace('  pre-render:\n','  pre-render:\n  - generate.ts\n'))
command(['render','.', '--profile','student'],root)
assert 'FRESH_GENERATED_HANDBOOK' in (root/'_site-student/handbook/generated.html').read_text()
cfg.write_text(original);(part/'generate.ts').unlink();(part/'generated.qmd').unlink()
command(['render','.', '--profile','student'],root)
assert not (root/'_site-student/handbook/generated.html').exists()
assert not any('generated.html' in x['href']for x in json.loads((root/'_site-student/search.json').read_text()))
command(['run',str(ROOT/'tests/check.ts'),str(root)],ROOT)
print('PASS selected native render, late failure/retry, stale exclusion, generated and removed input, current search')
